/**
 * Lightweight SEO crawler. Fetches a URL, parses the HTML, extracts SEO signals.
 * Runs server-side (edge or node) — no external dependencies.
 */

export interface PageCrawlResult {
  url: string;
  status_code: number;
  title: string | null;
  meta_description: string | null;
  canonical: string | null;
  robots: string | null;
  h1: string | null;
  h1_count: number;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  word_count: number;
  images_total: number;
  images_missing_alt: number;
  internal_links: number;
  external_links: number;
  schema_types: string[];
  has_og_tags: boolean;
  og_title: string | null;
  has_viewport: boolean;
}

function textBetween(html: string, open: RegExp, close: RegExp): string | null {
  const openMatch = html.match(open);
  if (!openMatch) return null;
  const afterOpen = html.slice(openMatch.index! + openMatch[0].length);
  const closeMatch = afterOpen.match(close);
  if (!closeMatch) return null;
  return afterOpen.slice(0, closeMatch.index!);
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractAll(html: string, pattern: RegExp): string[] {
  const out: string[] = [];
  let m;
  while ((m = pattern.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function getAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

export async function crawlPage(url: string, baseDomain: string): Promise<PageCrawlResult> {
  let status_code = 0;
  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SEO-Command-Center/1.0 (Audit)" },
      signal: AbortSignal.timeout(15000),
    });
    status_code = res.status;
    if (res.ok) {
      html = await res.text();
    }
  } catch (e) {
    return {
      url,
      status_code: status_code || 0,
      title: null,
      meta_description: null,
      canonical: null,
      robots: null,
      h1: null,
      h1_count: 0,
      headings: { h1: [], h2: [], h3: [] },
      word_count: 0,
      images_total: 0,
      images_missing_alt: 0,
      internal_links: 0,
      external_links: 0,
      schema_types: [],
      has_og_tags: false,
      og_title: null,
      has_viewport: false,
    };
  }

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Meta description
  const metaDescMatch = html.match(
    /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  const meta_description = metaDescMatch ? metaDescMatch[1] : null;

  // Canonical
  const canonicalMatch = html.match(
    /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  const canonical = canonicalMatch ? canonicalMatch[1] : null;

  // Robots meta
  const robotsMatch = html.match(
    /<meta\s+[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  const robots = robotsMatch ? robotsMatch[1] : null;

  // Headings
  const h1s = extractAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(stripTags);
  const h2s = extractAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(stripTags);
  const h3s = extractAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi).map(stripTags);

  // Body text for word count
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  // Strip scripts, styles, nav, footer
  const cleaned = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");
  const visibleText = stripTags(cleaned);
  const word_count = visibleText.split(/\s+/).filter(Boolean).length;

  // Images
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  let images_missing_alt = 0;
  for (const tag of imgTags) {
    const alt = getAttr(tag, "alt");
    if (!alt || alt.trim() === "") images_missing_alt++;
  }

  // Links
  const aTags = html.match(/<a\s+[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi) || [];
  let internal_links = 0;
  let external_links = 0;
  for (const tag of aTags) {
    const href = getAttr(tag, "href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    if (href.startsWith("/") || href.includes(baseDomain)) {
      internal_links++;
    } else if (href.startsWith("http")) {
      external_links++;
    }
  }

  // Schema types
  const ldScripts = extractAll(
    html,
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const schema_types_set = new Set<string>();
  for (const script of ldScripts) {
    try {
      const parsed = JSON.parse(script.trim());
      const collect = (obj: unknown) => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          obj.forEach(collect);
          return;
        }
        const o = obj as Record<string, unknown>;
        const t = o["@type"];
        if (typeof t === "string") schema_types_set.add(t);
        else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && schema_types_set.add(x));
      };
      collect(parsed);
    } catch {
      // skip invalid JSON
    }
  }
  const schema_types = Array.from(schema_types_set);

  // OG tags
  const ogTitleMatch = html.match(
    /<meta\s+[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  const og_title = ogTitleMatch ? ogTitleMatch[1] : null;
  const has_og_tags = !!og_title;

  // Viewport
  const has_viewport = /<meta\s+[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html);

  return {
    url,
    status_code,
    title,
    meta_description,
    canonical,
    robots,
    h1: h1s[0] || null,
    h1_count: h1s.length,
    headings: { h1: h1s, h2: h2s, h3: h3s },
    word_count,
    images_total: imgTags.length,
    images_missing_alt,
    internal_links,
    external_links,
    schema_types,
    has_og_tags,
    og_title,
    has_viewport,
  };
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

export async function fetchSitemapUrls(sitemapUrl: string, limit = 50): Promise<SitemapUrl[]> {
  try {
    const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const xml = await res.text();

    // Handle sitemap index
    if (xml.includes("<sitemapindex")) {
      const sitemaps = extractAll(xml, /<sitemap>\s*<loc>([^<]+)<\/loc>/gi);
      if (sitemaps.length > 0) {
        // Recurse into first sitemap only
        return fetchSitemapUrls(sitemaps[0], limit);
      }
    }

    const urls = extractAll(xml, /<url>\s*<loc>([^<]+)<\/loc>(?:[^]*?<lastmod>([^<]+)<\/lastmod>)?[^]*?<\/url>/gi);
    const matches: SitemapUrl[] = [];
    let m;
    const re = /<url>[^]*?<loc>([^<]+)<\/loc>[^]*?(?:<lastmod>([^<]+)<\/lastmod>)?[^]*?<\/url>/gi;
    while ((m = re.exec(xml)) !== null && matches.length < limit) {
      matches.push({ loc: m[1], lastmod: m[2] });
    }

    // Fallback: if the regex didn't capture, use simple loc extraction
    if (matches.length === 0) {
      return urls.slice(0, limit).map((loc) => ({ loc }));
    }

    return matches;
  } catch {
    return [];
  }
}

export interface PageScore {
  score: number;
  issues: string[];
}

export function scorePage(page: PageCrawlResult, primaryKeyword?: string): PageScore {
  let score = 0;
  const issues: string[] = [];

  // Title (15 pts)
  if (page.title) {
    score += 3;
    if (page.title.length >= 50 && page.title.length <= 60) score += 3;
    else issues.push(`Title length ${page.title.length} chars (target 50-60)`);
    if (primaryKeyword && page.title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      score += 5;
    } else if (primaryKeyword) {
      issues.push("Title missing primary keyword");
    }
    if (page.title.includes("|") || page.title.includes(" - ")) score += 2;
    if (page.title.length > 60) score += 2;
  } else {
    issues.push("Missing title tag");
  }

  // Meta description (10 pts)
  if (page.meta_description) {
    score += 2;
    if (page.meta_description.length >= 120 && page.meta_description.length <= 155) score += 3;
    else issues.push(`Meta description length ${page.meta_description.length} (target 120-155)`);
    if (primaryKeyword && page.meta_description.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      score += 3;
    }
    score += 2;
  } else {
    issues.push("Missing meta description");
  }

  // H1 (15 pts)
  if (page.h1_count === 1) {
    score += 10;
    if (primaryKeyword && page.h1?.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      score += 5;
    }
  } else if (page.h1_count === 0) {
    issues.push("Missing H1");
  } else {
    score += 2;
    issues.push(`Multiple H1 tags (${page.h1_count})`);
  }

  // Content depth (25 pts)
  if (page.word_count >= 2000) score += 15;
  else if (page.word_count >= 1000) score += 10;
  else if (page.word_count >= 500) score += 5;
  else issues.push(`Thin content (${page.word_count} words)`);
  if (page.headings.h2.length >= 3) score += 5;
  if (page.headings.h3.length >= 2) score += 5;

  // Images (10 pts)
  if (page.images_total > 0 && page.images_missing_alt === 0) score += 10;
  else if (page.images_missing_alt > 0) {
    score += Math.max(0, 5 - page.images_missing_alt);
    issues.push(`${page.images_missing_alt}/${page.images_total} images missing alt`);
  }

  // Internal links (10 pts)
  if (page.internal_links >= 5) score += 10;
  else if (page.internal_links >= 3) score += 5;
  else issues.push(`Only ${page.internal_links} internal links`);

  // Schema (10 pts)
  if (page.schema_types.length >= 3) score += 10;
  else if (page.schema_types.length >= 1) score += 5;
  else issues.push("No JSON-LD schema");

  // Technical (15 pts)
  if (page.canonical) score += 5;
  else issues.push("Missing canonical tag");
  if (page.has_og_tags) score += 5;
  else issues.push("Missing Open Graph tags");
  if (page.has_viewport) score += 5;
  else issues.push("Missing viewport meta");

  return { score: Math.min(100, Math.max(0, score)), issues };
}
