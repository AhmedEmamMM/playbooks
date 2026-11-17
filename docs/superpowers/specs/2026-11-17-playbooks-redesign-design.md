# Playbooks redesign: design spec

Approved through clickable mockups (https://claude.ai/artifact/3J2ZMtkYHMWZYxaukZ9DoZ, round 6) on 2026-11-17.

## Purpose
A personal library of steps and prompts, opened from disk (`file:///…/website/index.html`). It isn't a task
tracker. You open and close steps whenever you want. No server, no build, no deploy.

## Problems this fixes
- A long prompt made its step card as tall as the whole prompt, so reaching the next step meant a lot of scrolling.
- The dark theme wasn't liked. The new theme is a light grey page with white cards.
- Marketing homepage, dead links and a contact form that didn't send.

## Data model (localStorage `playbooks.v2`)
```
collection { id, name, icon, desc, steps[] }
step       { id, title, note, actions[string], prompt, links[{title,url}] }
```
- All step parts are optional. A step can mix actions, a prompt and links.
- Action text: `` `x` `` becomes a click-to-copy chip; `[label](url)` and bare `http(s)://` URLs become links.
- Migration on first load: v1 (`visionare.playbooks.v1`, with `explanation` becoming `note` and `done` dropped) is read, and
  very old guide keys go through the old phase migration. The old keys are never deleted, so they serve as the backup.
- UI state is kept separately: active collection (`playbooks.ui`) and appearance (`playbooks.appearance`).

## Screen
- Top bar: brand, search (`/` focuses it, Esc clears it), ⋮ menu (Appearance, Export, Import), New collection.
- Sidebar of collections with step counts. Header: icon, name, edit pencil, **Add step** (primary), description,
  and the step count.
- Steps are cards. The collapsed row shows number, title, a one-line preview, content tags (actions, prompt lines,
  links), an open-link button (first link), **Copy** (when there's a prompt), ⋮ (Edit, Duplicate, Move up/down,
  Delete) and a chevron.
- When a card is expanded: note, numbered actions, a dark prompt box with a fixed height (240px, scrolls inside,
  plus "Show full height"), link pills, and Edit step.
- Search: matching steps across all collections, grouped by collection, with the same cards.

## Modals
- Step: title, note, optional sections added with + Actions / + Prompt / + Links. Actions can be reordered
  and removed, and Enter adds the next action. Ctrl+Enter saves, Esc cancels. Edit mode has a delete that needs a
  second click.
- Collection: name, description, icon picker, delete (second click).
- Appearance: every option from the mockup, applied live and saved.

## Appearance defaults (user's choices)
List style Cards · Palette Graphite · Background Darker grey · Prompt box Dark · Top bar White ·
Sidebar White · Card style Shadow · Corners Round · Font Geist + Inter · Highlight Blue ·
Step numbers Circle · Preview line Show · Page width Full.

## Safety
- Every change saves right away. Deleting a step or a collection shows an Undo toast.
- If saving fails (storage full or blocked), an error toast says so. Nothing fails silently.
- All user text is escaped, and links only open `http(s)` URLs.

## Code layout (classic scripts with a `PB` namespace, because ES modules don't load over `file://`)
`css/theme.css` · `css/base.css` · `css/app.css`
`js/icons.js` · `util.js` · `store.js` · `appearance.js` · `modal.js` · `step-modal.js` ·
`collection-modal.js` · `view.js` · `backup.js` · `app.js`

## Cleanup
- Remove the marketing homepage, `styles.css`, `components.css`, `guide.css`, `tokens.css`, `main.js` and `guide.js`.
- `guide.html` becomes a redirect to `index.html` so old bookmarks keep working.
- Rename `design_system_for_my_website` to `.pen`. It replaces the empty 800×600 frame, which is still in git history.
- The missing `--space-7` goes away with the rewrite, because the spacing scale is defined in full in theme.css.

## Verification
Playwright against `file://`: load with seeded v1 data and confirm the migration; add, edit, duplicate, move and delete with
undo; copy a prompt and a chip; search; Appearance changes persist across a reload; export/import round trip;
no console errors; screenshots at desktop and mobile widths.
