import { test, expect, APIRequestContext } from '@playwright/test';

// Source: P4/API.md only. These are API tests: no page is opened.

// Every user a test makes. test.afterEach uses this list to find and delete their data.
const createdUsers: { username: string; token: string }[] = [];

// Signs up a new user and returns the user's name and token.
// API.md: POST /api/users answers 201 with {"user":{"email","token","username","bio","image"}}.
// API.md: passwords need at least 8 characters.
async function signUp(request: APIRequestContext) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `comment-tester-${id}`;
  const response = await request.post('/api/users', {
    data: {
      user: {
        username,
        email: `comment-tester-${id}@example.com`,
        password: 'password123',
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  const user = { username, token: json.user.token as string };
  createdUsers.push(user);
  return user;
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

// Makes a new article for the author and returns its slug.
// API.md: POST /api/articles answers 201 with an Article. title, description and body are required.
async function createArticle(request: APIRequestContext, token: string) {
  const created = await request.post('/api/articles', {
    headers: auth(token),
    data: {
      article: {
        title: `Comment API article ${Date.now()}`,
        description: 'An article to comment on',
        body: 'The article body',
      },
    },
  });
  expect(created.status()).toBe(201);
  return (await created.json()).article.slug as string;
}

// Cleanup. Playwright runs afterEach after every test, also when the test fails.
// It finds the data through the API, so it works even if a test stops halfway.
// Users are not deleted: API.md has no request to delete a user (NOT IN THE MATERIAL).
test.afterEach(async ({ request }) => {
  const problems: string[] = [];
  try {
    const tokenOf = new Map(createdUsers.map((u) => [u.username, u.token]));

    // 1. Find the articles written by this test's users.
    // API.md: GET /api/articles?author=<username> answers 200 with {"articles":[...]}.
    const articles: { slug: string; token: string }[] = [];
    for (const user of createdUsers) {
      const list = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}`);
      if (list.status() !== 200) {
        problems.push(`list articles of ${user.username}: status ${list.status()}`);
        continue;
      }
      for (const a of (await list.json()).articles) articles.push({ slug: a.slug, token: user.token });
    }

    // 2. Delete the comments this test's users wrote on those articles.
    // API.md: DELETE /api/articles/:slug/comments/:id, comment author only, answers 204.
    // API.md does not say if deleting an article also deletes its comments, so delete them first.
    for (const article of articles) {
      const slug = encodeURIComponent(article.slug);
      const list = await request.get(`/api/articles/${slug}/comments`);
      if (list.status() !== 200) {
        problems.push(`list comments of ${article.slug}: status ${list.status()}`);
        continue;
      }
      for (const c of (await list.json()).comments) {
        const token = tokenOf.get(c.author.username);
        if (!token) continue;
        const del = await request.delete(`/api/articles/${slug}/comments/${c.id}`, { headers: auth(token) });
        if (del.status() !== 204) problems.push(`delete comment ${c.id}: status ${del.status()}`);
      }
    }

    // 3. Delete the articles.
    // API.md: DELETE /api/articles/:slug, author only, answers 204.
    for (const article of articles) {
      const del = await request.delete(`/api/articles/${encodeURIComponent(article.slug)}`, {
        headers: auth(article.token),
      });
      if (del.status() !== 204) problems.push(`delete article ${article.slug}: status ${del.status()}`);
    }
  } finally {
    // Start the next test with an empty list.
    createdUsers.length = 0;
  }
  // Show every cleanup problem at the end, after all deletes were tried.
  expect(problems, 'cleanup problems').toEqual([]);
});

test('a signed-in user posts a comment through the API', async ({ request }) => {
  const author = await signUp(request);
  const commenter = await signUp(request);
  const slug = await createArticle(request, author.token);
  const commentBody = `API comment ${Date.now()}`;

  // API.md: POST /api/articles/:slug/comments needs a token and answers 201 with {"comment":{...}}.
  const response = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
    headers: auth(commenter.token),
    data: { comment: { body: commentBody } },
  });
  expect(response.status()).toBe(201);

  // API.md: Comment is {"id","createdAt","updatedAt","body","author"}. author is a Profile.
  const { comment } = await response.json();
  expect(comment.id).toBeDefined();
  expect(typeof comment.createdAt).toBe('string');
  expect(typeof comment.updatedAt).toBe('string');
  expect(comment.body).toBe(commentBody);
  // ASSUMPTION: the author of a new comment is the signed-in user.
  expect(comment.author.username).toBe(commenter.username);
});

test('a saved comment appears when the article comments are fetched again', async ({ request }) => {
  const author = await signUp(request);
  const commenter = await signUp(request);
  const slug = await createArticle(request, author.token);
  const commentBody = `Saved API comment ${Date.now()}`;

  const posted = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
    headers: auth(commenter.token),
    data: { comment: { body: commentBody } },
  });
  expect(posted.status()).toBe(201);
  const postedComment = (await posted.json()).comment;

  // API.md: an Article has no comments field, so fetch the article's comments again.
  // API.md: GET /api/articles/:slug/comments, token optional, answers 200 with {"comments":[...]}.
  const fetched = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(fetched.status()).toBe(200);
  const { comments } = await fetched.json();

  // The article is new, so exactly one comment must be saved.
  expect(comments).toHaveLength(1);
  expect(comments[0].id).toBe(postedComment.id);
  expect(comments[0].body).toBe(commentBody);
  expect(comments[0].author.username).toBe(commenter.username);
});
