# Visionare — Website

A static, fully responsive multi-page site built on the Visionare design system
(tokens mirrored from `../design_system_for_my_website.pen`).

## Pages
- **Homepage** — `index.html` — hero, features grid, testimonials, blog cards, contact form, footer.
- **Playbooks** — `guide.html` — save what you learned as **collections** of step **playbooks**, each step with an explanation + a one-click copyable prompt.

## Structure
```
website/
├── index.html          # Homepage
├── guide.html          # Playbooks page (collections + steps)
├── css/
│   ├── tokens.css      # Design tokens (color, type, spacing, radius) — dark + light
│   ├── base.css        # Reset, document defaults, layout helpers
│   ├── styles.css      # Shared shell: header/nav, hero, buttons, footer
│   ├── components.css  # Homepage sections: features, testimonials, blog, contact
│   └── guide.css       # Playbooks: collections sidebar, step cards, add form, focus mode
├── js/
│   ├── icons.js        # Local inline SVG icons (Lucide paths)
│   ├── main.js         # Shared: mobile nav, dark/light theme toggle, icon render
│   └── guide.js        # Playbooks engine: collections + steps, copy-only-prompt, focus mode
├── assets/
│   ├── images/
│   └── icons/
└── README.md
```

## Playbooks (guide.html)
A personal library of how-tos. Browse **collections** in the sidebar (or **search**); each
collection is a **playbook** of steps.

- **Step model** — every step has a *title*, an *explanation* (the part you read), a
  **prompt** (the part you copy), optional *links*, and a *done* state. **Copy prompt**
  copies **only the prompt**, never the explanation.
- **Add step** — the form captures title → explanation → prompt → optional link.
- **Collections** — add via "New collection"; rename/describe inline; delete from its header.
- **Focus / Do mode** — "Do it" opens a one-step-at-a-time view with a checklist rail and
  Previous / Mark done & next.
- **Search** — filters collections by name or step content.
- **Save / Discard** — edits are a draft; a bar appears when there are unsaved changes.
  **Save** persists to `localStorage` (also `Ctrl/Cmd+S`); **Discard** reverts. You're warned
  before leaving with unsaved changes.
- **Backup & portability** (toolbar "⋮" menu):
  - **Import old phases** — pulls any earlier Guide data (`visionare.guide.v2` /
    `visionare.guide.phases.v1`) into Collections. Auto-hidden if none exists; also runs
    automatically the first time if there's no Playbooks data yet.
  - **Export playbooks (.json)** — downloads everything as a JSON file.
  - **Import playbooks (.json)** — loads a JSON export (so you're not locked to one browser).

Reset to the seeded demo by clearing the `visionare.playbooks.v1` localStorage key.

## Theming
Dark is the default. The "Toggle theme" button (footer) switches to light
(`data-theme="light"` on `<html>`) and remembers your choice.

## Images & icons
- Placeholder photography from **Unsplash** (blog covers, avatars).
- Icons are **local inline SVGs** (`js/icons.js`, Lucide paths) — no CDN, no flash; matches the Pencil component designs.

## Run it
No build step — plain HTML/CSS/JS. Serve locally:

```bash
cd website
npx serve .          # or:  python -m http.server 8000
```

## Next steps
- Swap the text-glyph logo for a real SVG in `assets/icons/`.
- Add pricing / about pages using the same shell and tokens.
