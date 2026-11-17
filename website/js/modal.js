/* modal.js: one reusable dialog used by the step, collection and appearance editors.

   var m = PB.modal.open({
     title: "Edit step",            // string or function returning a string
     body: fn -> html, foot: fn -> html,
     wide: false, closeOnScrim: false,
     onClick(e, button), onInput(e), onKeydown(e) -> return true to stop default handling,
     beforeClose() -> return false to keep it open (e.g. unsaved changes), onClose()
   });
   m.rerender(focusSelector?)   m.close()   m.el (the .modal element)

   Esc closes. Tab stays inside the dialog. Focus returns to where it was on close.
   Only one modal is open at a time. */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var openModal = null;

  function open(cfg) {
    if (openModal) openModal.close();
    var returnFocus = document.activeElement;
    var scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.innerHTML = '<div class="modal' + (cfg.wide ? " modal--wide" : "") + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal__head"><h2 id="modal-title"></h2><button type="button" class="mini" data-close aria-label="Close">' + PB.icon("x") + "</button></div>" +
      '<div class="modal__body"></div><div class="modal__foot"></div></div>';
    document.body.appendChild(scrim);
    document.body.style.overflow = "hidden";

    var modalEl = scrim.querySelector(".modal");
    var api = {
      el: modalEl,
      rerender: function (focusSel) {
        var body = modalEl.querySelector(".modal__body"), scroll = body.scrollTop;
        var active = document.activeElement, activeKey = active && modalEl.contains(active) ? keyOf(active) : null;
        modalEl.querySelector("#modal-title").textContent = typeof cfg.title === "function" ? cfg.title() : cfg.title;
        body.innerHTML = cfg.body();
        modalEl.querySelector(".modal__foot").innerHTML = cfg.foot ? cfg.foot() : "";
        body.scrollTop = scroll;
        var target = focusSel ? modalEl.querySelector(focusSel) : (activeKey ? modalEl.querySelector(activeKey) : null);
        if (target) target.focus();
      },
      /* close(true) skips cfg.beforeClose (used after a successful save). */
      close: function (force) {
        if (openModal !== api) return;
        if (!force && cfg.beforeClose && cfg.beforeClose() === false) return;
        openModal = null;
        document.removeEventListener("keydown", onKey, true);
        scrim.remove();
        document.body.style.overflow = "";
        if (cfg.onClose) cfg.onClose();
        document.dispatchEvent(new CustomEvent("pb:modalclose"));
        if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      }
    };

    // Keep focus on "the same" control after a rerender (matched by its data attributes).
    function keyOf(node) {
      var attrs = ["data-f", "data-opt", "data-icon-pick", "data-addsect", "data-reset", "data-mdel", "data-save"];
      for (var i = 0; i < attrs.length; i++) {
        if (node.hasAttribute(attrs[i])) {
          var v = node.getAttribute(attrs[i]), sel = "[" + attrs[i] + (v ? '="' + v.replace(/"/g, '\\"') + '"' : "") + "]";
          if (attrs[i] === "data-opt") sel += '[data-val="' + node.getAttribute("data-val") + '"]';
          return sel;
        }
      }
      return null;
    }

    function onKey(e) {
      if (openModal !== api) return;
      if (cfg.onKeydown && cfg.onKeydown(e)) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); api.close(); return; }
      if (e.key === "Tab") {
        var f = modalEl.querySelectorAll('button:not(:disabled), input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);

    scrim.addEventListener("mousedown", function (e) {
      if (e.target === scrim && cfg.closeOnScrim) api.close();
    });
    modalEl.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn || !modalEl.contains(btn)) return;
      if (btn.hasAttribute("data-close")) { api.close(); return; }
      if (cfg.onClick) cfg.onClick(e, btn);
    });
    if (cfg.onInput) modalEl.addEventListener("input", cfg.onInput);

    openModal = api;
    api.rerender();
    var firstField = modalEl.querySelector(".modal__body input, .modal__body textarea, .modal__body button");
    if (firstField) firstField.focus();
    return api;
  }

  PB.modal = { open: open, isOpen: function () { return !!openModal; } };
})(window.PB);
