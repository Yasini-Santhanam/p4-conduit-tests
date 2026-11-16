import { test, expect, APIRequestContext } from '@playwright/test';

// Source: P4/API.md only.

// Signs up a new user and returns the user's name and token.
// API.md: POST /api/users answers 201 with {"user":{"email","token","username","bio","image"}}.
// API.md: passwords need at least 8 characters.
async function signUp(request: APIRequestContext) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `api-tester-${id}`;
  const response = await request.post('/api/users', {
    data: {
      user: {
        username,
        email: `api-tester-${id}@example.com`,
        password: 'password123',
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

const newArticle = {
  title: 'API test article',
  description: 'A short description',
  body: 'The article body text',
  tagList: ['testing', 'api'],
};

// Creates an article and returns its slug.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: newArticle },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article.slug as string;
}

// ---------- Positive tests ----------

test('create an article returns 201 and the new article', async ({ request }) => {
  const { username, token } = await signUp(request);

  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: newArticle },
  });

  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.article.title).toBe(newArticle.title);
  expect(json.article.description).toBe(newArticle.description);
  expect(json.article.body).toBe(newArticle.body);
  // API.md: tags keep the order you sent them in.
  expect(json.article.tagList).toEqual(newArticle.tagList);
  expect(typeof json.article.slug).toBe('string');
  expect(json.article.slug).not.toBe('');
  // ASSUMPTION: the author of a new article is the signed-in user.
  expect(json.article.author.username).toBe(username);
});

test('read an article by slug returns 200 and the article', async ({ request }) => {
  const { token } = await signUp(request);
  const slug = await createArticle(request, token);

  const response = await request.get(`/api/articles/${slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.slug).toBe(slug);
  expect(json.article.title).toBe(newArticle.title);
  expect(json.article.description).toBe(newArticle.description);
  expect(json.article.body).toBe(newArticle.body);
  expect(json.article.tagList).toEqual(newArticle.tagList);
});

test('update an article changes only the sent field', async ({ request }) => {
  // The app clears existing tags when only the body is updated.
  test.fail();
  const { token } = await signUp(request);
  const slug = await createArticle(request, token);

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(token),
    data: { article: { body: 'The new body text' } },
  });

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.body).toBe('The new body text');
  // API.md: a field you do not send stays as it was.
  expect(json.article.title).toBe(newArticle.title);
  expect(json.article.description).toBe(newArticle.description);
  expect(json.article.tagList).toEqual(newArticle.tagList);
  // Title did not change, so the slug should not change.
  expect(json.article.slug).toBe(slug);
});

test('delete an article returns 204 and the article is gone', async ({ request }) => {
  const { token } = await signUp(request);
  const slug = await createArticle(request, token);

  const response = await request.delete(`/api/articles/${slug}`, {
    headers: auth(token),
  });

  expect(response.status()).toBe(204);
  // API.md: 204, no body.
  expect(await response.text()).toBe('');

  const readAgain = await request.get(`/api/articles/${slug}`);
  expect(readAgain.status()).toBe(404);
  expect(await readAgain.json()).toEqual({ errors: { article: ['not found'] } });
});

// ---------- Negative tests ----------

test('create an article without a token returns 401', async ({ request }) => {
  const response = await request.post('/api/articles', {
    data: { article: newArticle },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('create an article with a wrong token returns 401', async ({ request }) => {
  const response = await request.post('/api/articles', {
    headers: auth('not-a-real-token'),
    data: { article: newArticle },
  });

  expect(response.status()).toBe(401);
  // API.md: this app says "is invalid" for a wrong token.
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
});

test('create an article without a title returns 422', async ({ request }) => {
  const { token } = await signUp(request);

  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: {
      article: { description: newArticle.description, body: newArticle.body },
    },
  });

  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });
});

test('read an article that does not exist returns 404', async ({ request }) => {
  const response = await request.get('/api/articles/this-slug-does-not-exist-12345');

  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ errors: { article: ['not found'] } });
});

test("update someone else's article returns 403 and changes nothing", async ({ request }) => {
  const author = await signUp(request);
  const other = await signUp(request);
  const slug = await createArticle(request, author.token);

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(other.token),
    data: { article: { body: 'Changed by someone else' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const readAgain = await request.get(`/api/articles/${slug}`);
  expect(readAgain.status()).toBe(200);
  expect((await readAgain.json()).article.body).toBe(newArticle.body);
});

test("delete someone else's article returns 403 and the article stays", async ({ request }) => {
  const author = await signUp(request);
  const other = await signUp(request);
  const slug = await createArticle(request, author.token);

  const response = await request.delete(`/api/articles/${slug}`, {
    headers: auth(other.token),
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const readAgain = await request.get(`/api/articles/${slug}`);
  expect(readAgain.status()).toBe(200);
  expect((await readAgain.json()).article.slug).toBe(slug);
});
