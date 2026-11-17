/* view.js: draws the page (sidebar, collection header, step cards, search results)
   and handles clicks on it. Everything is re-rendered from PB.store on each change.

   PB.view.render()            redraw
   PB.view.setOpen(id, bool)   expand/collapse a step
   PB.view.reveal(id)          scroll a step into view
   PB.view.setQuery(text) / clearSearch() */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var u = PB.util, ic = PB.icon, esc = u.esc;
  var root = null;
  var query = "";
  var openSteps = {};    // stepId -> true when expanded
  var fullHeight = {};   // stepId -> true when the prompt box shows its full height
  var menuFor = null;    // stepId whose ⋮ menu is open
  var PROMPT_CAP_LINES = 11;

  // --- Pieces -----------------------------------------------------------------
  function sidebar(cols, activeId) {
    var h = '<nav class="side" aria-label="Collections"><div class="side__lbl"><span>COLLECTIONS</span><span>' + cols.length + "</span></div>";
    cols.forEach(function (c) {
      var on = !query && c.id === activeId;
      h += '<button type="button" class="coll' + (on ? " coll--on" : "") + '" data-coll="' + esc(c.id) + '" title="' + esc(c.name) + '"' + (on ? ' aria-current="true"' : "") + ">" +
        '<span class="coll__ic">' + ic(c.icon) + '</span><span class="coll__n">' + esc(c.name) + '</span><span class="coll__ct">' + c.steps.length + "</span></button>";
    });
    return h + '<button type="button" class="coll-add" data-newcoll title="New collection">' + ic("plus") + "<span>New collection</span></button></nav>";
  }

  function tabs(cols, activeId) {
    return '<div class="tabs" role="navigation" aria-label="Collections">' + cols.map(function (c) {
      var on = !query && c.id === activeId;
      return '<button type="button" class="tab' + (on ? " tab--on" : "") + '" data-coll="' + esc(c.id) + '"' + (on ? ' aria-current="true"' : "") + ">" + ic(c.icon) + esc(c.name) + "</button>";
    }).join("") + '<button type="button" class="tab" data-newcoll aria-label="New collection">' + ic("plus") + "</button></div>";
  }

  function header(c) {
    var n = c.steps.length;
    return '<header class="head"><div class="head__row"><div class="head__title"><span class="head__ic">' + ic(c.icon) + "</span>" +
      "<h1>" + esc(c.name) + "</h1>" +
      '<button type="button" class="btn btn--ghost btn--icon" data-editcoll="' + esc(c.id) + '" aria-label="Edit collection" title="Edit collection">' + ic("pencil") + "</button></div>" +
      '<button type="button" class="btn btn--primary" data-add="' + esc(c.id) + '">' + ic("plus") + "Add step</button></div>" +
      (c.desc ? '<p class="head__desc">' + esc(c.desc) + "</p>" : "") +
      '<span class="head__meta">' + n + (n === 1 ? " step" : " steps") + "</span></header>";
  }

  function peek(s) {
    if (s.actions.length) return s.actions.map(u.plainText).join("  →  ");
    if (s.prompt) return s.prompt.split("\n").filter(function (l) { return l.trim(); })[0] || "";
    if (s.links.length) return s.links.map(function (l) { return l.title || u.prettyUrl(l.url); }).join(", ");
    return s.note || "Empty step";
  }

  function tags(s) {
    var lines = u.lineCount(s.prompt), h = "";
    if (s.actions.length) h += '<span class="h-a" title="' + s.actions.length + ' actions">' + ic("list-ordered") + s.actions.length + "</span>";
    if (s.prompt) h += '<span class="h-p" title="Prompt, ' + lines + (lines === 1 ? " line" : " lines") + '">' + ic("sparkles") + lines + "L</span>";
    if (s.links.length) h += '<span class="h-l" title="' + s.links.length + (s.links.length === 1 ? " link" : " links") + '">' + ic("link") + s.links.length + "</span>";
    return h ? '<span class="has">' + h + "</span>" : "";
  }

  function stepCard(s, index, total) {
    var id = esc(s.id), isOpen = !!openSteps[s.id], bodyId = "b-" + id;
    var first = s.links[0];
    var h = '<article class="item' + (isOpen ? " is-open" : "") + '" data-id="' + id + '">' +
      '<div class="item__row"><span class="num" aria-hidden="true">' + (index + 1) + "</span>" +
      '<button type="button" class="item__open" data-toggle="' + id + '" aria-expanded="' + isOpen + '" aria-controls="' + bodyId + '">' +
      '<span class="item__t">' + esc(s.title || "Untitled step") + '</span><span class="item__peek">' + esc(peek(s)) + "</span></button>" +
      tags(s) +
      (first ? '<a class="act act--icon" href="' + esc(u.safeHref(first.url)) + '" target="_blank" rel="noopener noreferrer" title="Open ' + esc(first.title || u.prettyUrl(first.url)) + '" aria-label="Open link: ' + esc(first.title || first.url) + '">' + ic("external-link") + "</a>" : "") +
      (s.prompt ? '<button type="button" class="act" data-copy="' + id + '" aria-label="Copy prompt">' + ic("copy") + "<span>Copy</span></button>" : "") +
      '<button type="button" class="kebab" data-menu="' + id + '" aria-label="Step options" aria-haspopup="menu" aria-expanded="' + (menuFor === s.id) + '">' + ic("ellipsis-vertical") + "</button>" +
      '<button type="button" class="chev" data-toggle="' + id + '" aria-label="' + (isOpen ? "Collapse" : "Expand") + '" tabindex="-1">' + ic("chevron-down") + "</button></div>";

    if (menuFor === s.id) {
      h += '<div class="menu" role="menu">' +
        '<button type="button" role="menuitem" data-edit="' + id + '">' + ic("pencil") + "Edit</button>" +
        '<button type="button" role="menuitem" data-dup="' + id + '">' + ic("copy-plus") + "Duplicate</button>" +
        '<button type="button" role="menuitem" data-move="' + id + '" data-dir="-1"' + (index === 0 ? " disabled" : "") + ">" + ic("arrow-up") + "Move up</button>" +
        '<button type="button" role="menuitem" data-move="' + id + '" data-dir="1"' + (index === total - 1 ? " disabled" : "") + ">" + ic("arrow-down") + "Move down</button><hr>" +
        '<button type="button" role="menuitem" class="danger" data-del="' + id + '">' + ic("trash-2") + "Delete</button></div>";
    }

    if (isOpen) {
      h += '<div class="item__body" id="' + bodyId + '">' + (s.note ? '<p class="note">' + esc(s.note) + "</p>" : "");
      if (s.actions.length) {
        h += '<div class="item__blk"><span class="blk__lbl">ACTIONS</span><ol class="acts">' +
          s.actions.map(function (a) { return "<li><span>" + u.richText(a) + "</span></li>"; }).join("") + "</ol></div>";
      }
      if (s.prompt) {
        var lines = u.lineCount(s.prompt), long = lines > PROMPT_CAP_LINES, full = !!fullHeight[s.id];
        h += '<div class="pbox' + (long && !full ? " pbox--capped" : "") + '"><div class="pbox__bar"><span class="pbox__lbl">PROMPT · ' + lines + (lines === 1 ? " LINE" : " LINES") + "</span>" +
          '<button type="button" class="act act--accent" data-copy="' + id + '">' + ic("copy") + "<span>Copy prompt</span></button></div>" +
          '<pre tabindex="0" aria-label="Prompt text">' + esc(s.prompt) + "</pre>" +
          (long ? '<div class="pbox__more"><button type="button" data-full="' + id + '">' + ic(full ? "chevron-up" : "chevron-down") + (full ? "Fit in box" : "Show full height") + "</button></div>" : "") + "</div>";
      }
      if (s.links.length) {
        h += '<div class="item__blk"><span class="blk__lbl">LINKS</span><div class="links">' + s.links.map(function (l) {
          return '<a class="linkpill" href="' + esc(u.safeHref(l.url)) + '" target="_blank" rel="noopener noreferrer">' + ic("link") +
            "<span>" + esc(l.title || u.prettyUrl(l.url)) + "</span>" + (l.title ? "<small>" + esc(u.prettyUrl(l.url)) + "</small>" : "") + "</a>";
        }).join("") + "</div></div>";
      }
      h += '<button type="button" class="btn btn--sm btn--ghost item__edit" data-edit="' + id + '">' + ic("pencil") + "Edit step</button></div>";
    }
    return h + "</article>";
  }

  function stepList(c, steps) {
    return '<div class="list">' + steps.map(function (s) { return stepCard(s, c.steps.indexOf(s), c.steps.length); }).join("") + "</div>";
  }

  function emptyApp() {
    return '<div class="main"><div class="empty"><b>No collections yet</b>Collections group your steps, for example "Deployment" or "AI prompts".' +
      '<button type="button" class="btn btn--primary" data-newcoll>' + ic("plus") + "Create your first collection</button></div></div>";
  }

  function mainForCollection(c) {
    var h = '<div class="main">' + tabs(PB.store.all(), c.id) + header(c);
    h += c.steps.length ? stepList(c, c.steps)
      : '<div class="empty"><b>No steps yet</b>Add a prompt you reuse, a how-to you want to remember, or both.' +
        '<button type="button" class="btn btn--primary" data-add="' + esc(c.id) + '">' + ic("plus") + "Add the first step</button></div>";
    return h + "</div>";
  }

  function mainForSearch() {
    var groups = PB.store.search(query), total = 0;
    groups.forEach(function (g) { total += g.steps.length; });
    var h = '<div class="main">' + tabs(PB.store.all(), null) +
      '<header class="head"><div class="head__row"><div class="head__title"><span class="head__ic">' + ic("search") + "</span>" +
      "<h1>Results for “" + esc(query) + "”</h1></div>" +
      '<button type="button" class="btn" data-clearsearch>' + ic("x") + "Clear search</button></div>" +
      '<span class="head__meta">' + total + (total === 1 ? " step" : " steps") + " in " + groups.length + (groups.length === 1 ? " collection" : " collections") + "</span></header>";
    if (!groups.length) return h + '<div class="empty"><b>Nothing found</b>No step or collection contains “' + esc(query) + "”. Try a shorter word.</div></div>";
    groups.forEach(function (g) {
      h += '<button type="button" class="group-title" data-coll="' + esc(g.coll.id) + '" title="Open collection">' + ic(g.coll.icon) + esc(g.coll.name) + "</button>";
      h += g.steps.length ? stepList(g.coll, g.steps) : '<p class="head__meta">The collection name matches, but it has no steps.</p>';
    });
    return h + "</div>";
  }

  // --- Render ---------------------------------------------------------------
  function render() {
    var cols = PB.store.all(), active = PB.store.active();
    var focusSel = rememberFocus();
    if (!cols.length) root.innerHTML = emptyApp();
    else root.innerHTML = sidebar(cols, active && active.id) + (query ? mainForSearch() : mainForCollection(active || cols[0]));
    restoreFocus(focusSel);
  }

  // Keep keyboard focus on the same control across re-renders.
  function rememberFocus() {
    var a = document.activeElement;
    if (!a || !root.contains(a)) return null;
    var attrs = ["data-toggle", "data-copy", "data-menu", "data-coll", "data-full", "data-add", "data-editcoll"];
    for (var i = 0; i < attrs.length; i++) if (a.hasAttribute(attrs[i])) return "[" + attrs[i] + '="' + a.getAttribute(attrs[i]) + '"]';
    return null;
  }
  function restoreFocus(sel) { if (sel) { var n = root.querySelector(sel); if (n) n.focus(); } }

  function closeMenu(focusKebab) {
    if (!menuFor) return;
    var id = menuFor; menuFor = null; render();
    if (focusKebab) { var k = root.querySelector('[data-menu="' + id + '"]'); if (k) k.focus(); }
  }

  // --- Events ---------------------------------------------------------------
  function onClick(e) {
    var b = e.target.closest("button, a");
    if (!b || !root.contains(b)) { if (menuFor) closeMenu(false); return; }
    var a = function (n) { return b.getAttribute(n); };

    if (b.hasAttribute("data-chip")) {
      var chipText = a("data-chip");
      u.copy(chipText, function (ok) {
        if (!ok) return u.toast("Copy didn't work. Select the text and press Ctrl+C.", { error: true });
        b.classList.add("is-copied"); setTimeout(function () { b.classList.remove("is-copied"); }, 1000);
        u.toast("Copied “" + chipText + "”");
      });
      return;
    }
    if (b.tagName === "A") { if (menuFor) closeMenu(false); return; }  // links open normally

    var inMenu = !!b.closest(".menu");
    if (menuFor && !inMenu && !b.hasAttribute("data-menu")) menuFor = null;

    if (b.hasAttribute("data-copy")) {
      var hit = PB.store.findStep(a("data-copy")); if (!hit) return;
      var lines = u.lineCount(hit.step.prompt);
      u.copy(hit.step.prompt, function (ok) {
        if (!ok) return u.toast("Copy didn't work. Open the step, select the prompt and press Ctrl+C.", { error: true });
        u.flashCopied(b, "Copied"); u.toast("Copied prompt (" + lines + (lines === 1 ? " line)" : " lines)"));
      });
      return;
    }
    if (b.hasAttribute("data-toggle")) { var t = a("data-toggle"); openSteps[t] = !openSteps[t]; render(); return; }
    if (b.hasAttribute("data-full")) { var f = a("data-full"); fullHeight[f] = !fullHeight[f]; render(); return; }
    if (b.hasAttribute("data-menu")) {
      var mid = a("data-menu"); menuFor = menuFor === mid ? null : mid; render();
      if (menuFor) { var firstItem = root.querySelector(".menu button:not(:disabled)"); if (firstItem) firstItem.focus(); }
      return;
    }
    if (b.hasAttribute("data-edit")) {
      var eid = a("data-edit"); menuFor = null; render();
      var kb = root.querySelector('[data-menu="' + eid + '"]'); if (kb) kb.focus();   // focus returns here when the dialog closes
      PB.stepModal.open({ stepId: eid }); return;
    }
    if (b.hasAttribute("data-dup")) {
      menuFor = null; var copy = PB.store.duplicateStep(a("data-dup"));
      if (copy) { openSteps[copy.id] = true; render(); reveal(copy.id); u.toast("Step duplicated"); }
      return;
    }
    if (b.hasAttribute("data-move")) {
      var sid = a("data-move"); menuFor = null; PB.store.moveStep(sid, +a("data-dir")); render(); reveal(sid);
      var kebab = root.querySelector('[data-menu="' + sid + '"]'); if (kebab) kebab.focus();
      return;
    }
    if (b.hasAttribute("data-del")) {
      var did = a("data-del"), info = PB.store.findStep(did), name = info ? info.step.title : "Step";
      menuFor = null; var undo = PB.store.deleteStep(did); render();
      if (!undo) return;
      u.toast("Deleted “" + (name || "Untitled step") + "”", { action: "Undo", onAction: function () { undo(); render(); } });
      return;
    }
    if (b.hasAttribute("data-add")) { PB.stepModal.open({ collId: a("data-add") }); return; }
    if (b.hasAttribute("data-coll")) { PB.store.setActive(a("data-coll")); clearSearch(); render(); window.scrollTo(0, 0); return; }
    if (b.hasAttribute("data-newcoll")) { PB.collectionModal.open(); return; }
    if (b.hasAttribute("data-editcoll")) { PB.collectionModal.open(a("data-editcoll")); return; }
    if (b.hasAttribute("data-clearsearch")) { clearSearch(); render(); return; }
    if (!inMenu) render();
  }

  function onKeydown(e) {
    if (e.key === "Escape" && menuFor) { e.preventDefault(); closeMenu(true); return; }
    if (!menuFor || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    var items = Array.prototype.slice.call(root.querySelectorAll(".menu button:not(:disabled)"));
    var i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  }

  // --- Public ------------------------------------------------------------------
  function reveal(stepId) {
    var el = root.querySelector('.item[data-id="' + stepId + '"]');
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function setQuery(q) { query = q.trim(); menuFor = null; render(); }
  function clearSearch() {
    query = "";
    var input = document.querySelector("[data-search]"); if (input) input.value = "";
    var clr = document.querySelector("[data-search-clear]"); if (clr) clr.hidden = true;
  }

  function init(rootEl) {
    root = rootEl;
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
  }

  PB.view = {
    init: init, render: render, reveal: reveal, setQuery: setQuery, clearSearch: clearSearch,
    closeMenu: function () { closeMenu(false); },
    setOpen: function (id, v) { openSteps[id] = !!v; },
    query: function () { return query; }
  };
})(window.PB);
