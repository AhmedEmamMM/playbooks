// End-to-end check of website/index.html over file:// with Playwright.
// Run:  cd tests && npm install && npm test   (screenshots + export land in tests/output/)
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
// Optional: point PW_CHROME at a Chrome/Chromium exe if Playwright's own browser is not installed.
const CHROME = process.env.PW_CHROME || undefined;

const SITE = path.resolve(__dirname, "../website").replace(/\\/g, "/");
const URL = "file:///" + SITE.split("/").map(encodeURIComponent).join("/").replace(/^([A-Za-z])%3A/, "$1:") + "/index.html";
const OUT = path.join(__dirname, "output"); fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ " + msg); } };

const LONG = Array.from({ length: 60 }, (_, i) => "Line " + (i + 1) + " of a very long prompt that keeps going and going.").join("\n");
const V1 = [
  { id: "c1", name: "Deployment", icon: "rocket", desc: "Ship it", tags: ["Vercel"], steps: [
    { id: "s1", title: "Long one", explanation: "Explained here", prompt: LONG, links: [{ title: "Docs", url: "vercel.com/docs" }], done: true },
    { id: "s2", title: "Short one", explanation: "", prompt: "vercel --prod", links: [], done: false }
  ]},
  { id: "c2", name: "Database", icon: "database", desc: "", steps: [] }
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  const toast = async () => (await page.locator(".toast").textContent()) || "";

  console.log("1. First run (empty storage)");
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  ok(await page.locator(".coll").count() >= 3, "sample collections render");
  const attrs = await page.evaluate(() => ["var","pal","depth","code","card","radius","hl"].map(k => document.documentElement.dataset[k]).join(","));
  ok(attrs === "cards,graphite,medium,dark,shadow,round,blue", "default appearance = chosen look (" + attrs + ")");
  ok(await page.locator("text=Do it step by step").count() === 0, "no 'Do it' focus mode");
  ok(await page.locator(".check, .pstep__check").count() === 0, "no done checkboxes");
  await page.screenshot({ path: path.join(OUT, "01-desktop-defaults.png") });

  console.log("2. Migration from v1 data");
  await page.evaluate(v1 => { localStorage.clear(); localStorage.setItem("visionare.playbooks.v1", JSON.stringify(v1)); }, V1);
  await page.reload();
  ok((await page.locator(".coll__n").allTextContents()).join("|") === "Deployment|Database", "v1 collections migrated");
  ok((await toast()).includes("moved to the new layout"), "migration toast shown");
  const stored = await page.evaluate(() => ({ v2: JSON.parse(localStorage.getItem("playbooks.v2")), v1: localStorage.getItem("visionare.playbooks.v1") }));
  ok(stored.v1 !== null, "old v1 data kept as backup");
  ok(stored.v2[0].steps[0].note === "Explained here" && !("done" in stored.v2[0].steps[0]), "explanation→note, done dropped");

  console.log("3. Long prompt stays compact");
  const row = page.locator('.item[data-id="s1"]');
  const collapsedH = (await row.boundingBox()).height;
  ok(collapsedH < 90, "collapsed card is one row (" + Math.round(collapsedH) + "px) with a 60-line prompt");
  await row.locator(".item__open").click();
  const openH = (await row.boundingBox()).height;
  const preH = await row.locator("pre").evaluate(p => p.clientHeight);
  ok(preH <= 240, "prompt box capped at 240px (" + preH + "px) for a 60-line prompt");
  ok(openH < 650, "expanded card (note + capped prompt + link + edit) stays short (" + Math.round(openH) + "px)");
  const preScroll = await row.locator("pre").evaluate(p => p.scrollHeight > p.clientHeight);
  ok(preScroll, "prompt box scrolls internally");
  await row.locator("[data-full]").click();
  ok((await row.boundingBox()).height > 900, "'Show full height' expands the box");
  await row.locator("[data-full]").click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, "02-long-prompt-open.png") });

  console.log("4. Copy prompt without opening");
  await page.locator('.item[data-id="s2"] [data-copy]').click();
  await page.waitForTimeout(150);
  ok((await toast()).includes("Copied prompt"), "copy toast shown");
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  ok(clip === null || clip === "vercel --prod", "clipboard holds the prompt" + (clip === null ? " (clipboard read not permitted on file://, toast verified instead)" : ""));

  console.log("5. Add a step with actions + prompt + link");
  await page.locator(".head [data-add]").click();
  await page.locator("#m-title").fill("Collect references");
  await page.locator('[data-addsect="A"]').click();
  await page.locator('[data-f="a:0"]').fill("Open [Pinterest](pinterest.com) and search `saas ui`");
  await page.keyboard.press("Enter");
  await page.locator('[data-f="a:1"]').fill("Save into folder `Design Refs`");
  await page.locator("#m-prompt").fill("Make a design system from these images.");
  await page.locator('[data-addsect="L"]').click();
  await page.locator('[data-f="lt:0"]').fill("Pinterest");
  await page.locator('[data-f="lu:0"]').fill("pinterest.com");
  await page.screenshot({ path: path.join(OUT, "03-step-modal.png") });
  await page.keyboard.press("Control+Enter");
  ok(await page.locator(".scrim").count() === 0, "Ctrl+Enter saved and closed the modal");
  const added = page.locator(".item", { hasText: "Collect references" });
  ok(await added.count() === 1, "new step shown");
  ok((await added.locator(".has").textContent()).replace(/\s/g, "") === "21L1", "tags show 2 actions · 1-line prompt · 1 link");
  ok(await added.locator(".acts li").count() === 2 && await added.locator(".chip").count() === 2, "actions rendered with copy chips");
  ok((await added.locator(".acts a.lk").getAttribute("href")) === "https://pinterest.com", "action link gets https://");
  await added.locator('.chip[data-chip="Design Refs"]').click();
  await page.waitForTimeout(100);
  ok((await toast()).includes("Copied “Design Refs”"), "chip copies its text");

  console.log("6. Validation + unsaved-changes guard");
  await page.locator(".head [data-add]").click();
  await page.locator("[data-save]").click();
  ok(await page.locator("#m-title[aria-invalid=true]").count() === 1, "empty title blocked with a message");
  await page.locator("#m-title").fill("Draft");
  await page.keyboard.press("Escape");
  ok(await page.locator(".scrim").count() === 1, "first Esc with unsaved text keeps the modal open");
  await page.keyboard.press("Escape");
  ok(await page.locator(".scrim").count() === 0, "second Esc discards");

  console.log("7. Menu: edit, duplicate, move, delete + undo");
  const kebab = () => page.locator('.item[data-id="s2"] [data-menu]');
  await kebab().click();
  await page.locator(".menu [data-edit]").click();
  await page.locator("#m-title").fill("Short one (edited)");
  await page.locator("[data-save]").click();
  ok(await page.locator(".item__t", { hasText: "Short one (edited)" }).count() === 1, "edit saved");
  await kebab().click(); await page.locator(".menu [data-dup]").click();
  ok(await page.locator(".item__t", { hasText: "(copy)" }).count() === 1, "duplicate created");
  await kebab().click(); await page.locator('.menu [data-dir="-1"]').click();
  ok((await page.locator(".item").first().getAttribute("data-id")) === "s2", "move up works");
  await kebab().click(); await page.locator(".menu [data-del]").click();
  ok(await page.locator('.item[data-id="s2"]').count() === 0, "deleted");
  await page.locator(".toast button").click();
  ok(await page.locator('.item[data-id="s2"]').count() === 1, "undo restores it");
  await page.reload();
  const s2Title = await page.locator('.item[data-id="s2"] .item__t').textContent();
  const order = await page.locator(".item").evaluateAll(els => els.map(e => e.dataset.id));
  ok(s2Title === "Short one (edited)" && order[0] === "s2" && order.length === 4, "edit, duplicate, move and undo all persist after reload");

  console.log("8. Search");
  await page.keyboard.press("/");
  ok(await page.evaluate(() => document.activeElement.matches("[data-search]")), "/ focuses search");
  await page.keyboard.type("pinterest");
  await page.waitForTimeout(250);
  ok((await page.locator(".head h1").textContent()).includes("Results for"), "results view shown");
  ok(await page.locator(".item", { hasText: "Collect references" }).count() === 1, "matching step found");
  await page.keyboard.press("Escape");
  ok((await page.locator(".head h1").textContent()) === "Deployment", "Esc clears search");

  console.log("9. Collections");
  await page.locator("[data-top-newcoll]").click();
  await page.locator("#m-name").fill("Video editing");
  await page.locator('[data-icon-pick="video"]').click();
  await page.locator("[data-save]").click();
  ok((await page.locator(".head h1").textContent()) === "Video editing", "collection created and opened");
  ok(await page.locator(".empty", { hasText: "No steps yet" }).count() === 1, "empty collection state");
  await page.locator("[data-editcoll]").click();
  await page.locator("[data-mdel]").click(); await page.locator("[data-mdel]").click();
  ok(await page.locator(".coll__n", { hasText: "Video editing" }).count() === 0, "collection deleted (two clicks)");
  await page.locator(".toast button").click();
  ok(await page.locator(".coll__n", { hasText: "Video editing" }).count() === 1, "collection undo works");

  console.log("10. Appearance persists");
  await page.locator("[data-topmenu-btn]").click();
  await page.locator('[data-action="appearance"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "04-appearance.png") });
  await page.locator('.pal[data-val="teal"]').click();
  await page.locator('[data-opt="var"][data-val="joined"]').click();
  await page.locator(".modal [data-close]").last().click();
  await page.reload();
  ok(await page.evaluate(() => document.documentElement.dataset.pal + "," + document.documentElement.dataset.var) === "teal,joined", "palette + list style survive reload");
  await page.locator("[data-topmenu-btn]").click();
  await page.locator('[data-action="appearance"]').click();
  await page.locator("[data-reset]").click();
  await page.keyboard.press("Escape");
  ok(await page.evaluate(() => document.documentElement.dataset.pal) === "graphite", "reset returns to chosen defaults");

  console.log("11. Export / import round trip");
  await page.locator("[data-topmenu-btn]").click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator('[data-action="export"]').click()]);
  const file = path.join(OUT, "export.json"); await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
  ok(exported.version === 2 && exported.collections.length === 3, "export has version + 3 collections");
  await page.evaluate(() => { localStorage.setItem("playbooks.v2", "[]"); });
  await page.reload();
  ok(await page.locator(".empty", { hasText: "No collections yet" }).count() === 1, "empty-app state");
  await page.locator("[data-import-file]").setInputFiles(file);
  await page.locator("[data-confirm]").click();
  ok(await page.locator(".coll").count() === 3, "import restored 3 collections");
  const bad = path.join(OUT, "bad.json"); fs.writeFileSync(bad, "{not json");
  await page.locator("[data-import-file]").setInputFiles(bad);
  await page.waitForTimeout(150);
  ok((await toast()).includes("isn't valid JSON"), "bad file shows a clear error");

  console.log("12. Escaping");
  await page.locator(".head [data-add]").click();
  await page.locator("#m-title").fill('<img src=x onerror="window.__xss=1">');
  await page.locator("#m-prompt").fill("<script>window.__xss=2</script>");
  await page.locator("[data-save]").click();
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__xss === undefined), "HTML in titles/prompts is shown as text, not run");

  console.log("13. Mobile width + redirect");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal scroll at 390px");
  await page.screenshot({ path: path.join(OUT, "05-mobile.png"), fullPage: false });
  await page.goto(URL.replace("index.html", "guide.html"));
  await page.waitForURL(/index\.html/);
  ok(page.url().endsWith("index.html"), "guide.html redirects to index.html");

  console.log("14. Data safety (review findings)");
  await page.setViewportSize({ width: 1440, height: 900 });
  // Two tabs: a change made in tab B must survive a later change made in tab A.
  const tabB = await ctx.newPage();
  await tabB.goto(URL);
  const firstId = await page.evaluate(() => PB.store.all()[0].steps[0].id);
  await tabB.evaluate(() => PB.store.addStep(PB.store.activeId(), { title: "From tab B" }));
  await page.waitForTimeout(300);
  ok(await page.locator(".item__t", { hasText: "From tab B" }).count() === 1, "tab A shows the step tab B added");
  await page.evaluate(id => PB.store.duplicateStep(id), firstId);
  const both = await page.evaluate(() => localStorage.getItem("playbooks.v2"));
  ok(both.includes("From tab B") && both.includes("(copy)"), "a change in tab A keeps tab B's step (no overwrite)");
  // Tab A edits a stale step while tab B deletes it: the edit is refused, not silently written back.
  const victim = await page.evaluate(() => PB.store.all()[0].steps[0].id);
  await tabB.evaluate(id => PB.store.deleteStep(id), victim);
  const res = await page.evaluate(id => PB.store.updateStep(id, { title: "stale edit" }), victim);
  ok(res === null && !(await page.evaluate(() => localStorage.getItem("playbooks.v2"))).includes("stale edit"), "editing a step deleted in another tab is refused");
  // Undo after the other tab changed things still restores the step.
  const delId = await page.evaluate(() => PB.store.all()[0].steps[0].id);
  await page.evaluate(id => { window.__undo = PB.store.deleteStep(id); }, delId);
  await tabB.evaluate(() => PB.store.addStep(PB.store.activeId(), { title: "Another from B" }));
  await page.evaluate(() => window.__undo());
  const afterUndo = JSON.parse(await page.evaluate(() => localStorage.getItem("playbooks.v2")));
  const allIds = afterUndo.flatMap(c => c.steps.map(s => s.id));
  ok(allIds.includes(delId) && JSON.stringify(afterUndo).includes("Another from B"), "undo works after another tab saved");
  await tabB.close();

  // A failed save keeps the dialog open with an error instead of claiming success.
  await page.reload();
  await page.evaluate(() => { const o = Storage.prototype.setItem; window.__setItem = o; Storage.prototype.setItem = function (k, v) { if (k === "playbooks.v2") throw new Error("QuotaExceededError"); return o.call(this, k, v); }; });
  await page.locator(".head [data-add]").click();
  await page.locator("#m-title").fill("Will not fit");
  await page.locator("[data-save]").click();
  await page.waitForTimeout(100);
  ok(await page.locator(".scrim").count() === 1 && (await toast()).includes("Couldn't save"), "failed save: dialog stays open, error shown");
  ok(await page.locator(".item__t", { hasText: "Will not fit" }).count() === 0, "failed save: step not shown as saved");
  await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; });
  await page.locator("[data-save]").click();
  ok(await page.locator(".item__t", { hasText: "Will not fit" }).count() === 1, "saving works again once storage is available");

  // Imported files with duplicate or unsafe ids are repaired.
  const dupFile = path.join(OUT, "dup-ids.json");
  fs.writeFileSync(dupFile, JSON.stringify([{ id: "c1", name: "Dup", steps: [{ id: "x", title: "A", prompt: "a" }, { id: "x", title: "B", prompt: "b" }, { id: 'bad"id', title: "C" }] }]));
  await page.locator("[data-import-file]").setInputFiles(dupFile);
  await page.locator("[data-confirm]").click();
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem("playbooks.v2"))[0].steps.map(s => s.id));
  ok(new Set(ids).size === 3 && ids.every(i => /^[\w-]+$/.test(i)), "duplicate/unsafe ids are replaced on import");
  ok(await page.evaluate(() => localStorage.getItem("playbooks.v2.beforeImport") !== null), "data replaced by import is kept in playbooks.v2.beforeImport");
  await page.locator(".item", { hasText: "B" }).locator("[data-menu]").click();
  await page.locator(".menu [data-del]").click();
  ok((await page.locator(".item__t").allTextContents()).join(",") === "A,C", "deleting the second duplicate deletes that one, not the first");

  // Unreadable saved data is copied aside before anything replaces it.
  await page.evaluate(() => localStorage.setItem("playbooks.v2", "{broken"));
  await page.reload();
  ok(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith("playbooks.v2.corrupt-") && localStorage.getItem(k) === "{broken")), "corrupt data backed up before fallback");

  ok(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
