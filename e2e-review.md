# My end-to-end tests and review (week 4, project P4)

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-18

## 1. My first look
- **After I published an article by hand, I would check:** I would check whether the article is successfully published and appears in the Global Feed with the correct title, description, and content. Also, ensure no errors occur during the journey
- **Where the page keeps my sign-in:** jwtToken

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No. Line 19 only checks whether the article heading is visible. But it does not confirm that the article was successfully liked or that the favorite count increased.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. Verify through the API that the article and comment are saved correctly
```

## 4. The run
- **Claude's 2 tests:** 2 passed, 0 failed.

## 5. The teammate's question
- **Claude said:** "7. Yes. Each test makes its own users and its own data."
- **My answer:** No. The tests create new users, articles, and comments, but they don't delete them after running. The test data remains in the app.

## 6. What I saw on the home page
- E2E comment article 1795005370923

## 7. My change
- **My line to Claude:** In P4/tests/e2e.spec.ts, add test.afterEach to delete the users, articles, and comments created by the tests. Make sure cleanup runs even if a test fails. Do not run the tests.
- **The clean-up Claude added:** test.afterEach deletes the comments and articles each test made. Users are not deleted: API.md has no request to delete a user.

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 passed, 0 failed
- **The newest article on the home page after the run:** Your first end-to-end test
