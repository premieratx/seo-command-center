// Screenshot the running /demo/ad-loop dashboard via Playwright + the
// project's bundled @sparticuz/chromium so the user can see what it looks
// like without port-forwarding. Saves several JPEGs to docs/screenshots/.

import chromium from "@sparticuz/chromium";
import { chromium as pw } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "/home/user/seo-command-center/docs/screenshots";

async function shoot() {
  await mkdir(OUT, { recursive: true });
  const exec = await chromium.executablePath();
  const browser = await pw.launch({
    executablePath: exec,
    args: chromium.args,
    headless: true,
  });

  const shots = [
    { path: "/demo/ad-loop", file: "01-overview.jpg", scrollTo: 0 },
    { path: "/demo/ad-loop", file: "02-overview-mid.jpg", scrollTo: 700 },
    { path: "/demo/ad-loop", file: "03-overview-bottom.jpg", scrollTo: 1500 },
  ];

  // Two tab states — sub-tab is local React state so we drive it via clicks.
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  for (const s of shots) {
    await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(1500);
    if (s.scrollTo) await page.evaluate((y) => window.scrollTo(0, y), s.scrollTo);
    await page.waitForTimeout(500);
    const img = await page.screenshot({ type: "jpeg", quality: 80, fullPage: false });
    await writeFile(`${OUT}/${s.file}`, img);
    console.log(`✓ ${s.file} (${img.length} bytes)`);
  }

  // Now jump to the Google Ads sub-tab
  await page.goto(`${BASE}/demo/ad-loop`, { waitUntil: "networkidle" });
  await page.click('button[role="tab"]:has-text("Google Ads")');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await writeFile(
    `${OUT}/04-google-ads-top.jpg`,
    await page.screenshot({ type: "jpeg", quality: 80 }),
  );
  console.log("✓ 04-google-ads-top.jpg");

  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);
  await writeFile(
    `${OUT}/05-google-ads-table.jpg`,
    await page.screenshot({ type: "jpeg", quality: 80 }),
  );
  console.log("✓ 05-google-ads-table.jpg");

  // Click first expand arrow to show drill-down
  try {
    await page.click('button[aria-label="Expand"]:first-of-type', { timeout: 3000 });
    await page.waitForTimeout(1500);
    await writeFile(
      `${OUT}/06-google-drilldown.jpg`,
      await page.screenshot({ type: "jpeg", quality: 80 }),
    );
    console.log("✓ 06-google-drilldown.jpg");
  } catch {
    console.log("  (drilldown click skipped)");
  }

  // Scroll all the way down to capture setup walkthrough
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await writeFile(
    `${OUT}/07-google-setup.jpg`,
    await page.screenshot({ type: "jpeg", quality: 80 }),
  );
  console.log("✓ 07-google-setup.jpg");

  // Meta tab
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('button[role="tab"]:has-text("Meta Ads")');
  await page.waitForTimeout(1500);
  await writeFile(
    `${OUT}/08-meta-ads-top.jpg`,
    await page.screenshot({ type: "jpeg", quality: 80 }),
  );
  console.log("✓ 08-meta-ads-top.jpg");

  await browser.close();
}

shoot().catch((err) => {
  console.error(err);
  process.exit(1);
});
