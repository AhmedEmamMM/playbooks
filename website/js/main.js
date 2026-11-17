/* main.js — interactions shared across pages */

(function () {
  "use strict";

  // Swap [data-lucide] placeholders for local inline SVGs (no network, no flash)
  if (window.hydrateIcons) window.hydrateIcons(document);

  // Mobile nav toggle
  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
  }

  // Theme toggle (dark <-> light) with persistence
  var root = document.documentElement;
  var saved = localStorage.getItem("theme");
  if (saved === "light") root.setAttribute("data-theme", "light");

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      if (next === "dark") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", "light");
      localStorage.setItem("theme", next);
    });
  });
})();
