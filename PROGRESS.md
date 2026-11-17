# Playbooks redesign: progress

## Goal
A personal library of steps and prompts, opened from disk (`website/index.html`). No deploy.
1. Long prompts must not blow up step height (main issue).
2. New light theme: grey page, white cards.
3. Agree everything in mockups first: https://claude.ai/artifact/3J2ZMtkYHMWZYxaukZ9DoZ
4. Full refactor + cleanup (dead links, fake contact form, `--space-7`, design file extension, structure).

## Status: implemented and verified (see Verification)

### Decisions (from the mockup rounds, 2026-11-17)
- Compact cards. Each step is one row with Copy on it, expands on demand, and the prompt box is capped at 240px and scrolls.
- A step = `{ title, note, actions[], prompt, links[] }`, all optional, any mix.
- Not a task list: no done checkboxes, progress bar or focus mode. **Add step** sits in the collection header.
- Add/edit in a modal. Step ⋮ menu: Edit, Duplicate, Move up/down, Delete (with Undo).
- Look (user's picks): Cards + Shadow, Graphite, Darker grey, Dark prompt box, Round corners, Geist + Inter,
  Blue highlight, White top bar and sidebar. Every option can be changed in-app via ⋮ → Appearance.
- Marketing homepage removed. Playbooks is `index.html`, and `guide.html` redirects to it.
- Edits save immediately (the old draft + Save/Discard bar is gone) with Undo for deletes and imports.
- Repo reorganised: `website/` app · `design/` Pencil file + references · `notes/` · `docs/` spec · `tests/` e2e.
- `design_system_for_my_website` → `design/design_system_for_my_website.pen`. It replaced an empty
  800×600-frame `.pen`, which is still recoverable from commit `59c84b0`.

### Verification
`tests/e2e.js` (Playwright over file://): 48/48 checks pass. It covers first run, v1 migration (old key kept),
long-prompt sizing, copy, add/edit/validate/unsaved guard, duplicate/move/delete/undo + persistence,
search, collections, appearance persistence + reset, export/import + bad file, HTML escaping,
390px width with no horizontal scroll, guide.html redirect, and no console errors.
Screenshots reviewed at desktop and mobile.

### Known limits
- Data lives in this browser's localStorage. Clearing site data erases it, so export a backup now and then.
- Fonts come from Google Fonts. Offline, the system font stack is used.
- Tested in Chromium. Firefox treats each `file://` page as its own origin, which is untested.
