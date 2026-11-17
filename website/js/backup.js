/* backup.js: export all playbooks to a .json file and import them back.
   Import replaces everything, after a confirm step, and can be undone from the toast. */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var u = PB.util;
  function pad(n) { return String(n).padStart(2, "0"); }

  function exportFile() {
    var data = PB.store.exportData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), d = new Date();
    var a = document.createElement("a");
    a.href = url;
    a.download = "playbooks-backup-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    var n = data.collections.length;
    u.toast("Exported " + n + (n === 1 ? " collection" : " collections"));
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () { u.toast("Couldn't read that file.", { error: true }); };
    reader.onload = function () {
      var cols;
      try { cols = PB.store.parseImport(JSON.parse(reader.result)); }
      catch (e) { u.toast(e instanceof SyntaxError ? "That file isn't valid JSON." : e.message, { error: true }); return; }
      confirmReplace(cols, file.name);
    };
    reader.readAsText(file);
  }

  function confirmReplace(cols, fileName) {
    var steps = cols.reduce(function (n, c) { return n + c.steps.length; }, 0);
    var m = PB.modal.open({
      title: "Import playbooks?",
      body: function () {
        return '<p class="note"><b>' + u.esc(fileName) + "</b> has " + cols.length + (cols.length === 1 ? " collection" : " collections") +
          " and " + steps + (steps === 1 ? " step" : " steps") + ".</p>" +
          '<p class="note">Importing <b>replaces</b> your current playbooks. You can undo it right after, and a copy of the replaced data is kept in this browser (<code>playbooks.v2.beforeImport</code>). To keep your own file, export first.</p>';
      },
      foot: function () {
        return '<button type="button" class="btn btn--ghost" data-export-first>' + PB.icon("download") + "Export current first</button>" +
          '<span class="sp"></span><button type="button" class="btn" data-close>Cancel</button>' +
          '<button type="button" class="btn btn--primary" data-confirm>Replace and import</button>';
      },
      onClick: function (e, b) {
        if (b.hasAttribute("data-export-first")) { exportFile(); return; }
        if (b.hasAttribute("data-confirm")) {
          var undo = PB.store.replaceAll(cols);
          if (!undo) return;   // not saved; error toast is showing
          m.close(true); PB.view.clearSearch(); PB.view.render();
          u.toast("Imported " + cols.length + (cols.length === 1 ? " collection" : " collections"), { action: "Undo", onAction: function () { undo(); PB.view.render(); } });
        }
      }
    });
  }

  PB.backup = { exportFile: exportFile, importFile: importFile };
})(window.PB);
