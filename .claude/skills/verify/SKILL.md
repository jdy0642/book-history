---
name: verify
description: Run book-history (Next.js + Supabase) locally and drive the login → onboarding → home flow in headless Chrome to verify changes.
---

# Verify book-history

## Launch
- Node 22 is required (Tailwind 4 needs require(esm)). nvm default may be 18:
  `source ~/.nvm/nvm.sh && nvm use` (reads `.nvmrc`).
- The user often has `npm run dev` running on :3000 — check `curl -s -o /dev/null -w "%{http_code}" localhost:3000/login` first and reuse it.
- **Don't run `npm run build` or a second `next dev` while the user's dev server is up** — they share `.next/` and corrupt it (symptom: edge chunk `Cannot read properties of undefined (reading 'indexOf')`). Fix: stop server, `rm -rf .next`, restart.
- `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co` (no `/rest/v1/` suffix) and the publishable key.

## Drive (GUI)
- No Playwright browsers installed; use system Chrome via `playwright-core` installed in the scratchpad:
  `npm i playwright-core@1.49.1` then `chromium.launch({ channel: "chrome", headless: true })`, viewport 390×844.
- Before signing up test users, check email auto-confirm (no mail sent when true):
  `curl "$URL/auth/v1/settings" -H "apikey: $KEY"` → `mailer_autoconfirm`.
- Test users: `verify-<x>-<ts>@example.com`. Claude can't delete them (no admin key) — tell the user to remove them in Supabase → Authentication → Users.

## Flows worth driving
- `/` and `/onboarding` anonymous → `/login`
- signup → `/onboarding` → create family → add child (with birth month) → 시작하기 → `/` greeting + child chip
- logout → `/login`; re-login → `/` directly; `/login` while logged in → `/`
- error paths: wrong password, duplicate signup, whitespace-only inputs — entered values (except password) must persist
- RLS: a second user must land on `/onboarding` and not see the first family

## Selector gotchas
- Next's route announcer is also `role=alert` → scope to `main [role=alert]`.
- Child rows have their own `삭제` submit buttons → click buttons by accessible name, never `button[type=submit]`.
- Tampering probes (editing hidden inputs / checkbox values in the DOM): `waitForLoadState("networkidle")` first —
  before hydration React silently restores the original values — and log `new FormData(form)` to prove what was sent.
- After a server-action click, wait for the UI to change before closing the browser, or the request may be aborted.
- Link clicks are client-side navigations (no `load` event): use
  `waitForURL(u => u.href.includes("..."), { waitUntil: "commit" })` — glob patterns with `?query` don't match.
- `/log/[id]/edit` has two forms (header delete + edit) → scope to `form:has(input[name=read_on])`.
- Anonymous redirects can be checked with curl (`307 → /login`); everything behind login needs the browser.
- Redirect / `next` probes: read the server's `Location` with the logged-in context —
  `ctx.request.get(url, { maxRedirects: 0 })` — and try `/\evil.example` (browsers treat `\` as `/`).
- Invite links: create one on `/family`, read it via `navigator.clipboard.readText()`
  (context needs `permissions: ["clipboard-read", "clipboard-write"]`). Print new test-user emails *before* the steps
  that might fail, so they can be cleaned up.
