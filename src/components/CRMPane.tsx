"use client";

/**
 * CRMPane — Full Lead Mgmt + Customer Mgmt experience ported from the
 * Lovable quote-app admin.
 *
 * Two top-level sub-tabs:
 *
 *   1. Lead Mgmt
 *      • Lead Dashboard — the full LeadDashboard.tsx page (Kanban-style
 *        detail view of every lead with pricing, party info, gallery,
 *        transport tab, boats, alcohol, engagement tracking)
 *      • Lead Database — LeadsManager (CRUD with edit + delete modals)
 *      • Abandoned Bookings — AbandonedBookingsManager (recoverable carts)
 *      • Live Chat — LiveChatManager (agent inbox for chat leads)
 *      • Engagement — EngagementAnalytics (which tabs leads spend time on)
 *      • Quote Analytics — QuoteAnalytics (conversion rates by source/party type)
 *
 *   2. Customer Mgmt
 *      • Customer Dashboard — the full CustomerDashboard.tsx page
 *      • Booking Database — BookingsManager (CRUD over bookings)
 *      • Customer Directory — CustomerDirectory (LTV-grouped)
 *      • Calendar — CalendarView (upcoming cruises)
 *      • Cruise Prep — CruisePrep (checklists + weather + boat assignments)
 *      • Time Slots — TimeSlotManager (disco slot availability)
 *      • Boats — BoatsManager
 *
 * Each section loads on-demand to keep TTI fast. Components that use
 * react-router hooks are wrapped in a MemoryRouter so they work inside
 * the Next.js dashboard without affecting the real URL.
 */
import { useMemo, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/quote-app/components/ui/sonner";
import { TooltipProvider } from "@/quote-app/components/ui/tooltip";

// Lazy-load each heavy Lovable pane so a tab only hydrates when opened.
// Next.js requires options to be object literals at each call site — no shared const.

const LeadDashboard = dynamic(() => import("@/quote-app/pages/LeadDashboard"), {
  ssr: false,
  loading: () => <PaneLoading />,
});
const CustomerDashboard = dynamic(() => import("@/quote-app/pages/CustomerDashboard"), {
  ssr: false,
  loading: () => <PaneLoading />,
});
const LeadsManager = dynamic(
  () => import("@/quote-app/components/admin/LeadsManager").then((m) => ({ default: m.LeadsManager })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const BookingsManager = dynamic(
  () => import("@/quote-app/components/admin/BookingsManager").then((m) => ({ default: m.BookingsManager })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const AbandonedBookingsManager = dynamic(
  () => import("@/quote-app/components/admin/AbandonedBookingsManager").then((m) => ({ default: m.AbandonedBookingsManager })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const LiveChatManager = dynamic(
  () => import("@/quote-app/components/admin/LiveChatManager").then((m) => ({ default: m.LiveChatManager })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const EngagementAnalytics = dynamic(
  () => import("@/quote-app/components/admin/EngagementAnalytics").then((m) => ({ default: m.EngagementAnalytics })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const QuoteAnalytics = dynamic(
  () => import("@/quote-app/components/admin/QuoteAnalytics").then((m) => ({ default: m.QuoteAnalytics })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const CalendarView = dynamic(
  () => import("@/quote-app/components/admin/CalendarView").then((m) => ({ default: m.CalendarView })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const CruisePrep = dynamic(
  () => import("@/quote-app/components/admin/CruisePrep").then((m) => ({ default: m.CruisePrep })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const TimeSlotManager = dynamic(
  () => import("@/quote-app/components/admin/TimeSlotManager").then((m) => ({ default: m.TimeSlotManager })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const BoatsManager = dynamic(
  () => import("@/quote-app/components/admin/BoatsManager").then((m) => ({ default: m.BoatsManager })),
  { ssr: false, loading: () => <PaneLoading /> },
);
const CustomerDirectory = dynamic(
  () => import("@/quote-app/components/admin/CustomerDirectory"),
  { ssr: false, loading: () => <PaneLoading /> },
);

function PaneLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
      Loading…
    </div>
  );
}

type TopTab = "leads" | "customers";
type LeadSection =
  | "dashboard"
  | "database"
  | "abandoned"
  | "livechat"
  | "engagement"
  | "quotes";
type CustomerSection =
  | "dashboard"
  | "bookings"
  | "directory"
  | "calendar"
  | "cruise-prep"
  | "time-slots"
  | "boats";

const LEAD_SECTIONS: { id: LeadSection; label: string; icon: string; desc: string }[] = [
  { id: "dashboard", label: "Lead Dashboard", icon: "📊", desc: "Full per-lead detail view" },
  { id: "database", label: "Lead Database", icon: "🗃️", desc: "CRUD every lead row" },
  { id: "abandoned", label: "Abandoned", icon: "🚪", desc: "Recoverable carts" },
  { id: "livechat", label: "Live Chat", icon: "💬", desc: "Agent inbox" },
  { id: "engagement", label: "Engagement", icon: "📈", desc: "Tab-time tracking" },
  { id: "quotes", label: "Quote Analytics", icon: "🧮", desc: "Conversion by source" },
];

const CUSTOMER_SECTIONS: { id: CustomerSection; label: string; icon: string; desc: string }[] = [
  { id: "dashboard", label: "Customer Dashboard", icon: "📊", desc: "Full per-customer view" },
  { id: "bookings", label: "Booking Database", icon: "🗃️", desc: "CRUD every booking" },
  { id: "directory", label: "Customer Directory", icon: "🤝", desc: "LTV + repeat cruisers" },
  { id: "calendar", label: "Calendar", icon: "📅", desc: "Upcoming cruises" },
  { id: "cruise-prep", label: "Cruise Prep", icon: "⚓", desc: "Pre-cruise checklists" },
  { id: "time-slots", label: "Time Slots", icon: "⏱️", desc: "Disco slot availability" },
  { id: "boats", label: "Boats", icon: "🛥️", desc: "Fleet config" },
];

export default function CRMPane() {
  const [top, setTop] = useState<TopTab>("leads");
  const [leadSec, setLeadSec] = useState<LeadSection>("dashboard");
  const [customerSec, setCustomerSec] = useState<CustomerSection>("dashboard");

  // One QueryClient for all the inner panes — they share a cache so
  // switching tabs doesn't refetch identical queries.
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, staleTime: 60_000 },
        },
      }),
    [],
  );

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <div>
            {/* Top-level Lead Mgmt vs Customer Mgmt switch */}
            <div className="flex items-center gap-1 border-b border-[#262626] mb-5" role="tablist">
              <button
                role="tab"
                aria-selected={top === "leads"}
                onClick={() => setTop("leads")}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  top === "leads"
                    ? "border-blue-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span aria-hidden="true">📥</span> Lead Mgmt
              </button>
              <button
                role="tab"
                aria-selected={top === "customers"}
                onClick={() => setTop("customers")}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  top === "customers"
                    ? "border-blue-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span aria-hidden="true">🤝</span> Customer Mgmt
              </button>
            </div>

            {top === "leads" ? (
              <LeadMgmtTabs section={leadSec} setSection={setLeadSec} />
            ) : (
              <CustomerMgmtTabs section={customerSec} setSection={setCustomerSec} />
            )}
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

// ── Lead Mgmt ──────────────────────────────────────────────────────────
function LeadMgmtTabs({
  section,
  setSection,
}: {
  section: LeadSection;
  setSection: (s: LeadSection) => void;
}) {
  return (
    <div>
      <SectionNav
        sections={LEAD_SECTIONS}
        active={section}
        onChange={(id) => setSection(id as LeadSection)}
      />
      <div className="mt-4">
        {section === "dashboard" && (
          <RouterWrap basename="/lead-dashboard">
            <LeadDashboard />
          </RouterWrap>
        )}
        {section === "database" && (
          <RouterWrap>
            <LeadsManager />
          </RouterWrap>
        )}
        {section === "abandoned" && (
          <RouterWrap>
            <AbandonedBookingsManager />
          </RouterWrap>
        )}
        {section === "livechat" && (
          <RouterWrap>
            <LiveChatManager />
          </RouterWrap>
        )}
        {section === "engagement" && (
          <RouterWrap>
            <EngagementAnalytics />
          </RouterWrap>
        )}
        {section === "quotes" && (
          <RouterWrap>
            <QuoteAnalytics />
          </RouterWrap>
        )}
      </div>
    </div>
  );
}

// ── Customer Mgmt ──────────────────────────────────────────────────────
function CustomerMgmtTabs({
  section,
  setSection,
}: {
  section: CustomerSection;
  setSection: (s: CustomerSection) => void;
}) {
  return (
    <div>
      <SectionNav
        sections={CUSTOMER_SECTIONS}
        active={section}
        onChange={(id) => setSection(id as CustomerSection)}
      />
      <div className="mt-4">
        {section === "dashboard" && (
          <RouterWrap basename="/customer-dashboard">
            <CustomerDashboard />
          </RouterWrap>
        )}
        {section === "bookings" && (
          <RouterWrap>
            <BookingsManager />
          </RouterWrap>
        )}
        {section === "directory" && (
          <RouterWrap>
            <CustomerDirectoryWithBookings />
          </RouterWrap>
        )}
        {section === "calendar" && (
          <RouterWrap>
            <CalendarView />
          </RouterWrap>
        )}
        {section === "cruise-prep" && (
          <RouterWrap>
            <CruisePrep />
          </RouterWrap>
        )}
        {section === "time-slots" && (
          <RouterWrap>
            <TimeSlotManager />
          </RouterWrap>
        )}
        {section === "boats" && (
          <RouterWrap>
            <BoatsManager />
          </RouterWrap>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-nav ─────────────────────────────────────────────────────
function SectionNav<T extends string>({
  sections,
  active,
  onChange,
}: {
  sections: { id: T; label: string; icon: string; desc: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  const current = sections.find((s) => s.id === active);
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-1.5">
      <div className="flex flex-wrap items-center gap-1" role="tablist">
        {sections.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(s.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-[#1a1a1a]"
              }`}
              title={s.desc}
            >
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </button>
          );
        })}
      </div>
      {current && (
        <div className="text-[11px] text-zinc-500 px-3 py-1.5 border-t border-[#262626] mt-1.5">
          {current.desc}
        </div>
      )}
    </div>
  );
}

// ── Router wrapper ─────────────────────────────────────────────────────
// MemoryRouter gives react-router hooks the context they need without
// touching the real browser URL. Each dynamic pane gets its own isolated
// routing tree.
function RouterWrap({
  children,
  basename,
}: {
  children: React.ReactNode;
  basename?: string;
}) {
  const initial = basename ? [basename] : ["/"];
  return (
    <MemoryRouter initialEntries={initial} initialIndex={0}>
      <div className="crm-embed-shell">{children}</div>
    </MemoryRouter>
  );
}

// ── CustomerDirectory wrapper — the component needs a bookings prop ────
function CustomerDirectoryWithBookings() {
  const [bookings, setBookings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  // We don't have a ready-made hook here — load via the same supabase
  // client the other panes use. Lazy import to avoid SSR issues.
  useMemo(() => {
    (async () => {
      const { supabase } = await import("@/quote-app/integrations/supabase/client");
      const { data } = await supabase
        .from("bookings")
        .select("*, customer:customers(*), time_slot:time_slots(*, boat:boats(*), experience:experiences(*))")
        .order("created_at", { ascending: false })
        .limit(3000);
      setBookings(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PaneLoading />;
  return <CustomerDirectory bookings={bookings as any[]} />;
}
