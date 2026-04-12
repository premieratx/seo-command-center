import Link from "next/link";

export default function MethodologyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/profiles"
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block"
      >
        ← Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-2">Methodology & Best Practices</h1>
      <p className="text-zinc-400 text-sm mb-8">
        How we collect data, analyze it, and make optimization decisions. This document ensures
        every recommendation is grounded in published best practices and verifiable measurement science.
      </p>

      <nav className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-8">
        <h2 className="font-semibold mb-3 text-sm text-zinc-400 uppercase tracking-wide">Contents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
          {[
            ["#semrush-methodology", "1. How SEMRush Measures AI Visibility"],
            ["#our-scoring", "2. Our Impact Score Algorithm"],
            ["#seo-best-practices", "3. SEO Best Practices (Published Standards)"],
            ["#ai-visibility-optimization", "4. AI Visibility Optimization Framework"],
            ["#web-design-principles", "5. Web Design Principles (Wes McDowell)"],
            ["#website-structure", "6. Website Structure for SEO"],
            ["#data-pipeline", "7. Data Collection → Analysis → Implementation"],
            ["#sources", "8. Sources & References"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-blue-400 hover:text-blue-300 py-0.5">
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Section 1: SEMRush Methodology */}
      <section id="semrush-methodology" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">1. How SEMRush Measures AI Visibility</h2>

        <div className="space-y-4">
          <Card title="AI Visibility Score (0-100)">
            <p>A benchmark metric showing how often your brand appears in AI-generated answers compared to the <strong>median number of mentions for your top industry competitors</strong>. SEMRush automatically identifies competitors to benchmark your visibility within your space.</p>
            <p className="mt-2">The score aggregates: mention frequency, citation count, share of voice vs competitors, and distribution across AI platforms. Updated <strong>daily on a rolling basis</strong> from a database of <strong>239M+ AI queries</strong>.</p>
          </Card>

          <Card title="Share of Voice (SoV)">
            <p>Percentage of mentions your brand receives in AI-generated answers compared to competitors. Calculated using:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Number of brand mentions</strong> across AI responses</li>
              <li><strong>Position of your brand</strong> within each AI response (higher = more weight)</li>
              <li><strong>For ChatGPT only:</strong> also considers the topic&apos;s search volume</li>
            </ul>
            <p className="mt-2 text-amber-300 text-sm">Note: SoV was updated in October 2025 to reflect prompt volume (how often a prompt is searched). The exact weighting formula is proprietary.</p>
          </Card>

          <Card title="Mentions">
            <p>Total number of unique AI queries where your brand appears in the response. Each mention = one unique prompt where the brand was included. SEMRush tracks both:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Direct website links (citations)</li>
              <li>Unlinked brand name mentions</li>
            </ul>
          </Card>

          <Card title="Citations">
            <p>Number of AI responses that cite your domain as a source (with a link). Different from mentions because citations include a URL reference, which carries more SEO weight.</p>
          </Card>

          <Card title="AI Volume">
            <p>Estimate of how often people ask about a given topic across AI platforms. Measured at the topic level, not individual prompts. Used to prioritize which topics are worth optimizing for.</p>
          </Card>

          <Card title="Topic Difficulty (0-100%)">
            <p>How competitive it is to appear for a topic, based on the brands most frequently mentioned in AI answers. Lower = easier to rank. Similar concept to keyword difficulty in traditional SEO.</p>
          </Card>

          <Card title="Data Collection Process">
            <p>SEMRush collects and refreshes <strong>100M+ prompts monthly</strong>. They run these through LLMs (ChatGPT, Google AI Mode, Gemini, Perplexity) and analyze:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Which brands are mentioned in each response</li>
              <li>Where brands appear (position in the answer)</li>
              <li>Whether domains are cited with links</li>
              <li>Sentiment of how the brand is described</li>
              <li>Which narrative themes/drivers are associated with each brand</li>
            </ul>
            <p className="mt-2">Reports can be run up to 300 times per day per domain. Data is refreshed daily on a rolling basis.</p>
          </Card>

          <Card title="Platform Distribution">
            <p>For premierpartycruises.com (as of April 9, 2026):</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div className="bg-zinc-900 rounded p-2"><strong>Google AI Mode:</strong> 38.6% of mentions (27)</div>
              <div className="bg-zinc-900 rounded p-2"><strong>Gemini:</strong> 25.7% of mentions (18)</div>
              <div className="bg-zinc-900 rounded p-2"><strong>AI Overview:</strong> 24.3% of mentions (17)</div>
              <div className="bg-zinc-900 rounded p-2"><strong>ChatGPT:</strong> 11.4% of mentions (8)</div>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 2: Our Impact Score */}
      <section id="our-scoring" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">2. Our Impact Score Algorithm</h2>

        <Card title="How We Calculate Impact Score (0-100)">
          <p>The impact score answers: &quot;If I could only optimize for 10 keywords, which ones would move the needle most?&quot; It combines four factors:</p>

          <div className="mt-4 space-y-3">
            <Factor name="Search Volume" weight="30 pts" description="Higher monthly search volume = more potential traffic. Scaled: 200 searches/mo = max score. Captures the size of the opportunity." />
            <Factor name="Position Opportunity" weight="30 pts" description="Where you rank determines how much room there is to improve. Positions 4-10 score highest (30pts) because small optimizations push to top 3. Page 2 (11-20) scores 25pts. Already #1 scores only 5pts (defend, don't chase)." />
            <Factor name="Difficulty Ease" weight="25 pts" description="Inverse of keyword difficulty. KD 0% = 25pts, KD 100% = 0pts. Lower difficulty means faster results from optimization. Formula: max(0, 25 - KD/4)." />
            <Factor name="Current Traffic Value" weight="15 pts" description="Keywords already sending you traffic are worth defending. A keyword at position #5 with 4% of your traffic is more urgent than a keyword at #5 with 0% traffic. Scaled: traffic_percent * 3, max 15." />
          </div>

          <div className="mt-4 bg-zinc-900 rounded p-3 font-mono text-xs">
            impact = min(100, volumeScore + positionScore + difficultyScore + trafficScore)
          </div>
        </Card>

        <Card title="Quick Wins vs Most Impactful" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-400">Quick Wins</h4>
              <p className="text-sm mt-1">Position 4-20, KD ≤ 40%, Volume ≥ 30. Sorted by difficulty ascending. These are keywords where a small content update or meta tag fix could jump you to page 1 or top 3 within weeks.</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400">Most Impactful</h4>
              <p className="text-sm mt-1">Top 30 keywords by composite impact score. Balances all four factors — might include harder keywords if the volume justifies the effort. These are your strategic priorities.</p>
            </div>
          </div>
          <div className="mt-3">
            <h4 className="font-semibold text-amber-400">Easy Wins (Low KD)</h4>
            <p className="text-sm mt-1">KD ≤ 15%, Volume ≥ 30. These are keywords where competitors barely compete. Often long-tail or niche terms. Fastest path to ranking improvement with minimal content effort.</p>
          </div>
        </Card>
      </section>

      {/* Section 3: SEO Best Practices */}
      <section id="seo-best-practices" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">3. SEO Best Practices (Published Standards)</h2>

        <Card title="On-Page SEO Fundamentals">
          <div className="space-y-3">
            <Practice title="Title Tags" rule="50-60 characters. Primary keyword near the beginning. Brand name at end with separator. Unique per page." source="Google Search Central, Moz" />
            <Practice title="Meta Descriptions" rule="120-155 characters. Include primary keyword (bolded in SERPs). Call-to-action verb. Unique per page. This is your ad copy for organic search." source="Google, SEMRush" />
            <Practice title="H1 Tags" rule="Exactly one per page. Contains primary keyword. Different from title tag but semantically related. Under 70 characters." source="W3C, Moz, Ahrefs" />
            <Practice title="Heading Hierarchy" rule="H1 → H2 → H3 → H4. Never skip levels. Each H2/H3 should relate to a keyword or answer a question. Don't use headings for styling." source="W3C Accessibility, Google" />
            <Practice title="Keyword Density" rule="Primary: 1-2%. Secondary: 0.5-1%. Never exceed 3% (Google treats as stuffing). Use variations and LSI terms naturally." source="SEMRush, Yoast" />
            <Practice title="Internal Linking" rule="Every page: 3-5 internal links minimum. Keyword-rich anchor text (varied, not identical). Pillar pages link to all cluster posts. Blogs link to pillar within first 300 words." source="Ahrefs, Moz" />
            <Practice title="Image Optimization" rule="Descriptive alt text with keyword (under 125 chars). WebP/AVIF format. Explicit width/height (prevents CLS). Lazy load below fold. Priority load above fold." source="Google PageSpeed, Web.dev" />
            <Practice title="Canonical Tags" rule="Self-referencing canonical on every page. Duplicate/similar pages canonical to preferred version. Absolute URLs only. Must match sitemap URL." source="Google Search Central" />
          </div>
        </Card>

        <Card title="Technical SEO Standards" className="mt-4">
          <div className="space-y-3">
            <Practice title="Core Web Vitals" rule="LCP < 2.5s, CLS < 0.1, INP < 200ms. These are ranking factors since 2021. Test with PageSpeed Insights." source="Google, Web.dev" />
            <Practice title="Mobile-First" rule="Viewport meta tag. Touch targets ≥ 44px. No horizontal scroll. 16px min body font. Google indexes mobile version first." source="Google Mobile-First Indexing" />
            <Practice title="Structured Data" rule="JSON-LD format preferred. Organization, BreadcrumbList, FAQPage, Service schemas. Validates with Google Rich Results Test." source="Schema.org, Google" />
            <Practice title="Sitemap" rule="All indexable pages. Accurate lastmod dates (not all the same). Under 50K URLs. Submitted to GSC and Bing Webmaster." source="Google Search Central" />
            <Practice title="robots.txt" rule="Don't block important resources. Point to sitemap. Consider AI crawler rules (GPTBot, ClaudeBot, PerplexityBot)." source="Google, Robots Exclusion Protocol" />
          </div>
        </Card>
      </section>

      {/* Section 4: AI Visibility Optimization */}
      <section id="ai-visibility-optimization" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">4. AI Visibility Optimization Framework</h2>

        <Card title="How AI Models Select Sources">
          <p>AI models (ChatGPT, Gemini, Perplexity, Google AI Mode) recommend brands based on:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-2">
            <li><strong>Content quality and depth</strong> — comprehensive, well-structured content that directly answers questions is preferred over thin or ambiguous content</li>
            <li><strong>Source authority</strong> — sites with strong E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness) get cited more</li>
            <li><strong>Structured data</strong> — JSON-LD schema helps AI understand your content&apos;s structure and extract accurate information</li>
            <li><strong>Direct answer format</strong> — content that leads with a clear, direct answer in the first paragraph gets pulled into AI responses</li>
            <li><strong>Freshness</strong> — recently updated content is weighted higher than stale pages</li>
            <li><strong>Third-party validation</strong> — mentions and citations from other authoritative sites amplify AI trust</li>
          </ol>
        </Card>

        <Card title="Content Patterns That Win AI Recommendations" className="mt-4">
          <div className="space-y-3">
            <Practice title="Definitive Answer Pattern" rule="Bold, authoritative opening statement → evidence/data → nuance ('however, if...') → comparison table → specific actionable advice. AI pulls the opening statement as its recommendation." source="SEMRush AI Visibility Guide" />
            <Practice title="FAQ Schema Pattern" rule="Structure content as Q&A with FAQPage schema. AI models directly extract these for question-based queries. Use exact phrasing from 'People Also Ask'." source="Google, Schema.org" />
            <Practice title="Comprehensive Guide Pattern" rule="TL;DR box at top → table of contents → each section answers a specific question → data tables → FAQ section. AI treats this as the authoritative reference." source="Ahrefs Content Study" />
            <Practice title="Topic Clustering" rule="Pillar page (broad topic) + cluster posts (specific subtopics) + internal links connecting them. AI models assess topical authority by coverage depth." source="HubSpot, SEMRush" />
          </div>
        </Card>

        <Card title="AI Crawler Management" className="mt-4">
          <p>Allow AI crawlers in robots.txt. Use <code className="bg-zinc-800 px-1 rounded text-xs">max-snippet:-1</code> to allow unlimited snippet length. Maintain <code className="bg-zinc-800 px-1 rounded text-xs">llms.txt</code> and <code className="bg-zinc-800 px-1 rounded text-xs">ai.txt</code> files for AI-specific guidance.</p>
          <p className="mt-2 text-green-400 text-sm">Premier Party Cruises already has these in place — ahead of 99% of competitors.</p>
        </Card>
      </section>

      {/* Section 5: Web Design Principles */}
      <section id="web-design-principles" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">5. Web Design Principles (Wes McDowell)</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Based on Wes McDowell&apos;s proven framework from 10+ years of testing websites for service businesses
          and 300K+ YouTube subscribers. His core philosophy: success comes from simplifying and clarifying your message.
        </p>

        <div className="space-y-4">
          <Card title="1. Message Clarity Over Design Complexity">
            <p>The most important part of your website is your message, your copy, and your strategy. A beautiful site with unclear messaging converts worse than a simple site with crystal-clear value proposition. <strong>Lead with what you do, who it&apos;s for, and why they should care.</strong></p>
          </Card>
          <Card title="2. Hero Section: The 5-Second Test">
            <p>Visitors decide in 5 seconds whether to stay. Your hero section must pass the test: Can a stranger understand what you offer, who it&apos;s for, and what to do next within 5 seconds? Use: clear headline + supporting subtext + one primary CTA + relevant image/video.</p>
          </Card>
          <Card title="3. One Clear Call-to-Action Per Page">
            <p>Don&apos;t give visitors 10 choices. Each page should have ONE primary action you want them to take. Secondary CTAs can exist but shouldn&apos;t compete. The CTA should be visible without scrolling and repeated throughout the page.</p>
          </Card>
          <Card title="4. Social Proof Above the Fold">
            <p>Testimonials, review counts, trust badges, and client logos reduce friction. Place them near the CTA. Real names, photos, and specific results outperform generic quotes. For PPC: &quot;4.9/5 from 500+ reviews&quot; and &quot;150,000+ guests served&quot; are powerful trust signals.</p>
          </Card>
          <Card title="5. Guide the Journey, Don't Dump Information">
            <p>Structure pages like a conversation: Problem → Solution → How it works → Social proof → CTA. Don&apos;t front-load every detail. Use progressive disclosure (accordions, tabs) to let visitors dig deeper on their own terms.</p>
          </Card>
          <Card title="6. Mobile-First Design (Not Mobile-Adapted)">
            <p>Design for mobile first, then expand for desktop. Touch targets ≥ 44px. No hover-dependent interactions. Content should be scannable with thumb-friendly navigation. 60%+ of party boat searches happen on mobile.</p>
          </Card>
          <Card title="7. Speed is a Feature">
            <p>Every second of load time costs ~7% conversion. Optimize images (WebP, lazy loading), minimize JavaScript, preload critical fonts. Target: LCP under 2.5 seconds on mobile. Speed is both a UX feature and a Google ranking factor.</p>
          </Card>
          <Card title="8. Video as a Welcome Mat">
            <p>The homepage should give an immediate small taste of what you offer. Video is extremely effective as a welcome device — it builds trust faster than text. For PPC: boat walkthrough videos, customer testimonial reels, and experience previews.</p>
          </Card>
        </div>
      </section>

      {/* Section 6: Website Structure */}
      <section id="website-structure" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">6. Website Structure for SEO</h2>

        <Card title="URL Architecture">
          <p>Flat hierarchy: no more than 3 levels deep from root. Descriptive, keyword-rich slugs. Hyphens, not underscores. Lowercase only. No session IDs or tracking parameters in indexed URLs.</p>
          <div className="mt-2 bg-zinc-900 rounded p-3 font-mono text-xs">
            Good: /bachelor-party-austin<br/>
            Good: /blogs/lake-travis-safety-guide<br/>
            Bad: /page?id=47&session=abc123
          </div>
        </Card>

        <Card title="Pillar-Cluster Content Model" className="mt-4">
          <p>The proven architecture for topical authority:</p>
          <div className="mt-2 bg-zinc-900 rounded p-3 text-sm">
            <div className="font-semibold text-blue-400">Pillar Page</div>
            <div className="text-zinc-400 ml-4">Broad topic, highest-volume keyword, 2,000-5,000 words</div>
            <div className="ml-4 mt-1 space-y-1">
              <div>├── <span className="text-green-400">Cluster Post 1</span> <span className="text-zinc-500">(specific subtopic, long-tail keyword)</span></div>
              <div>├── <span className="text-green-400">Cluster Post 2</span> <span className="text-zinc-500">(different subtopic, different long-tail)</span></div>
              <div>├── <span className="text-green-400">Cluster Post 3</span> <span className="text-zinc-500">(another angle on the topic)</span></div>
              <div>└── <span className="text-zinc-500">All cluster posts link back to pillar within first 300 words</span></div>
            </div>
          </div>
        </Card>

        <Card title="Page Types & Content Depth" className="mt-4">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="py-2">Page Type</th>
                <th className="py-2">Target Words</th>
                <th className="py-2">Keyword Type</th>
                <th className="py-2">Schema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr><td className="py-2">Pillar/Hub</td><td>2,000-5,000</td><td>Head terms</td><td>FAQPage, Service</td></tr>
              <tr><td className="py-2">Service</td><td>800-2,000</td><td>Commercial intent</td><td>Service, Offer</td></tr>
              <tr><td className="py-2">Blog/Guide</td><td>1,200-2,500</td><td>Informational long-tail</td><td>Article, HowTo</td></tr>
              <tr><td className="py-2">Landing</td><td>500-1,500</td><td>Location/campaign</td><td>LocalBusiness</td></tr>
              <tr><td className="py-2">Pricing</td><td>800-1,500</td><td>Transactional</td><td>Product, Offer</td></tr>
            </tbody>
          </table>
        </Card>
      </section>

      {/* Section 7: Data Pipeline */}
      <section id="data-pipeline" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">7. Data Collection → Analysis → Implementation</h2>

        <Card title="Our Data Pipeline">
          <div className="space-y-4">
            <Stage num={1} title="Collect" items={[
              "SEMRush API: keywords (200+), competitors (10), domain metrics, keyword difficulty, SERP features — refreshed daily at 6 AM UTC",
              "SEMRush AI Visibility: Share of Voice, mentions, citations, strategy recommendations — scraped via Chrome automation",
              "Custom AI Tracker: Perplexity queries from 16 US cities with unbiased prompts — daily at 7 AM UTC",
              "Google PageSpeed Insights: Core Web Vitals, performance scores — on demand",
              "Live site crawler: title, meta, headings, schema, word count, links — on demand or scheduled",
            ]} />
            <Stage num={2} title="Analyze" items={[
              "Impact scoring: composite of volume, position opportunity, difficulty ease, traffic value",
              "Cannibalization detection: multiple pages competing for same keyword via position data",
              "Competitor gap analysis: keywords they rank for that we don't (SEMRush domain_organic_organic)",
              "AI visibility benchmarking: our mention rate vs competitors across AI platforms",
              "Content depth scoring: word count, heading structure, schema presence, internal links",
            ]} />
            <Stage num={3} title="Recommend" items={[
              "Auto-generated recommendations refreshed daily based on latest data",
              "SEMRush AI strategy insights imported from Brand Performance reports",
              "Prioritized by impact score and implementation effort",
              "Quick wins surfaced first (low KD + high volume + position 4-20)",
            ]} />
            <Stage num={4} title="Implement" items={[
              "Fix Session: creates working branch in GitHub",
              "Each fix committed to branch with before/after tracked",
              "Preview via Netlify branch deploy before touching production",
              "Publish: PR created, merged, production redeploys",
              "Issues marked as fixed, metrics re-measured next cycle",
            ]} />
            <Stage num={5} title="Verify" items={[
              "Next day's SEMRush refresh shows position changes",
              "AI visibility tracker detects mention rate changes",
              "Recommendation engine adjusts priorities based on new data",
              "Cycle repeats — continuous improvement loop",
            ]} />
          </div>
        </Card>
      </section>

      {/* Section 8: Sources */}
      <section id="sources" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">8. Sources & References</h2>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 space-y-2 text-sm">
          {[
            ["Google Search Central", "https://developers.google.com/search/docs"],
            ["SEMRush AI Visibility Metrics", "https://www.semrush.com/kb/1594-ai-seo-metrics"],
            ["SEMRush Visibility Overview Report", "https://www.semrush.com/kb/1596-visibility-overview-report"],
            ["SEMRush AI Share of Voice", "https://www.semrush.com/blog/how-to-measure-ai-share-of-voice/"],
            ["SEMRush AI Visibility Toolkit", "https://www.semrush.com/kb/1493-ai-visibility-toolkit"],
            ["Moz Beginner's Guide to SEO", "https://moz.com/beginners-guide-to-seo"],
            ["Ahrefs SEO Guide", "https://ahrefs.com/seo"],
            ["Web.dev Core Web Vitals", "https://web.dev/vitals/"],
            ["Schema.org", "https://schema.org/"],
            ["Wes McDowell - Website Strategy", "https://wesmcdowell.com/"],
            ["Wes McDowell x SEMRush Academy", "https://www.semrush.com/academy/courses/how-to-create-a-small-business-website-with-wes-mcdowell"],
            ["Google E-E-A-T Guidelines", "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"],
          ].map(([title, url]) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300"
            >
              {title} →
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[#141414] border border-[#262626] rounded-lg p-4 ${className}`}>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
    </div>
  );
}

function Practice({
  title,
  rule,
  source,
}: {
  title: string;
  rule: string;
  source: string;
}) {
  return (
    <div className="bg-zinc-900 rounded p-3">
      <div className="font-medium text-white">{title}</div>
      <div className="text-sm text-zinc-300 mt-1">{rule}</div>
      <div className="text-xs text-zinc-600 mt-1">Source: {source}</div>
    </div>
  );
}

function Factor({
  name,
  weight,
  description,
}: {
  name: string;
  weight: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 bg-zinc-900 rounded p-3">
      <div className="shrink-0 text-blue-400 font-mono text-sm w-16">{weight}</div>
      <div>
        <div className="font-medium text-white">{name}</div>
        <div className="text-sm text-zinc-400 mt-0.5">{description}</div>
      </div>
    </div>
  );
}

function Stage({
  num,
  title,
  items,
}: {
  num: number;
  title: string;
  items: string[];
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center font-bold">
        {num}
      </div>
      <div>
        <div className="font-semibold text-white text-lg">{title}</div>
        <ul className="mt-1 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-zinc-400 flex gap-2">
              <span className="text-zinc-600 shrink-0">-</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
