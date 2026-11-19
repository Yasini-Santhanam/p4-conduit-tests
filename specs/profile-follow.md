# Profile page and follow author

## Application Overview

Plan for /profile/practice-author in the Conduit practice app. Checked on a fresh start: signed out, the profile shows heading "practice-author", bio "I write about testing and quality.", links "My Articles" and "Favorited Articles", and 7 articles, with NO follow button. Signed in as practice-reader, the page shows a button named "Unfollow practice-author", so practice-reader ALREADY follows practice-author on fresh data. Not checked: the name of the Follow button (I did not click anything, so I did not change data). ASSUMPTION: the button name is "Follow practice-author" after unfollowing. Home has links "Your Feed" and "Global Feed". Not seen: what Your Feed shows.

## Test Scenarios

### 1. Profile follow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Unfollow and follow practice-author keeps state after reload

**File:** `tests/profile-follow/follow-state.spec.ts`

**Steps:**
  1. Start on fresh data. Sign in at /login as practice-reader@example.com, password Practice123. Open /profile/practice-author.
    - expect: Button "Unfollow practice-author" is visible (seen on fresh data).
    - expect: Heading "practice-author" and the text "I write about testing and quality." are visible.
  2. Click button "Unfollow practice-author".
    - expect: A follow button for practice-author appears and "Unfollow practice-author" is gone. ASSUMPTION: new name is "Follow practice-author". Confirm the real name when you first run it.
  3. Reload the page.
    - expect: The follow button is still shown, and "Unfollow practice-author" is not visible. This proves the change was saved.
  4. Click the follow button, then reload the page.
    - expect: After the reload, button "Unfollow practice-author" is visible again.
  5. Check the API for the saved state: GET /api/profiles/practice-author with the reader's token (API.md, Profiles).
    - expect: Answer is 200 and profile.following is true, as API.md says.

#### 1.2. Follow changes the Your Feed list and signed-out visitors see no follow button

**File:** `tests/profile-follow/follow-visibility.spec.ts`

**Steps:**
  1. Without signing in, open /profile/practice-author.
    - expect: Heading "practice-author" is visible.
    - expect: No follow or unfollow button is visible (seen on the page).
  2. Sign in as practice-editor@example.com (Practice123) and open /profile/practice-author.
    - expect: A follow button for practice-author is visible. NOT CHECKED: practice-editor's start state. ASSUMPTION: not following, so the name is "Follow practice-author".
  3. Click that button, then reload the page.
    - expect: After the reload, button "Unfollow practice-author" is visible.
  4. Open / and click link "Your Feed".
    - expect: NOT CHECKED: what Your Feed shows. ASSUMPTION: it lists articles by practice-author, for example "Your first end-to-end test" (seen on the author's profile).
  5. Click "Unfollow practice-author" on the profile, then open "Your Feed" again.
    - expect: ASSUMPTION: "Your first end-to-end test" no longer appears in Your Feed.
