/* step-modal.js: add or edit a step.
   A step has a title, an optional note, and any mix of: actions, prompt, links.
   PB.stepModal.open({ collId })            -> new step in that collection
   PB.stepModal.open({ stepId })            -> edit an existing step
   Calls PB.view.render() after saving or deleting. */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var u = PB.util, ic = PB.icon, esc = u.esc;

  function open(opts) {
    var isNew = !opts.stepId;
    var hit = isNew ? null : PB.store.findStep(opts.stepId);
    if (!isNew && !hit) { u.toast("That step no longer exists.", { error: true }); return; }

    var src = isNew ? { title: "", note: "", actions: [], prompt: "", links: [] } : u.clone(hit.step);
    var d = {
      title: src.title, note: src.note, actions: src.actions.slice(), prompt: src.prompt, links: src.links.slice(),
      showA: src.actions.length > 0, showP: !!src.prompt, showL: src.links.length > 0
    };
    if (isNew && !d.showA && !d.showP && !d.showL) d.showP = true;   // most steps hold a prompt
    var initial = snapshot(), armedDelete = false, armedDiscard = false, titleError = false;

    function snapshot() {
      return JSON.stringify([d.title, d.note, d.showA ? d.actions : [], d.showP ? d.prompt : "", d.showL ? d.links : []]);
    }
    function dirty() { return snapshot() !== initial; }

    function body() {
      var h = '<div class="field"><label for="m-title">Title</label>' +
        '<input class="in in--title" id="m-title" data-f="title" value="' + esc(d.title) + '" placeholder="e.g. Collect design references" autocomplete="off"' + (titleError ? ' aria-invalid="true" aria-describedby="m-title-err"' : "") + ">" +
        (titleError ? '<span class="hint" id="m-title-err" style="color:var(--danger)">Give the step a title.</span>' : "") + "</div>" +
        '<div class="field"><label for="m-note">Note <span class="hint">(optional)</span></label>' +
        '<input class="in" id="m-note" data-f="note" value="' + esc(d.note) + '" placeholder="A reminder of why or when you do this" autocomplete="off"></div>';

      if (d.showA) {
        h += '<div class="sect sect--a"><div class="sect__head"><span class="sect__ic">' + ic("list-ordered") + '</span><span class="lbl">Actions</span><span class="sp"></span>' +
          '<button type="button" class="mini mini--x" data-rmsect="A" aria-label="Remove actions" title="Remove actions">' + ic("x") + "</button></div>";
        d.actions.forEach(function (a, k) {
          h += '<div class="arow"><span class="arow__n">' + (k + 1) + "</span>" +
            '<input class="in" data-f="a:' + k + '" value="' + esc(a) + '" placeholder="e.g. Open [Pinterest](pinterest.com) and search `saas ui`" aria-label="Action ' + (k + 1) + '" autocomplete="off">' +
            '<button type="button" class="mini" data-amove="' + k + ':-1"' + (k === 0 ? " disabled" : "") + ' aria-label="Move action up">' + ic("chevron-up") + "</button>" +
            '<button type="button" class="mini" data-amove="' + k + ':1"' + (k === d.actions.length - 1 ? " disabled" : "") + ' aria-label="Move action down">' + ic("chevron-down") + "</button>" +
            '<button type="button" class="mini mini--x" data-arm="' + k + '" aria-label="Remove action">' + ic("x") + "</button></div>";
        });
        h += '<button type="button" class="addrow" data-aadd>' + ic("plus") + "Add action</button>" +
          '<span class="hint">Press Enter for the next action. Wrap things to copy in <code>`backticks`</code>, like folder names or search words. Links: <code>[label](site.com)</code>.</span></div>';
      }
      if (d.showP) {
        h += '<div class="sect sect--p"><div class="sect__head"><span class="sect__ic">' + ic("sparkles") + '</span><label class="lbl" for="m-prompt">Prompt</label><span class="sp"></span>' +
          '<button type="button" class="mini mini--x" data-rmsect="P" aria-label="Remove prompt" title="Remove prompt">' + ic("x") + "</button></div>" +
          '<textarea class="in in--mono" id="m-prompt" data-f="prompt" rows="7" placeholder="Paste the exact prompt or command…" spellcheck="false">' + esc(d.prompt) + "</textarea>" +
          '<span class="hint">The Copy button copies exactly this text.</span></div>';
      }
      if (d.showL) {
        h += '<div class="sect sect--l"><div class="sect__head"><span class="sect__ic">' + ic("link") + '</span><span class="lbl">Links</span><span class="sp"></span>' +
          '<button type="button" class="mini mini--x" data-rmsect="L" aria-label="Remove links" title="Remove links">' + ic("x") + "</button></div>";
        d.links.forEach(function (l, k) {
          h += '<div class="arow"><input class="in" data-f="lt:' + k + '" value="' + esc(l.title) + '" placeholder="Name, e.g. Pinterest" aria-label="Link ' + (k + 1) + ' name" autocomplete="off">' +
            '<input class="in in--mono" data-f="lu:' + k + '" value="' + esc(l.url) + '" placeholder="pinterest.com" aria-label="Link ' + (k + 1) + ' address" autocomplete="off">' +
            '<button type="button" class="mini mini--x" data-lrm="' + k + '" aria-label="Remove link">' + ic("x") + "</button></div>";
        });
        h += '<button type="button" class="addrow" data-ladd>' + ic("plus") + "Add link</button></div>";
      }

      var adders = "";
      if (!d.showA) adders += '<button type="button" class="adder" data-addsect="A">' + ic("list-ordered") + "Actions</button>";
      if (!d.showP) adders += '<button type="button" class="adder" data-addsect="P">' + ic("sparkles") + "Prompt</button>";
      if (!d.showL) adders += '<button type="button" class="adder" data-addsect="L">' + ic("link") + "Links</button>";
      if (adders) h += '<div class="field"><span class="lbl">Add to this step</span><div class="adders">' + adders + "</div></div>";
      return h;
    }

    function foot() {
      return (isNew ? '<small>Ctrl+Enter to save</small>'
        : '<button type="button" class="btn btn--danger' + (armedDelete ? " is-armed" : "") + '" data-mdel>' + ic("trash-2") + (armedDelete ? "Click again to delete" : "Delete step") + "</button>") +
        '<span class="sp"></span><button type="button" class="btn" data-close>Cancel</button>' +
        '<button type="button" class="btn btn--primary" data-save>' + (isNew ? "Add step" : "Save changes") + "</button>";
    }

    function save() {
      if (!d.title.trim()) { titleError = true; m.rerender("#m-title"); return; }
      var data = {
        title: d.title.trim(), note: d.note.trim(),
        actions: d.showA ? d.actions.map(function (a) { return a.trim(); }).filter(Boolean) : [],
        prompt: d.showP ? d.prompt.replace(/\s+$/, "") : "",
        links: d.showL ? d.links.filter(function (l) { return l.url.trim() || l.title.trim(); }) : []
      };
      var step = isNew ? PB.store.addStep(opts.collId, data) : PB.store.updateStep(opts.stepId, data);
      if (!step) return;   // not saved: the error toast is showing and the dialog stays open with your text
      if (isNew) PB.view.setOpen(step.id, true);
      m.close(true);
      PB.view.render();
      PB.view.reveal(step.id);
      u.toast(isNew ? "Step added" : "Step saved");
    }

    var m = PB.modal.open({
      title: isNew ? "New step" : "Edit step",
      body: body, foot: foot,
      beforeClose: function () {
        if (!dirty() || armedDiscard) return true;
        armedDiscard = true;
        u.toast("You have unsaved changes. Close again to discard them.");
        return false;
      },
      onInput: function (e) {
        var f = e.target.getAttribute("data-f"); if (!f) return;
        var v = e.target.value;
        if (f.indexOf("a:") === 0) d.actions[+f.slice(2)] = v;
        else if (f.indexOf("lt:") === 0) d.links[+f.slice(3)].title = v;
        else if (f.indexOf("lu:") === 0) d.links[+f.slice(3)].url = v;
        else d[f] = v;
        armedDiscard = false;
        if (f === "title" && titleError && v.trim()) { titleError = false; m.rerender(); }
      },
      onKeydown: function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); return true; }
        var f = e.target.getAttribute && e.target.getAttribute("data-f");
        if (e.key === "Enter" && f && f.indexOf("a:") === 0) {
          e.preventDefault();
          var k = +f.slice(2); d.actions.splice(k + 1, 0, ""); m.rerender('[data-f="a:' + (k + 1) + '"]');
          return true;
        }
        if (e.key === "Backspace" && f && f.indexOf("a:") === 0 && e.target.value === "" && d.actions.length > 1) {
          e.preventDefault();
          var j = +f.slice(2); d.actions.splice(j, 1); m.rerender('[data-f="a:' + Math.max(0, j - 1) + '"]');
          return true;
        }
        return false;
      },
      onClick: function (e, b) {
        var focus = null;
        if (b.hasAttribute("data-save")) { save(); return; }
        if (b.hasAttribute("data-mdel")) {
          if (!armedDelete) { armedDelete = true; m.rerender("[data-mdel]"); return; }
          var undo = PB.store.deleteStep(opts.stepId);
          if (!undo) return;
          m.close(true); PB.view.render();
          u.toast("Step deleted", { action: "Undo", onAction: function () { undo(); PB.view.render(); } });
          return;
        }
        var add = b.getAttribute("data-addsect"), rm = b.getAttribute("data-rmsect");
        if (add) {
          d["show" + add] = true;
          if (add === "A") { if (!d.actions.length) d.actions.push(""); focus = '[data-f="a:0"]'; }
          if (add === "P") focus = "#m-prompt";
          if (add === "L") { if (!d.links.length) d.links.push({ title: "", url: "" }); focus = '[data-f="lt:0"]'; }
        } else if (rm) {
          d["show" + rm] = false;
        } else if (b.hasAttribute("data-aadd")) {
          d.actions.push(""); focus = '[data-f="a:' + (d.actions.length - 1) + '"]';
        } else if (b.hasAttribute("data-arm")) {
          d.actions.splice(+b.getAttribute("data-arm"), 1); if (!d.actions.length) d.showA = false;
        } else if (b.hasAttribute("data-amove")) {
          var p = b.getAttribute("data-amove").split(":"), k = +p[0], to = k + +p[1], t = d.actions[k];
          d.actions[k] = d.actions[to]; d.actions[to] = t;
          var atEdge = (p[1] === "-1" && to === 0) || (p[1] === "1" && to === d.actions.length - 1);
          focus = atEdge ? '[data-f="a:' + to + '"]' : '[data-amove="' + to + ":" + p[1] + '"]';   // never focus a disabled arrow
        } else if (b.hasAttribute("data-ladd")) {
          d.links.push({ title: "", url: "" }); focus = '[data-f="lt:' + (d.links.length - 1) + '"]';
        } else if (b.hasAttribute("data-lrm")) {
          d.links.splice(+b.getAttribute("data-lrm"), 1); if (!d.links.length) d.showL = false;
        } else return;
        armedDelete = false; armedDiscard = false;
        m.rerender(focus);
      }
    });
  }

  PB.stepModal = { open: open };
})(window.PB);
