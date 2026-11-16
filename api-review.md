# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- it was used request method as POST and status code is 201

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201 – Comment created successfully. Response contains a comment object. The app answered 201, with the comment "Clear and useful.", id 5, author practice-reader.
- **B** (the same comment, with no token): I predicted 401 – Token is missing. The app answered 401, `{"errors":{"token":["is missing"]}}`.
- **C** (a comment on an article that does not exist): I predicted 404 – Article not found. The app answered 404, `{"errors":{"article":["not found"]}}`.

The answer that surprised me most: The 401 response surprised me the most because the app checks whether the authentication token is present before allowing the request. Since the token was missing, the app rejected the request and returned a 401 status with the message "token is missing".

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check both the response status and response body, not just the status.
```

## 4. The run
- **Result:** 10 tests: 9 passed, 1 failed.
- **A red test, and who is wrong** (only if a test failed):
  - Test: "update an article changes only the sent field"
  - Expected: `["testing", "api"]` · Received: `[]`
  - API.md says: "Updating: every field is optional. A field you do not send stays as it was."
  - My answer: The app is wrong. API.md says fields not sent during an update must keep their existing values, so the tags should not become empty. Keep the test.
- **My note** (only if I kept a red test with `test.fail()`): The app clears existing tags when only the body is updated.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "create an article without a title returns 422"
- **My answer:** No. A 422 response shows the request was rejected, but we should also verify that no article was created.

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "create an article returns 201 and the new article"
- **My decision:** Change. Remove the author username check because it is an assumption, not confirmed by API.md. Keep the other checks

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. Check both the response status and body against API.md.
2. After a request, use GET to verify the actual saved data.
3. Do not add assumptions; write tests based only on API.md.
