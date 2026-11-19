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
  const username = `follow-reader-${id}`;
  const email = `follow-reader-${id}@example.com`;
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
// The new user stops following practice-author, so no follow is left behind.
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
  test('Unfollow and follow practice-author keeps state after reload', async ({ page, request }) => {
    const unfollowButton = page.getByRole('button', { name: 'Unfollow practice-author', exact: true });
    const followButton = page.getByRole('button', { name: 'Follow practice-author', exact: true });

    // 0. Make a new reader through the API. It follows practice-author, like the old start state.
    const reader = await signUp(request);
    // API.md: POST /api/profiles/:username/follow answers 200 with a Profile.
    const follow = await request.post('http://127.0.0.1:3000/api/profiles/practice-author/follow', {
      headers: { Authorization: `Token ${reader.token}` },
    });
    expect(follow.status()).toBe(200);
    expect((await follow.json()).profile.following).toBe(true);

    // 1. Sign in as the new reader and open /profile/practice-author
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(reader.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(reader.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('link', { name: reader.username })).toBeVisible();
    await page.goto('http://127.0.0.1:3000/profile/practice-author');
    await expect(unfollowButton).toBeVisible();
    await expect(page.getByRole('heading', { name: 'practice-author', level: 1 })).toBeVisible();
    await expect(page.getByText('I write about testing and quality.')).toBeVisible();

    try {
      // 2. Click "Unfollow practice-author"
      await unfollowButton.click();
      await expect(followButton).toBeVisible();
      await expect(unfollowButton).toBeHidden();

      // 3. Reload the page
      await page.reload();
      await expect(followButton).toBeVisible();
      await expect(unfollowButton).toBeHidden();
    } finally {
      // 4. Click the follow button, then reload (also restores the start state)
      await expect(followButton.or(unfollowButton)).toBeVisible();
      if (await followButton.isVisible()) {
        await followButton.click();
        await expect(unfollowButton).toBeVisible();
      }
    }
    await page.reload();
    await expect(unfollowButton).toBeVisible();

    // 5. Check the API with the reader's token
    const loginResponse = await request.post('http://127.0.0.1:3000/api/users/login', {
      data: { user: { email: reader.email, password: reader.password } },
    });
    expect(loginResponse.status()).toBe(200);
    const { user } = await loginResponse.json();
    const profileResponse = await request.get('http://127.0.0.1:3000/api/profiles/practice-author', {
      headers: { Authorization: `Token ${user.token}` },
    });
    expect(profileResponse.status()).toBe(200);
    const { profile } = await profileResponse.json();
    expect(profile.following).toBe(true);
  });
});
