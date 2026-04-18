import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/quote-app/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Badge } from "@/quote-app/components/ui/badge";
import { Button } from "@/quote-app/components/ui/button";
import { Copy, Check, BookOpen, Ship, Tag, Code2, Wrench, Database, Plug, Rocket, LayoutDashboard, ExternalLink, FileText, Github } from "lucide-react";
import { toast } from "sonner";

const CLAUDE_HANDOFF_URL = "https://tgambsdjfwgoohkqopns.supabase.co/storage/v1/object/public/dashboard-media/docs/CLAUDE_HANDOFF.md";

const Section = ({ children }: { children: React.ReactNode }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none space-y-3">{children}</div>
);

const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">{code}</pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success("Copied");
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
};

export function DocumentationTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Documentation</h2>
          <p className="text-sm text-muted-foreground">
            How this app was built, business rules, pricing, packages, and tech reference.
          </p>
        </div>
      </div>

      {/* CLAUDE HANDOFF BANNER — direct links for migration */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start gap-3">
            <Rocket className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-base">Migrating to Claude Code? Start here.</h3>
              <p className="text-sm text-muted-foreground">
                The complete handoff document is published as a public markdown file in Supabase Storage and
                mirrored in this tab. Link Claude directly to the URL below — it can fetch and read the full spec
                without needing repo access first.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="default">
                  <a href={CLAUDE_HANDOFF_URL} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Open Claude Handoff (public URL)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(CLAUDE_HANDOFF_URL);
                    toast.success("Handoff URL copied");
                  }}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy handoff URL
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href="https://github.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <Github className="h-4 w-4" />
                    Open GitHub repo
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                The handoff doc covers: architecture, every route &amp; tab, data flow, integrations,
                pricing rules, fleet schedule, exact migration steps, and the master prompt to give Claude.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2"><BookOpen className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="rules" className="gap-2"><Ship className="h-4 w-4" />Quote Rules</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2"><Tag className="h-4 w-4" />Pricing & Packages</TabsTrigger>
          <TabsTrigger value="fleet" className="gap-2"><Ship className="h-4 w-4" />Fleet & Slots</TabsTrigger>
          <TabsTrigger value="tech" className="gap-2"><Code2 className="h-4 w-4" />Tech Stack</TabsTrigger>
          <TabsTrigger value="howto" className="gap-2"><Wrench className="h-4 w-4" />How-To Guides</TabsTrigger>
          <TabsTrigger value="data" className="gap-2"><Database className="h-4 w-4" />Data & Integrations</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Plug className="h-4 w-4" />Integrations Map</TabsTrigger>
          <TabsTrigger value="migration" className="gap-2"><Rocket className="h-4 w-4" />Migration to Claude</TabsTrigger>
          <TabsTrigger value="blueprint" className="gap-2"><LayoutDashboard className="h-4 w-4" />App Blueprint</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>How This Was Built</CardTitle></CardHeader>
            <CardContent>
              <Section>
                <h3>Project Origin</h3>
                <p>
                  Premier Party Cruises' booking & quote ecosystem was built on Lovable (React + Vite + Tailwind +
                  shadcn/ui) with a Supabase backend. The codebase is mirrored to GitHub for parallel development and
                  is being migrated to Claude Code for further optimization.
                </p>

                <h3>Architecture</h3>
                <ul>
                  <li><strong>Frontend:</strong> React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui, React Router, TanStack Query.</li>
                  <li><strong>Backend:</strong> Supabase (Postgres + RLS + Edge Functions in Deno).</li>
                  <li><strong>Payments:</strong> Stripe (invoices, deposits, installments, balance payments) + Xola (booking engine).</li>
                  <li><strong>Comms:</strong> Mailgun + Resend (email), GoHighLevel (SMS, CRM, webhooks), Google Sheets (logging).</li>
                  <li><strong>AI/Voice:</strong> Lovable AI Gateway (chat), ElevenLabs (voice), OpenAI (transcription).</li>
                </ul>

                <h3>Core Surfaces</h3>
                <ul>
                  <li><code>/</code> & <code>/quote-v2</code> — Primary quote builder (NewQuoteV2).</li>
                  <li><code>/customer-dashboard</code> — Post-booking hub (reservation, add-ons, waiver, balance pay).</li>
                  <li><code>/lead-dashboard</code> — Pre-booking hub for prospects (quote, photos, transport, alcohol).</li>
                  <li><code>/inn-cahoots-dashboard</code> & <code>/d/:slug</code> — Partner/dynamic dashboards.</li>
                  <li><code>/admin</code> — This portal (calendar, bookings, leads, affiliates, analytics, etc).</li>
                  <li><code>/affiliate</code> — Affiliate self-serve portal.</li>
                </ul>

                <h3>Key Design Principles</h3>
                <ul>
                  <li><strong>Single source of truth:</strong> <code>src/lib/pricing.ts</code> + <code>/summary-sheet</code> drive all displayed totals.</li>
                  <li><strong>Static schedule:</strong> <code>src/lib/staticSchedule.ts</code> defines availability without DB round-trips.</li>
                  <li><strong>Quote persistence:</strong> Single live link <code>?quoteNumber=ABC123</code> auto-syncs latest pricing.</li>
                  <li><strong>Manual comms only:</strong> No auto emails/SMS to leads — all sends are admin-initiated.</li>
                  <li><strong>Roles:</strong> Stored in dedicated <code>user_roles</code> table, checked via <code>has_role()</code> SECURITY DEFINER.</li>
                </ul>
              </Section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QUOTE RULES */}
        <TabsContent value="rules">
          <Card>
            <CardHeader><CardTitle>Quote Builder Rules</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="step-order">
                  <AccordionTrigger>Step Order (Permanent)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ol>
                        <li>Date Selection</li>
                        <li>Party Type</li>
                        <li>Guest Count</li>
                        <li>Lead Capture (name/email/phone)</li>
                        <li>Quote Display (cruise selection, package, add-ons)</li>
                      </ol>
                      <p>This sequence is fixed. Lead capture must occur before pricing/cruise selection is shown for new visitors.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="party-types">
                  <AccordionTrigger>Party Types & Disco Eligibility</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Disco Cruise eligible:</strong> Bachelor, Bachelorette, Combined Bach Party only.</p>
                      <p><strong>All other types</strong> (Birthday, Corporate, Family, etc.) see only Private Cruise options.</p>
                      <p>Disco add-ons like Mimosa Party Cooler are gated by group type.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="availability">
                  <AccordionTrigger>Availability Filtering</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ol>
                        <li>Validate date is in range.</li>
                        <li>Filter by party-type eligibility.</li>
                        <li>Filter boat by guest count: 1–14 → Day Tripper · 15–30 → Meeseeks/Irony · 31–75 → Clever Girl.</li>
                        <li>Check time slot conflicts (private cruises lock the boat with 30-min buffer).</li>
                        <li>For Disco: must be Fri/Sat (+ Sun May 24 2026 holiday exception), Mar–Oct, Clever Girl, tickets available.</li>
                      </ol>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="quote-link">
                  <AccordionTrigger>Quote Link Format & Persistence</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Format: <code>https://booking.premierpartycruises.com/?quoteNumber=ABC123</code></p>
                      <ul>
                        <li>Quote number is required to auto-load saved state (skips lead capture, jumps to step 5).</li>
                        <li>New visitors without a quote number always see the lead capture flow at step 4.</li>
                        <li>Pricing is dynamically synced — old links always show current rates.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="disclaimers">
                  <AccordionTrigger>Disclaimers & Defaults</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li>Quote builder shows: "Note: this tool provides pricing only. For current availability, please contact us."</li>
                        <li>Total must always render as non-zero, even before user makes a selection (uses default boat/package).</li>
                        <li>All times displayed in CST/CDT (America/Chicago) regardless of viewer timezone.</li>
                        <li>Only ONE time slot can be selected at any given moment (selecting another deselects the first).</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="reactivity">
                  <AccordionTrigger>Real-time Reactivity</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Every selection that affects pricing or display must update ALL totals instantly with no debounce. This includes guest count, package, add-ons, promo code, and cruise type.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRICING */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader><CardTitle>Pricing, Packages & Add-Ons</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="private-rates">
                  <AccordionTrigger>Private Cruise Hourly Rates</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Mon–Thu / Fri / Sun:</strong></p>
                      <ul>
                        <li>1–14 guests: $200/hr (Mon–Thu), $225/hr (Fri/Sun)</li>
                        <li>15–25 guests: $250/hr</li>
                        <li>26–30 guests: $250/hr + $50/hr crew fee</li>
                        <li>31–50 guests: $300/hr</li>
                        <li>51–75 guests: $300/hr + $100/hr crew fee</li>
                      </ul>
                      <p><strong>Saturday (premium):</strong></p>
                      <ul>
                        <li>1–14: $350/hr · 15–25: $375/hr · 26–30: $375 + $50 crew · 31–50: $400/hr · 51–75: $400 + $100 crew</li>
                      </ul>
                      <p><strong>Duration:</strong> Mon–Thu = 3 or 4 hr (flex 9 AM–6 PM); Fri–Sun = fixed 4-hr slots.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="private-packages">
                  <AccordionTrigger>Private Cruise Packages & Add-Ons</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Essentials Package:</strong> +$100 (1–14) · +$150 (15–30) · +$200 (31–75)</p>
                      <p><strong>Ultimate Disco Party Package:</strong> +$250 (1–14) · +$300 (15–30) · +$350 (31–75)</p>
                      <p><strong>Pro Services</strong> (NOT for bach parties): DJ +$600, Photographer +$600, Bartender +$600 (max 1 each).</p>
                      <p><strong>Equipment</strong> (NOT for bach parties): Lily Pad +$50 each (max 3), A/V Package +$300 (max 1).</p>
                      <p><strong>Tax/Tip:</strong> 8.25% sales tax + 3% Xola fee + 20% gratuity apply to base, crew, packages, lily pads, A/V. DJ/Photo/Bartender get tax + Xola fee only (no gratuity).</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="disco-packages">
                  <AccordionTrigger>ATX Disco Cruise Packages (per person)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>Basic Bach — $85/person:</strong> 25-ft Unicorn Float, DJ, Pro Photographer, 3 Lily Pads, Shared Coolers, BYOB.</li>
                        <li><strong>Disco Queen — $95/person:</strong> All of Basic + Private Cooler, Disco Ball Cup & Bubble Gun, Boat Alcohol Delivery, 25% Transport Discount, $50–$100 Airbnb Voucher.</li>
                        <li><strong>Super Sparkle Platinum — $105/person:</strong> All of Disco Queen + Personal Unicorn Float, Mimosa Setup, $100 Airbnb Concierge Voucher, Towels & SPF-50.</li>
                      </ul>
                      <p>2026 season pricing standardized for all slots. Per-person tickets — multiple groups share the boat.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="payment">
                  <AccordionTrigger>Payment, Deposits & Discounts</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>14+ days out:</strong> 25% deposit, balance due 14 days before event.</li>
                        <li><strong>&lt;14 days out:</strong> 50% deposit, balance due 3 days after booking.</li>
                        <li><strong>Discounts:</strong> Applied to subtotal only. Tax recalc'd on discounted subtotal. Gratuity stays on original subtotal.</li>
                        <li><strong>Balance payments:</strong> Customer dashboard supports full or partial payments (min $0.50).</li>
                        <li><strong>Installments:</strong> Auto-charge via <code>process-due-installments</code> cron.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="xola-interp">
                  <AccordionTrigger>Xola Ticket Price Interpretation (Critical)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>Disco Cruise:</strong> <code>ticketPrice</code> = per-person rate. Subtotal = ticketPrice × headcount.</li>
                        <li><strong>Private Cruise:</strong> <code>ticketPrice</code> = flat cruise rate (total base). Do NOT multiply by headcount.</li>
                        <li><strong>booking.amount</strong> from Xola is ALWAYS the authoritative total. Breakdown is display-only.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLEET */}
        <TabsContent value="fleet">
          <Card>
            <CardHeader><CardTitle>Fleet, Time Slots & Booking Logic</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="boats">
                  <AccordionTrigger>Boat Fleet & Capacities</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>Day Tripper</strong> — 1–14 guests. Private only.</li>
                        <li><strong>Meeseeks / The Irony</strong> — 15–30 guests each (interchangeable). Crew fee +$50/hr at 26–30. Private only.</li>
                        <li><strong>Clever Girl</strong> — 31–75 guests. Crew fee +$100/hr at 51–75. Private + ATX Disco Cruise.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="disco-schedule">
                  <AccordionTrigger>Disco Cruise Schedule</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Standard slots (Mar–Oct only):</strong></p>
                      <ul>
                        <li>Friday: 12:00 PM – 4:00 PM</li>
                        <li>Saturday: 11:00 AM – 3:00 PM</li>
                        <li>Saturday: 3:30 PM – 7:30 PM</li>
                      </ul>
                      <p><strong>Holiday exception:</strong> Sunday May 24, 2026 (Memorial Day Weekend) 11 AM–3 PM.</p>
                      <p><strong>Capacity:</strong> 100 tickets per slot, displays "few left" warning at scarcity threshold (95).</p>
                      <p><strong>Closed:</strong> November–February.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="memorial">
                  <AccordionTrigger>Memorial Day 2026 Restricted Schedule</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Monday May 25, 2026 follows a restricted holiday schedule — limited availability for all boats. See <code>src/lib/staticSchedule.ts</code>.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="booking-logic">
                  <AccordionTrigger>Booking Conflict Logic</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Private:</strong> Exclusive — one booking per boat per slot. 30-min buffer after each cruise. When booked, slot status → "booked", capacity_available → 0.</p>
                      <p><strong>Disco:</strong> Shared — multiple groups per slot. Each booking decrements capacity_available by ticket count. Sold out at 0.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="arrival">
                  <AccordionTrigger>Arrival Time Requirements</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li>Bachelor / Bachelorette / Combined Bach: arrive <strong>25 min</strong> early.</li>
                        <li>All other party types: arrive <strong>15 min</strong> early.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="marina">
                  <AccordionTrigger>Marina Location</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Anderson Mill Marina</strong> — 13993 FM 2769, Leander, TX 78641. Departure point for all cruises.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TECH */}
        <TabsContent value="tech">
          <Card>
            <CardHeader><CardTitle>Tech Stack & Source-of-Truth Files</CardTitle></CardHeader>
            <CardContent>
              <Section>
                <h3>Frontend</h3>
                <ul>
                  <li>React 18 + Vite 5 + TypeScript 5</li>
                  <li>Tailwind CSS v3 + shadcn/ui (semantic tokens in <code>index.css</code> + <code>tailwind.config.ts</code>)</li>
                  <li>React Router v6, TanStack Query, Framer Motion, date-fns</li>
                </ul>

                <h3>Backend</h3>
                <ul>
                  <li>Supabase Postgres (RLS-enforced) + Edge Functions (Deno) — see <code>supabase/functions/</code>.</li>
                  <li>Auth: Email/password + Google OAuth (Workspace OAuth restriction noted).</li>
                  <li>Roles via <code>user_roles</code> table + <code>has_role()</code> SECURITY DEFINER function.</li>
                </ul>

                <h3>Single Source of Truth Files</h3>
                <ul>
                  <li><code>src/lib/pricing.ts</code> — All pricing math.</li>
                  <li><code>src/lib/boatSelection.ts</code> — Boat → guest-count matching.</li>
                  <li><code>src/lib/staticSchedule.ts</code> — Hardcoded availability schedule.</li>
                  <li><code>src/lib/discoRules.ts</code> — Disco eligibility & slot logic.</li>
                  <li><code>src/lib/packageDetails.ts</code> + <code>src/lib/addonDetails.ts</code> — Package/add-on registry.</li>
                  <li><code>/summary-sheet</code> — Authoritative pricing display reference.</li>
                  <li><code>BUSINESS_RULES.md</code> — Locked business logic doc (do not modify without owner approval).</li>
                </ul>

                <h3>Key Edge Functions</h3>
                <ul>
                  <li><code>create-lead</code>, <code>process-lead</code> — Lead intake + GHL/Sheets sync.</li>
                  <li><code>xola-booking-webhook</code>, <code>xola-payment-webhook</code> — Xola → Supabase upsert.</li>
                  <li><code>create-stripe-invoice</code>, <code>charge-installment</code>, <code>process-balance-payment</code> — Stripe.</li>
                  <li><code>chat-assistant</code>, <code>chat-widget-*</code> — Live chat + AI training suite.</li>
                  <li><code>send-engagement-to-ghl</code>, <code>track-affiliate-*</code> — Tracking.</li>
                </ul>
              </Section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOW-TO */}
        <TabsContent value="howto">
          <Card>
            <CardHeader><CardTitle>How-To Guides</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="embed">
                  <AccordionTrigger>Embed the Quote Builder on a Website</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>See the <Badge>Widget</Badge> tab for the production embed code. Key params:</p>
                      <ul>
                        <li><code>?sourceUrl=</code> — tracks origin page</li>
                        <li><code>?sourceType=embedded_quote_v2</code> — for analytics</li>
                        <li><code>?autoResize=1</code> — enables postMessage iframe height sync</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="xola-embeds">
                  <AccordionTrigger>Xola Booking Widget Embed Codes</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Required footer script (every page with Xola widgets):</strong></p>
                      <CodeBlock code={`<script type="text/javascript">
(function() {
  var co=document.createElement("script");
  co.type="text/javascript"; co.async=true;
  co.src="https://xola.com/checkout.js";
  var s=document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(co, s);
})();
</script>`} />
                      <p><strong>14-person Private:</strong></p>
                      <CodeBlock code={`<div class="xola-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="64c7d0012c2afc7d8d70e285"></div>`} />
                      <p><strong>25-person Private:</strong></p>
                      <CodeBlock code={`<div class="xola-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="64c7d2b74e1de53cee29395e"></div>`} />
                      <p><strong>50-person Private:</strong></p>
                      <CodeBlock code={`<div class="xola-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="64c7d4f01be574411500cf62"></div>`} />
                      <p><strong>Basic Bach Disco:</strong></p>
                      <CodeBlock code={`<div class="xola-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="676fe4a7ff119f53c4063c1b"></div>`} />
                      <p><strong>Disco Queen:</strong></p>
                      <CodeBlock code={`<div class="xola-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="676f0bc68ff6dfb29009b5ad"></div>`} />
                      <p><strong>Super Sparkle Platinum:</strong></p>
                      <CodeBlock code={`<div class="xola-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="676f0ceaa3744b05ae09e9de"></div>`} />
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dashboard-create">
                  <AccordionTrigger>Create a Custom Partner Dashboard</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ol>
                        <li>Go to <code>/dashboard-creator</code>.</li>
                        <li>Choose dashboard type (Boat Rental, Accommodations, Combo, Transport Partner, Lead Funnel, General).</li>
                        <li>Set company name + slug → live at <code>/d/{`{slug}`}</code>.</li>
                        <li>Pick tabs from the registry in <code>src/lib/dashboardTabs.ts</code> (Inn Cahoots / Customer / Lead sources).</li>
                        <li>Use the Website Media Puller to scrape partner branding (logo + header).</li>
                      </ol>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bookings">
                  <AccordionTrigger>Manually Edit a Booking</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>From <Badge>Bookings</Badge> tab → click row → "Edit Booking Modal" supports: Guest Count, Status, Financial Totals, Package, Party Type, Notes. Updates trigger Stripe + Sheets sync.</p>
                      <p><strong>Time slot reassign:</strong> Use 3:30 PM CST = 20:30 UTC mapping standard.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="messaging">
                  <AccordionTrigger>Send Customer Messages</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><Badge>Live Chat</Badge> tab → Smart Prompt Bar accepts natural language filters (e.g. "all bach parties this weekend"). Templates editable via Message Templates manager.</p>
                      <p>Messages render in customer Dashboard Inbox with rich link/CTA support.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="affiliates">
                  <AccordionTrigger>Manage Affiliates & Payouts</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ol>
                        <li><Badge>Affiliates</Badge> tab → create affiliate (auto-generates 8-char code).</li>
                        <li>Multiple promo codes per affiliate via Affiliate Codes Manager.</li>
                        <li>Conversions auto-tracked via <code>track-affiliate-conversion</code> when bookings complete.</li>
                        <li>Payouts via <code>process-affiliate-payout</code> (Stripe Connect or Venmo).</li>
                      </ol>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data-tools">
                  <AccordionTrigger>Data Maintenance Utilities</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Edge functions that bypass RLS (admin only):</p>
                      <ul>
                        <li><code>fix-data-integrity</code>, <code>fix-affiliate-codes</code>, <code>fix-lead-urls</code></li>
                        <li><code>backfill-all-leads</code>, <code>backfill-leads-to-sheets</code>, <code>backfill-stripe-invoices</code></li>
                        <li><code>bulk-import-xola-bookings</code>, <code>bulk-resync-invoices</code>, <code>sync-sheet-quote-urls</code></li>
                        <li><code>seed-time-slots</code> (Disco season = Feb–Sep all years)</li>
                      </ul>
                      <p><strong>Important:</strong> Retroactive repairs must NOT re-trigger customer-facing webhooks (no surprise emails/SMS).</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA & INTEGRATIONS */}
        <TabsContent value="data">
          <Card>
            <CardHeader><CardTitle>Data Model & Integrations</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="tables">
                  <AccordionTrigger>Core Tables</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>leads</code> · <code>customers</code> · <code>bookings</code> · <code>time_slots</code> · <code>boats</code> · <code>experiences</code></li>
                        <li><code>saved_quotes</code> — persisted quote snapshots (drives <code>?quoteNumber=</code> link).</li>
                        <li><code>abandoned_bookings</code> — incomplete checkout tracking.</li>
                        <li><code>affiliates</code> · <code>affiliate_codes</code> · <code>affiliate_clicks</code> · <code>affiliate_conversions</code> · <code>affiliate_payouts</code></li>
                        <li><code>engagement_sessions</code> · <code>engagement_events</code> · <code>lead_tab_engagement</code> — engagement tracking.</li>
                        <li><code>chat_conversations</code> · <code>chat_messages</code> · <code>chat_widget_rules</code> · <code>chat_widget_settings</code></li>
                        <li><code>dashboard_configs</code> — dynamic partner dashboards.</li>
                        <li><code>payment_installments</code> · <code>promo_codes</code> · <code>tags</code> · <code>booking_tags</code> · <code>lead_tags</code></li>
                        <li><code>message_templates</code> · <code>dashboard_messages</code> · <code>audit_events</code> · <code>app_settings</code></li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="integrations">
                  <AccordionTrigger>External Integrations</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>Xola</strong> — booking engine. Webhook: <code>xola-booking-webhook</code>, <code>xola-payment-webhook</code>. CSV sync via <code>batch-update-booking-notes</code>.</li>
                        <li><strong>Stripe</strong> — invoices, deposits, installments, balance payments, Connect payouts. Webhook: <code>stripe-webhook</code>.</li>
                        <li><strong>GoHighLevel (GHL)</strong> — SMS, CRM, two-way chat. Webhooks: <code>ghl-chat-webhook</code>, <code>send-booking-to-ghl</code>, <code>send-engagement-to-ghl</code>.</li>
                        <li><strong>Mailgun + Resend</strong> — transactional email (waiver, invoice, concierge).</li>
                        <li><strong>Google Sheets</strong> — central log for time slots, payments, waivers, leads. Service account via <code>GOOGLE_SHEETS_CREDENTIALS</code>.</li>
                        <li><strong>Make.com</strong> — automation router via <code>MAKE_WEBHOOK_URL</code>.</li>
                        <li><strong>Lovable AI Gateway</strong> — chatbot intelligence.</li>
                        <li><strong>ElevenLabs + OpenAI</strong> — voice + transcription.</li>
                        <li><strong>TikTok Pixel</strong> — ID <code>CSC4EHJC77U2VKPC1CB0</code>, site-wide.</li>
                        <li><strong>Party On Delivery (POD)</strong> — alcohol concierge. Webhook: <code>receive-pod-dashboard</code>.</li>
                        <li><strong>Fetii</strong> — group transport recommendations.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="storage">
                  <AccordionTrigger>Storage Buckets</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>2024-disco-cruise-photos</code> (public)</li>
                        <li><code>dashboard-media</code> (public)</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security">
                  <AccordionTrigger>Security & RLS</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li>RLS enabled on all tables. Anon role allowed for public-facing inserts (leads, abandoned bookings, chat).</li>
                        <li>Roles via <code>user_roles</code> + <code>has_role(uuid, app_role)</code> SECURITY DEFINER.</li>
                        <li>Never check admin status client-side — always server-side via RLS / function checks.</li>
                        <li>Edge functions validate JWTs in code (verify_jwt = false at config level).</li>
                        <li>Admin auth currently disabled in <code>Admin.tsx</code> for development — RE-ENABLE BEFORE PRODUCTION.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="github">
                  <AccordionTrigger>GitHub Sync</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Bidirectional sync with GitHub is active. Every Lovable change auto-pushes to the connected repo, and every GitHub commit auto-syncs back to Lovable. No manual push action is needed — saving this documentation file already triggered a push.</p>
                      <p>For Claude Code migration: clone the repo, work in branches, push back. Lovable picks up changes within ~30 seconds.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS MAP */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader><CardTitle>Integrations Map — Everything Wired Into This App</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="xola">
                  <AccordionTrigger>🎫 Xola (Booking Engine) — Bidirectional</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Inbound webhooks:</strong></p>
                      <ul>
                        <li><code>xola-booking-webhook</code> — receives <code>booking.created</code> / <code>booking.updated</code>; upserts into <code>bookings</code>.</li>
                        <li><code>xola-payment-webhook</code> — captures payment events.</li>
                      </ul>
                      <p><strong>Outbound sync:</strong></p>
                      <ul>
                        <li><code>xola-sync</code> + <code>bulk-import-xola-bookings</code> — pulls via Xola API (<code>XOLA_API_KEY</code>).</li>
                        <li><code>XolaCsvSyncButton</code> + <code>batch-update-booking-notes</code> — reconciles itemized notes from CSV exports.</li>
                      </ul>
                      <p><strong>Embedded checkout:</strong> Xola <code>checkout.js</code> on quote pages with experience IDs for 14/25/50-person private cruises and Disco packages (Basic Bach, Disco Queen, Super Sparkle Platinum).</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ghl">
                  <AccordionTrigger>📞 Go High Level (CRM / SMS / Email) — Bidirectional</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>Outbound (we → GHL):</strong></p>
                      <ul>
                        <li><code>create-lead</code> → <code>GHL_WEBHOOK_URL</code>.</li>
                        <li><code>send-booking-to-ghl</code> → <code>GHL_BOOKING_WEBHOOK_URL</code> (with affiliate, source, invoice URL).</li>
                        <li><code>send-engagement-to-ghl</code> → <code>GHL_ENGAGEMENT_WEBHOOK_URL</code> (high-engagement alerts).</li>
                      </ul>
                      <p><strong>Inbound (GHL → we):</strong></p>
                      <ul>
                        <li><code>ghl-chat-webhook</code> — agent replies from GHL Conversations injected as <code>sender_type: 'admin'</code>.</li>
                      </ul>
                      <p><strong>API:</strong> <code>GO_HIGH_LEVEL_API_KEY</code> for contact lookups + SMS sending.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stripe">
                  <AccordionTrigger>💳 Stripe (Payments)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>create-stripe-checkout</code> — embedded checkout sessions.</li>
                        <li><code>create-stripe-invoice</code>, <code>finalize-invoice</code>, <code>admin-send-invoice</code> — itemized invoices.</li>
                        <li><code>stripe-webhook</code> — receives payment + invoice events.</li>
                        <li><code>create-installment-plan</code> + <code>charge-installment</code> + <code>process-due-installments</code>.</li>
                        <li><code>create-balance-payment</code> / <code>process-balance-payment</code>.</li>
                        <li><code>process-affiliate-payout</code> — Stripe Connect transfers.</li>
                        <li><code>backfill-stripe-invoices</code> / <code>bulk-resync-invoices</code> / <code>sync-booking-to-stripe</code>.</li>
                      </ul>
                      <p><strong>Secrets:</strong> <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PUBLISHABLE_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sheets">
                  <AccordionTrigger>📊 Google Sheets (Logging Mirror)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Auth via <code>GOOGLE_SHEETS_CREDENTIALS</code>. Every key event mirrored:</p>
                      <ul>
                        <li><code>log-booking-to-sheets</code>, <code>log-payment-to-sheets</code>, <code>log-timeslot-to-sheets</code>, <code>log-waiver-to-sheets</code>.</li>
                        <li><code>backfill-leads-to-sheets</code> / <code>backfill-all-leads</code>.</li>
                        <li><code>sync-sheet-quote-urls</code> / <code>update-google-sheet-booking</code>.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="email">
                  <AccordionTrigger>📧 Email (Mailgun + Resend + Gmail SMTP)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>Mailgun</strong> (<code>MAILGUN_API_KEY</code>, <code>MAILGUN_DOMAIN</code>) — primary transactional sender.</li>
                        <li><strong>Resend</strong> (<code>RESEND_API_KEY</code>) — backup sender.</li>
                        <li><strong>Gmail SMTP</strong> (<code>GMAIL_APP_PASSWORD</code>) — admin notifications.</li>
                      </ul>
                      <p><strong>Functions:</strong> <code>send-invoice-email</code>, <code>send-waiver-confirmation</code>, <code>send-booking-notification</code>, <code>send-failed-payment-notification</code>, <code>send-installment-failed-notification</code>, <code>send-installment-success-notification</code>, <code>send-concierge-request</code>, <code>send-transport-inquiry</code>, <code>share-quote-email</code>, <code>send-ab-test-report</code>, <code>send-test-email</code>.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sms">
                  <AccordionTrigger>📱 SMS (via GHL)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><code>send-invoice-sms</code> and <code>share-quote-sms</code> — sent through GHL's SMS API using <code>GO_HIGH_LEVEL_API_KEY</code>.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai">
                  <AccordionTrigger>🤖 AI Services (OpenAI, ElevenLabs, Lovable AI)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><strong>OpenAI</strong> (<code>OPENAI_API_KEY</code>): <code>chat-assistant</code>, <code>ai-chat-test</code>, <code>transcribe-audio</code> (Whisper).</p>
                      <p><strong>ElevenLabs</strong> (<code>ELEVEN_LABS_API_KEY</code>, <code>ELEVEN_LABS_AGENT_ID</code>): <code>elevenlabs-create-session</code> for <code>VoiceVisualizer</code>.</p>
                      <p><strong>Lovable AI Gateway</strong> (<code>LOVABLE_API_KEY</code>) — additional model routing.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="affiliate">
                  <AccordionTrigger>🎯 Affiliate Tracking</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>track-affiliate-click</code> / <code>track-affiliate-conversion</code> — captures clicks from cookies + URL params.</li>
                        <li><code>process-affiliate-payout</code> — Stripe Connect or Venmo.</li>
                        <li><code>import-golden-ticket-affiliates</code> / <code>fix-affiliate-codes</code>.</li>
                        <li><code>admin-affiliate-stats</code> + DB function <code>get_affiliate_leaderboard()</code>.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="livechat">
                  <AccordionTrigger>💬 Live Chat Widget (Cross-Domain)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>chat-widget-script</code> — embeddable JS.</li>
                        <li><code>chat-widget-messages</code> — visitor → admin (forwards to GHL).</li>
                        <li><code>chat-widget-rules</code> — priority rules engine for behavioral triggers.</li>
                        <li><code>chat-widget-track</code> — session/engagement tracking.</li>
                        <li>Realtime via Supabase channels for <code>chat_messages</code>.</li>
                      </ul>
                      <p>Tracks across <code>premierpartycruises.com</code> ↔ <code>booking.premierpartycruises.com</code>.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="engagement">
                  <AccordionTrigger>📈 Engagement / Analytics / Pixels</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>add-engagement-headers</code> — captures referrer/UTM.</li>
                        <li><code>list-lead-engagement</code> / <code>admin-analytics</code> — dashboards.</li>
                        <li><code>useEngagementTracking</code> + <code>useTabEngagement</code> → <code>engagement_sessions</code> + <code>lead_tab_engagement</code>.</li>
                        <li>High-engagement events (video watch, Xola tab opened, scroll &gt; 75%) auto-fire to GHL.</li>
                        <li><strong>TikTok Pixel</strong> ID <code>CSC4EHJC77U2VKPC1CB0</code> on <code>/quote-v2</code>.</li>
                        <li><strong>GTM</strong> — <code>dataLayer.push(&#123; event: "lovable_quote_completed" &#125;)</code> on lead capture.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="media">
                  <AccordionTrigger>📸 Media & Storage</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>scrape-website-media</code> — partner branding scraper.</li>
                        <li><code>update-dashboard-images</code> — admin uploader.</li>
                        <li>Supabase Storage buckets: <code>dashboard-media</code>, <code>2024-disco-cruise-photos</code>.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="partners">
                  <AccordionTrigger>🏠 Partner Dashboards (Inn Cahoots, etc.)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><code>receive-pod-dashboard</code> — public webhook auto-linking POD orders.</li>
                        <li><code>DashboardCreator</code> builds bespoke partner sites in <code>dashboard_configs</code>.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="admin-fns">
                  <AccordionTrigger>🛠️ Admin / Maintenance Functions</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p><code>create-admin-user</code>, <code>admin-edit-booking</code>, <code>admin-upsert-booking</code>, <code>admin-delete-booking</code>, <code>admin-delete-lead</code>, <code>admin-update-lead</code>, <code>admin-abandoned-bookings</code>, <code>fix-data-integrity</code>, <code>fix-lead-urls</code>, <code>seed-time-slots</code>, <code>sync-booking-slots</code>, <code>test-booking-webhook</code>, <code>test-ghl-webhook</code>.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="event-flows">
                  <AccordionTrigger>📤 Event Flows — What's Coming OUT / IN</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <h4>Outbound</h4>
                      <ul>
                        <li><strong>New lead</strong> → GHL, Sheets, TikTok, GTM.</li>
                        <li><strong>Quote engaged</strong> → engagement table → GHL (on threshold).</li>
                        <li><strong>Booking confirmed</strong> → Stripe invoice, GHL, Sheets, admin email.</li>
                        <li><strong>Payment received</strong> → Sheets, GHL, customer receipt.</li>
                        <li><strong>Waiver signed</strong> → Mailgun, Sheets, admin notification.</li>
                        <li><strong>Add-on purchased</strong> → Stripe charge, GHL note, admin email.</li>
                        <li><strong>Transport inquiry</strong> → Mailgun + GHL SMS.</li>
                        <li><strong>Affiliate conversion</strong> → balance updated, payout queue.</li>
                        <li><strong>Chat message</strong> → GHL conversations (two-way).</li>
                        <li><strong>Abandoned booking</strong> → <code>abandoned_bookings</code>.</li>
                      </ul>
                      <h4>Inbound</h4>
                      <ul>
                        <li><strong>Xola</strong> bookings/payments → inbound webhooks.</li>
                        <li><strong>GHL</strong> agent replies → <code>ghl-chat-webhook</code>.</li>
                        <li><strong>Stripe</strong> events → <code>stripe-webhook</code>.</li>
                        <li><strong>POD</strong> orders → <code>receive-pod-dashboard</code>.</li>
                        <li><strong>Affiliate clicks</strong> → URL params + cookies → <code>track-affiliate-click</code>.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MIGRATION TO CLAUDE */}
        <TabsContent value="migration">
          <Card>
            <CardHeader><CardTitle>Migrating to Claude Code + Netlify</CardTitle></CardHeader>
            <CardContent>
              <Section>
                <p>
                  Give Claude Code full access to the latest version of this app — Supabase backend + GitHub repo —
                  and deploy the result to Netlify. The Supabase project stays exactly where it is, so all bookings,
                  leads, webhooks, and integrations keep working without interruption.
                </p>
              </Section>

              <Accordion type="multiple" className="w-full mt-4">
                <AccordionItem value="overview">
                  <AccordionTrigger>1. Stack You're Transferring</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>Frontend:</strong> React 18 + Vite 5 + Tailwind + shadcn/ui (in this GitHub repo).</li>
                        <li><strong>Backend:</strong> Supabase project <code>tgambsdjfwgoohkqopns</code> (Postgres + RLS + ~100 Edge Functions).</li>
                        <li><strong>Secrets:</strong> stored in Supabase Edge Function settings (Stripe, GHL, Xola, Mailgun, OpenAI, ElevenLabs, etc.).</li>
                        <li><strong>Hosting target:</strong> Netlify (replacing Lovable's <code>booking.premierpartycruises.com</code>).</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="github">
                  <AccordionTrigger>2. Connect Claude Code to GitHub</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>The repo already auto-syncs with GitHub (every Lovable change pushes within ~30 seconds).</p>
                      <ol>
                        <li>In Lovable, open <strong>GitHub → Open in GitHub</strong> (top-right) and copy the repo URL.</li>
                        <li>Install Claude Code locally:
                          <CodeBlock code={`npm install -g @anthropic-ai/claude-code`} />
                        </li>
                        <li>Clone the repo:
                          <CodeBlock code={`git clone https://github.com/<YOUR-ORG>/<REPO-NAME>.git
cd <REPO-NAME>`} />
                        </li>
                        <li>Launch Claude Code in the repo directory:
                          <CodeBlock code={`claude`} />
                        </li>
                        <li>Claude Code now has full read/write access. It commits via git, which auto-syncs back to Lovable too.</li>
                      </ol>
                      <p><strong>Tip:</strong> While transitioning, work in a branch (<code>git checkout -b claude-migration</code>) so Lovable's main stays stable.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="supabase">
                  <AccordionTrigger>3. Connect Claude Code to Supabase (MCP)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Claude Code connects to Supabase via the <strong>Supabase MCP server</strong>, giving Claude direct DB query, edge-function deploy, and log access.</p>

                      <h4>A. Get Supabase credentials</h4>
                      <ol>
                        <li>Open <a href="https://supabase.com/dashboard/project/tgambsdjfwgoohkqopns/settings/api" target="_blank" rel="noopener">Supabase API Settings</a>.</li>
                        <li>Copy:
                          <ul>
                            <li><strong>Project ref:</strong> <code>tgambsdjfwgoohkqopns</code></li>
                            <li><strong>Project URL:</strong> <code>https://tgambsdjfwgoohkqopns.supabase.co</code></li>
                            <li><strong>Anon (publishable) key</strong> — already in <code>.env</code> as <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.</li>
                            <li><strong>Service-role key</strong> — for Claude/MCP only, never commit.</li>
                          </ul>
                        </li>
                        <li>Create a <strong>Personal Access Token</strong> at <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener">supabase.com/dashboard/account/tokens</a>.</li>
                      </ol>

                      <h4>B. Install the Supabase MCP server in Claude Code</h4>
                      <p>Add to <code>~/.config/claude-code/mcp.json</code>:</p>
                      <CodeBlock code={`{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN>",
        "--project-ref",
        "tgambsdjfwgoohkqopns"
      ]
    }
  }
}`} />
                      <p>Or add interactively:</p>
                      <CodeBlock code={`claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --access-token <TOKEN> --project-ref tgambsdjfwgoohkqopns`} />

                      <h4>C. Local <code>.env.local</code> for Vite dev</h4>
                      <CodeBlock code={`VITE_SUPABASE_URL=https://tgambsdjfwgoohkqopns.supabase.co
VITE_SUPABASE_PROJECT_ID=tgambsdjfwgoohkqopns
VITE_SUPABASE_PUBLISHABLE_KEY=<copy from Supabase dashboard>`} />

                      <h4>D. Edge Function secrets</h4>
                      <p>All ~25 runtime secrets <strong>already live in Supabase</strong> and don't need to be re-added. Edge functions deployed from Claude will have access automatically.</p>
                      <p>Manage them at <a href="https://supabase.com/dashboard/project/tgambsdjfwgoohkqopns/settings/functions" target="_blank" rel="noopener">Edge Function Secrets</a>.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="netlify">
                  <AccordionTrigger>4. Deploy to Netlify</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <h4>A. Connect the repo</h4>
                      <ol>
                        <li>Go to <a href="https://app.netlify.com/start" target="_blank" rel="noopener">app.netlify.com/start</a> → <strong>Import from GitHub</strong>.</li>
                        <li>Select the synced repo.</li>
                        <li>Build settings (Vite defaults):
                          <ul>
                            <li><strong>Build command:</strong> <code>npm run build</code></li>
                            <li><strong>Publish directory:</strong> <code>dist</code></li>
                            <li><strong>Node version:</strong> 20</li>
                          </ul>
                        </li>
                      </ol>

                      <h4>B. Environment variables</h4>
                      <p><strong>Site settings → Environment variables:</strong></p>
                      <CodeBlock code={`VITE_SUPABASE_URL=https://tgambsdjfwgoohkqopns.supabase.co
VITE_SUPABASE_PROJECT_ID=tgambsdjfwgoohkqopns
VITE_SUPABASE_PUBLISHABLE_KEY=<from Supabase dashboard>`} />
                      <p>Edge function secrets do NOT go in Netlify — they live in Supabase.</p>

                      <h4>C. SPA redirect rule</h4>
                      <p>Create <code>public/_redirects</code> so React Router deep links work:</p>
                      <CodeBlock code={`/*    /index.html   200`} />

                      <h4>D. Custom domain</h4>
                      <p>In Netlify <strong>Domain Management</strong>, add <code>booking.premierpartycruises.com</code>. Update DNS at your registrar to CNAME → Netlify host. After propagation, remove the domain from Lovable to release it.</p>

                      <h4>E. Update integration callback URLs (only if domain changes)</h4>
                      <p>If you keep the same domain, no webhook changes are needed. Otherwise update:</p>
                      <ul>
                        <li>Stripe webhook endpoint URL.</li>
                        <li>Xola webhook URLs (booking + payment).</li>
                        <li>GHL outbound webhook → <code>ghl-chat-webhook</code> URL.</li>
                        <li>Hardcoded <code>booking.premierpartycruises.com</code> in edge functions — search the repo.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="checklist">
                  <AccordionTrigger>5. Migration Checklist</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li>☐ Repo cloned locally + Claude Code launched.</li>
                        <li>☐ Supabase MCP installed and verified (<code>claude mcp list</code>).</li>
                        <li>☐ <code>.env.local</code> created with Vite Supabase vars.</li>
                        <li>☐ <code>npm install &amp;&amp; npm run dev</code> works locally.</li>
                        <li>☐ Netlify site connected with build vars set.</li>
                        <li>☐ <code>public/_redirects</code> committed for SPA routing.</li>
                        <li>☐ Test deploy passes; preview URL loads correctly.</li>
                        <li>☐ Custom domain pointed at Netlify.</li>
                        <li>☐ Webhook callback URLs updated (if domain changed).</li>
                        <li>☐ Lovable project archived/paused once Netlify is fully live.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="gotchas">
                  <AccordionTrigger>6. Gotchas & Tips</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>Don't edit <code>src/integrations/supabase/types.ts</code> by hand</strong> — regenerate via <code>npx supabase gen types typescript --project-id tgambsdjfwgoohkqopns &gt; src/integrations/supabase/types.ts</code>.</li>
                        <li><strong>Edge functions auto-deploy from Lovable</strong> but require manual deploy from Claude: <code>npx supabase functions deploy &lt;name&gt; --project-ref tgambsdjfwgoohkqopns</code>.</li>
                        <li><strong>RLS + schema changes</strong> — always go through <code>supabase/migrations/</code>; don't edit live in the dashboard during transition.</li>
                        <li><strong>Two-way GitHub sync</strong> stays active until you disconnect Lovable. Work in one tool at a time to avoid merge conflicts.</li>
                        <li><strong>Build vs runtime secrets:</strong> Vite (anon) keys → Netlify env. Server-side secrets → Supabase only.</li>
                        <li><strong>Domain switch:</strong> validate via Netlify deploy preview before flipping DNS.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APP BLUEPRINT — full recreation guide for Claude */}
        <TabsContent value="blueprint">
          <Card>
            <CardHeader><CardTitle>App Blueprint — Full Recreation Guide for Claude</CardTitle></CardHeader>
            <CardContent>
              <Section>
                <p>
                  This is the master spec to hand Claude. It enumerates every page, tab, and component in the app,
                  what each does, how they wire together, the Supabase schema/edge functions backing them, and the exact
                  steps to reconnect to the existing Supabase project (no new secrets needed).
                </p>
                <p>
                  <strong>Key principle:</strong> the GitHub repo + the existing Supabase project (<code>tgambsdjfwgoohkqopns</code>)
                  together contain 100% of the app. Pulling the repo into Claude and pointing it at the same Supabase project
                  resumes work exactly where Lovable left off — all bookings, leads, edge functions, secrets, RLS policies,
                  and storage buckets remain in place.
                </p>
              </Section>

              <Accordion type="multiple" className="w-full mt-4">
                <AccordionItem value="bp-routes">
                  <AccordionTrigger>1. Route Map — Every Page in the App</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>All routes are registered in <code>src/App.tsx</code>. Public-facing pages have no auth gate; admin pages require login.</p>
                      <h4>Public / Customer-Facing</h4>
                      <ul>
                        <li><code>/</code> → <code>NewQuoteV2</code> — the primary quote builder (homepage). Renders <code>quote-builder/*</code> components.</li>
                        <li><code>/quote-v2</code> → same as <code>/</code> (alias).</li>
                        <li><code>/lead-dashboard?leadId=...</code> → <code>LeadDashboard</code> — personalized hub for prospects with embedded quote, pricing details, book-a-call, alcohol & concierge tabs.</li>
                        <li><code>/customer-dashboard?bookingId=...</code> → <code>CustomerDashboard</code> — post-booking hub: reservation, add-ons, balance payments, messaging inbox, waiver, alcohol & concierge.</li>
                        <li><code>/booking-success</code> → <code>BookingSuccess</code> — Stripe redirect landing.</li>
                        <li><code>/waiver?bookingId=...</code> → <code>Waiver</code> — e-signature flow with confirmation email.</li>
                        <li><code>/online-booking</code> → <code>OnlineBooking</code> — direct Xola embed (legacy).</li>
                        <li><code>/summary-sheet</code> → <code>SummarySheet</code> — authoritative pricing summary (single source of truth for all pricing).</li>
                        <li><code>/pricing-chart</code>, <code>/static-pricing</code>, <code>/january-price-calculator</code>, <code>/january-private-cruise-pricing</code> — embeddable pricing widgets.</li>
                        <li><code>/eoy-sale-quote</code>, <code>/eoy-sale-banner-*</code> — End-of-year sale variants.</li>
                        <li><code>/golden-ticket</code> → <code>GoldenTicket</code> — affiliate landing page.</li>
                        <li><code>/disco-vs-private</code> → <code>DiscoVsPrivate</code> — comparison page.</li>
                        <li><code>/one-pager</code> → <code>OnePager</code> — sales sheet.</li>
                        <li><code>/dashboard/:slug</code> → <code>DynamicDashboard</code> — partner-branded dashboards (Inn Cahoots, Mischief, etc.) configured in <code>dashboard_configs</code> table.</li>
                        <li><code>/inn-cahoots</code> → <code>InnCahootsDashboard</code> — bespoke partner dashboard.</li>
                        <li><code>/chat-app</code> → <code>ChatTestApp</code> — AI chatbot training/iteration suite.</li>
                      </ul>

                      <h4>Admin (auth required)</h4>
                      <ul>
                        <li><code>/auth</code> → <code>Auth</code> — login (Supabase auth + custom admin_profiles).</li>
                        <li><code>/admin</code> → <code>Admin</code> — main admin shell with ~20 tabs (see Admin Surface section).</li>
                        <li><code>/dashboard-creator</code> → <code>DashboardCreator</code> — builds bespoke partner dashboards.</li>
                        <li><code>/affiliate-portal</code> → <code>AffiliatePortal</code> — affiliate-facing earnings dashboard.</li>
                        <li><code>/quote-form</code>, <code>/new-quote</code> → legacy quote builders (kept for embeds).</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-quote-v2">
                  <AccordionTrigger>2. Quote Builder (/) — Step-by-Step Walkthrough</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Component: <code>src/pages/NewQuoteV2.tsx</code>. Sub-components in <code>src/components/quote-builder/</code>.</p>
                      <h4>Step Order (FIXED — do not reorder)</h4>
                      <ol>
                        <li><strong>Date Selection</strong> (<code>DateSelector</code>) — calendar picker; only Fri/Sat/Sun shown for Disco; weekday/weekend handling for private.</li>
                        <li><strong>Party Type</strong> (<code>PartyTypeSelector</code>) — Bachelor / Bachelorette / Combined Bach / Birthday / Corporate / Other. Tailors all subsequent content.</li>
                        <li><strong>Guest Count</strong> (<code>GuestCountSelector</code>) — drives boat selection + pricing tier (1-14, 15-25, 26-30, 31-50, 51-75).</li>
                        <li><strong>Available Slots</strong> (<code>AvailableSlots</code> + <code>DiscoCruiseSelectorV2</code> + <code>PrivateCruiseSelector</code>) — pulled from <code>src/lib/staticSchedule.ts</code> (hardcoded availability, NOT from DB).</li>
                        <li><strong>Lead Capture Modal</strong> (<code>LeadCaptureModal</code>) — name/email/phone form. Submits to <code>create-lead</code> edge function which fires GHL webhook + creates lead row + redirects to <code>/lead-dashboard?leadId=...</code>.</li>
                      </ol>

                      <h4>Quote State Persistence</h4>
                      <ul>
                        <li>URL format: <code>/?quoteNumber=ABC123</code> — required to load saved quote + countdown timer.</li>
                        <li>Saved to <code>saved_quotes</code> table on every selection change (debounced).</li>
                        <li>All previously-sent quote links dynamically reflect current pricing/layout (no static snapshots).</li>
                      </ul>

                      <h4>Critical Constraints (memory rules)</h4>
                      <ul>
                        <li>Disco Cruise options only show during eligible seasonal windows (see <code>discoRules.ts</code>).</li>
                        <li>Default state must show non-zero total even before user selects.</li>
                        <li>Real-time reactivity: ALL values update instantly when any selection changes.</li>
                        <li>Only ONE time slot (disco OR private) selected at a time.</li>
                        <li>Single unified checkout calc — not separate disco/private flows.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-lead-dashboard">
                  <AccordionTrigger>3. Lead Dashboard (/lead-dashboard) — Tabs & Behavior</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Component: <code>src/pages/LeadDashboard.tsx</code>. Loads lead by <code>?leadId=</code> param.</p>
                      <p>Tabs are tailored by party type (Bach groups see party-specific Disco content; Birthday/Corporate see private cruise content).</p>
                      <ul>
                        <li><strong>Reservation</strong> — hero with editable date + guest count (persists to DB, triggers Sheets re-sync).</li>
                        <li><strong>Pricing & Details</strong> (<code>PricingDetailsTab</code>) — pre-rendered summary slides + embedded <code>/quote-v2</code> via iframe with postMessage protocol.</li>
                        <li><strong>Book a Call</strong> — embedded GHL booking widget (<code>https://api.leadconnectorhq.com/widget/booking/...</code>).</li>
                        <li><strong>Alcohol & Concierge</strong> — vertical layout: CTA → 5 tiles → full menu. Hero personalized with first name.</li>
                        <li><strong>Transport</strong> (<code>TransportTabContent</code>) — vehicle recommendations filtered by guest count (≤60 guests). Submits inquiries via Mailgun + GHL SMS (fire-and-forget, no DB persistence).</li>
                      </ul>
                      <p>Tracks engagement via <code>useEngagementTracking</code> + <code>useTabEngagement</code> hooks → <code>engagement_sessions</code> + <code>lead_tab_engagement</code> tables → high-engagement events fire to GHL.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-customer-dashboard">
                  <AccordionTrigger>4. Customer Dashboard (/customer-dashboard) — Tabs & Behavior</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Component: <code>src/pages/CustomerDashboard.tsx</code>. Loads booking by <code>?bookingId=</code>. Refetches via <code>list-bookings</code> edge function after every mutation.</p>
                      <ul>
                        <li><strong>Reservation</strong> — booking summary, date, boat, headcount, time. Balance payment widget (full or partial, min $0.50).</li>
                        <li><strong>Add-Ons for Your Cruise</strong> (<code>AddOnStore</code>) — unified section: free add-ons ($0, formatted as <code>Add-On: [Name] x[Qty] @ $0</code>) + paid add-ons with Stripe checkout. Admin can edit via <code>AdminAddOnEditor</code>.</li>
                        <li><strong>Inbox</strong> (<code>DashboardInbox</code>) — admin-to-customer messaging. Rich protocol with linkified content + click tracking.</li>
                        <li><strong>Waiver</strong> — link to <code>/waiver</code>; supports unlimited signatures per group.</li>
                        <li><strong>Alcohol & Concierge</strong> — POD (Party On Delivery) integration. Personalized header.</li>
                        <li><strong>Admin Preview Mode</strong> — Eye icon (top-left) lets admins preview customer view.</li>
                      </ul>
                      <p>Authoritative grand total = <code>booking.amount</code> (always). Shorthand labels in metadata required for line-item display.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-admin">
                  <AccordionTrigger>5. Admin Surface (/admin) — All Tabs</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Component: <code>src/pages/Admin.tsx</code>. Auth-gated. Tabs (each backed by a component in <code>src/components/admin/</code>):</p>
                      <ul>
                        <li><strong>Bookings</strong> (<code>BookingsManager</code>) — list/edit bookings, manual reconciliation, Stripe sync, Xola sync.</li>
                        <li><strong>Calendar</strong> (<code>CalendarView</code>) — monthly view of all bookings.</li>
                        <li><strong>Leads</strong> (<code>LeadsManager</code>) — engagement-sorted leads with edit modal + tag management.</li>
                        <li><strong>Abandoned Bookings</strong> (<code>AbandonedBookingsManager</code>) — recovery workflow.</li>
                        <li><strong>Customers</strong> (<code>CustomerDirectory</code>) — directory with booking history.</li>
                        <li><strong>Cruise Prep</strong> (<code>CruisePrep</code>) — trip logistics, inventory, printable prep sheets.</li>
                        <li><strong>Boats</strong> (<code>BoatsManager</code>) — fleet management.</li>
                        <li><strong>Time Slots</strong> (<code>TimeSlotManager</code>) — slot creation/seeding.</li>
                        <li><strong>Tags</strong> (<code>TagsManager</code>) — custom labels for bookings/leads.</li>
                        <li><strong>Promo Codes</strong> (<code>PromoCodesManager</code>) — discount management with tiered values.</li>
                        <li><strong>Affiliates</strong> (<code>AffiliatesManager</code>, <code>AffiliateCodesManager</code>, <code>AffiliateLeaderboard</code>) — full affiliate program.</li>
                        <li><strong>Installments</strong> (<code>InstallmentsManager</code>) — payment plans.</li>
                        <li><strong>Messaging</strong> (<code>AdminMessagingCenter</code>) — bulk messaging with smart prompt parser + templates.</li>
                        <li><strong>Live Chat</strong> (<code>LiveChatManager</code>) — visitor conversations with GHL two-way sync.</li>
                        <li><strong>Quote Analytics</strong> + <strong>Engagement Analytics</strong> — funnel metrics.</li>
                        <li><strong>Package Guide</strong> (<code>PackageGuideTab</code>) — itemization registry.</li>
                        <li><strong>Settings</strong> (<code>SettingsManager</code>) — app config, dashboard logo uploader, media puller.</li>
                        <li><strong>Documentation</strong> (<code>DocumentationTab</code>) — this tab.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-data-flow">
                  <AccordionTrigger>6. Data Flow — How Pages Talk to Supabase</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <h4>Client → Supabase</h4>
                      <ul>
                        <li>All client DB calls go through <code>src/integrations/supabase/client.ts</code> (uses anon key + RLS).</li>
                        <li>Privileged operations call edge functions (service-role) instead of direct DB writes.</li>
                        <li>Realtime subscriptions: <code>chat_messages</code> (live chat), <code>dashboard_messages</code> (inbox).</li>
                      </ul>

                      <h4>Critical Edge Functions by Surface</h4>
                      <ul>
                        <li><strong>Quote Builder</strong> → <code>create-lead</code>, <code>quick-quote-widget</code>, <code>get-quote-widget</code>, <code>generate-quote-og</code>.</li>
                        <li><strong>Lead Dashboard</strong> → <code>list-lead-engagement</code>, <code>send-engagement-to-ghl</code>, <code>send-transport-inquiry</code>, <code>send-concierge-request</code>, <code>share-quote-email</code>, <code>share-quote-sms</code>.</li>
                        <li><strong>Customer Dashboard</strong> → <code>list-bookings</code>, <code>add-booking-addons</code>, <code>create-balance-payment</code>, <code>process-balance-payment</code>, <code>send-waiver-confirmation</code>.</li>
                        <li><strong>Admin</strong> → <code>list-leads</code>, <code>list-bookings</code>, <code>admin-edit-booking</code>, <code>admin-upsert-booking</code>, <code>admin-delete-booking</code>, <code>admin-update-lead</code>, <code>admin-send-invoice</code>, <code>admin-analytics</code>, <code>admin-affiliate-stats</code>.</li>
                        <li><strong>Stripe lifecycle</strong> → <code>create-stripe-checkout</code>, <code>create-stripe-invoice</code>, <code>finalize-invoice</code>, <code>stripe-webhook</code>, <code>charge-installment</code>, <code>process-due-installments</code>.</li>
                        <li><strong>Xola lifecycle</strong> → <code>xola-booking-webhook</code>, <code>xola-payment-webhook</code>, <code>xola-sync</code>, <code>bulk-import-xola-bookings</code>.</li>
                        <li><strong>Chat</strong> → <code>chat-widget-script</code>, <code>chat-widget-messages</code>, <code>chat-widget-rules</code>, <code>chat-widget-track</code>, <code>chat-assistant</code>, <code>ghl-chat-webhook</code>.</li>
                      </ul>

                      <h4>Single Sources of Truth (do not duplicate)</h4>
                      <ul>
                        <li><code>src/lib/pricing.ts</code> — all pricing math.</li>
                        <li><code>src/lib/staticSchedule.ts</code> — boat availability calendar.</li>
                        <li><code>src/lib/discoRules.ts</code> — Disco eligibility logic.</li>
                        <li><code>src/lib/boatSelection.ts</code> + <code>boatDetails.ts</code> — fleet config.</li>
                        <li><code>src/lib/packageDetails.ts</code> + <code>addonDetails.ts</code> + <code>xolaAddOns.ts</code> — package/add-on registry.</li>
                        <li><code>/summary-sheet</code> page — visual source of truth for pricing display.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-github">
                  <AccordionTrigger>7. GitHub Repo Organization</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <CodeBlock code={`├── src/
│   ├── App.tsx                    # Route registration
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Design tokens (HSL semantic colors)
│   ├── pages/                     # Route components (one per URL)
│   ├── components/
│   │   ├── ui/                    # shadcn primitives (don't edit)
│   │   ├── admin/                 # Admin tab components
│   │   ├── quote-builder/         # /quote-v2 sub-components
│   │   ├── customer-dashboard/    # Dashboard sections
│   │   ├── lead-dashboard/        # Lead hub sections
│   │   ├── pricing/               # Pricing calculators + embeds
│   │   ├── chat/                  # Chat widget UI
│   │   └── inn-cahoots/           # Partner-specific
│   ├── hooks/                     # useEngagementTracking, useTabEngagement, etc.
│   ├── lib/                       # SOURCES OF TRUTH (pricing, schedule, rules)
│   └── integrations/supabase/
│       ├── client.ts              # Supabase JS client
│       └── types.ts               # AUTO-GENERATED — never edit by hand
├── supabase/
│   ├── config.toml                # Edge function config
│   ├── functions/<name>/index.ts  # ~100 edge functions, one folder each
│   └── migrations/                # SQL migrations (read-only in Lovable)
├── public/                        # Static assets, embed HTML files
├── tailwind.config.ts             # Theme tokens
└── .env                           # Auto-populated VITE_SUPABASE_* vars`} />
                      <p><strong>Auto-sync:</strong> Lovable pushes to GitHub on every save (~30s). Pulling the repo into Claude gives you the complete frontend + edge function source.</p>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-supabase-state">
                  <AccordionTrigger>8. What Lives in Supabase (NOT in GitHub)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>The Supabase project holds critical state that is <strong>not</strong> in the GitHub repo. Reconnecting to the same Supabase project preserves all of it:</p>
                      <ul>
                        <li><strong>All data:</strong> bookings, leads, customers, abandoned_bookings, saved_quotes, affiliates, payment_installments, chat_messages, engagement_sessions, etc. (~40 tables).</li>
                        <li><strong>RLS policies</strong> — defined on each table, enforced server-side.</li>
                        <li><strong>~25 edge function secrets</strong> — Stripe, GHL (3 webhooks + API key), Xola, Mailgun, Resend, OpenAI, ElevenLabs, Google Sheets, Make.com, Gmail SMTP, Lovable AI Gateway. <strong>None need to be re-entered.</strong></li>
                        <li><strong>Storage buckets:</strong> <code>dashboard-media</code>, <code>2024-disco-cruise-photos</code>.</li>
                        <li><strong>Database functions:</strong> <code>has_role</code>, <code>get_affiliate_leaderboard</code>, <code>get_quote_analytics</code>, <code>generate_affiliate_code</code>, <code>update_affiliate_earnings</code>, <code>update_updated_at_column</code>.</li>
                        <li><strong>Auth users + admin_profiles</strong> — login state.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-claude-steps">
                  <AccordionTrigger>9. EXACT Claude Reconnection Steps (No New Secrets Needed)</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Hand this section directly to Claude. These steps preserve all existing data, secrets, and integrations.</p>

                      <h4>Step 1 — Pull the GitHub repo</h4>
                      <CodeBlock code={`git clone https://github.com/<YOUR-ORG>/<REPO-NAME>.git ppc-app
cd ppc-app
npm install`} />

                      <h4>Step 2 — Create <code>.env.local</code> pointing at the EXISTING Supabase project</h4>
                      <p>Copy these exact values (already public/safe — anon key only):</p>
                      <CodeBlock code={`VITE_SUPABASE_URL=https://tgambsdjfwgoohkqopns.supabase.co
VITE_SUPABASE_PROJECT_ID=tgambsdjfwgoohkqopns
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYW1ic2RqZndnb29oa3FvcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDYzMDUsImV4cCI6MjA3NDkyMjMwNX0.xRGHgSXJsMkxO5KV-Uh7TvLPGd8MnbYrBdKi-QNUMh4`} />
                      <p><strong>That's it for secrets on the frontend.</strong> All ~25 edge function secrets (Stripe, GHL, Xola, Mailgun, OpenAI, ElevenLabs, Google Sheets, etc.) already live in Supabase and are automatically available to any edge function deployed against this project.</p>

                      <h4>Step 3 — Verify dev server</h4>
                      <CodeBlock code={`npm run dev
# → loads existing bookings, leads, quotes from Supabase`} />

                      <h4>Step 4 — Install Supabase MCP server in Claude Code (gives Claude DB + edge function access)</h4>
                      <p>Get a Personal Access Token at <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener">supabase.com/dashboard/account/tokens</a>, then:</p>
                      <CodeBlock code={`claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --access-token <YOUR_PAT> --project-ref tgambsdjfwgoohkqopns`} />

                      <h4>Step 5 — Deploy edge functions from Claude (only when changed)</h4>
                      <CodeBlock code={`npx supabase functions deploy <function-name> --project-ref tgambsdjfwgoohkqopns`} />
                      <p>Source for all functions is in <code>supabase/functions/&lt;name&gt;/index.ts</code> — already in the repo, no recreation needed.</p>

                      <h4>Step 6 — Deploy frontend to Netlify</h4>
                      <ol>
                        <li>Connect repo at <a href="https://app.netlify.com/start" target="_blank" rel="noopener">app.netlify.com/start</a>.</li>
                        <li>Build command: <code>npm run build</code> · Publish dir: <code>dist</code> · Node 20.</li>
                        <li>Add the same 3 <code>VITE_SUPABASE_*</code> env vars from Step 2.</li>
                        <li>Create <code>public/_redirects</code>: <code>/*    /index.html   200</code></li>
                        <li>Point <code>booking.premierpartycruises.com</code> at Netlify (CNAME).</li>
                      </ol>

                      <h4>Step 7 — Webhook URLs (only update if domain changes)</h4>
                      <p>If you keep <code>booking.premierpartycruises.com</code>, NO webhook updates needed in Stripe/Xola/GHL. If domain changes, update:</p>
                      <ul>
                        <li>Stripe webhook endpoint URL.</li>
                        <li>Xola webhook URLs (booking + payment) in Xola admin.</li>
                        <li>GHL outbound webhook → <code>ghl-chat-webhook</code> URL in GHL workflow.</li>
                        <li>Search repo for hardcoded <code>booking.premierpartycruises.com</code> in edge functions.</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-recreation-prompt">
                  <AccordionTrigger>10. Master Prompt to Give Claude</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <p>Copy/paste this as your first message to Claude in the cloned repo:</p>
                      <CodeBlock code={`I'm migrating this Premier Party Cruises booking app from Lovable to Claude Code + Netlify. The full source is in this repo and the backend is Supabase project tgambsdjfwgoohkqopns.

Goals:
1. Do NOT recreate anything that already exists. The Supabase project has all data, RLS policies, ~25 secrets, storage buckets, and ~100 edge function deployments. Reuse all of it.
2. Read /admin → Documentation tab in the running app for the full blueprint (App Blueprint sub-tab is the master spec).
3. Frontend env vars are in .env.local (VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY). All server-side secrets stay in Supabase — never add them to Netlify.
4. Edge function source is in supabase/functions/<name>/index.ts. Deploy with: npx supabase functions deploy <name> --project-ref tgambsdjfwgoohkqopns
5. Sources of truth: src/lib/pricing.ts, staticSchedule.ts, discoRules.ts, boatSelection.ts, packageDetails.ts. /summary-sheet is the visual pricing source of truth.
6. Never edit src/integrations/supabase/types.ts by hand — regenerate via: npx supabase gen types typescript --project-id tgambsdjfwgoohkqopns > src/integrations/supabase/types.ts
7. Schema changes go through supabase/migrations/ — never edit live in the dashboard.
8. The Supabase MCP server is configured — use it to query DB, deploy functions, and check logs directly.

First task: run \`npm install && npm run dev\`, open the app, navigate to /admin → Documentation → App Blueprint, and confirm you can read the full spec. Then summarize back to me what you see so I know you have full context.`} />
                    </Section>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-gotchas">
                  <AccordionTrigger>11. Critical Gotchas for Claude</AccordionTrigger>
                  <AccordionContent>
                    <Section>
                      <ul>
                        <li><strong>HSL semantic tokens only</strong> — never use raw colors (text-white, bg-black). All colors live in <code>index.css</code> + <code>tailwind.config.ts</code>.</li>
                        <li><strong>Quote builder step order is permanent</strong> — Date → Party Type → Guest Count → Slots → Lead Capture. Do not reorder.</li>
                        <li><strong>Disco cruise visibility</strong> — only show during eligible windows. Memorial Day weekend has special Sunday slot. See <code>discoRules.ts</code>.</li>
                        <li><strong>Time slot UTC mapping</strong> — 3:30 PM CST/CDT = 20:30 UTC during DST.</li>
                        <li><strong>CST timezone everywhere</strong> — all displays use America/Chicago regardless of viewer.</li>
                        <li><strong>No automated emails/SMS to leads</strong> — communication is manual only (sharing quotes is the only exception).</li>
                        <li><strong>Quote URLs use <code>/?quoteNumber=</code></strong> — required for loading; never omit.</li>
                        <li><strong>Booking grand total = <code>booking.amount</code></strong> — authoritative. Don't recompute.</li>
                        <li><strong>Add-on metadata syntax</strong> — explicit <code>Add-On: [Name] x[Qty] @ $[Price]</code> required for dashboard line-item display.</li>
                        <li><strong>Webhook re-trigger safety</strong> — never re-fire webhooks during retroactive data repairs.</li>
                        <li><strong>Disco cruise canonical slots</strong> — exactly 3 windows enforced through end of October (Fri/Sat/Sun specific times).</li>
                      </ul>
                    </Section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
