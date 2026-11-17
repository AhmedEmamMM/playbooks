# Playbooks

A personal library of steps and prompts. A step can hold any mix of:

- **Actions**: a numbered "do this" list. `` `text` `` becomes a click-to-copy chip, and `[label](site.com)` or a full `https://…` address becomes a link.
- **Prompt**: text to paste into an AI tool. The **Copy** button copies exactly this text.
- **Links**: websites to open.

Steps stay one row high until you open them. Long prompts sit in a fixed-height box that scrolls inside the card.

## Open it

Double-click `index.html`, or open `file:///…/website/index.html` in Chrome or Edge. There's nothing to install and no server.
The old address `guide.html` redirects here.

## Use it

| Do this | How |
|---|---|
| Add a step | **Add step** (top right of a collection) |
| Copy a prompt | **Copy** on the row, no need to open the step |
| Edit, duplicate, reorder, delete | the **⋮** button on a step |
| Rename or change the icon of a collection | the pencil next to its name |
| Search everything | press **/** and type, then **Esc** to clear |
| Change colors, layout, corners, font… | **⋮** in the top bar → **Appearance** |
| Back up or move to another PC | **⋮** → **Export backup** / **Import backup** |

In a dialog, **Ctrl+Enter** saves and **Esc** closes. Deleting anything shows an **Undo** button.

## Where your data lives

Everything is saved in this browser's local storage (key `playbooks.v2`) as soon as you change it.
It stays on this machine and in this browser only. Export a backup now and then, because clearing browser data erases it.
On first start, older data from earlier versions (`visionare.playbooks.v1`) is converted automatically and the old copy is left untouched.

## Code map

```
index.html            page shell (top bar, app root, script order)
css/theme.css         ALL colors, fonts, radii, spacing + palette/appearance variants
css/base.css          reset
css/app.css           layout and components, then layout options ([data-var], [data-card], …)
js/appearance.js      appearance options + panel (loaded in <head> so the look applies before paint)
js/icons.js           inline Lucide icons, PB.icon(name)
js/util.js            escaping, safe links, clipboard, toast, `chip` / [link](url) rendering
js/defaults.js        sample collections for the very first run
js/store.js           data model, saving, migration, undo, import/export parsing
js/modal.js           reusable dialog (focus trap, Esc, unsaved-changes hook)
js/step-modal.js      add / edit a step
js/collection-modal.js add / edit / delete a collection
js/backup.js          export / import files
js/view.js            renders sidebar, header, step cards, search results; handles their clicks
js/app.js             start-up, top bar, search, shortcuts
```

Plain scripts with a shared `window.PB` namespace are used instead of ES modules, because browsers block modules over `file://`.

**Add a palette:** copy a `[data-pal="…"]` block in `theme.css`, then add it to `PALETTES` in `appearance.js`.
**Add a collection icon:** add its Lucide SVG to `P` in `icons.js` and its name to `COLLECTION_ICONS`.
