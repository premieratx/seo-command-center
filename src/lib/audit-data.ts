// Audit data from our crawl of premierpartycruises.com
// This will be replaced by live API calls once SEMRush MCP is connected

export interface AuditIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  affectedPages: string[];
  fix: string;
  status: "open" | "in_progress" | "fixed";
  impact: string;
}

export interface PageData {
  url: string;
  title: string | null;
  h1: string | null;
  metaDescription: string | null;
  canonical: string | null;
  wordCount: number;
  schemaTypes: string[];
  internalLinks: number;
  hasOgTags: boolean;
  score: number;
  pageType: "pillar" | "service" | "blog" | "landing" | "utility";
  targetKeyword: string;
}

export interface CannibalizationIssue {
  keyword: string;
  intendedPage: string;
  competingPages: { url: string; score: number }[];
  severity: "high" | "medium";
  recommendation: string;
}

export const siteOverview = {
  domain: "premierpartycruises.com",
  totalPages: 185,
  servicePages: 18,
  blogPosts: 130,
  celebrationPages: 15,
  utilityPages: 22,
  lastAudit: "2026-04-09T23:30:00Z",
  overallScore: 58,
  issuesFound: 42,
  criticalIssues: 4,
  highIssues: 12,
  mediumIssues: 18,
  lowIssues: 8,
};

export const auditIssues: AuditIssue[] = [
  {
    id: "meta-desc-missing",
    severity: "critical",
    category: "Meta Tags",
    title: "Missing meta descriptions on ALL pages",
    description:
      "Every single page (185 total) is missing a meta description. Google auto-generates snippets which produces suboptimal click-through rates.",
    affectedPages: ["All 185 pages"],
    fix: "Generate unique, keyword-rich meta descriptions (120-155 chars) with CTAs for every page.",
    status: "open",
    impact: "Very High — directly affects CTR from search results",
  },
  {
    id: "canonical-missing",
    severity: "critical",
    category: "Technical SEO",
    title: "Missing canonical tags on ALL pages",
    description:
      "No pages have self-referencing canonical tags. This leaves the site vulnerable to duplicate content issues from trailing slashes, query parameters, or www/non-www variations.",
    affectedPages: ["All 185 pages"],
    fix: "Add self-referencing canonical tags to every page via Next.js metadata.",
    status: "open",
    impact: "High — risk of duplicate content diluting rankings",
  },
  {
    id: "og-tags-missing",
    severity: "critical",
    category: "Social/Sharing",
    title: "Missing Open Graph tags on ALL pages",
    description:
      "No pages have og:title, og:description, og:image tags. Social shares display unpredictable previews.",
    affectedPages: ["All 185 pages"],
    fix: "Add OG tags to every page via Next.js metadata export.",
    status: "open",
    impact: "High — social sharing is a major traffic driver for party businesses",
  },
  {
    id: "booking-blocked",
    severity: "critical",
    category: "Crawlability",
    title: "/book-online blocked in robots.txt",
    description:
      'The booking/conversion page is blocked from search engines via robots.txt "Disallow: /book-online". High-intent searches like "book party boat austin" cannot find this page.',
    affectedPages: ["/book-online"],
    fix: "Remove the Disallow: /book-online line from robots.txt.",
    status: "open",
    impact: "High — conversion page invisible to search",
  },
  {
    id: "cannibalization-bachelor",
    severity: "high",
    category: "Keyword Strategy",
    title: "4 blog posts cannibalize /bachelor-party-austin",
    description:
      'Multiple blog posts target "bachelor party austin" — the exact primary keyword of the service page. Google is confused about which page to rank.',
    affectedPages: [
      "/bachelor-party-austin",
      "/blogs/epic-bachelor-party-austin-ultimate-guide",
      "/blogs/how-to-throw-great-bachelor-party-austin",
      "/blogs/lake-travis-bachelor-party-boats-guide",
      "/blogs/the-best-bachelor-party-boat-in-austin-disco-cruise-vs-private-charter",
    ],
    fix: "Retarget blog posts to specific long-tail keywords. Change titles, H1s, and meta descriptions to informational intent.",
    status: "open",
    impact: "Very High — splitting ranking authority across pages",
  },
  {
    id: "cannibalization-bachelorette",
    severity: "high",
    category: "Keyword Strategy",
    title: "3 blog posts cannibalize /bachelorette-party-austin",
    description:
      'Blog posts target "bachelorette party austin" which directly competes with the service page.',
    affectedPages: [
      "/bachelorette-party-austin",
      "/blogs/epic-bachelorette-party-austin-ultimate-guide",
      "/blogs/how-to-throw-great-bachelorette-party-austin",
      "/blogs/ultimate-austin-bachelorette-party-boat-guide-lake-travis",
    ],
    fix: "Differentiate blog keywords to long-tail variants.",
    status: "open",
    impact: "Very High — service page rankings suppressed",
  },
  {
    id: "cannibalization-disco",
    severity: "high",
    category: "Keyword Strategy",
    title: "Blog cannibalizes branded term 'ATX Disco Cruise'",
    description:
      "/blogs/why-atx-disco-cruise-austins-most-booked-party-boat-experience competes with the /atx-disco-cruise service page for the branded product keyword.",
    affectedPages: [
      "/atx-disco-cruise",
      "/blogs/why-atx-disco-cruise-austins-most-booked-party-boat-experience",
    ],
    fix: "Change blog to target 'Austin party boat experience' instead. Add canonical pointing to service page.",
    status: "open",
    impact: "High — branded term should always go to conversion page",
  },
  {
    id: "thin-content-party-boat-austin",
    severity: "high",
    category: "Content",
    title: "/party-boat-austin has thin content (~1,200 words)",
    description:
      "This page targets a high-volume keyword but has significantly less content than competing pages and your own top pages (3,500-4,500 words).",
    affectedPages: ["/party-boat-austin"],
    fix: "Expand to 2,500+ words with deeper content about Austin party boat options, pricing, what to expect.",
    status: "open",
    impact: "High — insufficient depth to rank for competitive keyword",
  },
  {
    id: "thin-content-lake-travis",
    severity: "high",
    category: "Content",
    title: "/party-boat-lake-travis has thin content (~1,100 words)",
    description:
      "Similar issue — key landing page needs more depth to compete.",
    affectedPages: ["/party-boat-lake-travis"],
    fix: "Expand to 2,500+ words.",
    status: "open",
    impact: "High",
  },
  {
    id: "thin-content-birthday",
    severity: "high",
    category: "Content",
    title: "/birthday-parties has thin content (~650 words)",
    description: "Thinnest service page. Needs significant expansion.",
    affectedPages: ["/birthday-parties"],
    fix: "Expand to 1,500+ words with age-specific party ideas, pricing, FAQ.",
    status: "open",
    impact: "High — commercial intent page too thin to rank",
  },
  {
    id: "thin-content-wedding",
    severity: "high",
    category: "Content",
    title: "/wedding-parties has thin content (~850 words)",
    description:
      "High-value wedding keyword page needs more depth. No WeddingEvent schema either.",
    affectedPages: ["/wedding-parties"],
    fix: "Expand to 1,500+ words. Add WeddingEvent schema.",
    status: "open",
    impact: "High",
  },
  {
    id: "title-h1-identical",
    severity: "medium",
    category: "On-Page SEO",
    title: "Title tag = H1 on multiple pages",
    description:
      "Title and H1 are identical on /birthday-parties, /contact, /celebration-cruises, /party-boat-austin, /party-boat-lake-travis. This wastes keyword variation opportunities.",
    affectedPages: [
      "/birthday-parties",
      "/contact",
      "/celebration-cruises",
      "/party-boat-austin",
      "/party-boat-lake-travis",
    ],
    fix: "Make H1 slightly different from title — use different keyword modifiers.",
    status: "open",
    impact: "Medium — missed keyword diversity",
  },
  {
    id: "duplicate-lake-travis-title",
    severity: "medium",
    category: "On-Page SEO",
    title: '"Lake Travis" appears twice in title tags',
    description:
      "/celebration-cruises and /pricing have 'Lake Travis' repeated in their title tags, wasting character space.",
    affectedPages: ["/celebration-cruises", "/pricing"],
    fix: "Remove duplicate 'Lake Travis' from titles.",
    status: "open",
    impact: "Medium — looks spammy, wastes title space",
  },
  {
    id: "no-pricing-schema",
    severity: "medium",
    category: "Structured Data",
    title: "No Product/Offer schema on /pricing",
    description:
      "Lists specific boats, capacities, and prices ($85-$495/hour) but no structured pricing data.",
    affectedPages: ["/pricing"],
    fix: "Add Product or Offer schema with pricing details.",
    status: "open",
    impact: "Medium — could surface pricing in rich results",
  },
  {
    id: "duplicate-faq-schema",
    severity: "medium",
    category: "Structured Data",
    title: "Duplicate FAQPage schema on /faq and /contact",
    description:
      "Both pages have FAQPage markup with overlapping questions.",
    affectedPages: ["/faq", "/contact"],
    fix: "Consolidate FAQ schema to /faq only. Keep contact-specific Q&A on /contact without FAQPage schema.",
    status: "open",
    impact: "Medium — confuses Google about which FAQ to show",
  },
  {
    id: "blog-commercial-intent",
    severity: "medium",
    category: "Keyword Strategy",
    title: "Blog meta descriptions use transactional language",
    description:
      'Blog descriptions say "Plan an epic bachelor party..." and "Book your Austin party boat today!" — commercial language that competes with service pages.',
    affectedPages: ["~15 blog posts"],
    fix: 'Rewrite to informational: "Learn insider tips for..." / "Discover what to expect..."',
    status: "open",
    impact: "Medium — confuses search intent signals",
  },
  {
    id: "same-lastmod",
    severity: "medium",
    category: "Technical SEO",
    title: "All sitemap lastmod dates identical (2026-03-22)",
    description:
      "Google may ignore lastmod if all dates are the same.",
    affectedPages: ["sitemap.xml"],
    fix: "Only update lastmod when content actually changes.",
    status: "open",
    impact: "Low-Medium — affects crawl prioritization",
  },
  {
    id: "thin-blogs",
    severity: "medium",
    category: "Content",
    title: "Most blog posts are only 350-500 words",
    description:
      "Blog posts are too thin to serve as substantive guides. Not enough content depth to differentiate from service pages or to rank independently.",
    affectedPages: ["~100 blog posts"],
    fix: "Expand key blogs to 1,200+ words or consolidate thin posts into comprehensive guides.",
    status: "open",
    impact: "Medium — thin content dilutes site authority",
  },
];

export const keyPages: PageData[] = [
  {
    url: "/",
    title: "Premier Party Cruises - Austin Lake Travis Boat Rentals",
    h1: "Premier Party Cruises - Austin Lake Travis Boat Rentals",
    metaDescription: null,
    canonical: null,
    wordCount: 3300,
    schemaTypes: ["Organization", "FAQPage", "VideoObject", "Service"],
    internalLinks: 25,
    hasOgTags: false,
    score: 72,
    pageType: "pillar",
    targetKeyword: "austin lake travis boat rentals",
  },
  {
    url: "/atx-disco-cruise",
    title: "ATX Disco Cruise | Austin Bachelor Bachelorette Boat",
    h1: "ATX Disco Cruise - Austin Bachelorette Party & Bachelor Party Boat Lake Travis",
    metaDescription: null,
    canonical: null,
    wordCount: 3400,
    schemaTypes: ["Organization", "BreadcrumbList", "Event", "FAQPage", "ItemList", "VideoObject"],
    internalLinks: 32,
    hasOgTags: false,
    score: 68,
    pageType: "pillar",
    targetKeyword: "atx disco cruise",
  },
  {
    url: "/bachelor-party-austin",
    title: "Bachelor Party Austin | Lake Travis Party Boat Rentals",
    h1: "Austin Bachelor Party Boat Rentals | Lake Travis Cruises",
    metaDescription: null,
    canonical: null,
    wordCount: 3400,
    schemaTypes: ["Organization", "BreadcrumbList", "FAQPage", "Service", "ItemList", "VideoObject"],
    internalLinks: 42,
    hasOgTags: false,
    score: 65,
    pageType: "pillar",
    targetKeyword: "bachelor party austin",
  },
  {
    url: "/bachelorette-party-austin",
    title: "Austin Bachelorette Party Boats | Lake Travis Cruise",
    h1: "Austin Bachelorette Party Boat Cruises | Lake Travis",
    metaDescription: null,
    canonical: null,
    wordCount: 4400,
    schemaTypes: ["Organization", "BreadcrumbList", "FAQPage", "Service", "ItemList", "VideoObject"],
    internalLinks: 42,
    hasOgTags: false,
    score: 70,
    pageType: "pillar",
    targetKeyword: "bachelorette party austin",
  },
  {
    url: "/private-cruises",
    title: "Private Boat Cruise Austin | Lake Travis Rentals",
    h1: "Private Boat Rentals Lake Travis | Austin Party Cruises",
    metaDescription: null,
    canonical: null,
    wordCount: 3500,
    schemaTypes: ["Organization", "BreadcrumbList", "FAQPage", "Service", "Product"],
    internalLinks: 38,
    hasOgTags: false,
    score: 67,
    pageType: "pillar",
    targetKeyword: "private boat cruise austin",
  },
  {
    url: "/party-boat-austin",
    title: "Party Boat Austin | Lake Travis Cruises & Rentals",
    h1: "Party Boat Austin | Lake Travis Cruises & Rentals",
    metaDescription: null,
    canonical: null,
    wordCount: 1250,
    schemaTypes: ["Organization", "BreadcrumbList", "FAQPage", "VideoObject"],
    internalLinks: 48,
    hasOgTags: false,
    score: 42,
    pageType: "landing",
    targetKeyword: "party boat austin",
  },
  {
    url: "/party-boat-lake-travis",
    title: "Party Boat Lake Travis | Austin Cruises & Rentals",
    h1: "Party Boat Lake Travis | Austin Cruises & Rentals",
    metaDescription: null,
    canonical: null,
    wordCount: 1150,
    schemaTypes: ["Organization", "BreadcrumbList", "FAQPage", "VideoObject"],
    internalLinks: 28,
    hasOgTags: false,
    score: 40,
    pageType: "landing",
    targetKeyword: "party boat lake travis",
  },
  {
    url: "/corporate-events",
    title: "Corporate Events Austin | Lake Travis Party Boat",
    h1: "Corporate Events Lake Travis | Austin Business Cruises",
    metaDescription: null,
    canonical: null,
    wordCount: 1000,
    schemaTypes: ["Organization", "BreadcrumbList"],
    internalLinks: 20,
    hasOgTags: false,
    score: 45,
    pageType: "service",
    targetKeyword: "corporate events austin lake travis",
  },
  {
    url: "/wedding-parties",
    title: "Wedding Party Boat Austin | Lake Travis Cruises",
    h1: "Wedding Party Cruises Lake Travis | Austin Wedding Boats",
    metaDescription: null,
    canonical: null,
    wordCount: 875,
    schemaTypes: ["Organization", "BreadcrumbList"],
    internalLinks: 18,
    hasOgTags: false,
    score: 38,
    pageType: "service",
    targetKeyword: "wedding party boat austin",
  },
  {
    url: "/birthday-parties",
    title: "Birthday Party Boat Cruises Lake Travis | Austin Celebrations",
    h1: "Birthday Party Boat Cruises Lake Travis | Austin Celebrations",
    metaDescription: null,
    canonical: null,
    wordCount: 675,
    schemaTypes: ["Organization", "BreadcrumbList"],
    internalLinks: 15,
    hasOgTags: false,
    score: 35,
    pageType: "service",
    targetKeyword: "birthday party boat lake travis",
  },
];

export const cannibalizationIssues: CannibalizationIssue[] = [
  {
    keyword: "bachelor party austin",
    intendedPage: "/bachelor-party-austin",
    competingPages: [
      { url: "/blogs/epic-bachelor-party-austin-ultimate-guide", score: 55 },
      { url: "/blogs/how-to-throw-great-bachelor-party-austin", score: 50 },
      { url: "/blogs/lake-travis-bachelor-party-boats-guide", score: 48 },
      { url: "/blogs/the-best-bachelor-party-boat-in-austin-disco-cruise-vs-private-charter", score: 60 },
    ],
    severity: "high",
    recommendation: "Retarget blogs to long-tail variants. Blog #8 is highest risk at 1,400 words.",
  },
  {
    keyword: "bachelorette party austin",
    intendedPage: "/bachelorette-party-austin",
    competingPages: [
      { url: "/blogs/epic-bachelorette-party-austin-ultimate-guide", score: 52 },
      { url: "/blogs/how-to-throw-great-bachelorette-party-austin", score: 48 },
      { url: "/blogs/ultimate-austin-bachelorette-party-boat-guide-lake-travis", score: 55 },
    ],
    severity: "high",
    recommendation: "Change blog targets to 'austin bachelorette weekend itinerary', 'bachelorette planning tips', etc.",
  },
  {
    keyword: "ATX Disco Cruise",
    intendedPage: "/atx-disco-cruise",
    competingPages: [
      { url: "/blogs/why-atx-disco-cruise-austins-most-booked-party-boat-experience", score: 58 },
      { url: "/blogs/the-best-bachelor-party-boat-in-austin-disco-cruise-vs-private-charter", score: 45 },
    ],
    severity: "high",
    recommendation: "Branded term must always point to conversion page. Add canonical from blog to /atx-disco-cruise.",
  },
  {
    keyword: "party boat lake travis",
    intendedPage: "/party-boat-lake-travis",
    competingPages: [
      { url: "/blogs/lake-travis-bachelor-party-boats-guide", score: 42 },
      { url: "/blogs/why-atx-disco-cruise-austins-most-booked-party-boat-experience", score: 38 },
    ],
    severity: "medium",
    recommendation: "Strengthen /party-boat-lake-travis content (currently only 1,100 words). Differentiate blog keywords.",
  },
];

export const positiveFindings = [
  "Excellent schema markup on homepage and service pages (Organization, LocalBusiness, FAQPage, Service, Product, VideoObject, Event, BreadcrumbList)",
  "4.9/5 aggregate rating with 500 reviews in schema — strong for rich snippets",
  "AI visibility ahead of 99% of competitors: llms.txt, ai.txt, AI crawlers explicitly allowed",
  "Strong H1→H2→H3 heading hierarchy across all pages",
  "Good internal linking: 28-48 links per page with keyword-rich anchors",
  "All blog posts link back to pillar pages — hub-and-spoke structure in place",
  "Deep content on top pages: bachelorette ~4,500 words, bachelor/disco ~3,500 words",
  "BYOB policy content creates natural FAQ opportunities",
  "15+ years of experience = strong E-E-A-T signals",
  "150,000+ guests served = strong trust signal",
];
