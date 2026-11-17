// Regenerates the README screenshots in docs/screenshots/ from the sample data (never your own data:
// it runs in a fresh browser profile). Run:  cd tests && node screenshots.js
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const SITE = path.resolve(__dirname, "../website").replace(/\\/g, "/");
const URL = "file:///" + SITE.split("/").map(encodeURIComponent).join("/").replace(/^([A-Za-z])%3A/, "$1:") + "/index.html";
const OUT = path.resolve(__dirname, "../docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1360, height: 820 }, deviceScaleFactor: 1.5 });
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, name) }); console.log("saved " + name); };

  // 1. Overview: compact cards, one step open (actions + capped dark prompt box)
  await page.locator(".item", { hasText: "Build the design system" }).locator(".item__open").click();
  await shot("overview.png");

  // 2. Add / edit dialog
  await page.locator(".item", { hasText: "Build the design system" }).locator("[data-menu]").click();
  await page.locator(".menu [data-edit]").click();
  await shot("edit-step.png");
  await page.keyboard.press("Escape");

  // 3. Appearance panel
  await page.locator("[data-topmenu-btn]").click();
  await page.locator('[data-action="appearance"]').click();
  await shot("appearance.png");

  // 4. Same app, different look (Teal, dark top bar + sidebar, bordered cards, medium corners)
  for (const [k, v] of [["pal", "teal"], ["top", "dark"], ["sidebar", "dark"], ["card", "border"], ["radius", "medium"], ["depth", "normal"], ["hl", "orange"]]) {
    await page.locator(`[data-opt="${k}"][data-val="${v}"]`).click();
  }
  await page.keyboard.press("Escape");
  await page.locator(".item", { hasText: "Collect design references" }).locator(".item__open").click();
  await shot("theme-teal.png");
  await page.evaluate(() => PB.appearance.reset());

  // 5. Phone width
  await page.setViewportSize({ width: 390, height: 780 });
  await page.reload();
  await shot("mobile.png");

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
