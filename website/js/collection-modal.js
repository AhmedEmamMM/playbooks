/* collection-modal.js: create or edit a collection (name, description, icon), or delete it.
   PB.collectionModal.open()          -> new collection
   PB.collectionModal.open(collId)    -> edit */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var u = PB.util, ic = PB.icon, esc = u.esc;

  function open(collId) {
    var isNew = !collId;
    var c = isNew ? null : PB.store.find(collId);
    if (!isNew && !c) return;
    var d = { name: isNew ? "" : c.name, desc: isNew ? "" : c.desc, icon: isNew ? "folder" : c.icon };
    var armed = false, nameError = false, armedDiscard = false;
    var initial = JSON.stringify(d);

    function body() {
      return '<div class="field"><label for="m-name">Name</label>' +
        '<input class="in in--title" id="m-name" data-f="name" value="' + esc(d.name) + '" placeholder="e.g. Deployment" autocomplete="off"' + (nameError ? ' aria-invalid="true"' : "") + ">" +
        (nameError ? '<span class="hint" style="color:var(--danger)">Give the collection a name.</span>' : "") + "</div>" +
        '<div class="field"><label for="m-desc">Description <span class="hint">(optional)</span></label>' +
        '<textarea class="in" id="m-desc" data-f="desc" rows="2" style="min-height:70px" placeholder="What is this collection for?">' + esc(d.desc) + "</textarea></div>" +
        '<div class="field"><span class="lbl">Icon</span><div class="icons" role="group" aria-label="Icon">' +
        PB.COLLECTION_ICONS.map(function (n) {
          return '<button type="button" data-icon-pick="' + n + '" aria-pressed="' + (d.icon === n) + '" aria-label="' + n + '" title="' + n + '">' + ic(n) + "</button>";
        }).join("") + "</div></div>";
    }
    function foot() {
      var stepCount = c ? c.steps.length : 0;
      return (isNew ? "" : '<button type="button" class="btn btn--danger' + (armed ? " is-armed" : "") + '" data-mdel>' + ic("trash-2") +
          (armed ? "Delete " + stepCount + (stepCount === 1 ? " step" : " steps") + "? Click again" : "Delete collection") + "</button>") +
        '<span class="sp"></span><button type="button" class="btn" data-close>Cancel</button>' +
        '<button type="button" class="btn btn--primary" data-save>' + (isNew ? "Create" : "Save") + "</button>";
    }
    function save() {
      if (!d.name.trim()) { nameError = true; m.rerender("#m-name"); return; }
      var saved = isNew ? PB.store.addCollection(d) : PB.store.updateCollection(collId, d);
      if (!saved) return;   // error toast is showing; keep the dialog open
      m.close(true); PB.view.clearSearch(); PB.view.render();
      u.toast(isNew ? "Collection created" : "Collection saved");
    }

    var m = PB.modal.open({
      title: isNew ? "New collection" : "Edit collection",
      body: body, foot: foot,
      beforeClose: function () {
        if (JSON.stringify(d) === initial || armedDiscard) return true;
        armedDiscard = true;
        u.toast("You have unsaved changes. Close again to discard them.");
        return false;
      },
      onInput: function (e) {
        armedDiscard = false;
        var f = e.target.getAttribute("data-f"); if (f) d[f] = e.target.value;
        if (f === "name" && nameError && d.name.trim()) { nameError = false; m.rerender(); }
      },
      onKeydown: function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey || e.target.id === "m-name")) { e.preventDefault(); save(); return true; }
        return false;
      },
      onClick: function (e, b) {
        if (b.hasAttribute("data-save")) { save(); return; }
        if (b.hasAttribute("data-icon-pick")) { d.icon = b.getAttribute("data-icon-pick"); armed = false; m.rerender(); return; }
        if (b.hasAttribute("data-mdel")) {
          if (!armed) { armed = true; m.rerender("[data-mdel]"); return; }
          var name = c.name, undo = PB.store.deleteCollection(collId);
          if (!undo) return;
          m.close(true); PB.view.render();
          u.toast("Deleted “" + name + "”", { action: "Undo", onAction: function () { undo(); PB.view.render(); } });
        }
      }
    });
  }

  PB.collectionModal = { open: open };
})(window.PB);
