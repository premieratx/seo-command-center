import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";

import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Badge } from "@/quote-app/components/ui/badge";
import { Lightbox } from "@/quote-app/components/ui/lightbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/quote-app/components/ui/dialog";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { Slider } from "@/quote-app/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/quote-app/lib/utils";

import { 
  CalendarDays, Users, MapPin, FileText, 
  Camera, Car, AlertTriangle, Compass, Loader2, Anchor,
  Phone, Mail, ExternalLink, Copy, Search, ArrowUpDown,
  Shield, Wine, Eye, Clock, Send, Star, DollarSign, CalendarCheck, Download
} from "lucide-react";
import { formatPartyType } from "@/quote-app/lib/utils";
import { SEOHead } from "@/quote-app/components/SEOHead";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";

// Boat photos from assets
import cleverGirl1 from "@/quote-app/assets/boats/clever-girl-1.jpg";
import cleverGirl3 from "@/quote-app/assets/boats/clever-girl-3.jpg";
import cleverGirl4 from "@/quote-app/assets/boats/clever-girl-4.jpg";
import cleverGirl6 from "@/quote-app/assets/boats/clever-girl-6.jpg";
import cleverGirl9 from "@/quote-app/assets/boats/clever-girl-9.jpg";
import dayTripper1 from "@/quote-app/assets/boats/day-tripper-1.jpg";
import dayTripper2 from "@/quote-app/assets/boats/day-tripper-2.jpg";
import dayTripper3 from "@/quote-app/assets/boats/day-tripper-3.jpg";
import dayTripper4 from "@/quote-app/assets/boats/day-tripper-4.jpg";
import meeseeks1 from "@/quote-app/assets/boats/meeseeks-1.jpg";
import meeseeks2 from "@/quote-app/assets/boats/meeseeks-2.jpg";
import meeseeks3 from "@/quote-app/assets/boats/meeseeks-3.jpg";
import meeseeks4 from "@/quote-app/assets/boats/meeseeks-4.jpg";
import meeseeks5 from "@/quote-app/assets/boats/meeseeks-5.jpg";
import irony1 from "@/quote-app/assets/boats/irony-1.jpg";
import irony2 from "@/quote-app/assets/boats/irony-2.jpg";
import irony3 from "@/quote-app/assets/boats/irony-3.jpg";
import irony4 from "@/quote-app/assets/boats/irony-4.jpg";
import irony5 from "@/quote-app/assets/boats/irony-5.jpg";
import irony6 from "@/quote-app/assets/boats/irony-6.jpg";
import discoFun from "@/quote-app/assets/party/disco_fun_first.jpg";
import discoFun27 from "@/quote-app/assets/party/disco_fun_27.jpg";
import discoFun28 from "@/quote-app/assets/party/disco_fun_28.jpg";
import discoFun29 from "@/quote-app/assets/party/disco_fun29.jpg";
import discoFunBest from "@/quote-app/assets/party/disco_fun_best2.jpg";
import groupPic from "@/quote-app/assets/party/Group_Pic_6_22.jpg";
import djPic from "@/quote-app/assets/party/DJ_Pic.jpg";
import discoWigs from "@/quote-app/assets/party/disco_wigs.jpg";
import unicornPic from "@/quote-app/assets/party/unicorn_pic.jpg";
import ppcLogo from "@/quote-app/assets/ppc-logo-round.png";

import TransportTabContent from "@/quote-app/components/inn-cahoots/TransportTabContent";
import { BachPhotoGallery } from "@/quote-app/components/BachPhotoGallery";
import { isDiscoEligiblePartyType } from "@/quote-app/lib/discoRules";
import { PricingDetailsTab } from "@/quote-app/components/lead-dashboard/PricingDetailsTab";
import { useTabEngagement } from "@/quote-app/hooks/useTabEngagement";

// Alcohol delivery service tiles
import tileSuiteDelivery from "@/quote-app/assets/tiles/suite-delivery.jpg";
import tileBoatDelivery from "@/quote-app/assets/tiles/boat-delivery.jpg";
import tileCocktailBar from "@/quote-app/assets/tiles/cocktail-bar.jpg";
import tileStockFridge from "@/quote-app/assets/tiles/stock-fridge.jpg";
import tileGroupOrdering from "@/quote-app/assets/tiles/group-ordering.jpg";
import cocktailKitsHero from "@/quote-app/assets/Lake-Ready_Cocktail_Kits.png";

const boatPhotos: Record<string, string[]> = {
  "Clever Girl": [cleverGirl1, cleverGirl3, cleverGirl4, cleverGirl6, cleverGirl9],
  "Day Tripper": [dayTripper1, dayTripper2, dayTripper3, dayTripper4],
  "Meeseeks": [meeseeks1, meeseeks2, meeseeks3, meeseeks4, meeseeks5],
  "The Irony": [irony1, irony2, irony3, irony4, irony5, irony6],
};

const experiencePhotos = [discoFun, discoFun27, discoFun28, discoFun29, discoFunBest, groupPic, djPic, discoWigs, unicornPic];

interface LeadData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  party_type: string;
  guest_count: number;
  event_date: string;
  quote_number: string | null;
  quote_url: string;
  status: string;
  created_at: string;
}

type LeadSortKey = "name" | "date" | "guests" | "recent" | "party_type" | "engagement" | "recently_active";

// Hook to track active time on the quote tab with 30s idle timeout
const useQuoteTabTracker = (leadId: string | null, activeTab: string) => {
  const activeTimeRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoggedViewRef = useRef(false);

  const resetIdleTimer = useCallback(() => {
    if (isIdleRef.current) {
      isIdleRef.current = false;
      lastTickRef.current = Date.now();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
    }, 30000);
  }, []);

  useEffect(() => {
    if (activeTab !== "quote" || !leadId) return;

    // Log a view event
    if (!hasLoggedViewRef.current) {
      hasLoggedViewRef.current = true;
      supabase.from("engagement_events").insert({
        session_id: `lead-${leadId}-${Date.now()}`,
        event_type: "lead_quote_tab_viewed",
        event_data: { lead_id: leadId },
        page_url: window.location.href,
      }).then(() => {});
    }

    // Start active time tracking
    lastTickRef.current = Date.now();
    isIdleRef.current = false;
    resetIdleTimer();

    intervalRef.current = setInterval(() => {
      if (!isIdleRef.current && lastTickRef.current) {
        const now = Date.now();
        activeTimeRef.current += (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
      }
    }, 1000);

    const handleActivity = () => resetIdleTimer();
    window.addEventListener("scroll", handleActivity, true);
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("scroll", handleActivity, true);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);

      // Flush active time on tab switch/unmount
      if (leadId && activeTimeRef.current > 1) {
        supabase.from("engagement_events").insert({
          session_id: `lead-${leadId}-${Date.now()}`,
          event_type: "lead_quote_active_time",
          event_data: { lead_id: leadId, active_seconds: Math.round(activeTimeRef.current) },
          page_url: window.location.href,
        }).then(() => {});
        activeTimeRef.current = 0;
      }
    };
  }, [activeTab, leadId, resetIdleTimer]);
};

const LeadDashboard = () => {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead");
  const isAdminView = searchParams.get("admin") === "1";
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [activeTab, setActiveTab] = useState("quote");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewType, setEmailPreviewType] = useState<"admin" | "customer">("admin");
  const [sendingTestInquiry, setSendingTestInquiry] = useState(false);

  // Editable field modals
  const [showDateEditor, setShowDateEditor] = useState(false);
  const [showGuestEditor, setShowGuestEditor] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editGuestCount, setEditGuestCount] = useState(15);
  const [savingField, setSavingField] = useState(false);

  // Admin panel state
  const [adminSearch, setAdminSearch] = useState("");
  const [sortKey, setSortKey] = useState<LeadSortKey>("recent");
  const [sortAsc, setSortAsc] = useState(false);
  const [leadEngagement, setLeadEngagement] = useState<Record<string, { views: number; activeSeconds: number; tabCount: number; lastActiveAt: string | null; tabs: Record<string, { clicks: number; seconds: number; scroll: number }> }>>({});

  // Live overrides from embedded quote iframe
  const [quotePartyType, setQuotePartyType] = useState<string | null>(null);
  const [quoteGuestCount, setQuoteGuestCount] = useState<number | null>(null);

  // Auto-resize the quote iframe based on content height + handle tab switch messages + selection sync
  const quoteIframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'quote-v2-resize' && event.data?.height) {
        if (quoteIframeRef.current) {
          quoteIframeRef.current.style.height = `${event.data.height}px`;
        }
      }
      if (event.data?.type === 'switch-to-booking-tab') {
        setActiveTab('booking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (event.data?.type === 'quote-v2-selections') {
        if (event.data.partyType) setQuotePartyType(event.data.partyType);
        if (event.data.guestCount) setQuoteGuestCount(event.data.guestCount);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Track quote tab engagement (legacy)
  useQuoteTabTracker(leadId, activeTab);
  // Track per-tab engagement
  useTabEngagement(leadId, activeTab);

  // Load Senja reviews widget scripts when reviews tab is active
  useEffect(() => {
    if (activeTab !== 'reviews') return;
    const widgetIds = ['48b63026-6e70-4e50-8bc0-b565344099de', '44902d45-5982-4bea-8014-fa5de08c5b1a'];
    widgetIds.forEach(id => {
      const scriptId = `senja-widget-${id}`;
      if (document.getElementById(scriptId)) return;
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://widget.senja.io/widget/${id}/platform.js`;
      script.async = true;
      document.body.appendChild(script);
    });
  }, [activeTab]);

  // Load GHL form embed script when Book a Call tab is active
  useEffect(() => {
    if (activeTab !== 'call') return;
    const scriptId = 'ghl-form-embed';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://events.premierpartycruises.com/js/form_embed.js';
    script.type = 'text/javascript';
    document.body.appendChild(script);
  }, [activeTab]);

  const DEMO_LEAD: LeadData = {
    id: "demo-preview",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    phone: "(512) 555-9876",
    party_type: "bachelorette",
    guest_count: 15,
    event_date: "2026-05-15",
    quote_number: "PPC-DEMO-001",
    quote_url: "/quote-v2",
    status: "new",
    created_at: new Date().toISOString(),
  };

  useEffect(() => {
    const fetchLead = async () => {
      if (!leadId) {
        setLead(DEMO_LEAD);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.functions.invoke("list-leads", {
          body: {},
        });

        if (fetchError) throw fetchError;

        const found = data?.leads?.find((l: any) => l.id === leadId);
        if (!found) {
          setError("Lead not found.");
          setLoading(false);
          return;
        }

        setLead({
          id: found.id,
          first_name: found.first_name,
          last_name: found.last_name,
          email: found.email,
          phone: found.phone,
          party_type: found.party_type,
          guest_count: found.guest_count,
          event_date: found.event_date,
          quote_number: found.quote_number,
          quote_url: found.quote_url,
          status: found.status,
          created_at: found.created_at,
        });
      } catch (err: any) {
        console.error("Failed to fetch lead:", err);
        setError("Failed to load lead details.");
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  // Fetch all leads for admin panel
  useEffect(() => {
    if (!showAdmin) return;
    const fetchAllLeads = async () => {
      setLoadingLeads(true);
      try {
        const { data, error: fetchError } = await supabase.functions.invoke("list-leads", {
          body: {},
        });
        if (!fetchError && data?.leads) {
          setAllLeads(data.leads);
          // Fetch engagement data for all leads
          fetchLeadEngagement(data.leads.map((l: any) => l.id));
        }
      } catch (err) {
        console.error("Failed to fetch leads for admin:", err);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchAllLeads();
  }, [showAdmin]);

  const fetchLeadEngagement = async (leadIds: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("list-lead-engagement", {
        body: { leadIds },
      });
      if (!error && data?.engagement) {
        setLeadEngagement(data.engagement);
      }
    } catch (err) {
      console.error("Failed to fetch lead engagement:", err);
    }
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleSort = (key: LeadSortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "name" || key === "date"); }
  };

  // Filter and sort leads
  const filteredLeads = (() => {
    let list = allLeads;
    if (adminSearch) {
      const q = adminSearch.toLowerCase();
      list = list.filter(l => 
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) || 
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "name") return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`) * dir;
      if (sortKey === "date") return (a.event_date || "").localeCompare(b.event_date || "") * dir;
      if (sortKey === "guests") return ((a.guest_count || 0) - (b.guest_count || 0)) * dir;
      if (sortKey === "party_type") return (a.party_type || "").localeCompare(b.party_type || "") * dir;
      if (sortKey === "recent") return (a.created_at || "").localeCompare(b.created_at || "") * dir;
      if (sortKey === "engagement") {
        const engA = leadEngagement[a.id];
        const engB = leadEngagement[b.id];
        const scoreA = engA ? (Object.keys(engA.tabs).length * 10 + engA.activeSeconds) : 0;
        const scoreB = engB ? (Object.keys(engB.tabs).length * 10 + engB.activeSeconds) : 0;
        return (scoreA - scoreB) * dir;
      }
      if (sortKey === "recently_active") {
        const engA = leadEngagement[a.id];
        const engB = leadEngagement[b.id];
        const timeA = engA?.lastActiveAt || "";
        const timeB = engB?.lastActiveAt || "";
        return timeA.localeCompare(timeB) * dir;
      }
      return 0;
    });
  })();

  const getDashUrl = (id: string) => `https://booking.premierpartycruises.com/lead-dashboard?lead=${id}`;

  const formatActiveTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const SortButton = ({ label, field }: { label: string; field: LeadSortKey }) => (
    <Button
      size="sm"
      variant="ghost"
      className={`h-7 text-xs px-2 ${sortKey === field ? 'text-sky-300 bg-slate-600/50' : 'text-slate-400 hover:text-white'}`}
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ml-1 ${sortKey === field ? 'text-sky-400' : 'text-slate-500'}`} />
    </Button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400 mx-auto" />
          <p className="text-sky-200 text-lg">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/80 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 text-lg">{error || "Lead not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventDate = new Date(lead.event_date + "T12:00:00");
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  });

  // Format party type as "X Cruise" for the dashboard title
  const partyCruiseLabel = (() => {
    const pt = (lead.party_type || '').toLowerCase();
    if (pt.includes('bachelorette') && !pt.includes('combined')) return 'Bachelorette Cruise';
    if (pt.includes('combined') || (pt.includes('bach') && !pt.includes('bachelor'))) return 'Bach Party Cruise';
    if (pt.includes('bachelor')) return 'Bachelor Party Cruise';
    if (pt.includes('corporate')) return 'Company Party Cruise';
    if (pt.includes('wedding')) return 'Wedding Cruise';
    if (pt.includes('birthday')) return 'Birthday Cruise';
    if (pt.includes('graduation')) return 'Graduation Cruise';
    if (pt.includes('other') || pt === '') return 'Party Cruise';
    return 'Party Cruise';
  })();

  // Save updated lead field to DB
  const saveLeadField = async (updates: Record<string, any>) => {
    setSavingField(true);
    try {
      const { error } = await supabase.functions.invoke("admin-update-lead", {
        body: { leadId: lead.id, updates },
      });
      if (error) throw error;
      // Update local state
      setLead({ ...lead, ...updates });
      toast.success("Updated successfully!");
    } catch (err: any) {
      console.error("Failed to update lead:", err);
      toast.error("Failed to update");
    } finally {
      setSavingField(false);
    }
  };

  // Build quote-v2 embed URL with lead's info pre-filled
  const quoteEmbedUrl = (() => {
    const base = `${window.location.origin}/quote-v2`;
    const params = new URLSearchParams();
    params.set("sourceType", "lead_dashboard");
    params.set("autoResize", "1");
    if (lead.quote_number) params.set("quoteNumber", lead.quote_number);
    return `${base}?${params.toString()}`;
  })();


  return (
    <>
      <SEOHead
        title={`${lead.first_name}'s Cruise Details - Premier Party Cruises`}
        description="Your Premier Party Cruises quote hub"
      />

      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
        {/* Admin-only header bar (hidden from customers) */}
        {(!leadId || isAdminView) && (
          <div className="bg-slate-800/60 border-b border-sky-500/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
              <div className="flex-1" />
              {!leadId && (
                <Button
                  size="sm"
                  className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
                  onClick={() => setShowAdmin(!showAdmin)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Button>
              )}
              {!window.location.hostname.includes('premierpartycruises.com') && (
                <a
                  href={`https://booking.premierpartycruises.com/lead-dashboard${window.location.search}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Live
                  </Button>
                </a>
              )}
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs">
                <Users className="h-3 w-3 mr-1" />
                Lead
              </Badge>
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {showAdmin && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <Card className="bg-slate-800/70 border-amber-500/30 text-white">
              <CardHeader>
                <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search and Sort Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <p className="text-slate-400 text-sm">{filteredLeads.length} leads</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                      onClick={() => {
                        const csvRows = [
                          ["First Name", "Last Name", "Phone", "Email", "Lead Dashboard Link", "Quote Link"].join(","),
                          ...allLeads.map(l => {
                            const dashLink = getDashUrl(l.id);
                            const quoteLink = l.quote_url || "";
                            return [
                              `"${(l.first_name || "").replace(/"/g, '""')}"`,
                              `"${(l.last_name || "").replace(/"/g, '""')}"`,
                              `"${(l.phone || "").replace(/"/g, '""')}"`,
                              `"${(l.email || "").replace(/"/g, '""')}"`,
                              `"${dashLink}"`,
                              `"${quoteLink.replace(/"/g, '""')}"`,
                            ].join(",");
                          }),
                        ].join("\n");
                        const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `lead-dashboards-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Exported ${allLeads.length} leads to CSV`);
                      }}
                      disabled={allLeads.length === 0}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Export CSV
                    </Button>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Search name, email, phone..."
                        value={adminSearch}
                        onChange={e => setAdminSearch(e.target.value)}
                        className="pl-8 h-8 w-56 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <SortButton label="Name" field="name" />
                  <SortButton label="Event Date" field="date" />
                  <SortButton label="Guests" field="guests" />
                  <SortButton label="Type" field="party_type" />
                   <SortButton label="Most Recent" field="recent" />
                   <SortButton label="Most Engaged" field="engagement" />
                   <SortButton label="Recently Active" field="recently_active" />
                </div>

                <div className="space-y-3">
                  {loadingLeads && (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-sky-400 mx-auto" />
                      <p className="text-slate-400 text-sm mt-2">Loading leads...</p>
                    </div>
                  )}
                  {!loadingLeads && filteredLeads.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No leads found.</p>
                  )}
                  {!loadingLeads && filteredLeads.map((l: any) => {
                    const lDate = l.event_date
                      ? new Date(l.event_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
                      : "No date";
                    const dashUrl = getDashUrl(l.id);
                    const engagement = leadEngagement[l.id];
                    const viewCount = engagement?.views || 0;
                    const _activeSeconds = engagement?.activeSeconds || 0;
                    const tabs = engagement?.tabs || {};

                    const createdCST = l.created_at
                      ? new Date(l.created_at).toLocaleString("en-US", { 
                          month: "short", day: "numeric", year: "numeric",
                          hour: "numeric", minute: "2-digit", hour12: true,
                          timeZone: "America/Chicago" 
                        }) + " CST"
                      : "";

                    const TAB_ORDER: { key: string; label: string; activeClass: string; inactiveClass: string }[] = [
                      { key: 'quote', label: 'Quote', activeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'reviews', label: 'Reviews', activeClass: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'booking', label: 'Book', activeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'photos', label: 'Photos', activeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'pricing', label: 'Pricing', activeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'transportation', label: 'Transport', activeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'alcohol', label: 'Concierge', activeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'map', label: 'Map', activeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                      { key: 'call', label: 'Call', activeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30', inactiveClass: 'bg-slate-600/30 text-slate-500 border border-slate-600/20' },
                    ];

                    const totalTabSeconds = Object.values(tabs).reduce((sum, t) => sum + (t.seconds || 0), 0);

                    return (
                      <div key={l.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">{l.first_name} {l.last_name}</p>
                            <p className="text-sm text-slate-400">{formatPartyType(l.party_type)} • {l.guest_count} guests</p>
                            <p className="text-xs text-slate-500">{lDate}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`text-xs ${l.status === 'converted' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'}`}>
                              {l.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                              onClick={() => {
                                navigator.clipboard.writeText(dashUrl);
                                toast.success("Dashboard link copied!");
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
                              onClick={() => window.open(dashUrl, "_blank")}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>

                        {/* Tab Engagement Grid */}
                        <div className="mt-3 pt-3 border-t border-slate-600/30">
                          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
                            {TAB_ORDER.map(({ key, label, activeClass, inactiveClass }) => {
                              const t = tabs[key];
                              const hasData = t && (t.clicks > 0 || t.seconds > 0);
                              return (
                                <div
                                  key={key}
                                  className={`rounded-md px-2 py-1.5 text-center ${hasData ? activeClass : inactiveClass}`}
                                  title={hasData ? `${t.clicks} visits, ${formatActiveTime(t.seconds)} active, ${t.scroll}% scrolled` : 'Not visited'}
                                >
                                  <p className="text-xs font-semibold leading-tight">{label}</p>
                                  {hasData ? (
                                    <div className="mt-0.5 space-y-0">
                                      <p className="text-[11px] font-medium opacity-90">{t.clicks}× viewed</p>
                                      {t.seconds > 0 && <p className="text-[10px] opacity-75">{formatActiveTime(t.seconds)}</p>}
                                      {t.scroll > 0 && <p className="text-[10px] opacity-75">↓{t.scroll}%</p>}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] mt-0.5 opacity-50">—</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom row: created timestamp, total time, views */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-600/30">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {createdCST}
                          </p>
                          <div className="flex items-center gap-3">
                            {totalTabSeconds > 0 && (
                              <span className="text-xs font-medium flex items-center gap-1 text-sky-400">
                                <Clock className="h-3 w-3" />
                                {formatActiveTime(totalTabSeconds)} total
                              </span>
                            )}
                            <span className={`text-xs font-medium flex items-center gap-1 ${viewCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                              <Eye className="h-3 w-3" />
                              {viewCount}x viewed
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Toolbar - visible when ?admin=1 and viewing individual lead */}
        {isAdminView && leadId && lead && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-400" />
                  <span className="text-amber-300 font-bold text-sm uppercase tracking-wider">Admin Tools</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                    disabled={sendingTestInquiry}
                    onClick={async () => {
                      setSendingTestInquiry(true);
                      try {
                        const { error } = await supabase.functions.invoke("send-transport-inquiry", {
                          body: {
                            customerName: `${lead.first_name} ${lead.last_name}`,
                            customerEmail: "ppcaustin@gmail.com",
                            customerPhone: lead.phone,
                            pickupAddress: "1221 E 6th St, Austin, TX 78702",
                            destinationAddress: "13993 FM 2769, Leander, TX 78641",
                            pickupDate: lead.event_date,
                            pickupTime: "2:00 PM",
                            endTime: "6:00 PM",
                            passengerCount: "10",
                            selectedVehicle: "Mercedes Sprinter (Test)",
                            specialRequests: "⚠️ TEST INQUIRY — sent from admin toolbar",
                          },
                        });
                        if (error) throw error;
                        toast.success("Test inquiry sent to ppcaustin@gmail.com!");
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to send test inquiry");
                      } finally {
                        setSendingTestInquiry(false);
                      }
                    }}
                  >
                    {sendingTestInquiry ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                    Send Test Inquiry
                  </Button>
                  <Button
                    size="sm"
                    variant={showEmailPreview ? "default" : "outline"}
                    className={showEmailPreview ? "bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs" : "border-amber-500/50 text-amber-300 hover:bg-amber-500/20 text-xs"}
                    onClick={() => setShowEmailPreview(!showEmailPreview)}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    Email Preview
                  </Button>
                </div>
              </div>

              {/* Email Preview Panel */}
              {showEmailPreview && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" className={emailPreviewType === "admin" ? "bg-amber-600 text-black font-bold text-xs" : "bg-slate-700 text-slate-300 text-xs"} onClick={() => setEmailPreviewType("admin")}>
                      Admin Email
                    </Button>
                    <Button size="sm" className={emailPreviewType === "customer" ? "bg-sky-600 text-white font-bold text-xs" : "bg-slate-700 text-slate-300 text-xs"} onClick={() => setEmailPreviewType("customer")}>
                      Customer Email
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    {emailPreviewType === "admin" ? (
                      <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto" }}>
                        <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, color: "#e2e8f0" }}>
                          <h2 style={{ color: "#fbbf24", marginTop: 0 }}>🚐 Transportation Inquiry</h2>
                          <div style={{ background: "#334155", padding: 16, borderRadius: 8, marginBottom: 16 }}>
                            <h3 style={{ color: "#38bdf8", marginTop: 0 }}>Customer Info</h3>
                            <p style={{ margin: "4px 0" }}><strong>Name:</strong> {lead.first_name} {lead.last_name}</p>
                            <p style={{ margin: "4px 0" }}><strong>Email:</strong> {lead.email}</p>
                            <p style={{ margin: "4px 0" }}><strong>Phone:</strong> {lead.phone}</p>
                          </div>
                          <div style={{ background: "#334155", padding: 16, borderRadius: 8, marginBottom: 16 }}>
                            <h3 style={{ color: "#38bdf8", marginTop: 0 }}>Trip Details</h3>
                            <p style={{ margin: "4px 0" }}><strong>From:</strong> 1221 E 6th St, Austin, TX 78702</p>
                            <p style={{ margin: "4px 0" }}><strong>To:</strong> 13993 FM 2769, Leander, TX 78641</p>
                            <p style={{ margin: "4px 0" }}><strong>Date:</strong> {new Date(lead.event_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                            <p style={{ margin: "4px 0" }}><strong>Time:</strong> 2:00 PM — 6:00 PM</p>
                            <p style={{ margin: "4px 0" }}><strong>Passengers:</strong> 10</p>
                            <p style={{ margin: "4px 0" }}><strong>Preferred Vehicle:</strong> Mercedes Sprinter</p>
                          </div>
                          <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 16 }}>Sent from Premier Party Cruises Lead Dashboard</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto" }}>
                        <div style={{ background: "#ffffff", padding: 24, borderRadius: 12, color: "#1e293b" }}>
                          <h2 style={{ color: "#0369a1", marginTop: 0 }}>🚐 Transportation Inquiry Received!</h2>
                          <p>Hey {lead.first_name}! We got your transportation inquiry and will be in touch soon with options and pricing.</p>
                          <div style={{ background: "#f1f5f9", padding: 16, borderRadius: 8, margin: "16px 0" }}>
                            <h3 style={{ color: "#0369a1", marginTop: 0 }}>Your Trip Summary</h3>
                            <p style={{ margin: "4px 0" }}><strong>From:</strong> 1221 E 6th St, Austin, TX 78702</p>
                            <p style={{ margin: "4px 0" }}><strong>To:</strong> 13993 FM 2769, Leander, TX 78641</p>
                            <p style={{ margin: "4px 0" }}><strong>Date:</strong> {new Date(lead.event_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                            <p style={{ margin: "4px 0" }}><strong>Time:</strong> 2:00 PM — 6:00 PM</p>
                            <p style={{ margin: "4px 0" }}><strong>Passengers:</strong> 10</p>
                            <p style={{ margin: "4px 0" }}><strong>Vehicle:</strong> Mercedes Sprinter</p>
                          </div>
                          <p>If you have any questions, reply to this email or call us at (512) 576-7975.</p>
                          <p style={{ color: "#64748b", fontSize: 12, marginTop: 24 }}>— Premier Party Cruises</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lead Hero */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-4 pb-2">
          <div className="bg-gradient-to-r from-sky-500/10 to-purple-500/10 border border-sky-500/20 rounded-xl px-4 py-3 sm:px-6 sm:py-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Left: Logo + Name + Party Type */}
              <div className="flex items-center gap-3">
                <img src={ppcLogo} alt="Premier Party Cruises" className="h-10 w-10 rounded-full" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {lead.first_name}'s {partyCruiseLabel}
                  </h2>
                </div>
              </div>
              {/* Right: Details aligned right on desktop */}
              <div className="flex flex-col items-start sm:items-end gap-1 text-sky-200 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <button
                    onClick={() => {
                      setEditDate(eventDate);
                      setShowDateEditor(true);
                    }}
                    className="flex items-center gap-1.5 hover:text-yellow-300 transition-colors cursor-pointer group"
                    title="Click to change date"
                  >
                    <span className="hidden sm:inline text-yellow-400 text-xs font-medium">✎</span>
                    <CalendarDays className="h-4 w-4 text-sky-400 group-hover:text-yellow-400" />
                    {formattedDate}
                    <span className="sm:hidden text-yellow-400 text-xs font-medium">✎</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditGuestCount(lead.guest_count);
                      setShowGuestEditor(true);
                    }}
                    className="flex items-center gap-1.5 hover:text-yellow-300 transition-colors cursor-pointer group"
                    title="Click to change guest count"
                  >
                    <span className="hidden sm:inline text-yellow-400 text-xs font-medium">✎</span>
                    <Users className="h-4 w-4 text-sky-400 group-hover:text-yellow-400" />
                    {lead.guest_count} guests
                    <span className="sm:hidden text-yellow-400 text-xs font-medium">✎</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-sky-400" />
                    {lead.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-sky-400" />
                    {lead.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} className="space-y-4" onValueChange={setActiveTab}>
            <TabsList className="bg-slate-800/90 border border-sky-500/20 w-full grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 h-auto p-2 gap-2 rounded-xl">
              <TabsTrigger value="quote" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/30 bg-slate-700/80 text-sky-200 border border-slate-600 data-[state=active]:border-sky-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <FileText className="h-4 w-4 mr-1.5" />
                Quote
              </TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-yellow-500/30 bg-slate-700/80 text-yellow-200 border border-slate-600 data-[state=active]:border-yellow-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <Star className="h-4 w-4 mr-1.5" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="booking" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 bg-slate-700/80 text-emerald-200 border border-slate-600 data-[state=active]:border-emerald-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <Anchor className="h-4 w-4 mr-1.5" />
                Book Now
              </TabsTrigger>
              <TabsTrigger value="photos" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/30 bg-slate-700/80 text-sky-200 border border-slate-600 data-[state=active]:border-sky-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <Camera className="h-4 w-4 mr-1.5" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 bg-slate-700/80 text-amber-200 border border-slate-600 data-[state=active]:border-amber-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <DollarSign className="h-4 w-4 mr-1.5" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="transportation" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/30 bg-slate-700/80 text-sky-200 border border-slate-600 data-[state=active]:border-sky-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <Car className="h-4 w-4 mr-1.5" />
                Transport
              </TabsTrigger>
              <TabsTrigger value="alcohol" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 bg-slate-700/80 text-purple-200 border border-slate-600 data-[state=active]:border-purple-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <Wine className="h-4 w-4 mr-1.5" />
                Concierge
              </TabsTrigger>
              <TabsTrigger value="map" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/30 bg-slate-700/80 text-sky-200 border border-slate-600 data-[state=active]:border-sky-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <Compass className="h-4 w-4 mr-1.5" />
                Map & Rules
              </TabsTrigger>
              <TabsTrigger value="call" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 bg-slate-700/80 text-orange-200 border border-slate-600 data-[state=active]:border-orange-400 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-bold transition-all">
                <CalendarCheck className="h-4 w-4 mr-1.5" />
                Book a Call
              </TabsTrigger>
            </TabsList>

            {/* Quote Builder Tab */}
            <TabsContent value="quote">
              <Card className="bg-slate-800/70 border-sky-500/20 text-white overflow-hidden">
                <CardHeader className="px-2 sm:px-6 py-3">
                  <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Your Personalized Quote <span className="text-slate-400 font-normal text-sm">— Review your options and customize your cruise experience</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <iframe
                    ref={quoteIframeRef}
                    src={quoteEmbedUrl}
                    title="Quote Builder"
                    className="w-full border-none overflow-hidden"
                    style={{ minHeight: '600px' }}
                    scrolling="no"
                    allow="payment; clipboard-write"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card className="bg-slate-800/70 border-yellow-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-yellow-300 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    {isDiscoEligiblePartyType(lead.party_type) ? 'Bach Cruise Reviews' : 'Private Cruise Reviews'}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    We've had over 200,000 happy customers. Scroll through below to see how many people have had a blast!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="senja-embed"
                    data-id={isDiscoEligiblePartyType(lead.party_type) ? "44902d45-5982-4bea-8014-fa5de08c5b1a" : "48b63026-6e70-4e50-8bc0-b565344099de"}
                    data-mode="shadow"
                    data-lazyload="false"
                    style={{ display: 'block', width: '100%' }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Book Now Tab (Xola Widget) */}
            <TabsContent value="booking">
              <XolaBookingWidget leadId={lead.id} quoteNumber={lead.quote_number || undefined} />
            </TabsContent>

             {/* Photos Tab */}
            <TabsContent value="photos">
              <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    {isDiscoEligiblePartyType(lead.party_type) ? 'Bach Party Gallery' : 'Our Boats & Experience'}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {isDiscoEligiblePartyType(lead.party_type) 
                      ? 'Browse photos by experience type and boat size'
                      : 'Photos of our fleet and the cruise experience'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isDiscoEligiblePartyType(lead.party_type) ? (
                    <div className="space-y-6">
                      {/* YouTube Videos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-center text-white font-bold text-base sm:text-lg mb-2 underline">ATX Disco Cruise Highlight Reel</h3>
                          <div className="aspect-video rounded-lg overflow-hidden">
                            <iframe
                              src="https://www.youtube.com/embed/USWZ3BrexEI?autoplay=1&mute=1"
                              title="ATX Disco Cruise Highlight Reel"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-center text-white font-bold text-base sm:text-lg mb-2 underline">A Video Letter from the Owner</h3>
                          <div className="aspect-video rounded-lg overflow-hidden">
                            <iframe
                              src="https://www.youtube.com/embed/iFlLA8uh9Yg"
                              title="A Video Letter from the Owner"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      </div>
                      <BachPhotoGallery openLightbox={openLightbox} />
                    </div>
                  ) : (
                    <>
                      {/* Highlight Video for non-bach leads */}
                      <div className="rounded-xl overflow-hidden border border-sky-500/20 aspect-video w-full mb-6">
                        <video
                          src="/videos/PPC_Non-Bach_Compilation.mp4"
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {Object.entries(boatPhotos).map(([name, photos]) => (
                        <div key={name} className="mb-6">
                          <h3 className="text-sm font-semibold text-sky-300 mb-3 uppercase tracking-wider">{name}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {photos.map((photo, idx) => (
                              <img
                                key={`${name}-${idx}`}
                                src={photo}
                                alt={`${name} photo ${idx + 1}`}
                                className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full"
                                onClick={() => openLightbox(photos, idx)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                      <div>
                        <h3 className="text-sm font-semibold text-sky-300 mb-3 uppercase tracking-wider">Experience Photos</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {experiencePhotos.map((photo, idx) => (
                            <img
                              key={`exp-${idx}`}
                              src={photo}
                              alt={`Cruise experience ${idx + 1}`}
                              className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full"
                              onClick={() => openLightbox(experiencePhotos, idx)}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing & Details Tab */}
            <TabsContent value="pricing">
              <PricingDetailsTab partyType={quotePartyType || lead.party_type} guestCount={quoteGuestCount || lead.guest_count} />
            </TabsContent>

            <TabsContent value="transportation">
              <TransportTabContent openExternalLink={openExternalLink} openLightbox={openLightbox} guestCount={lead.guest_count} partyType={lead.party_type} isBooked={false} defaultDestination="13993 FM 2769, Leander, TX 78641" customerName={`${lead.first_name} ${lead.last_name}`} customerEmail={lead.email} customerPhone={lead.phone} />
            </TabsContent>

            {/* Alcohol Delivery & Concierge Tab */}
            <TabsContent value="alcohol">
              <div className="space-y-4">
                {/* Cocktail Kits Hero Image */}
                <a href="https://partyondelivery.com/partners/premier" target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-purple-500/20">
                  <img src={cocktailKitsHero} alt="Lake-Ready Cocktail Kits & Bar Setups" className="w-full h-auto" />
                </a>

                {/* Recommendations for Group */}
                <Card className="bg-slate-800/70 border-purple-500/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-300 flex items-center gap-2">
                      <Wine className="h-5 w-5" />
                      Recommendations for Your Group
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-slate-300 text-lg leading-relaxed space-y-3">
                    <p>
                      For your group of <strong className="text-white">{lead.guest_count}</strong>, we'd highly recommend you take advantage of our official delivery partner, <strong className="text-purple-300">Party On Delivery</strong>, to get drinks delivered directly to the boat so you'll have your drinks on ice when you show up.
                    </p>
                    <p>
                      If you're coming from out of town, Party On Delivery will also stock up your Airbnb for the weekend — <strong className="text-white">free delivery with a $300 minimum order</strong>.
                    </p>
                    <p>
                      Party On Delivery has everything listed below to make your weekend seamless. The owner of Premier Party Cruises, Brian, started Party On Delivery specifically to make things easier for y'all planning your party and planning an amazing weekend.
                    </p>
                    <p className="text-purple-300 font-semibold">
                      🎉 Party on, y'all. See you on the water.
                    </p>
                  </CardContent>
                </Card>

                {/* CTA Button */}
                <div className="w-full rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-amber-500/10 p-4 sm:p-6 flex flex-col items-center gap-3 text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-white">🎉 Ready to Order?</h3>
                  <p className="text-slate-300 text-sm max-w-md">
                    Browse cocktail kits, beer, wine, liquor, and party supplies — delivered straight to your boat or Airbnb.
                  </p>
                  <a
                    href="https://partyondelivery.com/partners/premier"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-lg transition-colors text-lg whitespace-nowrap"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Open Party On Delivery Store
                  </a>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed mt-1">
                    Brian Hill, owner of Premier Party Cruises, started <span className="font-semibold text-slate-300">Party On Delivery</span> to provide delivery and concierge services to our amazing guests. Party On Delivery is the official delivery partner of Premier Party Cruises.
                  </p>
                </div>

                {/* Service Photo Tiles */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                  {[
                    { label: "Pre-Arrival Alcohol Delivery", img: tileSuiteDelivery },
                    { label: "Direct-to-Boat Alcohol Delivery", img: tileBoatDelivery },
                    { label: "Cocktail Bar Setups", img: tileCocktailBar },
                    { label: "Stock the Fridge Service", img: tileStockFridge },
                    { label: "Group Ordering & Split Pay", img: tileGroupOrdering },
                  ].map((tile) => (
                    <div key={tile.label} className="relative rounded-xl overflow-hidden aspect-square">
                      <img src={tile.img} alt={tile.label} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col items-center justify-end p-3">
                        <span className="text-white text-xs sm:text-sm font-bold text-center leading-tight">{tile.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Map & Rules Tab */}
            <TabsContent value="map">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Map & Directions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-slate-300">
                    <div className="rounded-lg overflow-hidden border border-sky-500/20">
                      <iframe
                        src="https://maps.google.com/maps?q=Anderson+Mill+Marina,+Leander,+TX&t=&z=15&ie=UTF8&iwloc=&output=embed"
                        width="100%"
                        height="250"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Anderson Mill Marina Location"
                      />
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-white">Anderson Mill Marina</p>
                      <p>13993 FM 2769</p>
                      <p>Leander, TX 78641</p>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openExternalLink("https://www.google.com/maps/dir/?api=1&destination=Anderson+Mill+Marina,+13993+FM+2769,+Leander,+TX+78641")}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline mt-2 p-0 h-auto"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Get Directions
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Boat Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-slate-300">
                    <ul className="text-sm space-y-2.5">
                      <li className="flex gap-2">
                        <span className="text-emerald-400">✅</span>
                        <span>BYOB — Bring your own beverages (no glass containers)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400">✅</span>
                        <span>Non-marking shoes recommended (no black-soled shoes)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400">✅</span>
                        <span>Arrive {isDiscoEligiblePartyType(lead.party_type) ? '25' : '15'} minutes before departure</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400">✅</span>
                        <span>Sunscreen, hats, and sunglasses recommended</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400">✅</span>
                        <span>Be nice, be respectful, be safe, have fun, drink water.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-400">❌</span>
                        <span>No glass bottles or containers</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-400">❌</span>
                        <span>No illegal substances</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-400">❌</span>
                        <span>No smoking on the boat</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-400">❌</span>
                        <span>No jumping off the boat without crew approval</span>
                      </li>
                    </ul>
                    <div className="mt-4 bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
                      <p className="text-xs text-sky-300">The captain has final say on all safety matters. Please follow crew instructions at all times for a safe and fun experience!</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Book a Call Tab */}
            <TabsContent value="call">
              <Card className="bg-slate-800/70 border-orange-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-300 flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5" />
                    Book a Call
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Schedule a call with our team to discuss your cruise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden bg-white">
                    <iframe 
                      src="https://events.premierpartycruises.com/widget/booking/DqPB17NVhUtyO5JBqv2B" 
                      style={{ width: '100%', minHeight: '700px', border: 'none' }}
                      scrolling="yes"
                      title="Book a Call"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-8 pb-8 text-center text-sm text-slate-500">
            <p>Questions? Contact us at <a href="mailto:clientservices@premierpartycruises.com" className="text-sky-400 underline">clientservices@premierpartycruises.com</a></p>
            <p className="mt-1">Or call/text <a href="tel:5124885892" className="text-sky-400 underline">(512) 488-5892</a></p>
            <p className="mt-1">© {new Date().getFullYear()} Premier Party Cruises • Austin, TX</p>
          </div>
        </div>
      </div>

      <Lightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Date Editor Modal */}
      <Dialog open={showDateEditor} onOpenChange={setShowDateEditor}>
        <DialogContent className="bg-slate-800 border-sky-500/30 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sky-300 flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Change Event Date
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={editDate}
              onSelect={setEditDate}
              disabled={(date) => date < new Date()}
              className={cn("p-3 pointer-events-auto bg-slate-700 rounded-lg border border-slate-600 text-white [&_.rdp-day]:text-white [&_.rdp-head_cell]:text-slate-400 [&_.rdp-nav_button]:text-white [&_.rdp-caption]:text-white")}
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setShowDateEditor(false)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold"
              disabled={!editDate || savingField}
              onClick={async () => {
                if (!editDate) return;
                const dateStr = format(editDate, 'yyyy-MM-dd');
                await saveLeadField({ event_date: dateStr });
                setShowDateEditor(false);
              }}
            >
              {savingField ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Count Editor Modal */}
      <Dialog open={showGuestEditor} onOpenChange={setShowGuestEditor}>
        <DialogContent className="bg-slate-800 border-sky-500/30 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sky-300 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Change Guest Count
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="text-center">
              <span className="text-5xl font-bold text-sky-300">{editGuestCount}</span>
              <p className="text-slate-400 text-sm mt-1">guests</p>
            </div>
            <div className="px-6">
              <Slider
                value={[editGuestCount]}
                onValueChange={(v) => setEditGuestCount(v[0])}
                min={1}
                max={75}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-sm font-bold text-sky-400">
                <span>1</span>
                <span>75</span>
              </div>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-center text-sm text-sky-200">
              {editGuestCount <= 14 && "Day Tripper (up to 14 guests)"}
              {editGuestCount > 14 && editGuestCount <= 30 && "Meeseeks / The Irony (15-30 guests)"}
              {editGuestCount > 30 && "Clever Girl (31-75 guests)"}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setShowGuestEditor(false)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold"
              disabled={savingField}
              onClick={async () => {
                await saveLeadField({ guest_count: editGuestCount });
                setShowGuestEditor(false);
              }}
            >
              {savingField ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Guests
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadDashboard;
