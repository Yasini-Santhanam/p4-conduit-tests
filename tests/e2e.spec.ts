import { test, expect, APIRequestContext, Page } from '@playwright/test';

// Source: P4/API.md for the API. P4/app/public/app.js only for labels and button names.

// Every user a test makes. test.afterEach uses this list to find and delete their data.
const createdUsers: { username: string; token: string }[] = [];

// Signs up a new user and returns the user's name and token.
// API.md: POST /api/users answers 201 with {"user":{"email","token","username","bio","image"}}.
// API.md: passwords need at least 8 characters.
async function signUp(request: APIRequestContext) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `e2e-tester-${id}`;
  const response = await request.post('/api/users', {
    data: {
      user: {
        username,
        email: `e2e-tester-${id}@example.com`,
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

// Gives the page the user's token before any page script runs.
// The page keeps the sign-in token in localStorage, key jwtToken (from the prompt).
async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('jwtToken', t);
  }, token);
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

test('a signed-in user publishes a new article in the editor', async ({ page, request }) => {
  const { username, token } = await signUp(request);
  await signInPage(page, token);

  const id = `${Date.now()}`;
  const article = {
    title: `E2E article ${id}`,
    description: 'An article made in the editor',
    body: 'The article body written in the editor',
    tagList: ['e2e', 'testing'],
  };

  await page.goto('/editor');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New Article');

  await page.getByLabel('Title', { exact: true }).fill(article.title);
  await page.getByLabel("What's this article about?", { exact: true }).fill(article.description);
  await page.getByLabel('Write your article', { exact: true }).fill(article.body);
  // app.js: the hint says "Separate tags with commas."
  await page.getByLabel('Tags', { exact: true }).fill(article.tagList.join(', '));
  await page.getByRole('button', { name: 'Publish Article' }).click();

  // ASSUMPTION: after publishing, the page shows the article with its title as the main heading.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title);

  // API.md: GET /api/articles?author=<username> lists only this user's articles.
  // The user is new, so exactly one article must be saved.
  const list = await request.get(`/api/articles?author=${encodeURIComponent(username)}`);
  expect(list.status()).toBe(200);
  const listJson = await list.json();
  expect(listJson.articlesCount).toBe(1);
  const slug = listJson.articles[0].slug as string;

  // API.md: the list has no body, so read the full article by its slug.
  const saved = await request.get(`/api/articles/${encodeURIComponent(slug)}`);
  expect(saved.status()).toBe(200);
  const savedJson = await saved.json();
  expect(savedJson.article.title).toBe(article.title);
  expect(savedJson.article.description).toBe(article.description);
  expect(savedJson.article.body).toBe(article.body);
  // API.md: tags keep the order you sent them in.
  expect(savedJson.article.tagList).toEqual(article.tagList);
  // ASSUMPTION: the author of a new article is the signed-in user.
  expect(savedJson.article.author.username).toBe(username);
});

test('a signed-in user posts a comment on an article', async ({ page, request }) => {
  // The article is made by one user with the API. Another user comments in the page.
  const author = await signUp(request);
  const commenter = await signUp(request);

  const articleTitle = `E2E comment article ${Date.now()}`;
  const created = await request.post('/api/articles', {
    headers: auth(author.token),
    data: {
      article: {
        title: articleTitle,
        description: 'An article to comment on',
        body: 'The article body',
      },
    },
  });
  expect(created.status()).toBe(201);
  const slug = (await created.json()).article.slug as string;

  await signInPage(page, commenter.token);
  const commentBody = `E2E comment ${Date.now()}`;

  // ASSUMPTION: the article page is at /article/<slug>.
  await page.goto(`/article/${encodeURIComponent(slug)}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(articleTitle);

  await page.getByLabel('Write a comment', { exact: true }).fill(commentBody);
  await page.getByRole('button', { name: 'Post Comment' }).click();

  // ASSUMPTION: after posting, the page shows the new comment and an empty comment box.
  await expect(page.getByText(commentBody, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Write a comment', { exact: true })).toHaveValue('');

  // API.md: GET /api/articles/:slug/comments answers 200 with {"comments":[...]}.
  // The article is new, so exactly one comment must be saved.
  const comments = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(comments.status()).toBe(200);
  const commentsJson = await comments.json();
  expect(commentsJson.comments).toHaveLength(1);
  expect(commentsJson.comments[0].body).toBe(commentBody);
  expect(commentsJson.comments[0].author.username).toBe(commenter.username);
});
