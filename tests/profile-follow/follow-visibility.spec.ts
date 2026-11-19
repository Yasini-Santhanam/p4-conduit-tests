// spec: specs/profile-follow.md
// seed: tests/seed.spec.ts
import { test, expect, APIRequestContext } from '@playwright/test';

// Every user this test makes. test.afterEach uses this list to undo the follow.
const createdUsers: { username: string; token: string }[] = [];

// Signs up a new user and returns the user's name, email, password and token.
// API.md: POST /api/users answers 201 with {"user":{"email","token","username","bio","image"}}.
// API.md: passwords need at least 8 characters.
async function signUp(request: APIRequestContext) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `follow-editor-${id}`;
  const email = `follow-editor-${id}@example.com`;
  const password = 'password123';
  const response = await request.post('http://127.0.0.1:3000/api/users', {
    data: { user: { username, email, password } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  const user = { username, email, password, token: json.user.token as string };
  createdUsers.push({ username, token: user.token });
  return user;
}

// Cleanup. Playwright runs afterEach after every test, also when the test fails.
// If the test stops halfway, the new user may still follow practice-author: undo it.
// Users are not deleted: API.md has no request to delete a user (NOT IN THE MATERIAL).
test.afterEach(async ({ request }) => {
  const problems: string[] = [];
  try {
    for (const user of createdUsers) {
      const headers = { Authorization: `Token ${user.token}` };
      // API.md: GET /api/profiles/:username answers 200 with "following".
      const profile = await request.get('http://127.0.0.1:3000/api/profiles/practice-author', { headers });
      if (profile.status() !== 200) {
        problems.push(`get profile for ${user.username}: status ${profile.status()}`);
        continue;
      }
      if ((await profile.json()).profile.following) {
        // API.md: DELETE /api/profiles/:username/follow answers 200.
        const del = await request.delete('http://127.0.0.1:3000/api/profiles/practice-author/follow', { headers });
        if (del.status() !== 200) problems.push(`unfollow for ${user.username}: status ${del.status()}`);
      }
    }
  } finally {
    createdUsers.length = 0;
  }
  expect(problems, 'cleanup problems').toEqual([]);
});

test.describe('Profile follow', () => {
  test('Follow changes the Your Feed list and signed-out visitors see no follow button', async ({ page, request }) => {
    const followButton = page.getByRole('button', { name: 'Follow practice-author', exact: true });
    const unfollowButton = page.getByRole('button', { name: 'Unfollow practice-author', exact: true });
    const article = page.getByRole('heading', { name: 'Your first end-to-end test', level: 2 });

    // 0. Make a new user through the API. A new user follows nobody.
    const editor = await signUp(request);

    // 1. Without signing in, open /profile/practice-author.
    await page.goto('http://127.0.0.1:3000/profile/practice-author');
    await expect(page.getByRole('heading', { name: 'practice-author', level: 1 })).toBeVisible();
    await expect(followButton).toHaveCount(0);
    await expect(unfollowButton).toHaveCount(0);

    // 2. Sign in as the new user and open /profile/practice-author.
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(editor.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(editor.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('http://127.0.0.1:3000/');
    await page.goto('http://127.0.0.1:3000/profile/practice-author');
    await expect(followButton).toBeVisible();

    // 3. Click that button, then reload the page.
    await followButton.click();
    await page.reload();
    await expect(unfollowButton).toBeVisible();

    // 4. Open / and click link "Your Feed".
    await page.goto('http://127.0.0.1:3000/');
    await page.getByRole('link', { name: 'Your Feed' }).click();
    await expect(page).toHaveURL(/feed=yours/);
    await expect(article).toBeVisible();

    // 5. Click "Unfollow practice-author" on the profile, then open "Your Feed" again.
    await page.goto('http://127.0.0.1:3000/profile/practice-author');
    await unfollowButton.click();
    await expect(followButton).toBeVisible();
    await page.goto('http://127.0.0.1:3000/');
    await page.getByRole('link', { name: 'Your Feed' }).click();
    await expect(page).toHaveURL(/feed=yours/);
    await expect(page.getByText('No articles are here... yet.')).toBeVisible();
    await expect(article).toHaveCount(0);
  });
});
