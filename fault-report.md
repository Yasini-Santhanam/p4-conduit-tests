# My practice fault report (week 4, project P4)

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-19
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** Even though all 18 tests are passing, that doesn't guarantee our test suite catches real problems. I would need to check how many bugs the tests can detect.

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** `api.spec.ts`, `contract.spec.ts`, `e2e.spec.ts`, `example.spec.ts`, `profile-follow/follow-state.spec.ts`, `profile-follow/follow-visibility.spec.ts`, `seed.spec.ts`
- **No fault:** 21 passed, 0 failed
- **F1:** caught (9 tests failed)
- **F2:** caught (5 tests failed)
- **F3:** caught (4 tests failed)
- **F4:** caught (1 test failed: e2e.spec.ts › a signed-in user posts a comment on an article)
- **F5:** stayed green (0 tests failed)
- **F6:** caught (1 test failed: e2e.spec.ts › a signed-in user posts a comment on an article)

## 3. The weak spot I chose, and why
F4 is the weakest. Only one test catches the empty comments list. A good suite should catch this issue with additional tests.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Only one test checks comments. Add 2 API tests in P4/tests/comments.spec.ts: one to verify that a signed-in user can post a comment successfully, and another to verify that the saved comment appears when fetching the article again.
- **New or changed test file:** `tests/comments.spec.ts` (new); `tests/profile-follow/follow-state.spec.ts` and `tests/profile-follow/follow-visibility.spec.ts` (changed)

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4`
- **No fault:** 23 passed, 0 failed
- **The fault I chose:** F4 caught (2 tests failed: comments.spec.ts › a saved comment appears when the article comments are fetched again; e2e.spec.ts › a signed-in user posts a comment on an article)

## 6. What changed
The test suite improved from 21 to 23 passing tests. We added two tests, and now F4 is caught by two tests instead of one. This gives us better coverage of the comments functionality and helps us detect issues more reliably
