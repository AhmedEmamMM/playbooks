/* guide.js — Playbooks (Concept A + C, with B as focus mode)
   MODEL:  collection { id, name, icon, desc, tags[], steps[] }
           step       { id, title, explanation, prompt, links[{title,url}], done }
   - Browse collections in the sidebar (search to find fast).
   - Each step: read the explanation, COPY only the prompt; links open in a new tab.
   - "Do it" opens focus mode (one step at a time + checklist).
   - Edits are a draft; the Save/Discard bar persists or reverts.
*/
(function () {
  "use strict";

  var KEY = "visionare.playbooks.v1";

  var DEFAULTS = [
    { name: "Deployment", icon: "rocket", desc: "Everything I learned about shipping apps to production — grouped so I can grab the right prompt fast.", tags: ["Next.js", "Vercel"], steps: [
      { title: "Create the project", explanation: "Spin up a fresh Next.js app with the App Router and TypeScript so you start from a clean, working baseline.", prompt: "npx create-next-app@latest my-app --ts --app --tailwind", links: [], done: true },
      { title: "Configure environment", explanation: "Add the keys your app needs locally and on the host so nothing is hard-coded or leaks into git.", prompt: "Create .env.local with NEXT_PUBLIC_API_URL and DATABASE_URL, then add the same variables in Vercel → Settings → Environment Variables.", links: [{ title: "Environment variables guide", url: "vercel.com/docs/projects/environment-variables" }], done: true },
      { title: "Connect the database", explanation: "Wire up the ORM and run the first migration before you deploy so the schema is live.", prompt: "Set up Prisma with a PostgreSQL datasource in schema.prisma, generate the client, then run: npx prisma migrate deploy", links: [{ title: "Prisma deploy guide", url: "prisma.io/docs/orm/prisma-migrate" }], done: false },
      { title: "Deploy to production", explanation: "Ship it to Vercel and confirm the live URL responds before you share it.", prompt: "vercel --prod", links: [], done: false }
    ]},
    { name: "Database", icon: "database", desc: "Schema, migrations, and query snippets I reach for.", tags: ["Prisma", "Postgres"], steps: [
      { title: "Model a table", explanation: "Describe the shape of your data once and let the ORM generate the client.", prompt: "Add a Prisma model called Post with id, title, body, authorId, and createdAt fields.", links: [], done: false },
      { title: "Seed sample data", explanation: "Get realistic rows in so the UI has something to render while you build.", prompt: "Write a prisma/seed.ts that inserts 5 sample posts, then run: npx prisma db seed", links: [], done: false }
    ]},
    { name: "Styling", icon: "palette", desc: "Design-system and layout prompts that keep screens consistent.", tags: ["Tailwind"], steps: [
      { title: "Apply the tokens", explanation: "Reuse the design tokens instead of hard-coding values so everything stays on-brand.", prompt: "Restyle this component using our CSS variables: --bg-surface, --text-primary, --accent, and --radius-lg.", links: [], done: false },
      { title: "Make it responsive", explanation: "Collapse multi-column layouts gracefully on small screens.", prompt: "Make this grid responsive: 3 columns on desktop, 2 on tablet, 1 on mobile, with consistent gaps.", links: [], done: false }
    ]},
    { name: "Auth", icon: "key", desc: "Sign-in, sessions, and protection snippets.", tags: ["Auth.js"], steps: [
      { title: "Add email + OAuth login", explanation: "Stand up authentication with a couple of providers and a session.", prompt: "Set up Auth.js with Email and GitHub providers and a database session strategy.", links: [{ title: "Auth.js docs", url: "authjs.dev/getting-started" }], done: false }
    ]},
    { name: "Tooling", icon: "wrench", desc: "Linting, formatting, and CI snippets.", tags: [], steps: [
      { title: "Format on commit", explanation: "Keep the codebase tidy automatically so reviews stay about logic.", prompt: "Set up Prettier + lint-staged + Husky to format staged files on every commit.", links: [], done: false }
    ]},
    { name: "AI prompts", icon: "sparkles", desc: "Reusable prompts for vibe coding sessions.", tags: ["Prompts"], steps: [
      { title: "Generate a screen", explanation: "A reliable starter prompt for scaffolding a new screen from a one-liner.", prompt: "Build a responsive [screen] with [sections], using our design tokens and Lucide icons. Mobile-first, accessible, no placeholder lorem.", links: [], done: false }
    ]}
  ];

  // --- DOM refs ------------------------------------------------------------
  var pbEl = document.querySelector("[data-pb]");
  var searchEl = document.querySelector("[data-search]");
  var saveBar = document.querySelector("[data-save-bar]");
  if (!pbEl) return;

  // --- State ---------------------------------------------------------------
  var saved = [], cols = [], activeId = null, mode = "browse", focusIndex = 0, query = "", adding = false;

  function uid() { return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function el(t, c) { var n = document.createElement(t); if (c) n.className = c; return n; }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function refreshIcons() { if (window.hydrateIcons) window.hydrateIcons(document); }

  function normStep(s) {
    return {
      id: s.id || uid(), title: s.title || "", explanation: s.explanation || "",
      prompt: s.prompt || "", done: !!s.done,
      links: Array.isArray(s.links) ? s.links.map(function (l) { return { title: l.title || "", url: l.url || "" }; }) : []
    };
  }
  function normCol(c) {
    return { id: c.id || uid(), name: c.name || "Untitled", icon: c.icon || "folder", desc: c.desc || "", tags: Array.isArray(c.tags) ? c.tags.slice() : [], steps: Array.isArray(c.steps) ? c.steps.map(normStep) : [] };
  }
  function readArr(k) { try { var v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) && v.length ? v : null; } catch (e) { return null; } }
  function shortLabel(t) { t = (t || "").replace(/\s+/g, " ").trim(); return t.length > 60 ? t.slice(0, 57) + "…" : t; }

  // Convert an old "phase" (any past Guide model) into a new collection.
  function migratePhase(p) {
    var steps = [];
    if (Array.isArray(p.steps)) {
      p.steps.forEach(function (s) {
        if (s && s.type === "link") steps.push({ id: uid(), title: s.title || s.url || "Link", explanation: "", prompt: "", links: [{ title: s.title || "", url: s.url || "" }], done: !!s.done });
        else { var txt = (s && (s.text || s.title)) || ""; steps.push({ id: uid(), title: shortLabel(txt), explanation: "", prompt: txt, links: [], done: !!(s && s.done) }); }
      });
    } else if (typeof p.body === "string" && p.body.trim()) {
      p.body.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) {
        steps.push({ id: uid(), title: shortLabel(l), explanation: "", prompt: l, links: [], done: false });
      });
    }
    if (p.notes && String(p.notes).trim()) steps.push({ id: uid(), title: "Notes", explanation: String(p.notes), prompt: "", links: [], done: false });
    return { id: uid(), name: p.name || "Untitled", icon: "folder", desc: p.desc || "", tags: [], steps: steps };
  }

  var migrated = false;
  function load() {
    var raw = readArr(KEY);
    if (raw) { saved = raw.map(normCol); cols = clone(saved); activeId = cols[0] ? cols[0].id : null; return; }
    // No Playbooks data yet — import old phases from any previous Guide model.
    var old = readArr("visionare.guide.v2") || readArr("visionare.guide.phases.v1");
    if (old) {
      cols = old.map(migratePhase).map(normCol);
      saved = clone(cols);
      persist();          // make the import durable under the new key
      migrated = true;
      activeId = cols[0] ? cols[0].id : null;
      return;
    }
    saved = DEFAULTS.map(normCol); cols = clone(saved); activeId = cols[0] ? cols[0].id : null;
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(cols)); } catch (e) {} }
  function isDirty() { return JSON.stringify(cols) !== JSON.stringify(saved); }
  function markDirty() { if (saveBar) saveBar.hidden = !isDirty(); }
  function commitSave() { persist(); saved = clone(cols); markDirty(); toast("All changes saved", true); }
  function discard() { cols = clone(saved); if (!cols.some(function (c) { return c.id === activeId; })) activeId = cols[0] ? cols[0].id : null; adding = false; render(); toast("Changes discarded", false); }
  function getActive() { return cols.find(function (c) { return c.id === activeId; }) || cols[0]; }

  // --- helpers -------------------------------------------------------------
  function editable(node, get, set) {
    node.setAttribute("contenteditable", "true");
    node.setAttribute("spellcheck", "false");
    node.textContent = get();
    node.addEventListener("input", function () { set(node.innerText); markDirty(); });
    return node;
  }
  function copyText(text, labelSpan, done) {
    function flash() { if (!labelSpan) return; var b = labelSpan.closest("button"); if (b) b.classList.add("is-copied"); var o = labelSpan.textContent; labelSpan.textContent = done || "Copied"; setTimeout(function () { if (b) b.classList.remove("is-copied"); labelSpan.textContent = o; }, 1200); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(flash, fb); else fb();
    function fb() { var ta = el("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); flash(); } catch (e) {} document.body.removeChild(ta); }
  }
  function openUrl(url) { var u = (url || "").trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) u = "https://" + u; window.open(u, "_blank", "noopener,noreferrer"); }
  var tT = null;
  function toast(msg, ok) {
    var t = document.querySelector(".toast"); if (!t) { t = el("div", "toast"); document.body.appendChild(t); }
    t.className = "toast" + (ok ? " toast--ok" : ""); t.innerHTML = (ok ? '<i data-lucide="check"></i>' : "") + "<span>" + msg + "</span>"; refreshIcons();
    requestAnimationFrame(function () { t.classList.add("is-show"); }); clearTimeout(tT); tT = setTimeout(function () { t.classList.remove("is-show"); }, 1600);
  }
  function matchCol(c) {
    if (!query) return true;
    var q = query.toLowerCase();
    if (c.name.toLowerCase().indexOf(q) > -1) return true;
    return c.steps.some(function (s) { return (s.title + " " + s.explanation + " " + s.prompt).toLowerCase().indexOf(q) > -1; });
  }

  // --- Render --------------------------------------------------------------
  function render() { pbEl.innerHTML = ""; if (mode === "focus") renderFocus(); else renderBrowse(); refreshIcons(); markDirty(); }

  function renderBrowse() {
    pbEl.appendChild(renderSidebar());
    var main = el("div", "pb-main");
    var active = getActive();
    if (!active) { var em = el("div", "focus-empty"); em.textContent = "No collections yet — create one to start."; main.appendChild(em); pbEl.appendChild(main); return; }

    // header
    var head = el("div", "pb-head");
    var row = el("div", "pb-head__row");
    var h1 = el("h1", "pb-head__title"); h1.setAttribute("data-placeholder", "Collection name");
    editable(h1, function () { return active.name; }, function (v) { active.name = v; });
    var acts = el("div", "pb-head__actions");
    var doBtn = el("button", "btn btn-ghost"); doBtn.type = "button"; doBtn.innerHTML = "Do it &nbsp;→";
    doBtn.addEventListener("click", function () { if (!active.steps.length) { toast("Add a step first", false); return; } mode = "focus"; focusIndex = firstUndone(active); render(); });
    var del = el("button", "icon-btn icon-btn--danger"); del.type = "button"; del.title = "Delete collection"; del.innerHTML = '<i data-lucide="trash-2"></i>';
    del.addEventListener("click", function () { cols = cols.filter(function (c) { return c.id !== active.id; }); activeId = cols[0] ? cols[0].id : null; adding = false; markDirty(); render(); });
    acts.append(doBtn, del);
    row.append(h1, acts);
    var desc = el("div", "pb-head__desc"); desc.setAttribute("data-placeholder", "Describe this collection…");
    editable(desc, function () { return active.desc; }, function (v) { active.desc = v; });
    var meta = el("div", "pb-meta");
    var n = active.steps.length; var done = active.steps.filter(function (s) { return s.done; }).length;
    meta.appendChild(chip("layers", n + (n === 1 ? " prompt" : " prompts")));
    active.tags.forEach(function (t) { meta.appendChild(chip(null, t, true)); });
    var prog = el("div", "pb-progress");
    var pct = n ? Math.round((done / n) * 100) : 0;
    prog.innerHTML = '<span class="pb-progress__lbl">' + done + " of " + n + ' done</span><span class="pb-progress__track"><span class="pb-progress__fill" style="width:' + pct + '%"></span></span>';
    head.append(row, desc, meta, prog);
    main.appendChild(head);

    // steps
    var steps = el("div", "steps");
    active.steps.forEach(function (s, i) { steps.appendChild(renderStepCard(active, s, i)); });
    main.appendChild(steps);

    // add step (button or form)
    if (adding) main.appendChild(renderAddForm(active));
    else {
      var addBtn = el("button", "add-step-btn"); addBtn.type = "button"; addBtn.innerHTML = '<i data-lucide="plus"></i> Add step';
      addBtn.addEventListener("click", function () { adding = true; render(); });
      main.appendChild(addBtn);
    }
    pbEl.appendChild(main);
  }

  function chip(icon, text, accent) {
    var c = el("span", "pchip" + (accent ? " pchip--accent" : ""));
    if (icon) c.innerHTML = '<i data-lucide="' + icon + '"></i>';
    var s = el("span"); s.textContent = text; c.appendChild(s); return c;
  }

  function renderSidebar() {
    var side = el("aside", "pb-side");
    var head = el("div", "pb-side__head");
    var visible = cols.filter(matchCol);
    head.innerHTML = '<span class="lbl">COLLECTIONS</span><span class="ct">' + visible.length + "</span>";
    side.appendChild(head);
    var list = el("div", "coll-list");
    visible.forEach(function (c) {
      var it = el("button", "coll-item" + (c.id === activeId ? " coll-item--active" : "")); it.type = "button";
      var ic = el("span", "coll-item__icon"); ic.innerHTML = '<i data-lucide="' + (c.icon || "folder") + '"></i>';
      var nm = el("span", "coll-item__name"); nm.textContent = c.name;
      var ct = el("span", "coll-item__ct"); ct.textContent = String(c.steps.length);
      it.append(ic, nm, ct);
      it.addEventListener("click", function () { activeId = c.id; adding = false; mode = "browse"; render(); });
      list.appendChild(it);
    });
    if (!visible.length) { var e = el("div", "focus-empty"); e.style.padding = "8px 4px"; e.textContent = query ? "No matches." : "No collections."; list.appendChild(e); }
    side.appendChild(list);
    var add = el("button", "coll-add"); add.type = "button"; add.innerHTML = '<i data-lucide="plus"></i> New collection';
    add.addEventListener("click", newCollection);
    side.appendChild(add);
    return side;
  }

  function renderStepCard(coll, step, i) {
    var card = el("div", "pstep" + (step.done ? " pstep--done" : ""));
    var head = el("div", "pstep__head");
    var num = el("span", "pstep__num"); num.textContent = String(i + 1);
    var title = el("div", "pstep__title"); title.setAttribute("data-placeholder", "Step title");
    editable(title, function () { return step.title; }, function (v) { step.title = v; });
    var check = el("button", "pstep__check"); check.type = "button"; check.title = "Mark done"; check.innerHTML = '<i data-lucide="check"></i>';
    check.addEventListener("click", function () { step.done = !step.done; markDirty(); render(); });
    var del = el("button", "pstep__del"); del.type = "button"; del.title = "Delete step"; del.innerHTML = '<i data-lucide="trash-2"></i>';
    del.addEventListener("click", function () { coll.steps.splice(i, 1); markDirty(); render(); });
    head.append(num, title, check, del);

    var expl = el("div", "pstep__expl"); expl.setAttribute("data-placeholder", "Explanation — the part you read…");
    editable(expl, function () { return step.explanation; }, function (v) { step.explanation = v; });

    card.append(head, expl, promptBlock(step, true));

    step.links.forEach(function (lk, li) { card.appendChild(renderLink(step, lk, li)); });
    var addLink = el("button", "add-link-toggle"); addLink.type = "button"; addLink.innerHTML = '<i data-lucide="link"></i> Add link';
    addLink.addEventListener("click", function () { step.links.push({ title: "", url: "" }); markDirty(); render(); });
    card.appendChild(addLink);
    return card;
  }

  function promptBlock(step, edit) {
    var pb = el("div", "prompt-block");
    var bar = el("div", "prompt-block__bar");
    bar.innerHTML = '<span class="prompt-block__label"><i data-lucide="sparkles"></i> PROMPT</span>';
    var copy = el("button", "prompt-copy"); copy.type = "button"; copy.innerHTML = '<i data-lucide="copy"></i> <span>Copy prompt</span>';
    copy.addEventListener("click", function () { copyText(step.prompt, copy.querySelector("span"), "Copied"); });
    bar.appendChild(copy);
    var text = el("div", "prompt-block__text"); text.setAttribute("data-placeholder", "The prompt to copy…");
    if (edit) editable(text, function () { return step.prompt; }, function (v) { step.prompt = v; });
    else text.textContent = step.prompt;
    pb.append(bar, text);
    return pb;
  }

  function renderLink(step, lk, li) {
    var row = el("div", "link-row");
    row.innerHTML = '<span class="link-row__lead"><i data-lucide="link"></i></span>';
    var body = el("div", "link-row__body");
    var t = el("div", "link-row__title"); t.setAttribute("data-placeholder", "Link title");
    editable(t, function () { return lk.title; }, function (v) { lk.title = v; });
    var u = el("div", "link-row__url"); u.setAttribute("data-placeholder", "example.com/path");
    editable(u, function () { return lk.url; }, function (v) { lk.url = v; });
    body.append(t, u);
    var open = el("button", "link-row__open"); open.type = "button"; open.innerHTML = '<span>Open</span> <i data-lucide="arrow-up-right"></i>';
    open.addEventListener("click", function () { openUrl(lk.url); });
    var del = el("button", "link-row__del"); del.type = "button"; del.title = "Remove link"; del.innerHTML = '<i data-lucide="trash-2"></i>';
    del.addEventListener("click", function () { step.links.splice(li, 1); markDirty(); render(); });
    row.append(body, open, del);
    return row;
  }

  function renderAddForm(coll) {
    var f = el("div", "step-form");
    var head = el("div", "step-form__head");
    head.innerHTML = '<span class="badge"><i data-lucide="plus"></i></span><h4>New step</h4>';
    var hx = el("button", "icon-btn"); hx.type = "button"; hx.setAttribute("aria-label", "Cancel"); hx.innerHTML = '<i data-lucide="x"></i>';
    hx.addEventListener("click", function () { adding = false; render(); });
    head.appendChild(hx);

    var fTitle = el("div", "field"); fTitle.innerHTML = "<label>Step title</label>";
    var iTitle = el("input"); iTitle.type = "text"; iTitle.placeholder = "e.g. Connect the database"; fTitle.appendChild(iTitle);

    var fExpl = el("div", "field"); fExpl.innerHTML = "<label>Explanation — what you read</label>";
    var iExpl = el("textarea"); iExpl.rows = 3; iExpl.placeholder = "Describe what this step does and why. This part is context, not copied."; fExpl.appendChild(iExpl);

    var fPrompt = el("div", "field field--prompt"); fPrompt.innerHTML = "<label>Prompt to copy</label>";
    var wrap = el("div", "prompt-wrap");
    wrap.innerHTML = '<div class="prompt-wrap__bar"><span class="lbl">PROMPT</span><span class="hint">only this is copied</span></div>';
    var iPrompt = el("textarea"); iPrompt.rows = 3; iPrompt.placeholder = "Paste the exact prompt or command you copy…"; wrap.appendChild(iPrompt); fPrompt.appendChild(wrap);

    var linkFields = el("div", "step-form__link"); linkFields.hidden = true;
    var iLinkTitle = el("input"); iLinkTitle.type = "text"; iLinkTitle.placeholder = "Link title";
    var iLinkUrl = el("input"); iLinkUrl.type = "text"; iLinkUrl.placeholder = "example.com/path";
    linkFields.append(iLinkTitle, iLinkUrl);
    var linkToggle = el("button", "add-link-toggle"); linkToggle.type = "button"; linkToggle.innerHTML = '<i data-lucide="link"></i> Add link (optional)';
    linkToggle.addEventListener("click", function () { linkFields.hidden = !linkFields.hidden; if (!linkFields.hidden) iLinkTitle.focus(); });

    var foot = el("div", "step-form__foot");
    foot.innerHTML = '<span class="step-form__hint">Only the prompt is copied — the rest is context you read.</span>';
    var fa = el("div", "step-form__actions");
    var cancel = el("button", "btn btn-ghost"); cancel.type = "button"; cancel.textContent = "Cancel";
    cancel.addEventListener("click", function () { adding = false; render(); });
    var addB = el("button", "btn btn-primary"); addB.type = "button"; addB.textContent = "Add step";
    addB.addEventListener("click", function () {
      var step = { id: uid(), title: iTitle.value.trim() || "Untitled step", explanation: iExpl.value.trim(), prompt: iPrompt.value.trim(), links: [], done: false };
      if (!linkFields.hidden && (iLinkTitle.value.trim() || iLinkUrl.value.trim())) step.links.push({ title: iLinkTitle.value.trim(), url: iLinkUrl.value.trim() });
      coll.steps.push(step); adding = false; markDirty(); render();
    });
    fa.append(cancel, addB); foot.appendChild(fa);

    f.append(head, fTitle, fExpl, fPrompt, linkToggle, linkFields, foot);
    setTimeout(function () { iTitle.focus(); }, 0);
    return f;
  }

  // --- Focus mode ----------------------------------------------------------
  function firstUndone(coll) { var i = coll.steps.findIndex(function (s) { return !s.done; }); return i < 0 ? 0 : i; }

  function renderFocus() {
    var coll = getActive();
    if (!coll || !coll.steps.length) { mode = "browse"; renderBrowse(); return; }
    if (focusIndex >= coll.steps.length) focusIndex = coll.steps.length - 1;

    // rail
    var rail = el("aside", "focus-rail");
    var title = el("div", "focus-rail__title"); title.textContent = coll.name;
    var doneCount = coll.steps.filter(function (s) { return s.done; }).length;
    var prog = el("div", "focus-rail__prog");
    prog.innerHTML = '<span class="l">' + doneCount + " / " + coll.steps.length + '</span><span class="track"><span class="fill" style="width:' + Math.round((doneCount / coll.steps.length) * 100) + '%"></span></span>';
    var list = el("div", "focus-list");
    coll.steps.forEach(function (s, i) {
      var r = el("button", "cklrow" + (i === focusIndex ? " cklrow--active" : "") + (s.done ? " cklrow--done" : "")); r.type = "button";
      var ck = el("span", "cklrow__ck"); ck.innerHTML = '<i data-lucide="check"></i>';
      var t = el("span", "cklrow__t"); t.textContent = s.title || "Untitled step";
      r.append(ck, t);
      r.addEventListener("click", function () { focusIndex = i; render(); });
      list.appendChild(r);
    });
    var exit = el("button", "btn btn-ghost"); exit.type = "button"; exit.innerHTML = '<i data-lucide="arrow-left"></i> Exit focus';
    exit.addEventListener("click", function () { mode = "browse"; render(); });
    rail.append(title, prog, list, exit);
    pbEl.appendChild(rail);

    // main
    var step = coll.steps[focusIndex];
    var main = el("div", "focus-main");
    var kicker = el("div", "focus-main__kicker"); kicker.textContent = "STEP " + (focusIndex + 1) + " OF " + coll.steps.length;
    var h = el("div", "focus-main__title"); h.textContent = step.title || "Untitled step";
    var expl = el("div", "focus-main__expl"); expl.textContent = step.explanation;
    main.append(kicker, h, expl, promptBlock(step, false));
    step.links.forEach(function (lk) {
      var row = el("div", "link-row");
      row.innerHTML = '<span class="link-row__lead"><i data-lucide="link"></i></span>';
      var body = el("div", "link-row__body");
      var t = el("div", "link-row__title"); t.textContent = lk.title || lk.url; var u = el("div", "link-row__url"); u.textContent = lk.url;
      body.append(t, u);
      var open = el("button", "link-row__open"); open.type = "button"; open.innerHTML = '<span>Open</span> <i data-lucide="arrow-up-right"></i>';
      open.addEventListener("click", function () { openUrl(lk.url); });
      row.append(body, open); main.appendChild(row);
    });
    main.appendChild(el("div", "focus-main__rule"));
    var nav = el("div", "focus-nav");
    var prev = el("button", "btn btn-ghost"); prev.type = "button"; prev.innerHTML = '<i data-lucide="arrow-left"></i> Previous'; prev.disabled = focusIndex === 0;
    prev.addEventListener("click", function () { if (focusIndex > 0) { focusIndex--; render(); } });
    var dots = el("div", "focus-dots");
    coll.steps.forEach(function (s, i) { var d = el("span", i === focusIndex ? "on" : ""); dots.appendChild(d); });
    var next = el("button", "btn btn-primary"); next.type = "button";
    var last = focusIndex === coll.steps.length - 1;
    next.innerHTML = last ? 'Mark done &nbsp;<i data-lucide="check"></i>' : 'Mark done & next &nbsp;→';
    next.addEventListener("click", function () { step.done = true; markDirty(); if (!last) focusIndex++; render(); });
    nav.append(prev, dots, next);
    main.appendChild(nav);
    pbEl.appendChild(main);
  }

  // --- Collections ---------------------------------------------------------
  function newCollection() {
    var c = { id: uid(), name: "New collection", icon: "folder", desc: "", tags: [], steps: [] };
    cols.push(c); activeId = c.id; adding = false; mode = "browse"; query = ""; if (searchEl) searchEl.value = "";
    markDirty(); render();
    var h = pbEl.querySelector(".pb-head__title"); if (h) { h.focus(); document.execCommand && document.getSelection().selectAllChildren(h); }
  }

  // --- Backup / import -----------------------------------------------------
  function hasOldData() { return !!(readArr("visionare.guide.v2") || readArr("visionare.guide.phases.v1")); }
  function importOld() {
    var old = readArr("visionare.guide.v2") || readArr("visionare.guide.phases.v1");
    if (!old) { toast("No old phases found in this browser", false); return; }
    var imported = old.map(migratePhase).map(normCol);
    cols = cols.concat(imported);
    activeId = imported[0].id; adding = false; mode = "browse"; query = ""; if (searchEl) searchEl.value = "";
    markDirty(); render();
    toast("Imported " + imported.length + " old " + (imported.length === 1 ? "phase" : "phases") + " — review and Save", true);
  }
  function exportJSON() {
    var blob = new Blob([JSON.stringify(cols, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a"); a.href = url;
    var d = new Date();
    a.download = "visionare-playbooks-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Exported " + cols.length + " collection" + (cols.length === 1 ? "" : "s"), true);
  }
  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null; try { parsed = JSON.parse(reader.result); } catch (e) {}
      if (!Array.isArray(parsed) || !parsed.length) { toast("That file isn't a valid playbooks export", false); return; }
      if (!window.confirm("Replace your current playbooks with the imported file? You can Discard afterwards to undo.")) return;
      cols = parsed.map(normCol); activeId = cols[0] ? cols[0].id : null; adding = false; mode = "browse"; query = ""; if (searchEl) searchEl.value = "";
      markDirty(); render();
      toast("Imported " + cols.length + " collection" + (cols.length === 1 ? "" : "s") + " — review and Save", true);
    };
    reader.readAsText(file);
  }

  // --- Wire up -------------------------------------------------------------
  if (searchEl) searchEl.addEventListener("input", function () { query = searchEl.value.trim(); if (mode === "focus") mode = "browse"; render(); });
  var nc = document.querySelector("[data-new-collection]"); if (nc) nc.addEventListener("click", newCollection);

  var menuWrap = document.querySelector("[data-menu-wrap]"), menuBtn = document.querySelector("[data-menu-btn]"), menuEl = document.querySelector("[data-menu]");
  function closeMenu() { if (menuEl) { menuEl.hidden = true; if (menuBtn) menuBtn.setAttribute("aria-expanded", "false"); } }
  if (menuBtn && menuEl) {
    menuBtn.addEventListener("click", function (e) { e.stopPropagation(); var open = !menuEl.hidden; menuEl.hidden = open; menuBtn.setAttribute("aria-expanded", String(!open)); });
    document.addEventListener("click", function (e) { if (menuWrap && !menuWrap.contains(e.target)) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }
  var importOldBtn = document.querySelector("[data-import-old]");
  if (importOldBtn) { if (!hasOldData()) importOldBtn.style.display = "none"; importOldBtn.addEventListener("click", function () { closeMenu(); importOld(); }); }
  var exportBtn = document.querySelector("[data-export]"); if (exportBtn) exportBtn.addEventListener("click", function () { closeMenu(); exportJSON(); });
  var importBtn = document.querySelector("[data-import]"), importFile = document.querySelector("[data-import-file]");
  if (importBtn && importFile) { importBtn.addEventListener("click", function () { closeMenu(); importFile.click(); }); importFile.addEventListener("change", function () { if (importFile.files && importFile.files[0]) importJSON(importFile.files[0]); importFile.value = ""; }); }
  var sb = document.querySelector("[data-save]"); if (sb) sb.addEventListener("click", commitSave);
  var db = document.querySelector("[data-discard]"); if (db) db.addEventListener("click", discard);
  document.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (isDirty()) commitSave(); } });
  window.addEventListener("beforeunload", function (e) { if (isDirty()) { e.preventDefault(); e.returnValue = ""; } });

  // --- Init ----------------------------------------------------------------
  load();
  render();
  if (migrated) toast("Imported your old phases into Collections", true);
})();
