/* app.js: starts the app and wires the top bar (search, ⋮ menu, new collection) and shortcuts.
   Shortcuts:  /  focus search  ·  Esc  clear search / close menu  ·  Ctrl+Enter  save in a dialog */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var u = PB.util;
  var search = document.querySelector("[data-search]");
  var searchClear = document.querySelector("[data-search-clear]");
  var menuBtn = document.querySelector("[data-topmenu-btn]");
  var menu = document.querySelector("[data-topmenu]");
  var fileInput = document.querySelector("[data-import-file]");

  PB.hydrateIcons(document);
  PB.view.init(document.querySelector("[data-root]"));

  var source = PB.store.load();
  PB.view.render();
  if (source === "v1") u.toast("Your playbooks were moved to the new layout. The old copy is kept as a backup.");
  if (source === "phases") u.toast("Your old guide phases were imported as collections.");

  // --- Search ------------------------------------------------------------------
  var searchTimer = null;
  search.addEventListener("input", function () {
    searchClear.hidden = !search.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { PB.view.setQuery(search.value); }, 120);
  });
  search.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); PB.view.clearSearch(); PB.view.render(); search.blur(); }
  });
  searchClear.addEventListener("click", function () { PB.view.clearSearch(); PB.view.render(); search.focus(); });

  // --- Top menu -------------------------------------------------------------
  function setMenu(open) {
    menu.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("button").focus();
  }
  menuBtn.addEventListener("click", function (e) { e.stopPropagation(); PB.view.closeMenu(); setMenu(menu.hidden); });
  document.addEventListener("click", function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn) setMenu(false); });
  menu.addEventListener("keydown", function (e) {
    var items = Array.prototype.slice.call(menu.querySelectorAll("button")), i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); setMenu(false); menuBtn.focus(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
  });
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    setMenu(false);
    var action = b.getAttribute("data-action");
    if (action === "appearance") PB.appearance.openPanel();
    if (action === "export") PB.backup.exportFile();
    if (action === "import") fileInput.click();
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) PB.backup.importFile(fileInput.files[0]);
    fileInput.value = "";
  });
  document.querySelector("[data-top-newcoll]").addEventListener("click", function () { PB.collectionModal.open(); });

  // --- Global shortcuts ------------------------------------------------------
  document.addEventListener("keydown", function (e) {
    if (PB.modal.isOpen()) return;
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); search.focus(); search.select(); }
  });

  // Data saved in another tab: show it. (Every change also re-reads saved data first, so tabs never
  // overwrite each other.) While a dialog is open, wait until it closes.
  var pendingSync = false;
  window.addEventListener("storage", function (e) {
    if (e.key !== "playbooks.v2") return;
    if (PB.modal.isOpen()) { pendingSync = true; return; }
    if (PB.store.sync()) PB.view.render();
  });
  document.addEventListener("pb:modalclose", function () {
    if (pendingSync) { pendingSync = false; if (PB.store.sync()) PB.view.render(); }
  });
})(window.PB);
