# Tests from Playwright's agents, and my review (week 4, project P4)

App: Conduit practice app on my laptop · Date: 2026-11-19

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `.claude/agents/playwright-test-generator.md`, `.claude/agents/playwright-test-healer.md`, `.mcp.json`, `specs/README.md`, `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  - Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  - Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  - Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. Each test must verify the actual result on the page, not just that a button was clicked or a success message appeared.
- **The plan the planner saved:** `specs/profile-follow.md`
- **The test files the generator wrote:** `tests/profile-follow/follow-state.spec.ts`, `tests/profile-follow/follow-visibility.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "Claude says the test follows practice-author again if a check fails. So we can keep this test in our suite as it is, right?"
- **My answer:** The test checks follow-state persistence, but cleanup may fail and leave the author in the wrong state. It changes the practice-reader's account, because the test signs in as practice-reader before clicking Unfollow.
- "Unfollow and follow practice-author keeps state after reload" (`follow-state.spec.ts`) · **changed**, because the test is useful, but it should create its own user instead of modifying the shared practice-reader account.
- "Follow changes the Your Feed list and signed-out visitors see no follow button" (`follow-visibility.spec.ts`) · **changed**, because the test checks useful follow and feed behavior, but it modifies the shared practice-editor account. It should create its own user through the API

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In @P4/tests/profile-follow/follow-state.spec.ts: The test is useful, but it should create its own user instead of modifying the shared practice-reader account. In @P4/tests/profile-follow/follow-visibility.spec.ts: The test checks useful follow and feed behavior, but it modifies the shared practice-editor account. It should create its own user through the API
- **Result:** No fault: 23 passed, 0 failed (my second fault run)
