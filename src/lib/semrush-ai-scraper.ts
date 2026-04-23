/**
 * SEMRush AI Visibility scraper.
 *
 * Uses Playwright + a stored session cookie to iterate the 4 AI Visibility
 * surfaces × 4 LLMs (16 extractions total) on https://www.semrush.com/ai-seo/.
 *
 * Dependencies (install once):
 *   npm install playwright-core @sparticuz/chromium
 *
 * Required env:
 *   SEMRUSH_SESSION_COOKIE   // cookie header string from authenticated browser
 *   SEMRUSH_PID              // SEMRush project id, e.g. "122198"
 *   SEMRUSH_FID              // SEMRush filter id, e.g. "8797552"
 *
 * Returns per-surface raw `<main>` text. Caller forwards to the existing
 * Claude-powered ingest endpoint at /api/ai-visibility-ingest.
 *
 * See docs/ai-visibility-refresh-pipeline.md for the complete pipeline.
 */

import type { Page } from "playwright-core";

// Playwright Cookie type shape we use — fields relevant to us
type Cookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

export type AiSurface = "narrative_drivers" | "brand_performance" | "perception" | "questions";
export type AiLlm = "google_ai_mode" | "chatgpt" | "perplexity" | "gemini";

export type SurfaceExtract = {
  surface: AiSurface;
  llm: AiLlm;
  url: string;
  text: string;
  extractedAt: string;
  bytes: number;
};

const SURFACE_PATHS: Record<AiSurface, string> = {
  narrative_drivers: "/ai-seo/narrative-drivers/",
  brand_performance: "/ai-seo/brand-performance/",
  perception: "/ai-seo/perception/",
  questions: "/ai-seo/questions/", // cross-LLM, only scrape once
};

// Human-readable LLM labels as shown in the SEMRush dropdown
const LLM_LABELS: Record<AiLlm, string> = {
  google_ai_mode: "Google AI Mode",
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  gemini: "Gemini",
};

type ScrapeOpts = {
  sessionCookie: string;
  pid: string;
  fid: string;
  /** Optional filter — scrape only these surfaces. */
  surfaces?: AiSurface[];
  /** Optional filter — scrape only these LLMs. */
  llms?: AiLlm[];
};

/**
 * Parses a cookie header string into Playwright cookie objects.
 * Accepts either a raw `Cookie:` header value (semicolon-separated)
 * or a single `name=value` pair.
 */
function parseCookieString(raw: string): Cookie[] {
  const cookies: Cookie[] = [];
  for (const p of raw.split(";").map((s) => s.trim()).filter(Boolean)) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    cookies.push({
      name: p.slice(0, eq).trim(),
      value: p.slice(eq + 1).trim(),
      domain: ".semrush.com",
      path: "/",
      secure: true,
      sameSite: "Lax",
    });
  }
  return cookies;
}

/**
 * Scrapes a single surface × LLM combination.
 *
 * Flow: navigate → (if LLM selector exists) click dropdown → click LLM option
 * → wait for render → grab `<main>` text.
 */
async function scrapeSurface(
  page: Page,
  pid: string,
  fid: string,
  surface: AiSurface,
  llm: AiLlm,
): Promise<SurfaceExtract> {
  const path = SURFACE_PATHS[surface];
  const url = `https://www.semrush.com${path}?pid=${pid}&fid=${fid}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(4_000); // let JS charts render

  // Questions surface is cross-LLM, no dropdown to switch.
  if (surface !== "questions") {
    try {
      // Click the "Select provider" combobox (aria-label on the button)
      await page.click('[role="combobox"][aria-label*="provider" i]', { timeout: 3_000 });
      await page.waitForTimeout(700);
      // Click the LLM option by visible text
      const label = LLM_LABELS[llm];
      await page.click(`[role="option"]:has-text("${label}"), button:has-text("${label}")`, {
        timeout: 3_000,
      });
      await page.waitForTimeout(4_500); // charts re-render
    } catch (err) {
      // Non-fatal; fall back to default (usually Google AI Mode) but annotate
      console.warn(`[semrush-scraper] LLM switch failed for ${surface}/${llm}:`, err);
    }
  }

  const text = await page.evaluate<string>(() => {
    const main = document.querySelector("main");
    return (main?.innerText || document.body.innerText || "").slice(0, 80_000);
  });

  return {
    surface,
    llm,
    url,
    text,
    extractedAt: new Date().toISOString(),
    bytes: text.length,
  };
}

/**
 * Full SEMRush AI Visibility scrape.
 * Returns an array of surface extracts; caller forwards to ingest.
 */
export async function scrapeAiVisibility(opts: ScrapeOpts): Promise<SurfaceExtract[]> {
  const chromiumMod = await import("@sparticuz/chromium");
  const chromium = chromiumMod.default;
  const { chromium: pwChromium } = await import("playwright-core");

  const browser = await pwChromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  const cookies = parseCookieString(opts.sessionCookie);
  const results: SurfaceExtract[] = [];

  try {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });
    await ctx.addCookies(cookies);

    const surfaces = opts.surfaces ?? (Object.keys(SURFACE_PATHS) as AiSurface[]);
    const llms = opts.llms ?? (Object.keys(LLM_LABELS) as AiLlm[]);

    // Scrape sequentially to avoid SEMRush rate limits.
    // Questions surface is cross-LLM, only hit once (first LLM in list).
    const page = await ctx.newPage();
    for (const surface of surfaces) {
      if (surface === "questions") {
        results.push(await scrapeSurface(page, opts.pid, opts.fid, surface, llms[0]));
        continue;
      }
      for (const llm of llms) {
        results.push(await scrapeSurface(page, opts.pid, opts.fid, surface, llm));
      }
    }
    await page.close();
  } finally {
    await browser.close();
  }

  return results;
}
