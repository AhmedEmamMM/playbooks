/* appearance.js: look-and-feel options, stored in localStorage "playbooks.appearance".
   Each option becomes a data attribute on <html> (e.g. data-pal="graphite"); the CSS in
   theme.css and app.css reacts to it. Loaded in <head> so the saved look applies before first paint.
   To add an option: add it to OPTIONS + DEFAULTS, then style [data-yourkey="value"] in CSS. */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  var KEY = "playbooks.appearance";

  var PALETTES = [
    { value: "graphite", label: "Graphite", sw: ["#EBECEE", "#1F2430", "#888C95", "#111318"] },
    { value: "cobalt",   label: "Cobalt",   sw: ["#ECEFF3", "#2F6BFF", "#8A93A3", "#161B26"] },
    { value: "teal",     label: "Teal",     sw: ["#EAEEED", "#0E7C6B", "#86938F", "#14201E"] },
    { value: "indigo",   label: "Indigo",   sw: ["#EDEDF1", "#4F46E5", "#8A8AA0", "#17172A"] },
    { value: "forest",   label: "Forest",   sw: ["#ECEEEA", "#2F7A45", "#879184", "#18201A"] },
    { value: "sunset",   label: "Sunset",   sw: ["#F0EEEC", "#D9480F", "#968B84", "#211A16"] },
    { value: "rose",     label: "Rose",     sw: ["#F0EDEF", "#C2255C", "#968894", "#221722"] },
    { value: "violet",   label: "Violet",   sw: ["#EEEDF2", "#7C3AED", "#8E88A0", "#1B1726"] }
  ];

  var GROUPS = [
    { title: "Layout", options: [
      { key: "var", label: "List style", choices: [["cards", "Cards"], ["joined", "Joined"], ["dense", "Dense"], ["tabs", "Tabs on top"]] },
      { key: "sidebar", label: "Sidebar", choices: [["panel", "White"], ["plain", "Open"], ["dark", "Dark"], ["rail", "Icons"]] },
      { key: "top", label: "Top bar", choices: [["white", "White"], ["blend", "Blended"], ["dark", "Dark"]] },
      { key: "width", label: "Page width", choices: [["full", "Full"], ["narrow", "Centered"]] }
    ]},
    { title: "Colors", options: [
      { key: "pal", label: "Palette", palette: true },
      { key: "depth", label: "Background shade", choices: [["light", "Lighter"], ["normal", "Normal"], ["medium", "Darker grey"]] },
      { key: "code", label: "Prompt box", choices: [["light", "Light"], ["dark", "Dark"]] },
      { key: "hl", label: "Highlight color", hint: "Action numbers, tags and links.", choices: [["blue", "Blue"], ["orange", "Orange"], ["green", "Green"], ["grey", "Grey"]] }
    ]},
    { title: "Cards and text", options: [
      { key: "card", label: "Card style", hint: "Used when List style is Cards.", choices: [["shadow", "Shadow"], ["border", "Bordered"], ["flat", "Flat"], ["outline", "Outline"]] },
      { key: "radius", label: "Corners", choices: [["sharp", "Sharp"], ["medium", "Medium"], ["round", "Round"]] },
      { key: "font", label: "Font", choices: [["mixed", "Geist + Inter"], ["geist", "Geist"], ["grotesk", "Space Grotesk"], ["plex", "IBM Plex"]] },
      { key: "num", label: "Step numbers", choices: [["circle", "Circle"], ["plain", "Plain"], ["none", "Hidden"]] },
      { key: "peek", label: "Preview line under title", choices: [["on", "Show"], ["off", "Hide"]] }
    ]}
  ];

  /* The look chosen in the mockups (2026-11-17). */
  var DEFAULTS = {
    var: "cards", pal: "graphite", depth: "medium", code: "dark", top: "white", sidebar: "panel",
    card: "shadow", radius: "round", font: "mixed", hl: "blue", num: "circle", peek: "on", width: "full"
  };

  function valid(key, value) {
    if (key === "pal") return PALETTES.some(function (p) { return p.value === value; });
    for (var g = 0; g < GROUPS.length; g++) for (var o = 0; o < GROUPS[g].options.length; o++) {
      var opt = GROUPS[g].options[o];
      if (opt.key === key && opt.choices) return opt.choices.some(function (c) { return c[0] === value; });
    }
    return false;
  }

  var current = {};
  function load() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { saved = {}; }
    current = {};
    Object.keys(DEFAULTS).forEach(function (k) { current[k] = valid(k, saved[k]) ? saved[k] : DEFAULTS[k]; });
  }
  function apply() {
    var root = document.documentElement;
    Object.keys(current).forEach(function (k) { root.setAttribute("data-" + k, current[k]); });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (e) { /* look still applies this session */ } }
  function set(key, value) { if (!valid(key, value)) return; current[key] = value; apply(); save(); }
  function reset() { current = Object.assign({}, DEFAULTS); apply(); save(); }

  // --- Appearance panel (uses PB.modal, loaded later) -------------------------
  function panelBody() {
    var esc = PB.util.esc;
    return GROUPS.map(function (g) {
      return '<div class="field"><span class="blk__lbl">' + esc(g.title.toUpperCase()) + '</span><div class="opts">' +
        g.options.map(function (o) {
          var control;
          if (o.palette) {
            control = '<div class="pals" role="group" aria-label="Palette">' + PALETTES.map(function (p) {
              return '<button type="button" class="pal" data-opt="pal" data-val="' + p.value + '" aria-pressed="' + (current.pal === p.value) + '"><span class="pal__sw">' +
                p.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span>" + esc(p.label) + "</button>";
            }).join("") + "</div>";
          } else {
            control = '<div class="seg" role="group" aria-label="' + esc(o.label) + '">' + o.choices.map(function (c) {
              return '<button type="button" data-opt="' + o.key + '" data-val="' + c[0] + '" aria-pressed="' + (current[o.key] === c[0]) + '">' + esc(c[1]) + "</button>";
            }).join("") + "</div>";
          }
          return '<div class="opt' + (o.palette ? '" style="grid-column:1/-1' : "") + '"><span class="lbl">' + esc(o.label) + "</span>" + control +
            (o.hint ? '<span class="hint">' + esc(o.hint) + "</span>" : "") + "</div>";
        }).join("") + "</div></div>";
    }).join("");
  }

  function openPanel() {
    var m = PB.modal.open({
      title: "Appearance",
      wide: true,
      closeOnScrim: true,
      body: panelBody,
      foot: function () {
        return '<button type="button" class="btn btn--ghost" data-reset>' + PB.icon("rotate-ccw") + "Reset to my defaults</button>" +
          '<span class="sp"></span><button type="button" class="btn btn--primary" data-close>Done</button>';
      },
      onClick: function (e, btn) {
        if (btn.hasAttribute("data-opt")) { set(btn.getAttribute("data-opt"), btn.getAttribute("data-val")); m.rerender(); return; }
        if (btn.hasAttribute("data-reset")) { reset(); m.rerender(); PB.util.toast("Appearance reset"); }
      }
    });
  }

  load();
  apply();

  PB.appearance = { get: function () { return Object.assign({}, current); }, set: set, reset: reset, openPanel: openPanel, DEFAULTS: DEFAULTS };
})(window.PB);
