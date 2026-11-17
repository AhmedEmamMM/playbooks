/* util.js: small shared helpers (escaping, links, clipboard, toast, rich action text). */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var util = {};

  util.uid = function () { return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  util.clone = function (x) { return JSON.parse(JSON.stringify(x)); };

  /* Escape text for use inside HTML content or a double-quoted attribute. */
  util.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* Only ever produce http(s) links. "example.com" becomes "https://example.com". */
  util.safeHref = function (url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return "https://" + u.replace(/^[a-z][a-z0-9+.-]*:\/*/i, "");
  };
  util.prettyUrl = function (url) { return String(url || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, ""); };

  util.lineCount = function (text) { return text ? String(text).split("\n").length : 0; };

  /* Action text -> HTML: `x` = copy chip, [label](url) = link, bare http(s) URL = link. */
  util.richText = function (text) {
    var re = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<]+)/g;
    var out = "", last = 0, m, t = String(text || "");
    while ((m = re.exec(t))) {
      out += util.esc(t.slice(last, m.index));
      if (m[1] != null) {
        out += '<button type="button" class="chip" data-chip="' + util.esc(m[1]) + '" title="Click to copy">' + util.esc(m[1]) + PB.icon("copy") + "</button>";
      } else {
        var url = m[3] || m[4], label = m[2] || util.prettyUrl(m[4]);
        out += '<a class="lk" href="' + util.esc(util.safeHref(url)) + '" target="_blank" rel="noopener noreferrer">' + util.esc(label) + PB.icon("external-link") + "</a>";
      }
      last = re.lastIndex;
    }
    return out + util.esc(t.slice(last));
  };

  /* Action text without markup, for the one-line preview and search. */
  util.plainText = function (text) {
    return String(text || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "");
  };

  /* Copy text to the clipboard. Calls done(true|false). */
  util.copy = function (text, done) {
    done = done || function () {};
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else fallback();
  };

  /* Toast: util.toast("Saved") · util.toast("Deleted", { action: "Undo", onAction: fn }) · { error: true } */
  var toastEl = null, toastTimer = null;
  util.toast = function (msg, opts) {
    opts = opts || {};
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.className = "toast" + (opts.error ? " toast--error" : "") + (opts.action ? "" : " toast--plain");
    toastEl.innerHTML = "<span>" + util.esc(msg) + "</span>" + (opts.action ? '<button type="button">' + util.esc(opts.action) + "</button>" : "");
    if (opts.action) {
      toastEl.querySelector("button").addEventListener("click", function () {
        hide(); if (opts.onAction) opts.onAction();
      });
    }
    void toastEl.offsetWidth;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, opts.action ? 6000 : (opts.error ? 5000 : 1800));
    function hide() { toastEl.classList.remove("is-show"); }
  };

  /* Brief "Copied" state on a button. */
  util.flashCopied = function (btn, label) {
    btn.classList.add("is-copied");
    var span = btn.querySelector("span"), old = span ? span.textContent : null;
    if (span && label) span.textContent = label;
    setTimeout(function () { btn.classList.remove("is-copied"); if (span && old != null) span.textContent = old; }, 1200);
  };

  PB.util = util;
})(window.PB);
