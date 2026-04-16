import Link from "next/link";

export default function DesignGuidelinesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/methodology"
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block"
      >
        ← Back to Methodology
      </Link>
      <h1 className="text-3xl font-bold mb-2">Design Guidelines</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Design system extracted from the PPC Booking Concierge app + Wes McDowell&apos;s proven
        conversion principles. Use these as the standard for all Premier Party Cruises web properties.
      </p>

      {/* Color Palette */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Color Palette</h2>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
          <h3 className="font-semibold mb-4">Primary Ocean Palette</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <ColorSwatch name="Primary Blue" value="hsl(210, 85%, 45%)" hex="#1166B8" css="--primary" />
            <ColorSwatch name="Primary Glow" value="hsl(210, 90%, 55%)" hex="#2B8BDB" css="--primary-glow" />
            <ColorSwatch name="Accent Cyan" value="hsl(195, 85%, 50%)" hex="#13A3CC" css="--accent" />
            <ColorSwatch name="Sunset Coral" value="hsl(15, 85%, 60%)" hex="#E86835" css="--secondary" />
          </div>
          <h3 className="font-semibold mb-4">Luxury / Fancy Quote Mode</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <ColorSwatch name="Fancy Dark" value="hsl(228, 28%, 12%)" hex="#161B2E" css="--fancy-bg" />
            <ColorSwatch name="Fancy Secondary" value="hsl(230, 25%, 18%)" hex="#222842" css="--fancy-bg-secondary" />
            <ColorSwatch name="Gold Accent" value="hsl(45, 90%, 60%)" hex="#F0C83D" css="--fancy-gold" />
            <ColorSwatch name="Gold Dark" value="hsl(42, 85%, 50%)" hex="#D9A625" css="--fancy-gold-dark" />
          </div>
          <h3 className="font-semibold mb-4">Backgrounds &amp; Neutrals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ColorSwatch name="Light BG" value="hsl(210, 20%, 98%)" hex="#F8F9FB" css="--background" />
            <ColorSwatch name="Dark BG" value="hsl(215, 30%, 8%)" hex="#0E1219" css="--background (dark)" />
            <ColorSwatch name="Card Light" value="hsl(0, 0%, 100%)" hex="#FFFFFF" css="--card" />
            <ColorSwatch name="Card Dark" value="hsl(215, 28%, 10%)" hex="#121825" css="--card (dark)" />
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Typography</h2>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Font Stack</h3>
            <div className="space-y-2 text-sm">
              <div className="bg-zinc-900 rounded p-3">
                <span className="text-zinc-400">Primary:</span>{" "}
                <span className="text-white">Inter / System Sans-Serif</span>
                <span className="text-zinc-500 ml-2">— all body text, UI elements, navigation</span>
              </div>
              <div className="bg-zinc-900 rounded p-3">
                <span className="text-zinc-400">Display / Luxury:</span>{" "}
                <span className="text-white font-serif">Playfair Display</span>
                <span className="text-zinc-500 ml-2">— hero headings, formal quotes, premium CTAs</span>
              </div>
              <div className="bg-zinc-900 rounded p-3">
                <span className="text-zinc-400">Monospace:</span>{" "}
                <span className="text-white font-mono">Geist Mono</span>
                <span className="text-zinc-500 ml-2">— pricing, data, code, technical elements</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Scale</h3>
            <div className="space-y-2">
              <TypoRow size="7xl" weight="bold" use="Hero headline (desktop)" example="Premier Party Cruises" />
              <TypoRow size="5xl" weight="bold" use="Hero headline (mobile)" example="Premier Party Cruises" />
              <TypoRow size="3xl" weight="bold" use="Section headings" example="Why Choose Us" />
              <TypoRow size="2xl" weight="semibold" use="Card titles, subsection heads" example="Private Charters" />
              <TypoRow size="xl" weight="medium" use="Feature highlights, stat labels" example="4.9-Star Rating" />
              <TypoRow size="base" weight="normal" use="Body text, descriptions" example="Book your dream cruise..." />
              <TypoRow size="sm" weight="normal" use="Captions, metadata, fine print" example="Last updated Apr 12" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Luxury Mode Typography</h3>
            <div className="bg-zinc-900 rounded p-4">
              <p className="text-sm text-zinc-400 mb-2">
                For formal quotes and premium experiences, use Playfair Display with:
              </p>
              <ul className="text-sm text-zinc-300 space-y-1 list-disc pl-5">
                <li><code className="bg-zinc-800 px-1 rounded text-xs">letter-spacing: -0.02em</code> — tighter tracking for elegance</li>
                <li><code className="bg-zinc-800 px-1 rounded text-xs">font-weight: 700</code> — bold only, never regular</li>
                <li>Gold text shadow: <code className="bg-zinc-800 px-1 rounded text-xs">text-shadow: 0 0 20px hsl(45 90% 60% / 0.3)</code></li>
                <li>Pair with thin-weight sans-serif body text for contrast</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Layout Patterns */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Layout Patterns</h2>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-4">
          <DesignRule
            title="Hero Section"
            rule="Full-bleed gradient background (ocean blue → cyan). Min-height 80vh. Centered content with max-w-6xl. Animated wave SVG overlay at bottom. Stats grid (2x2 mobile, 4-col desktop) with glassmorphism cards (bg-white/10 backdrop-blur-sm)."
            mcDowell="Wes McDowell: 5-Second Test — visitor must understand what you offer, who it's for, and what to do next within 5 seconds."
          />
          <DesignRule
            title="Content Sections"
            rule="Max-w-6xl centered. Generous vertical padding (py-16 to py-24). Alternating backgrounds (white/slight blue wash). Clear heading hierarchy with H2 sections."
            mcDowell="Wes McDowell: Guide the Journey — structure pages like a conversation: Problem → Solution → How it works → Social proof → CTA."
          />
          <DesignRule
            title="Card Components"
            rule="Rounded-lg (0.75rem). Soft shadow (shadow-soft). On hover: scale(1.02) with transition 300ms. In dark/luxury mode: bg-white/10 backdrop-blur-sm border-white/20."
            mcDowell="Wes McDowell: Progressive Disclosure — don't dump information. Use cards to let visitors dig deeper on their terms."
          />
          <DesignRule
            title="CTA Buttons"
            rule="Primary: gradient background (gold for luxury, coral for standard). Large touch targets (px-8 py-6 for hero CTAs). Hover: scale(1.05) + translateY(-2px) + enhanced shadow. Always ONE primary CTA per viewport."
            mcDowell="Wes McDowell: One Clear CTA Per Page — each page has ONE primary action. Secondary CTAs exist but don't compete."
          />
          <DesignRule
            title="Social Proof"
            rule="Place near CTA buttons. Use specific numbers: '4.9/5 from 500+ reviews', '150,000+ guests served'. Real names on testimonials. Star ratings with gold color."
            mcDowell="Wes McDowell: Social Proof Above the Fold — trust badges and review counts reduce friction. Place near the CTA."
          />
          <DesignRule
            title="Mobile Design"
            rule="Touch targets ≥ 44px. No hover-dependent interactions. 16px min body font. Bottom-fixed CTA on scroll. Hamburger nav with slide-in panel. Images scale with srcset."
            mcDowell="Wes McDowell: Mobile-First (Not Mobile-Adapted) — design for mobile first, then expand for desktop."
          />
        </div>
      </section>

      {/* Effects & Motion */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Effects &amp; Motion</h2>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-3">
          <EffectRow name="Smooth Transition" css="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" use="All interactive elements" />
          <EffectRow name="Hover Scale" css="transform: scale(1.05)" use="CTA buttons, interactive cards" />
          <EffectRow name="Hover Lift" css="transform: translateY(-2px)" use="Fancy/luxury buttons" />
          <EffectRow name="Soft Shadow" css="0 4px 20px -4px hsl(210 50% 50% / 0.15)" use="Cards, elevated surfaces" />
          <EffectRow name="Glow Shadow" css="0 0 30px hsl(210 85% 55% / 0.3)" use="Primary buttons, active states" />
          <EffectRow name="Gold Glow" css="0 6px 30px hsl(45 90% 60% / 0.4)" use="Luxury CTA buttons on hover" />
          <EffectRow name="Glassmorphism" css="bg-white/10 backdrop-blur-sm" use="Overlay cards on hero, stat badges" />
          <EffectRow name="Geometric BG" css="Diagonal gold lines at 3% opacity" use="Luxury page backgrounds" />
          <EffectRow name="Wave Overlay" css="SVG wave path at bottom of sections" use="Hero sections, section transitions" />
          <EffectRow name="Bounce" css="animate-bounce" use="Hero icon (Anchor), attention getters" />
        </div>
      </section>

      {/* Gradients */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Gradients</h2>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="h-20 rounded-lg mb-2" style={{ background: "linear-gradient(135deg, hsl(210,85%,45%), hsl(195,85%,50%))" }} />
              <div className="text-sm font-medium">Ocean Gradient</div>
              <div className="text-xs text-zinc-500">Hero backgrounds, primary surfaces</div>
            </div>
            <div>
              <div className="h-20 rounded-lg mb-2" style={{ background: "linear-gradient(135deg, hsl(15,85%,60%), hsl(35,90%,55%))" }} />
              <div className="text-sm font-medium">Sunset Gradient</div>
              <div className="text-xs text-zinc-500">Secondary CTAs, accent elements</div>
            </div>
            <div>
              <div className="h-20 rounded-lg mb-2" style={{ background: "linear-gradient(135deg, hsl(42,85%,50%), hsl(45,90%,60%))" }} />
              <div className="text-sm font-medium">Gold Gradient</div>
              <div className="text-xs text-zinc-500">Luxury mode buttons, premium indicators</div>
            </div>
          </div>
        </div>
      </section>

      {/* V2 Luxury Concierge Design System */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-purple-400">V2 Luxury Concierge Design System</h2>
        <p className="text-zinc-400 text-sm mb-4">
          The proven template for all V2 page upgrades. Based on the HomeV2 design that outperforms
          the current homepage on every SEO and conversion metric.
        </p>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-4">
          <DesignRule
            title="Typography: Cormorant Garamond + Jost"
            rule="Display/headlines: Cormorant Garamond, weight 300, italic for emphasis words. Body: Jost, weight 400-600. Headlines use clamp(3.75rem, 4vw, 5.47rem) with line-height 0.96. All text anti-aliased."
            mcDowell="Typography creates instant luxury perception. Serif + sans-serif pairing signals premium without saying it."
          />
          <DesignRule
            title="Color Palette: Dark/Gold"
            rule="Background: #07070C (deepest), #0F0F18 (alt sections), #1A1A26 (cards). Gold: #C8A96E (primary accent), #DFC08A (light), #EDD9AA (pale). Cream: #F0E6D0 (headings), #C8B898 (body). Borders: rgba(200,169,110,0.16)."
            mcDowell="Dark backgrounds with gold accents create exclusivity. The contrast ratio naturally draws eyes to CTAs and key content."
          />
          <DesignRule
            title="Hero: Video Background at 35% Opacity"
            rule="Full-viewport hero with autoplay muted loop video behind a dark gradient overlay. Left-aligned content with eyebrow text (uppercase, gold, letter-spacing 0.28em), massive headline, descriptive subheadline, and dual CTAs."
            mcDowell="Wes McDowell: Video as Welcome Mat — hero video backgrounds convert 2-3x better than static images. 35% opacity keeps text readable."
          />
          <DesignRule
            title="Trust Bar: 5 Stats Immediately After Hero"
            rule="Horizontal bar with 5 trust signals: 150,000+ Guests | Perfect Safety | 4.9 Star Rating | 4 Premium Boats | BYOB Friendly. Each has icon + label + sublabel. Dark background with gold border-bottom."
            mcDowell="Wes McDowell: Social Proof Above the Fold — place trust signals immediately after the hero. Specific numbers beat vague claims."
          />
          <DesignRule
            title="Sections: Alternating Backgrounds"
            rule="Alternate between hp2-section (bg-0: #07070C) and hp2-section--alt (bg-1: #0F0F18). Each section has: section label (uppercase, gold, small), headline (Cormorant Garamond italic emphasis), body text, then content."
            mcDowell="Visual rhythm through alternating backgrounds creates a sense of journey. Users feel progress as they scroll."
          />
          <DesignRule
            title="Cards: Sharp Edges, Gold Borders"
            rule="No border-radius (sharp, premium feel). Background: #1A1A26. Border: 1px solid rgba(200,169,110,0.16). Numbered cards use gold accent number. Content uses cream/muted text hierarchy."
            mcDowell="Sharp edges signal precision and luxury. Rounded corners feel casual — square corners feel intentional."
          />
          <DesignRule
            title="Experience Cards: Photo + Content Split"
            rule="Two-column cards: left column is photo (aspect-ratio with object-cover), right column is title, meta tags, description, price, and CTA. Tags use small uppercase gold-bordered pills."
            mcDowell="Show don't tell. Real photos of the experience remove uncertainty and let visitors imagine themselves there."
          />
          <DesignRule
            title="Fleet Section: 4-Column Grid with Photos"
            rule="Each boat gets a card with photo, name (Cormorant Garamond), capacity badge, and description. Maintains visual consistency across all boat cards."
            mcDowell="Product details reduce purchase anxiety. Showing all 4 boats with specs lets visitors self-select their fit."
          />
          <DesignRule
            title="Expandable Services: Progressive Disclosure"
            rule="Toggle buttons with +/− icons. Collapsed: one-line title. Expanded: rich text content with check-mark lists and links to dedicated service pages. CSS-only animation for expand/collapse."
            mcDowell="Progressive disclosure keeps the page scannable while maintaining SEO content depth. Crawlers index the content; users expand what interests them."
          />
          <DesignRule
            title="FAQ: AI-Optimized Format"
            rule="13+ FAQ entries minimum. Format: Question → Direct answer first sentence → Supporting detail. This structure matches how AI platforms extract answers for featured snippets and People Also Ask."
            mcDowell="FAQs serve dual purpose: remove purchase objections (conversion) AND capture long-tail keyword rankings (SEO)."
          />
          <DesignRule
            title="Photo Gallery: 4-Column Grid"
            rule="Real party photos in a 4-column grid with 0.5rem gap. Images have gold border, hover:scale(1.03) transition. Use descriptive alt text with keywords."
            mcDowell="Real photos > stock photos. Customer action shots create FOMO and build trust simultaneously."
          />
          <DesignRule
            title="Quick Links Footer: Internal Linking"
            rule="14+ internal links in a centered flex-wrap row above the footer. Gold for primary link, cream-muted for secondary. This is critical for SEO link equity distribution."
            mcDowell="Internal links are the circulatory system of your SEO. Every page should link to every other relevant page."
          />
          <DesignRule
            title="JSON-LD Schema: Full Coverage"
            rule="Every V2 page must include: LocalBusiness, Event (if applicable), FAQPage (all FAQs), Service, Product (per boat), VideoObject (if video present). Minimum 10+ schema types per page."
            mcDowell="Rich schema = rich snippets in search results = higher CTR. Google rewards pages that help it understand content structure."
          />
        </div>
      </section>

      {/* V2 SEO Optimization Checklist */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-green-400">V2 SEO Optimization Checklist</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Every V2 page must meet or exceed the current page on ALL of these metrics before publishing.
          Use this checklist to audit V2 pages before they go live.
        </p>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-3">
          {[
            { check: "Word count ≥ current page (never reduce crawlable content)", priority: "P0", category: "Content" },
            { check: "FAQ count ≥ current page (aim for 13+ per page)", priority: "P0", category: "Content" },
            { check: "Internal link count ≥ current page (18+ for homepage-level pages)", priority: "P0", category: "SEO" },
            { check: "All target keywords present at equal or higher frequency", priority: "P0", category: "SEO" },
            { check: "JSON-LD schema types ≥ current page (FAQPage, Event, Service, Product, Video)", priority: "P0", category: "SEO" },
            { check: "Title tag set in renderer.ts (not React component)", priority: "P0", category: "Technical" },
            { check: "Meta description set in renderer.ts (not React component)", priority: "P0", category: "Technical" },
            { check: "All service types covered (Private, Disco, Corporate, Wedding, Birthday, Team Building)", priority: "P0", category: "Content" },
            { check: "Fleet section with all 4 boats, photos, specs, and pricing", priority: "P0", category: "Content" },
            { check: "Real party photos (minimum 8 per page)", priority: "P1", category: "UX" },
            { check: "Hero video with autoplay muted loop (35% opacity)", priority: "P1", category: "UX" },
            { check: "3+ testimonials with real names and event types", priority: "P1", category: "Social Proof" },
            { check: "Trust bar with specific numbers (150,000+ guests, 4.9 stars, 15+ years)", priority: "P1", category: "Social Proof" },
            { check: "Quick Links footer with 14+ internal page links", priority: "P1", category: "SEO" },
            { check: "Expandable service sections with deep links to dedicated pages", priority: "P1", category: "Content" },
            { check: "New keyword clusters not on current page (expand ranking surface)", priority: "P1", category: "SEO" },
            { check: "Mobile responsive: 44px touch targets, no hover-only interactions", priority: "P1", category: "UX" },
            { check: "Anderson Mill Marina location mentioned (local SEO signal)", priority: "P2", category: "SEO" },
            { check: "Phone number visible (click-to-call on mobile)", priority: "P2", category: "Conversion" },
            { check: "Pricing transparency (builds trust, qualifies leads)", priority: "P2", category: "Conversion" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-zinc-900 rounded p-3">
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                item.priority === "P0" ? "bg-red-900/40 text-red-300" :
                item.priority === "P1" ? "bg-amber-900/40 text-amber-300" :
                "bg-blue-900/40 text-blue-300"
              }`}>
                {item.priority}
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">{item.category}</span>
              <span className="text-sm text-zinc-300">{item.check}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Implementation Checklist */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">PPC Website Upgrade Checklist</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Apply these design principles when upgrading premierpartycruises.com. Each item combines
          the concierge site aesthetics with Wes McDowell&apos;s conversion principles and SEMRush SEO recommendations.
        </p>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-3">
          {[
            { check: "Hero section passes 5-second test: clear value prop + one CTA + social proof stat", priority: "P0" },
            { check: "Ocean gradient hero with wave SVG overlay matching concierge site aesthetic", priority: "P0" },
            { check: "Single primary CTA per page (not competing with secondary links)", priority: "P0" },
            { check: "4.9/5 stars + 150K+ guests badge visible above the fold on every page", priority: "P0" },
            { check: "Mobile-first: 44px touch targets, no hover menus, 16px body font", priority: "P0" },
            { check: "Glassmorphism stat cards (bg-white/10 backdrop-blur) on hero", priority: "P1" },
            { check: "Button hover effects: scale(1.05) + translateY(-2px) + glow shadow", priority: "P1" },
            { check: "Playfair Display for formal quote pages and premium experience sections", priority: "P1" },
            { check: "Gold accent color for luxury/premium tier indicators", priority: "P1" },
            { check: "Progressive disclosure: accordion/details for FAQ, feature details", priority: "P1" },
            { check: "Video walkthrough on homepage (Wes McDowell: video as welcome mat)", priority: "P1" },
            { check: "Content sections alternate white/blue-wash backgrounds", priority: "P2" },
            { check: "Animated wave transitions between sections", priority: "P2" },
            { check: "Geometric gold pattern background on formal/premium pages", priority: "P2" },
            { check: "Sticky CTA on mobile scroll", priority: "P2" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-zinc-900 rounded p-3">
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                item.priority === "P0" ? "bg-red-900/40 text-red-300" :
                item.priority === "P1" ? "bg-amber-900/40 text-amber-300" :
                "bg-blue-900/40 text-blue-300"
              }`}>
                {item.priority}
              </span>
              <span className="text-sm text-zinc-300">{item.check}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({ name, value, hex, css }: { name: string; value: string; hex: string; css: string }) {
  return (
    <div className="text-center">
      <div className="h-16 rounded-lg mb-2 border border-zinc-700" style={{ backgroundColor: hex }} />
      <div className="text-xs font-medium">{name}</div>
      <div className="text-[10px] text-zinc-500">{hex}</div>
      <div className="text-[10px] text-zinc-600 font-mono">{css}</div>
    </div>
  );
}

function TypoRow({ size, weight, use, example }: { size: string; weight: string; use: string; example: string }) {
  return (
    <div className="bg-zinc-900 rounded p-3 flex items-center gap-4">
      <div className="w-16 text-xs text-zinc-500 font-mono shrink-0">{size}</div>
      <div className="w-20 text-xs text-zinc-500 shrink-0">{weight}</div>
      <div className="text-xs text-zinc-400 w-48 shrink-0">{use}</div>
      <div className="text-zinc-300 truncate">{example}</div>
    </div>
  );
}

function DesignRule({ title, rule, mcDowell }: { title: string; rule: string; mcDowell: string }) {
  return (
    <div className="bg-zinc-900 rounded p-4">
      <div className="font-semibold text-white mb-1">{title}</div>
      <div className="text-sm text-zinc-300 mb-2">{rule}</div>
      <div className="text-xs text-blue-300 bg-blue-900/20 rounded p-2 mt-2">
        {mcDowell}
      </div>
    </div>
  );
}

function EffectRow({ name, css, use }: { name: string; css: string; use: string }) {
  return (
    <div className="bg-zinc-900 rounded p-3 flex items-center gap-4">
      <div className="text-sm font-medium text-white w-32 shrink-0">{name}</div>
      <div className="text-xs font-mono text-zinc-400 flex-1">{css}</div>
      <div className="text-xs text-zinc-500 w-48 shrink-0 text-right">{use}</div>
    </div>
  );
}
