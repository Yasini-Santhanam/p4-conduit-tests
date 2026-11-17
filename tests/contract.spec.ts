import { test, expect, APIRequestContext } from '@playwright/test';

// Source: P4/API.md only.

// Signs up a new user and returns the user's name, email and token.
// API.md: POST /api/users answers 201 with {"user":{"email","token","username","bio","image"}}.
// API.md: passwords need at least 8 characters.
async function signUp(request: APIRequestContext) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `contract-tester-${id}`;
  const email = `contract-tester-${id}@example.com`;
  const response = await request.post('/api/users', {
    data: { user: { username, email, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, email, token: json.user.token as string };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

const newArticle = {
  title: 'Contract test article',
  description: 'A short description',
  body: 'The article body text',
  tagList: ['testing', 'api'],
};

// Creates an article and returns its slug.
// API.md: POST /api/articles answers 201 with an Article.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: newArticle },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article.slug as string;
}

// ---------- Schema tests ----------

test('GET /api/articles/:slug answers with the Article shape', async ({ request }) => {
  const { token } = await signUp(request);
  const slug = await createArticle(request, token);

  const response = await request.get(`/api/articles/${slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  // API.md: Article is {"article":{"slug","title","description","body","tagList",
  // "createdAt","updatedAt","favorited","favoritesCount","author"}}.
  // API.md: author is a Profile {"username","bio","image","following"} without the wrapper.
  expect(json).toMatchObject({
    article: {
      slug: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      body: expect.any(String),
      tagList: expect.any(Array),
      // API.md: dates are ISO 8601 text.
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      favorited: expect.any(Boolean),
      favoritesCount: expect.any(Number),
      author: {
        username: expect.any(String),
        // API.md: a new user has bio and image set to null.
        bio: null,
        image: null,
        following: expect.any(Boolean),
      },
    },
  });
  // API.md: the article has exactly these keys, no more and no fewer.
  expect(Object.keys(json.article).sort()).toEqual(
    [
      'slug',
      'title',
      'description',
      'body',
      'tagList',
      'createdAt',
      'updatedAt',
      'favorited',
      'favoritesCount',
      'author',
    ].sort(),
  );
  // API.md: tagList is a list of text values.
  for (const tag of json.article.tagList) {
    expect(tag).toEqual(expect.any(String));
  }
});

test('GET /api/user answers with the User shape', async ({ request }) => {
  const { token } = await signUp(request);

  const response = await request.get('/api/user', { headers: auth(token) });

  expect(response.status()).toBe(200);
  const json = await response.json();
  // API.md: User is {"user":{"email","token","username","bio","image"}}.
  expect(json).toMatchObject({
    user: {
      email: expect.any(String),
      token: expect.any(String),
      username: expect.any(String),
      // API.md: a new user has bio and image set to null.
      bio: null,
      image: null,
    },
  });
});

// ---------- Auth tests ----------

test('GET /api/user without a token returns 401', async ({ request }) => {
  const response = await request.get('/api/user');

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('GET /api/user with a wrong token returns 401', async ({ request }) => {
  const response = await request.get('/api/user', { headers: auth('not-a-real-token') });

  expect(response.status()).toBe(401);
  // API.md: this app says "is invalid" for a wrong token.
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
});

test("PUT someone else's article returns 403 and changes nothing", async ({ request }) => {
  const author = await signUp(request);
  const other = await signUp(request);
  const slug = await createArticle(request, author.token);

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(other.token),
    data: { article: { title: 'Changed by someone else', body: 'Changed body' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  // Read the article again: the saved data did not change.
  const readAgain = await request.get(`/api/articles/${slug}`);
  expect(readAgain.status()).toBe(200);
  const json = await readAgain.json();
  expect(json.article.slug).toBe(slug);
  expect(json.article.title).toBe(newArticle.title);
  expect(json.article.body).toBe(newArticle.body);
});
