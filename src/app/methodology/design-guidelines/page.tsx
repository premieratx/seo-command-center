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
