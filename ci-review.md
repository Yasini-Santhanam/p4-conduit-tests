# My CI workflow and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 2026-11-20

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** v24.22.1
- **My whole suite on my laptop:** `npx playwright test` → 23 passed, 0 failed
- **What the GitHub computer needs (my words):**
  - Node.js: Node.js v24.22.1, because that's the version used to run and pass all 23 tests on my laptop.
  - Packages: npm ci – it installs the exact package versions from package-lock.json.
  - Browser: Chromium only (from the example)

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. Use Node.js v24.22.1, run npm ci to install the exact dependencies, and install only Chromium.
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** my own rule gave Claude the version, so my file had `node-version: 24.22.1` (lines 13-16). In another run with no Node.js rule, Claude wrote `node-version: 22` (line 16).
- **Claude said:** (in that other run) "ASSUMPTION: `node-version: 22` gets the newest Node 22, which is 22.13 or later. You could use 24 instead. Nothing in the material asks for a specific version."
- **My project needs:** Node.js v24.22.1, because that's the version used to run and pass all 23 tests on my laptop.
- **My answer to the developer:** No. Our 23 tests passed on Node.js 24.22.1, so we must use that exact version in GitHub Actions to match our tested environment.
- **My line to Claude:** In @P4/.github/workflows/playwright.yml, add a comment above the node-version line explaining that Node.js 24.22.1 is used because all 23 Playwright tests passed on this version on my laptop. Change nothing else. Do not run anything.

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 3-17):** The workflow runs whenever code is pushed. It creates a fresh Ubuntu computer, copies the repository code, and sets up Node.js 24.22.1 to run the tests
- **Packages, browser, tests and the report (lines 18-33):** npm ci – Installs dependencies. npx playwright install --with-deps chromium – Installs Chromium. npx playwright test – Runs the tests. actions/upload-artifact@v6 – Saves the HTML report, even if tests fail.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** … · **Tests:** …
- **The report (artifact):** …

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** …
- **What GitHub showed:** …

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** …

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- "…": **kept / changed / removed**, because …

### Tuesday: `tests/contract.spec.ts`
- "…": **kept / changed / removed**, because …
