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

  // Body text for word count.
  //
  // Previous logic counted the body minus <script>/<style>/<nav>/<footer>,
  // which systematically undercounted prerendered SPA/Next pages. Blogs with
  // ~1500-2500 real words were reporting 300-500 because:
  //   (a) <header>, <aside>, <noscript>, <form>, and inline JSON payloads
  //       leaked nav chrome into the count,
  //   (b) when a page rendered its article inside a wrapper without <body>,
  //       the regex missed it,
  //   (c) we never looked at JSON-LD "articleBody" which contains the
  //       authoritative article text for most of our blog posts.
  //
  // New logic:
  //   1. Prefer <main> / <article> / [role=main] if present (avoids nav chrome).
  //   2. Strip script/style/nav/footer/header/aside/noscript/form/svg/template.
  //   3. If that total is still low, fall back to any JSON-LD
  //      articleBody string we can find.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  const contentContainerMatch =
    bodyHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    bodyHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    bodyHtml.match(/<[^>]+role\s*=\s*["']main["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
  const scope = contentContainerMatch ? contentContainerMatch[1] : bodyHtml;

  const cleaned = scope
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<template[\s\S]*?<\/template>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  let visibleText = stripTags(cleaned);
  let word_count = visibleText.split(/\s+/).filter(Boolean).length;

  // Fallback: JSON-LD articleBody often holds the authoritative copy
  // when the page is SPA-hydrated and <main> was empty at fetch time.
  if (word_count < 200) {
    const ldMatches = html.match(
      /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );
    if (ldMatches) {
      let ldWords = 0;
      for (const block of ldMatches) {
        const inner = block.replace(/<script[^>]*>|<\/script>/gi, "").trim();
        try {
          const parsed = JSON.parse(inner);
          const walk = (node: unknown) => {
            if (!node) return;
            if (typeof node === "string") return;
            if (Array.isArray(node)) {
              node.forEach(walk);
              return;
            }
            if (typeof node === "object") {
              const obj = node as Record<string, unknown>;
              const body = obj.articleBody ?? obj.description;
              if (typeof body === "string") {
                ldWords += body.split(/\s+/).filter(Boolean).length;
              }
              for (const v of Object.values(obj)) walk(v);
            }
          };
          walk(parsed);
        } catch {
          /* skip invalid JSON-LD */
        }
      }
      if (ldWords > word_count) word_count = ldWords;
    }
  }

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
  issues: StructuredIssue[];
}

/**
 * Structured issue shape — replaces the old string-based issues list.
 * Downstream consumers can show priority badges, sort by impact, batch-fix, etc.
 */
export interface StructuredIssue {
  key: string;                    // stable id, used for dedupe across pages
  title: string;                  // short human-readable
  category: IssueCategory;
  severity: "critical" | "high" | "medium" | "low";
  priority: "urgent" | "high" | "medium" | "low";
  impact_score: number;           // 1-10, higher = bigger SEO/AI payoff
  effort: "quick_win" | "moderate" | "heavy";
  recommended_fix: string;        // the concrete action
  why_it_matters: string;         // one-line explanation
  target_keywords?: string[];
}

export type IssueCategory =
  | "Technical SEO"
  | "Meta Tags"
  | "On-Page SEO"
  | "Content"
  | "Images"
  | "Structured Data"
  | "AI Visibility"
  | "Web Design"
  | "Performance"
  | "Internal Linking";

export function scorePage(page: PageCrawlResult, primaryKeyword?: string): PageScore {
  let score = 100;
  const issues: StructuredIssue[] = [];
  const kw = primaryKeyword?.toLowerCase();
  const titleLower = page.title?.toLowerCase() || "";
  const metaLower = page.meta_description?.toLowerCase() || "";

  const add = (
    i: Omit<StructuredIssue, "priority"> & { priority?: StructuredIssue["priority"] },
  ) => {
    const priority =
      i.priority ??
      (i.severity === "critical" ? "urgent" : i.severity === "high" ? "high" : i.severity === "medium" ? "medium" : "low");
    issues.push({ ...i, priority });
    const deduct = i.severity === "critical" ? 10 : i.severity === "high" ? 6 : i.severity === "medium" ? 3 : 1;
    score -= deduct;
  };

  // ─── TITLE ─────────────────────────────────────────────────
  if (!page.title) {
    add({
      key: "missing-title",
      title: "Missing <title> tag",
      category: "Meta Tags",
      severity: "critical",
      impact_score: 10,
      effort: "quick_win",
      recommended_fix: "Add a unique <title> tag (50-60 chars) leading with the primary keyword.",
      why_it_matters: "Title is the #1 on-page ranking signal and appears in search results + AI citations.",
    });
  } else {
    if (page.title.length < 50 || page.title.length > 60) {
      add({
        key: `title-length-${page.title.length < 50 ? "short" : "long"}`,
        title: `Title length ${page.title.length} chars (target 50-60)`,
        category: "Meta Tags",
        severity: page.title.length > 70 || page.title.length < 30 ? "high" : "medium",
        impact_score: page.title.length > 70 ? 7 : 5,
        effort: "quick_win",
        recommended_fix: page.title.length > 60
          ? "Tighten title to 50-60 chars. Lead with primary keyword, trim filler words."
          : "Expand title to 50-60 chars. Add a descriptor or brand suffix.",
        why_it_matters: "Google truncates titles over ~60 chars. Under 50 leaves SERP real estate on the table.",
      });
    }
    if (kw && !titleLower.includes(kw)) {
      add({
        key: "title-missing-keyword",
        title: "Title missing primary keyword",
        category: "On-Page SEO",
        severity: "high",
        impact_score: 8,
        effort: "quick_win",
        recommended_fix: `Rewrite title to include "${primaryKeyword}" near the front.`,
        why_it_matters: "Primary keyword in title (preferably front-loaded) is a top-3 ranking factor.",
        target_keywords: primaryKeyword ? [primaryKeyword] : undefined,
      });
    }
    if (page.title && !page.title.includes("|") && !page.title.includes(" - ")) {
      add({
        key: "title-missing-brand",
        title: "Title has no brand separator",
        category: "Meta Tags",
        severity: "low",
        impact_score: 3,
        effort: "quick_win",
        recommended_fix: "Append \" | Premier Party Cruises\" (or \" - Premier Party Cruises\") after the primary phrase.",
        why_it_matters: "Brand suffix reinforces entity recognition and helps AI attribute citations.",
      });
    }
  }

  // ─── META DESCRIPTION ──────────────────────────────────────
  if (!page.meta_description) {
    add({
      key: "missing-meta-description",
      title: "Missing meta description",
      category: "Meta Tags",
      severity: "high",
      impact_score: 7,
      effort: "quick_win",
      recommended_fix: "Add a 120-155 char meta description with the primary keyword and a CTA verb.",
      why_it_matters: "Meta description drives CTR from SERPs and is often quoted verbatim by AI engines.",
    });
  } else {
    if (page.meta_description.length < 120 || page.meta_description.length > 155) {
      add({
        key: `meta-length-${page.meta_description.length < 120 ? "short" : "long"}`,
        title: `Meta description length ${page.meta_description.length} chars (target 120-155)`,
        category: "Meta Tags",
        severity: page.meta_description.length > 170 || page.meta_description.length < 80 ? "medium" : "low",
        impact_score: 4,
        effort: "quick_win",
        recommended_fix: page.meta_description.length > 155
          ? "Trim to 155 chars. Lead with value prop, end with CTA verb."
          : "Expand to 120-155 chars. Add benefit statement + CTA.",
        why_it_matters: "Google truncates descriptions over ~155 chars on desktop.",
      });
    }
    if (kw && !metaLower.includes(kw)) {
      add({
        key: "meta-missing-keyword",
        title: "Meta description missing primary keyword",
        category: "On-Page SEO",
        severity: "medium",
        impact_score: 5,
        effort: "quick_win",
        recommended_fix: `Include "${primaryKeyword}" naturally in the meta description.`,
        why_it_matters: "Keywords in meta description get bolded in SERPs, increasing CTR.",
        target_keywords: primaryKeyword ? [primaryKeyword] : undefined,
      });
    }
    if (!/\b(book|get|see|learn|see|find|discover|start|build|compare|call)\b/i.test(page.meta_description)) {
      add({
        key: "meta-missing-cta",
        title: "Meta description has no CTA verb",
        category: "Meta Tags",
        severity: "low",
        impact_score: 3,
        effort: "quick_win",
        recommended_fix: "Add an action verb (Book, Get, See, Learn, Discover, Start) — ideally at the end.",
        why_it_matters: "CTA verbs in meta descriptions measurably lift click-through rate.",
      });
    }
  }

  // ─── H1 / HEADINGS ─────────────────────────────────────────
  if (page.h1_count === 0) {
    add({
      key: "missing-h1",
      title: "Missing H1 tag",
      category: "On-Page SEO",
      severity: "critical",
      impact_score: 9,
      effort: "quick_win",
      recommended_fix: "Add exactly one <h1> with the primary keyword or closest semantic variant.",
      why_it_matters: "H1 is the strongest on-page topical signal after title. Missing = confusing to crawlers and AI.",
    });
  } else if (page.h1_count > 1) {
    add({
      key: "multiple-h1",
      title: `Multiple H1 tags (${page.h1_count})`,
      category: "On-Page SEO",
      severity: "medium",
      impact_score: 5,
      effort: "quick_win",
      recommended_fix: `Keep one <h1>, demote the others to <h2>. Current page has ${page.h1_count}.`,
      why_it_matters: "Multiple H1s dilute topical focus. Modern SEO best practice is one H1 per page.",
    });
  } else if (kw && page.h1 && !page.h1.toLowerCase().includes(kw)) {
    add({
      key: "h1-missing-keyword",
      title: "H1 missing primary keyword",
      category: "On-Page SEO",
      severity: "medium",
      impact_score: 6,
      effort: "quick_win",
      recommended_fix: `Rewrite H1 to include "${primaryKeyword}" naturally.`,
      why_it_matters: "Keyword in H1 is a direct relevance signal to both search engines and AI.",
      target_keywords: primaryKeyword ? [primaryKeyword] : undefined,
    });
  }
  if (page.headings.h2.length < 3 && page.word_count > 300) {
    add({
      key: "insufficient-h2",
      title: `Only ${page.headings.h2.length} H2 heading${page.headings.h2.length === 1 ? "" : "s"} on a ${page.word_count}-word page`,
      category: "On-Page SEO",
      severity: "medium",
      impact_score: 5,
      effort: "moderate",
      recommended_fix: "Break content into at least 3-5 H2 sections. AI prefers scannable structure.",
      why_it_matters: "H2/H3 structure is how AI chunks your content for quoting. Flat walls of text are rarely cited.",
    });
  }

  // ─── CONTENT DEPTH ─────────────────────────────────────────
  if (page.word_count < 300) {
    add({
      key: "thin-content-severe",
      title: `Severely thin content (${page.word_count} words)`,
      category: "Content",
      severity: "critical",
      impact_score: 9,
      effort: "heavy",
      recommended_fix: "Expand to 800+ words. Add FAQs, pricing details, use-case sections, or comparison content.",
      why_it_matters: "Pages under 300 words rarely rank and almost never get cited by AI engines.",
    });
  } else if (page.word_count < 800) {
    add({
      key: "thin-content",
      title: `Thin content (${page.word_count} words, target 800+)`,
      category: "Content",
      severity: "medium",
      impact_score: 6,
      effort: "moderate",
      recommended_fix: "Expand to 800+ words with more use cases, FAQs, or depth on existing sections.",
      why_it_matters: "800-2000 words is the sweet spot for organic ranking + AI citation frequency.",
    });
  }

  // ─── IMAGES ────────────────────────────────────────────────
  if (page.images_total > 0 && page.images_missing_alt > 0) {
    const pct = Math.round((page.images_missing_alt / page.images_total) * 100);
    add({
      key: "images-missing-alt",
      title: `${page.images_missing_alt} of ${page.images_total} images missing alt text (${pct}%)`,
      category: "Images",
      severity: pct > 50 ? "high" : "medium",
      impact_score: 6,
      effort: "quick_win",
      recommended_fix: "Add descriptive alt text to every <img>. Use the keyword where naturally relevant.",
      why_it_matters: "Alt text is an accessibility requirement, a ranking signal, and AI uses it to understand visual content.",
    });
  }

  // ─── INTERNAL LINKING ──────────────────────────────────────
  if (page.internal_links < 5) {
    add({
      key: "low-internal-linking",
      title: `Only ${page.internal_links} internal link${page.internal_links === 1 ? "" : "s"} (target 5+)`,
      category: "Internal Linking",
      severity: page.internal_links < 2 ? "high" : "medium",
      impact_score: 6,
      effort: "quick_win",
      recommended_fix: "Add 5-10 contextual internal links to related /private-cruises, /atx-disco-cruise, /safety, pricing, comparison pages.",
      why_it_matters: "Internal linking distributes link equity and helps AI understand site topology.",
    });
  }
  if (page.external_links === 0 && page.word_count > 500) {
    add({
      key: "no-external-links",
      title: "No external links to authority sources",
      category: "Internal Linking",
      severity: "low",
      impact_score: 3,
      effort: "quick_win",
      recommended_fix: "Add 1-2 outbound links to authoritative sources (TPWD, USCG, Lake Travis official, Austin Visitors Bureau).",
      why_it_matters: "Outbound links to authorities signal trustworthiness — a Google E-E-A-T factor.",
    });
  }

  // ─── SCHEMA / STRUCTURED DATA ──────────────────────────────
  if (page.schema_types.length === 0) {
    add({
      key: "no-json-ld",
      title: "No JSON-LD schema on page",
      category: "Structured Data",
      severity: "high",
      impact_score: 8,
      effort: "moderate",
      recommended_fix: "Add relevant schema: Organization + Service + FAQPage (minimum). Use attached_assets/schema_data/ folder pattern.",
      why_it_matters: "Schema is how AI engines disambiguate your entity and quote your answers. Biggest AI-visibility lever.",
    });
  } else {
    if (!page.schema_types.includes("FAQPage") && page.word_count > 500) {
      add({
        key: "missing-faqpage-schema",
        title: "FAQPage schema missing",
        category: "AI Visibility",
        severity: "high",
        impact_score: 9,
        effort: "moderate",
        recommended_fix: "Add FAQPage JSON-LD wrapping the FAQ section. Each Q/A should already exist in page content.",
        why_it_matters: "FAQPage is the highest-yield AI citation format. Cited as rich answers across ChatGPT, Gemini, Perplexity, Google AI Mode.",
      });
    }
    if (!page.schema_types.includes("Organization") && !page.schema_types.includes("LocalBusiness")) {
      add({
        key: "missing-org-schema",
        title: "Organization/LocalBusiness schema missing",
        category: "Structured Data",
        severity: "medium",
        impact_score: 6,
        effort: "quick_win",
        recommended_fix: "Add Organization or LocalBusiness JSON-LD (name, address, telephone, sameAs social URLs).",
        why_it_matters: "Lets Google + AI tie every mention back to the same brand entity. Required for knowledge panel.",
      });
    }
    if (!page.schema_types.includes("BreadcrumbList") && (page.url?.split("/").filter(Boolean).length || 0) >= 2) {
      add({
        key: "missing-breadcrumb-schema",
        title: "BreadcrumbList schema missing",
        category: "Structured Data",
        severity: "low",
        impact_score: 4,
        effort: "quick_win",
        recommended_fix: "Add BreadcrumbList JSON-LD reflecting the URL hierarchy (Home › Category › Page).",
        why_it_matters: "Breadcrumbs appear in SERPs and help AI understand site structure.",
      });
    }
  }

  // ─── CANONICAL / OG / VIEWPORT ─────────────────────────────
  if (!page.canonical) {
    add({
      key: "missing-canonical",
      title: "Missing canonical tag",
      category: "Technical SEO",
      severity: "high",
      impact_score: 7,
      effort: "quick_win",
      recommended_fix: "Add <link rel=\"canonical\" href=\"{canonical_url}\"> — prevents duplicate-content dilution.",
      why_it_matters: "Without canonical, Google can't pick a primary URL; ranking equity splits across variants.",
    });
  }
  if (!page.has_og_tags) {
    add({
      key: "missing-og-tags",
      title: "Missing Open Graph tags",
      category: "Technical SEO",
      severity: "medium",
      impact_score: 5,
      effort: "quick_win",
      recommended_fix: "Add og:title, og:description, og:image, og:url. Use a 1200x630 image.",
      why_it_matters: "OG tags control social preview cards. Missing = broken-looking shares on Facebook, LinkedIn, Slack.",
    });
  }
  if (!page.has_viewport) {
    add({
      key: "missing-viewport",
      title: "Missing viewport meta tag",
      category: "Web Design",
      severity: "critical",
      impact_score: 9,
      effort: "quick_win",
      recommended_fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
      why_it_matters: "Without viewport, mobile browsers render at desktop width — instant bounce on phones.",
    });
  }
  if (!page.robots) {
    // Not an issue per se, just noting
  } else if (/noindex/i.test(page.robots)) {
    add({
      key: "noindex-flag",
      title: "Page is set to noindex",
      category: "Technical SEO",
      severity: "critical",
      impact_score: 10,
      effort: "quick_win",
      recommended_fix: "Remove the noindex directive from <meta name=\"robots\"> unless the page is genuinely meant to be hidden.",
      why_it_matters: "noindex = page will never appear in search results. Check if this is intentional.",
    });
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    issues,
  };
}
