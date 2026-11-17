# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-17

## 1. My first look
How I would check that an article answer has the right shape: I would check whether the API response contains all the required fields and whether each field has the correct data type. This ensures the response structure stays the same even after a new app update.

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):** Missing bio: Fails · New password field: Fails · Token is a number: Passes

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. For every schema test, check that all required fields are present and each field has the correct data type.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape"
- **Claude said:** "the answer is 200, and the article has all 10 fields with the right types. This includes `author` with its 4 Profile fields, and every tag in `tagList` must be text."
- **My answer:** No, it will still pass. toMatchObject checks only the fields listed in the test. It does not fail if an extra field, like password, is added.

## 6. My change
- **What I asked Claude:** "In @P4/tests/contract.spec.ts, the article shape test allows extra fields. Add a check to ensure the article has exactly the keys defined in API.md. Do not run the tests."
- **The run after it:** 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** The "GET /api/articles/:slug answers with the Article shape" test will fail because F2 removes one field from the article response, and the exact key list check will detect the missing field
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 3 passed, 2 failed ("GET /api/articles/:slug answers with the Article shape" and "PUT someone else's article returns 403 and changes nothing")
- **What Playwright showed:** the article test: `-     "body": Any<String>,` (Expected - 1, Received + 0). The PUT test: Expected: "The article body text", Received: undefined
- **My answer about a red test:** It failed because F2 removed the body field from the article response. The test expected the article body text, but received undefined instead.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
