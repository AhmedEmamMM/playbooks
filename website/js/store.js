/* store.js: data model, saving and migration.

   collection { id, name, icon, desc, steps[] }
   step       { id, title, note, actions[string], prompt, links[{ title, url }] }

   Saved in localStorage under "playbooks.v2". Every change saves immediately.
   Before each change the latest saved copy is re-read (sync), so two open tabs don't overwrite each other.
   Mutations return null/false when saving failed (an error toast is already showing) and roll back.

   Older data is migrated on first load and never deleted (it doubles as a backup):
     "visionare.playbooks.v1"   (steps had explanation/prompt/links/done)
     "visionare.guide.v2" / "visionare.guide.phases.v1"  (the original phase-based guide)
   Safety copies: "playbooks.v2.beforeImport" (data replaced by the last import),
                  "playbooks.v2.corrupt-<time>" (unreadable data found at start-up). */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var u = PB.util;
  var KEY = "playbooks.v2";
  var UI_KEY = "playbooks.ui";
  var OLD_V1 = "visionare.playbooks.v1";
  var OLD_PHASES = ["visionare.guide.v2", "visionare.guide.phases.v1"];
  var ID_RE = /^[\w-]+$/;

  var cols = [];
  var activeId = null;
  var lastRaw = null;   // the JSON this tab last read or wrote

  // --- Normalizing (accepts v2, v1 and partial objects) ----------------------
  function str(v) { return typeof v === "string" ? v : (v == null ? "" : String(v)); }

  function normLink(l) {
    l = l || {};
    return { title: str(l.title).trim(), url: str(l.url).trim() };
  }
  function normStep(s) {
    s = s || {};
    return {
      id: str(s.id),
      title: str(s.title),
      note: str(s.note != null ? s.note : s.explanation),
      actions: Array.isArray(s.actions) ? s.actions.map(str).filter(function (a) { return a.trim(); }) : [],
      prompt: str(s.prompt),
      links: Array.isArray(s.links) ? s.links.map(normLink).filter(function (l) { return l.url || l.title; }) : []
    };
  }
  function normCollection(c) {
    c = c || {};
    return {
      id: str(c.id),
      name: str(c.name) || "Untitled collection",
      icon: PB.COLLECTION_ICONS.indexOf(c.icon) > -1 ? c.icon : "folder",
      desc: str(c.desc),
      steps: Array.isArray(c.steps) ? c.steps.map(normStep) : []
    };
  }
  /* Every id must be present, safe for selectors, and unique. Returns true if any id changed. */
  function fixIds(list) {
    var seen = {}, changed = false;
    function fix(obj) {
      if (!ID_RE.test(obj.id) || seen[obj.id]) { obj.id = u.uid(); changed = true; }
      seen[obj.id] = true;
    }
    list.forEach(function (c) { fix(c); c.steps.forEach(fix); });
    return changed;
  }
  function normAll(arr) { var list = arr.map(normCollection); return { list: list, changed: fixIds(list) }; }

  // The original guide stored "phases" with free-text steps or a body of lines.
  function shortLabel(t) { t = str(t).replace(/\s+/g, " ").trim(); return t.length > 60 ? t.slice(0, 57) + "…" : t; }
  function migratePhase(p) {
    var steps = [];
    if (Array.isArray(p.steps)) {
      p.steps.forEach(function (s) {
        if (s && s.type === "link") steps.push({ title: s.title || s.url || "Link", links: [{ title: s.title, url: s.url }] });
        else { var txt = str(s && (s.text || s.title)); steps.push({ title: shortLabel(txt), prompt: txt }); }
      });
    } else if (typeof p.body === "string") {
      p.body.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) {
        steps.push({ title: shortLabel(l), prompt: l });
      });
    }
    if (p.notes && str(p.notes).trim()) steps.push({ title: "Notes", note: str(p.notes) });
    return { name: p.name, desc: p.desc, steps: steps };
  }

  function readRaw(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function readJSON(key) { try { return JSON.parse(readRaw(key)); } catch (e) { return null; } }
  function nonEmptyArray(v) { return Array.isArray(v) && v.length ? v : null; }

  // --- Saving --------------------------------------------------------------
  function persist() {
    var raw = JSON.stringify(cols);
    try {
      localStorage.setItem(KEY, raw);
      lastRaw = raw;
      return true;
    } catch (e) {
      u.toast("Couldn't save. Browser storage is full or blocked. Export a backup from the ⋮ menu.", { error: true });
      return false;
    }
  }
  function persistUI() {
    try { localStorage.setItem(UI_KEY, JSON.stringify({ activeId: activeId })); } catch (e) { /* not critical */ }
  }

  /* Pick up changes another tab saved since we last read or wrote. Returns true if data changed. */
  function sync() {
    var raw = readRaw(KEY);
    if (raw === null || raw === lastRaw) return false;
    var arr; try { arr = JSON.parse(raw); } catch (e) { return false; }
    if (!Array.isArray(arr)) return false;
    var n = normAll(arr);
    cols = n.list; lastRaw = raw;
    if (!find(activeId)) activeId = cols[0] ? cols[0].id : null;
    return true;
  }

  // --- Loading ---------------------------------------------------------------
  /* Returns "v2" | "v1" | "phases" | "defaults" to say where the data came from. */
  function load() {
    var source, raw = readRaw(KEY), parsed = null;
    if (raw !== null) { try { parsed = JSON.parse(raw); } catch (e) { parsed = null; } }

    if (Array.isArray(parsed)) {
      var n = normAll(parsed); cols = n.list; source = "v2"; lastRaw = raw;
      if (n.changed) persist();
    } else {
      if (raw !== null) {   // unreadable current data: keep a copy before anything replaces it
        try { localStorage.setItem(KEY + ".corrupt-" + Date.now(), raw); } catch (e) { /* best effort */ }
      }
      var v1 = nonEmptyArray(readJSON(OLD_V1));
      var phases = nonEmptyArray(readJSON(OLD_PHASES[0])) || nonEmptyArray(readJSON(OLD_PHASES[1]));
      if (v1) { cols = normAll(v1).list; source = "v1"; }
      else if (phases) { cols = normAll(phases.map(migratePhase)).list; source = "phases"; }
      else { cols = normAll(PB.DEFAULT_COLLECTIONS()).list; source = "defaults"; }
      persist();
    }
    var ui = readJSON(UI_KEY);
    activeId = ui && ui.activeId && find(ui.activeId) ? ui.activeId : (cols[0] ? cols[0].id : null);
    return source;
  }

  // --- Queries ----------------------------------------------------------------
  function find(collId) { for (var i = 0; i < cols.length; i++) if (cols[i].id === collId) return cols[i]; return null; }
  function findStep(stepId) {
    for (var i = 0; i < cols.length; i++) {
      var steps = cols[i].steps;
      for (var j = 0; j < steps.length; j++) if (steps[j].id === stepId) return { coll: cols[i], step: steps[j], index: j };
    }
    return null;
  }
  function stepMatches(step, q) {
    var hay = [step.title, step.note, step.prompt, u.plainText(step.actions.join(" "))]
      .concat(step.links.map(function (l) { return l.title + " " + l.url; })).join(" ").toLowerCase();
    return hay.indexOf(q) > -1;
  }
  /* [{ coll, steps[] }] for every collection with a matching name or matching steps. */
  function search(query) {
    var q = query.trim().toLowerCase(), out = [];
    if (!q) return out;
    cols.forEach(function (c) {
      var nameHit = c.name.toLowerCase().indexOf(q) > -1;
      var steps = nameHit ? c.steps : c.steps.filter(function (s) { return stepMatches(s, q); });
      if (steps.length || nameHit) out.push({ coll: c, steps: steps });
    });
    return out;
  }

  // --- Collections -----------------------------------------------------------
  function addCollection(data) {
    sync();
    var c = normCollection(data); c.id = u.uid(); c.steps = [];
    cols.push(c);
    if (!persist()) { cols.pop(); return null; }
    activeId = c.id; persistUI();
    return c;
  }
  function updateCollection(id, patch) {
    sync();
    var c = find(id); if (!c) return null;
    var before = u.clone(c);
    if (patch.name != null) c.name = str(patch.name).trim() || "Untitled collection";
    if (patch.desc != null) c.desc = str(patch.desc).trim();
    if (patch.icon != null && PB.COLLECTION_ICONS.indexOf(patch.icon) > -1) c.icon = patch.icon;
    if (!persist()) { c.name = before.name; c.desc = before.desc; c.icon = before.icon; return null; }
    return c;
  }
  /* Returns an undo function, or null if saving failed. */
  function deleteCollection(id) {
    sync();
    var idx = -1;
    for (var i = 0; i < cols.length; i++) if (cols[i].id === id) idx = i;
    if (idx < 0) return null;
    var removed = cols.splice(idx, 1)[0], wasActive = activeId === id;
    if (!persist()) { cols.splice(idx, 0, removed); return null; }
    if (wasActive) activeId = cols[Math.min(idx, cols.length - 1)] ? cols[Math.min(idx, cols.length - 1)].id : null;
    persistUI();
    return function undo() {
      sync();
      if (find(removed.id)) return true;
      cols.splice(Math.min(idx, cols.length), 0, removed);
      if (!persist()) { cols.splice(cols.indexOf(removed), 1); return false; }
      if (wasActive) { activeId = removed.id; persistUI(); }
      return true;
    };
  }
  function setActive(id) { if (find(id)) { activeId = id; persistUI(); } }

  // --- Steps -----------------------------------------------------------------
  function addStep(collId, data) {
    sync();
    var c = find(collId); if (!c) { u.toast("That collection no longer exists.", { error: true }); return null; }
    var s = normStep(data); s.id = u.uid();
    c.steps.push(s);
    if (!persist()) { c.steps.pop(); return null; }
    return s;
  }
  function updateStep(stepId, data) {
    sync();
    var hit = findStep(stepId); if (!hit) { u.toast("That step was deleted in another tab.", { error: true }); return null; }
    var s = normStep(data); s.id = stepId;
    hit.coll.steps[hit.index] = s;
    if (!persist()) { hit.coll.steps[hit.index] = hit.step; return null; }
    return s;
  }
  /* Returns an undo function, or null if saving failed. */
  function deleteStep(stepId) {
    sync();
    var hit = findStep(stepId); if (!hit) return null;
    var collId = hit.coll.id, index = hit.index, step = hit.step;
    hit.coll.steps.splice(index, 1);
    if (!persist()) { hit.coll.steps.splice(index, 0, step); return null; }
    return function undo() {
      sync();
      if (findStep(step.id)) return true;
      var c = find(collId);
      if (!c) { u.toast("Can't undo: its collection was deleted.", { error: true }); return false; }
      c.steps.splice(Math.min(index, c.steps.length), 0, step);
      if (!persist()) { c.steps.splice(c.steps.indexOf(step), 1); return false; }
      return true;
    };
  }
  function duplicateStep(stepId) {
    sync();
    var hit = findStep(stepId); if (!hit) return null;
    var copy = u.clone(hit.step); copy.id = u.uid(); copy.title = (copy.title || "Untitled step") + " (copy)";
    hit.coll.steps.splice(hit.index + 1, 0, copy);
    if (!persist()) { hit.coll.steps.splice(hit.index + 1, 1); return null; }
    return copy;
  }
  function moveStep(stepId, delta) {
    sync();
    var hit = findStep(stepId); if (!hit) return false;
    var to = hit.index + delta, steps = hit.coll.steps;
    if (to < 0 || to >= steps.length) return false;
    steps.splice(hit.index, 1); steps.splice(to, 0, hit.step);
    if (!persist()) { steps.splice(to, 1); steps.splice(hit.index, 0, hit.step); return false; }
    return true;
  }

  // --- Backup ----------------------------------------------------------------
  function exportData() {
    sync();
    return { app: "playbooks", version: 2, exportedAt: new Date().toISOString(), collections: u.clone(cols) };
  }
  /* Accepts an export file ({ collections }) or a bare array (v1 or v2). Throws on bad input. */
  function parseImport(parsed) {
    var list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.collections) ? parsed.collections : null);
    if (!list || !list.length) throw new Error("This file has no playbooks in it.");
    if (!list.every(function (c) { return c && typeof c === "object" && (typeof c.name === "string" || Array.isArray(c.steps)); }))
      throw new Error("This file isn't a Playbooks export.");
    return normAll(list).list;
  }
  /* Replace everything. The replaced data is also kept under "playbooks.v2.beforeImport".
     Returns an undo function, or null if saving failed. */
  function replaceAll(newCols) {
    sync();
    var before = cols, beforeActive = activeId;
    try { localStorage.setItem(KEY + ".beforeImport", JSON.stringify(before)); } catch (e) { /* undo still works this session */ }
    cols = newCols;
    if (!persist()) { cols = before; return null; }
    activeId = cols[0] ? cols[0].id : null; persistUI();
    return function undo() {
      cols = before;
      if (!persist()) return false;
      activeId = find(beforeActive) ? beforeActive : (cols[0] ? cols[0].id : null); persistUI();
      return true;
    };
  }

  PB.store = {
    load: load, sync: sync,
    all: function () { return cols; },
    find: find, findStep: findStep, search: search,
    activeId: function () { return activeId; }, setActive: setActive,
    active: function () { return find(activeId); },
    addCollection: addCollection, updateCollection: updateCollection, deleteCollection: deleteCollection,
    addStep: addStep, updateStep: updateStep, deleteStep: deleteStep, duplicateStep: duplicateStep, moveStep: moveStep,
    exportData: exportData, parseImport: parseImport, replaceAll: replaceAll
  };
})(window.PB);
