import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Badge } from "@/quote-app/components/ui/badge";
import { Separator } from "@/quote-app/components/ui/separator";
import { Lightbox } from "@/quote-app/components/ui/lightbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/quote-app/components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/quote-app/components/ui/collapsible";

import { Progress } from "@/quote-app/components/ui/progress";
import {
  CalendarDays, Clock, Users, Ship, MapPin, FileText,
  Camera, AlertTriangle, Loader2, Anchor,
  Phone, Mail, CheckCircle, Copy, Share2, ExternalLink,
  Shield, Wine, ChevronDown, FileDown, CreditCard, Home, Send, TrendingUp, Minus, Package, Info, RefreshCw, Palette, Inbox as InboxIcon, MessageSquare, Eye, EyeOff } from
"lucide-react";
import { addDays, differenceInDays } from "date-fns";
import { Input } from "@/quote-app/components/ui/input";
import { Checkbox } from "@/quote-app/components/ui/checkbox";
import { Search } from "lucide-react";
import { formatPackageName, formatTimeCSTFull } from "@/quote-app/lib/utils";
import { SEOHead } from "@/quote-app/components/SEOHead";
import { AddOnStore, ConfirmedAddOn } from "@/quote-app/components/customer-dashboard/AddOnStore";
import { parseAddOnsFromNotes, getMatchingAddOnIds, getMatchingAddOnQuantities, parsePartyInfoFromNotes, parsePricingFromNotes, type ParsedAddOn } from "@/quote-app/lib/xolaAddOns";
import { BalancePaymentForm } from "@/quote-app/components/customer-dashboard/BalancePaymentForm";
import { AdminInvoiceDialog } from "@/quote-app/components/customer-dashboard/AdminInvoiceDialog";
import { AdminAddOnEditor } from "@/quote-app/components/customer-dashboard/AdminAddOnEditor";
import { RevenueAnalytics } from "@/quote-app/components/customer-dashboard/RevenueAnalytics";
import { CruisePrep } from "@/quote-app/components/admin/CruisePrep";
import PackageGuideTab from "@/quote-app/components/admin/PackageGuideTab";
import CustomerDirectory from "@/quote-app/components/admin/CustomerDirectory";
import BookingSlotSync from "@/quote-app/components/admin/BookingSlotSync";
import { getAddonDetails, type AddonDetail } from "@/quote-app/lib/addonDetails";
import { isDiscoEligiblePartyType } from "@/quote-app/lib/discoRules";
import { toast } from "sonner";
import DashboardThemeSwitcher, { getThemeClasses, type DashboardTheme } from "@/quote-app/components/customer-dashboard/DashboardThemeSwitcher";
import { DashboardInbox, useUnreadMessageCount } from "@/quote-app/components/customer-dashboard/DashboardInbox";
import { AdminMessagingCenter } from "@/quote-app/components/admin/AdminMessagingCenter";

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

// Alcohol delivery service tiles
import tileSuiteDelivery from "@/quote-app/assets/tiles/suite-delivery.jpg";
import tileBoatDelivery from "@/quote-app/assets/tiles/boat-delivery.jpg";
import tileCocktailBar from "@/quote-app/assets/tiles/cocktail-bar.jpg";
import tileStockFridge from "@/quote-app/assets/tiles/stock-fridge.jpg";
import cocktailKitsHero from "@/quote-app/assets/Lake-Ready_Cocktail_Kits.png";
import tileGroupOrdering from "@/quote-app/assets/tiles/group-ordering.jpg";

const boatPhotos: Record<string, string[]> = {
  "Clever Girl": [cleverGirl1, cleverGirl3, cleverGirl4, cleverGirl6, cleverGirl9],
  "Day Tripper": [dayTripper1, dayTripper2, dayTripper3, dayTripper4],
  "Meeseeks": [meeseeks1, meeseeks2, meeseeks3, meeseeks4, meeseeks5],
  "The Irony": [irony1, irony2, irony3, irony4, irony5, irony6]
};

const experiencePhotos = [discoFun, discoFun27, discoFun28, discoFun29, discoFunBest, groupPic, djPic, discoWigs, unicornPic];

interface BookingData {
  id: string;
  amount: number;
  deposit_amount: number;
  amount_paid: number | null;
  headcount: number;
  party_type: string;
  package_type: string;
  status: string;
  notes: string | null;
  stripe_invoice_id: string | null;
  stripe_invoice_url: string | null;
  alcohol_delivery_url: string | null;
  customer: {name: string;email: string;phone: string | null;};
  time_slot: {
    start_at: string;
    end_at: string;
    boat: {name: string;};
    experience: {title: string;type: string;};
  };
}

/* ─── Confirmation Email Tab Component ─── */
const ConfirmationEmailTab = () => {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const sampleHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
      <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:32px 24px;text-align:center">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold">✅ Waiver Signed!</h1>
        <p style="margin:8px 0 0;color:#93c5fd;font-size:14px">Thank you for signing your waiver, Jane Doe.</p>
      </div>
      <div style="padding:24px">
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Your Cruise</p>
          <p style="margin:0 0 4px;font-size:16px;color:#0f172a;font-weight:bold">Saturday, April 18, 2026</p>
          <p style="margin:0 0 4px;font-size:14px;color:#0369a1">2:00 PM – 6:00 PM</p>
          <p style="margin:0;font-size:14px;color:#334155">Bachelorette Disco Cruise</p>
          <p style="margin:4px 0 0;font-size:13px;color:#7c3aed">Slot: 2:00 PM</p>
        </div>
        <div style="text-align:center;margin-bottom:24px">
          <a href="https://partyondelivery.com/partners/premier" style="display:inline-block;background:#eab308;color:#000000;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px">🍹 Order Your Drinks &amp; Concierge Services</a>
          <p style="margin:8px 0 0;font-size:12px;color:#64748b">Delivered directly to your boat by Party On Delivery</p>
        </div>
        <p style="margin:0 0 12px;font-size:12px;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Next Steps</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px">
              <span style="display:inline-block;width:20px;height:20px;background:#10b981;border-radius:4px;text-align:center;line-height:20px;color:white;font-size:12px">✓</span>
            </td>
            <td style="padding:8px 0;color:#10b981;font-size:14px;text-decoration:line-through">Sign your waiver</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px"><span style="display:inline-block;width:20px;height:20px;border:2px solid #cbd5e1;border-radius:4px"></span></td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px">Order your drinks for the boat<br><a href="https://partyondelivery.com/partners/premier" style="color:#0ea5e9;font-size:12px;text-decoration:none">→ Party On Delivery</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px"><span style="display:inline-block;width:20px;height:20px;border:2px solid #cbd5e1;border-radius:4px"></span></td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px">Read through the cruise rules<br><a href="https://docs.google.com/document/d/1DS9cdYgi4tIEog8U0G1Xg7t13ukX2MnFDyy79__p81k/edit?usp=sharing" style="color:#0ea5e9;font-size:12px;text-decoration:none">→ View Rules</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px"><span style="display:inline-block;width:20px;height:20px;border:2px solid #cbd5e1;border-radius:4px"></span></td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px">Get the transportation discount code<br><a href="https://fetii.com" style="color:#0ea5e9;font-size:12px;text-decoration:none">→ Fetii Rides</a></td>
          </tr>
        </table>
      </div>
      <div style="background:#f8fafc;border-top:1px solid #e4e4e7;padding:16px 24px;text-align:center">
        <p style="margin:0;font-size:12px;color:#94a3b8">Premier Party Cruises • Austin, TX</p>
        <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">See you on the water! 🚤</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-waiver-confirmation", {
        body: {
          signerName: "Test User",
          signerEmail: testEmail.trim(),
          bookingId: "test-preview",
          cruiseDate: "Saturday, April 18, 2026",
          cruiseTime: "2:00 PM – 6:00 PM",
          experienceTitle: "Bachelorette Disco Cruise",
          discoCruiseSlot: "2:00 PM",
          alcoholDeliveryUrl: "https://partyondelivery.com/partners/premier"
        }
      });
      if (error) throw error;
      toast.success(`Test email sent to ${testEmail.trim()}`);
    } catch (err: any) {
      console.error("Failed to send test email:", err);
      toast.error("Failed to send test email. Check edge function logs.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Preview the waiver confirmation email that guests receive after signing.</p>
      
      {/* Send Test Email */}
      <div className="bg-slate-700/50 border border-purple-500/20 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-purple-300">Send a Test Email</p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter email address..."
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500" />
          
          <Button
            onClick={handleSendTest}
            disabled={sending || !testEmail.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0">
            
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Send Test
          </Button>
        </div>
      </div>

      {/* Email Preview */}
      <div className="border border-slate-600/50 rounded-lg overflow-hidden">
        <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600/50 flex items-center gap-2">
          <Mail className="h-4 w-4 text-purple-400" />
          <span className="text-sm text-slate-300 font-medium">Email Preview</span>
        </div>
        <iframe
          srcDoc={sampleHtml}
          title="Confirmation Email Preview"
          className="w-full bg-white"
          style={{ height: 700, border: "none" }} />
        
      </div>
    </div>);

};

/* ─── Confirmation Screen Tab Component ─── */
const ConfirmationScreenTab = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Preview the confirmation screen guests see after signing their waiver.</p>
        <Button
          size="sm"
          className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
          onClick={() => window.open(`${window.location.origin}/waiver?booking=demo-preview&submitted=1`, "_blank")}>
          
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          Open in New Tab
        </Button>
      </div>
      <div className="rounded-lg overflow-hidden border border-slate-600/50">
        <iframe
          src={`${window.location.origin}/waiver?booking=demo-preview&submitted=1`}
          className="w-full border-none"
          style={{ minHeight: '700px' }}
          title="Confirmation Screen Preview" />
        
      </div>
    </div>);

};

const CustomerDashboard = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking") ?? searchParams.get("bookingId");
  const isAdminView = searchParams.get("admin") === "1";
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [waiverCount, setWaiverCount] = useState(0);
  const [waiverSignatures, setWaiverSignatures] = useState<any[]>([]);
  const [waiverListOpen, setWaiverListOpen] = useState(false);
  const [waiverCopied, setWaiverCopied] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [customerPreview, setCustomerPreview] = useState(false);
  const [_addOnTotal, setAddOnTotal] = useState(0);
  const [confirmedAddOns, setConfirmedAddOns] = useState<ConfirmedAddOn[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [adminWaiverCounts, setAdminWaiverCounts] = useState<Record<string, number>>({});
  const [adminPodClicks, setAdminPodClicks] = useState<Record<string, number>>({});
  const [invoiceDialogBooking, setInvoiceDialogBooking] = useState<any>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminSortBy, setAdminSortBy] = useState<"date" | "name" | "recent">("date");
  const [adminSortAsc, setAdminSortAsc] = useState(true);
  const [adminPaymentFilter, setAdminPaymentFilter] = useState<"all" | "balance" | "paid" | "pastdue">("all");
  const [adminExperienceFilter, setAdminExperienceFilter] = useState<"all" | "disco" | "14" | "25" | "50">("all");
  const [adminShowCompleted, setAdminShowCompleted] = useState(false);
  const [editingAlcoholUrl, setEditingAlcoholUrl] = useState("");
  const [savingAlcoholUrl, setSavingAlcoholUrl] = useState(false);
  const [activeTab, setActiveTab] = useState("reservation");
  const [showStaysTab, setShowStaysTab] = useState(false);
  const [showPhotosTab, setShowPhotosTab] = useState(false);
  const [addOnEditorOpen, setAddOnEditorOpen] = useState(false);
  const [addonDetailOpen, setAddonDetailOpen] = useState<AddonDetail | null>(null);
  const [dashboardTheme, setDashboardTheme] = useState<DashboardTheme>("classic-navy");
  
  const unreadMessageCount = useUnreadMessageCount(bookingId || (booking?.id !== "demo-preview" ? booking?.id : null) || null);

  // Fetch tab visibility settings
  useEffect(() => {
    supabase.
    from('app_settings').
    select('key, value').
    in('key', ['show_places_to_stay_tab', 'show_photos_tab']).
    then(({ data }) => {
      (data || []).forEach((s) => {
        if (s.key === 'show_places_to_stay_tab') setShowStaysTab(s.value === 'true');
        if (s.key === 'show_photos_tab') setShowPhotosTab(s.value === 'true');
      });
    });
  }, []);
  const DEMO_BOOKING: BookingData = {
    id: "demo-preview",
    amount: 2500,
    deposit_amount: 500,
    amount_paid: 500,
    headcount: 12,
    party_type: "bachelorette",
    package_type: "disco_queen",
    status: "confirmed",
    notes: null,
    stripe_invoice_id: null,
    stripe_invoice_url: null,
    alcohol_delivery_url: null,
    customer: { name: "Brian Hill", email: "brian@example.com", phone: "(512) 555-1234" },
    time_slot: {
      start_at: "2026-04-18T19:00:00Z",
      end_at: "2026-04-18T22:00:00Z",
      boat: { name: "Clever Girl" },
      experience: { title: "Bachelorette Disco Cruise", type: "disco" }
    }
  };

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        // No booking ID — use demo data so the page renders for design work
        setBooking(DEMO_BOOKING);
        setLoading(false);
        return;
      }

      try {
        let data: any = null;
        let fetchError: any = null;

        // Try via supabase.functions.invoke first
        const invokeResult = await supabase.functions.invoke("list-bookings", {
          body: { bookingId }
        });
        data = invokeResult.data;
        fetchError = invokeResult.error;

        // Fallback: if invoke fails (often due to a stale auth session attaching a bad JWT),
        // call the function directly with just the anon key.
        if (fetchError || !data?.bookings) {
          console.warn("invoke failed, falling back to direct fetch:", fetchError);
          const SUPABASE_URL = "https://tgambsdjfwgoohkqopns.supabase.co";
          const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYW1ic2RqZndnb29oa3FvcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDYzMDUsImV4cCI6MjA3NDkyMjMwNX0.xRGHgSXJsMkxO5KV-Uh7TvLPGd8MnbYrBdKi-QNUMh4";
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/list-bookings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": ANON_KEY,
              "Authorization": `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({ bookingId }),
          });
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
          }
          data = await resp.json();
        }

        const found = data?.bookings?.[0];
        if (!found) {
          setError("Booking not found.");
          setLoading(false);
          return;
        }

        setBooking({
          id: found.id,
          amount: found.amount,
          deposit_amount: found.deposit_amount,
          amount_paid: found.amount_paid,
          headcount: found.headcount,
          party_type: found.party_type,
          package_type: found.package_type,
          status: found.status,
          notes: found.notes,
          stripe_invoice_id: found.stripe_invoice_id || null,
          stripe_invoice_url: found.stripe_invoice_url || null,
          alcohol_delivery_url: found.alcohol_delivery_url || null,
          customer: {
            name: found.customer?.name || "Guest",
            email: found.customer?.email || "",
            phone: found.customer?.phone || null
          },
          time_slot: {
            start_at: found.time_slot?.start_at || "",
            end_at: found.time_slot?.end_at || "",
            boat: { name: found.time_slot?.boat?.name || "TBD" },
            experience: {
              title: found.time_slot?.experience?.title || "Cruise",
              type: found.time_slot?.experience?.type || ""
            }
          }
        });
      } catch (err: any) {
        console.error("Failed to fetch booking:", err);
        setError(`Failed to load booking details: ${err?.message || "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  // Initialize alcohol URL editor when booking loads
  useEffect(() => {
    if (booking) {
      setEditingAlcoholUrl(booking.alcohol_delivery_url || "");
    }
  }, [booking]);

  // Fetch waiver signatures
  useEffect(() => {
    if (!booking) return;
    const fetchWaivers = async () => {
      const { data, count } = await supabase.
      from("waiver_signatures").
      select("*", { count: "exact" }).
      eq("booking_id", booking.id).
      order("signed_at", { ascending: true });
      setWaiverCount(count || 0);
      setWaiverSignatures(data || []);
    };
    fetchWaivers();
  }, [booking]);

  // Fetch all bookings for admin panel
  const fetchAllBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("list-bookings", {
        body: {}
      });
      if (!fetchError && data?.bookings) {
        setAllBookings(data.bookings);

        // Fetch waiver counts for all bookings
        const bookingIds = data.bookings.map((b: any) => b.id);
        if (bookingIds.length > 0) {
          const { data: waiverData } = await supabase.
          from("waiver_signatures").
          select("booking_id").
          in("booking_id", bookingIds);

          const counts: Record<string, number> = {};
          (waiverData || []).forEach((w: any) => {
            counts[w.booking_id] = (counts[w.booking_id] || 0) + 1;
          });
          setAdminWaiverCounts(counts);
        }

        // Fetch POD click counts from engagement_events
        if (bookingIds.length > 0) {
          const { data: podData } = await supabase.
          from("engagement_events").
          select("event_data").
          eq("event_type", "pod_store_clicked");

          const podCounts: Record<string, number> = {};
          (podData || []).forEach((e: any) => {
            const bId = e.event_data?.booking_id;
            if (bId && bookingIds.includes(bId)) {
              podCounts[bId] = (podCounts[bId] || 0) + 1;
            }
          });
          setAdminPodClicks(podCounts);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bookings for admin:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (!showAdmin) return;
    fetchAllBookings();
  }, [showAdmin]);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400 mx-auto" />
          <p className="text-sky-200 text-lg">Loading your reservation...</p>
        </div>
      </div>);

  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/80 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 text-lg">{error || "Booking not found."}</p>
          </CardContent>
        </Card>
      </div>);

  }

  const eventDate = new Date(booking.time_slot.start_at);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago"
  });
  const startTime = formatTimeCSTFull(booking.time_slot.start_at);
  const endTime = formatTimeCSTFull(booking.time_slot.end_at);
  const boatName = booking.time_slot.boat.name;
  const currentBoatPhotos = boatPhotos[boatName] || [];
  const experienceType = booking.time_slot.experience.type;

  // Calculate balance due date: 2 weeks before event
  const balanceDueDate = addDays(eventDate, -14);
  const formattedDueDate = balanceDueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago"
  });
  // Parse Xola add-ons from booking notes — ONLY show what's actually in the Xola booking data
  const xolaAddOnsRaw = parseAddOnsFromNotes(booking.notes);

  // Items to NEVER display as add-ons (informational/covered elsewhere)
  const HIDDEN_ADDON_PATTERNS = [
  /alcohol\s*delivery/i,
  /super\s*sparkle?\s*(package\s*inclusions|disco\s*package)/i,
  /concierge\s*delivery\s*service/i];


  // Filter out hidden add-ons only — NO auto-injection of universal perks
  const isHiddenAddon = (name: string) => HIDDEN_ADDON_PATTERNS.some((p) => p.test(name));
  const xolaAddOns = xolaAddOnsRaw.filter((a) => !isHiddenAddon(a.name));

  const existingAddOnIds = getMatchingAddOnIds(xolaAddOns);
  const existingAddOnQuantities = getMatchingAddOnQuantities(xolaAddOns);

  // Map confirmed add-on names to store IDs
  const confirmedAddOnQuantities = confirmedAddOns.map((ca) => {
    const NAME_TO_ID: Record<string, string> = {
      "combined bride/groom sparkle package": "combined-sparkle",
      "bride sparkle package": "bride-sparkle",
      "groom sparkle package": "groom-sparkle",
      "mimosa party cooler": "mimosa-cooler",
      "5 disco ball cups": "disco-ball-cups-5",
      "ultimate disco package + pre-party setup (50 people)": "ultimate-50",
      "essentials package + pre-party setup (50 people)": "essentials-50",
      "additional 1 to 25 guests": "additional-25-guests",
      "professional photographer": "photographer",
      "professional dj": "dj",
      "bartender": "bartender",
      "party-cooler setup": "party-cooler-setup",
      "lily pad float": "lily-pad",
      "5 premier koozies": "premier-koozies",
      "personal unicorn float": "unicorn-float",
      "20-lb bags of ice": "ice-bags",
      "bubble wands": "bubble-wands"
    };
    const id = NAME_TO_ID[ca.name.toLowerCase()];
    return id ? { id, quantity: ca.quantity } : null;
  }).filter((item): item is {id: string;quantity: number;} => !!item);

  const allExistingQuantities = [...existingAddOnQuantities, ...confirmedAddOnQuantities];
  const allExistingIds = [...new Set([...existingAddOnIds, ...confirmedAddOnQuantities.map((q) => q.id)])];

  const partyInfo = parsePartyInfoFromNotes(booking.notes);

  // Parse pricing data from notes (ticket_price, discount_amount)
  const pricingData = parsePricingFromNotes(booking.notes);

  // Parse balance payments from notes
  const balancePayments: {date: string;amount: number;}[] = [];
  if (booking.notes) {
    const paymentRegex = /\[Balance Payment (\d{4}-\d{2}-\d{2})\]: \$(\d+\.?\d*)/g;
    let match;
    while ((match = paymentRegex.exec(booking.notes)) !== null) {
      const paymentDate = new Date(match[1] + 'T12:00:00');
      balancePayments.push({
        date: paymentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        amount: parseFloat(match[2])
      });
    }
  }
  const _totalBalancePayments = balancePayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate add-on totals
  // xolaAddOnTotal = add-ons already baked into booking.amount by edge function
  const xolaAddOnTotal = xolaAddOns.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0);
  // newAddOnTotal = add-ons confirmed in this session (not yet in booking.amount)
  const newAddOnTotal = confirmedAddOns.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0);

  // The base cruise cost WITHOUT add-ons already included in booking.amount
  const _cruiseBaseAmount = booking.amount - xolaAddOnTotal;

  // Use real ticket price from Xola if available, otherwise reverse-engineer
  const hasRealPricing = pricingData.ticketPrice > 0;
  const isDisco = experienceType === 'disco_cruise' || experienceType === 'disco';

  // Separate paid vs free Xola add-ons
  const paidXolaAddOns = xolaAddOns.filter((a) => a.unitPrice > 0);
  const _freeXolaAddOns = xolaAddOns.filter((a) => a.unitPrice === 0);
  const paidAddOnTotal = paidXolaAddOns.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0);

  let ticketSubtotal: number; // ticket-only subtotal (before add-ons)
  let rawSubtotal: number; // tickets + paid add-ons
  let discountAmount: number;
  let discountedSubtotal: number;
  let taxGratFees: number; // back-calculated from authoritative total
  let estimatedGratuity: number;
  let estimatedTax: number;
  let estimatedXolaFee: number;
  let canItemizeFees: boolean;
  let perPersonPrice: number;

  if (hasRealPricing) {
    // For disco cruises: ticketPrice is per-person, multiply by headcount
    // For private cruises: ticketPrice is the flat cruise rate (total base)
    if (isDisco) {
      perPersonPrice = pricingData.ticketPrice;
      const effectiveTicketCount = pricingData.ticketCount > 0 ? pricingData.ticketCount : booking.headcount;
      ticketSubtotal = perPersonPrice * effectiveTicketCount;
    } else {
      ticketSubtotal = pricingData.ticketPrice;
      perPersonPrice = booking.headcount > 0 ? ticketSubtotal / booking.headcount : 0;
    }
    rawSubtotal = ticketSubtotal + paidAddOnTotal;
    discountAmount = pricingData.discountAmount;
    discountedSubtotal = rawSubtotal - discountAmount;

    // Back-calculate tax+tip+fee from authoritative booking.amount
    // This GUARANTEES the breakdown sums to the correct total
    taxGratFees = booking.amount - discountedSubtotal;

    // Use EXACT values from Xola when available (stored in notes by webhook)
    const hasExactFees = pricingData.tax > 0 || pricingData.gratuity > 0 || pricingData.serviceFee > 0;

    if (hasExactFees) {
      // Direct from Xola — no estimation, no formulas
      estimatedTax = pricingData.tax;
      estimatedGratuity = pricingData.gratuity;
      estimatedXolaFee = pricingData.serviceFee;
      canItemizeFees = true;
    } else {
      // No exact values stored — show combined to guarantee correct total
      estimatedTax = 0;
      estimatedGratuity = 0;
      estimatedXolaFee = 0;
      canItemizeFees = false;
    }
  } else {
    // Fallback: reverse-engineer from grand total
    ticketSubtotal = booking.amount / 1.3185;
    rawSubtotal = ticketSubtotal;
    discountedSubtotal = ticketSubtotal;
    discountAmount = 0;
    taxGratFees = booking.amount - discountedSubtotal;
    estimatedGratuity = ticketSubtotal * 0.20;
    estimatedTax = ticketSubtotal * 0.0825;
    estimatedXolaFee = taxGratFees - estimatedTax - estimatedGratuity;
    canItemizeFees = false;
    perPersonPrice = booking.headcount > 0 ? booking.amount / booking.headcount : 0;
  }

  // Keep estimatedSubtotal as alias for backward compat in display
  const estimatedSubtotal = ticketSubtotal;

  // booking.amount from Xola is the AUTHORITATIVE grand total
  const grandTotal = booking.amount + newAddOnTotal;

  // Total amount paid = amount_paid (tracks all payments & refunds), fallback to deposit_amount
  const totalAmountPaid = booking.amount_paid ?? booking.deposit_amount;

  // Remaining balance
  const remainingBalance = grandTotal - totalAmountPaid;

  const tc = getThemeClasses(dashboardTheme);

  return (
    <>
      <SEOHead
        title={`${booking.customer.name}'s Cruise Details - Premier Party Cruises`}
        description="Your Premier Party Cruises reservation hub" />
      

      <div className={`min-h-screen transition-colors duration-300 ${tc.page} ${tc.font}`}>
        {/* Header */}
        <div className={`${tc.header} backdrop-blur-sm transition-colors duration-300`}>
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-3 flex items-center gap-2 sm:gap-4">
            <img src={ppcLogo} alt="Premier Party Cruises" className={`${tc.logoSize} rounded-full transition-all duration-300`} />
            <h1 className={`text-sm sm:text-xl font-bold flex-1 ${tc.headerTitle} ${tc.font}`}>Premier Party Cruises <span className={`font-normal text-xs sm:text-sm ${tc.headerSubtitle}`}>Dashboard</span></h1>
            {!bookingId && !customerPreview &&
            <Button
              size="sm"
              className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
              onClick={() => setShowAdmin(!showAdmin)}>
              
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Button>
            }
            {!window.location.hostname.includes('premierpartycruises.com') && !customerPreview &&
            <a
              href={`https://booking.premierpartycruises.com/customer-dashboard${window.location.search}`}
              target="_blank"
              rel="noopener noreferrer">
              
                <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Live
                </Button>
              </a>
            }
            {/* Customer Preview Toggle - top left */}
            {isAdminView && bookingId && (
              <button
                onClick={() => setCustomerPreview(!customerPreview)}
                className={`p-2 rounded-lg transition-colors ${customerPreview ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/50 text-slate-400 hover:text-white"}`}
                title={customerPreview ? "Exit customer preview" : "Preview as customer"}
              >
                {customerPreview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            )}
            {/* Mailbox notification icon */}
            {bookingId && (
              <button
                onClick={() => setActiveTab("inbox")}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Messages"
              >
                <InboxIcon className={`h-10 w-10 ${unreadMessageCount > 0 ? "text-yellow-400 animate-bounce" : "text-slate-400"}`} />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
            )}
            <Badge className={`${tc.badge} text-xs`}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Confirmed
            </Badge>
          </div>
        </div>

        {/* Admin Panel */}
        {showAdmin && !customerPreview &&
        <div className="max-w-7xl mx-auto px-4 pt-4">
            <Card className="bg-slate-800/70 border-amber-500/30 text-white">
              <CardHeader>
                <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button className="text-[10px] uppercase tracking-widest text-amber-300/50 hover:text-amber-300 transition-colors mb-2 flex items-center gap-1">
                      <Palette className="h-3 w-3" /> Theme
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <DashboardThemeSwitcher value={dashboardTheme} onChange={setDashboardTheme} />
                  </CollapsibleContent>
                </Collapsible>
                <Tabs defaultValue="bookings" className="w-full">
                  <TabsList className="bg-slate-700/50 border border-slate-600/50 mb-4 w-full grid grid-cols-4 sm:grid-cols-10">
                    <TabsTrigger value="bookings" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      Customer<br className="sm:hidden" />{' '}Dashboards
                    </TabsTrigger>
                    <TabsTrigger value="cruise-prep" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      <Package className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                      Cruise<br className="sm:hidden" />{' '}Prep
                    </TabsTrigger>
                    <TabsTrigger value="package-guide" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      <Package className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                      Package<br className="sm:hidden" />{' '}Guide
                    </TabsTrigger>
                    <TabsTrigger value="waiver-template" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      Waiver<br className="sm:hidden" />{' '}Template
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      <TrendingUp className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                      Analytics
                    </TabsTrigger>
                    <TabsTrigger value="confirmation-email" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      <Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                      Confirm<br className="sm:hidden" />{' '}Email
                    </TabsTrigger>
                    <TabsTrigger value="confirmation-screen" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      Confirm<br className="sm:hidden" />{' '}Screen
                    </TabsTrigger>
                    <TabsTrigger value="customer-directory" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      <Search className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                      Customer<br className="sm:hidden" />{' '}Directory
                    </TabsTrigger>
                    <TabsTrigger value="slot-sync" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      <RefreshCw className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                      Sync w/<br className="sm:hidden" />{' '}Quote
                    </TabsTrigger>
                    <TabsTrigger value="messaging" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300 text-slate-400 text-xs px-2 py-2 leading-tight text-center">
                      <MessageSquare className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                      Messaging<br className="sm:hidden" />{' '}Center
                    </TabsTrigger>
                  </TabsList>

                  {/* Bookings Tab */}
                  <TabsContent value="bookings">
                    <p className="text-slate-400 text-sm mb-3">All bookings with customer dashboards</p>
                    
                    {/* Search & Filters */}
                    <div className="space-y-3 mb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                          placeholder="Search by name..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="pl-9 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500" />
                        
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Sort:</span>
                          <Button
                          size="sm"
                          variant={adminSortBy === "recent" ? "default" : "outline"}
                          className={adminSortBy === "recent" ? "bg-sky-600 text-white hover:bg-sky-500" : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"}
                          onClick={() => {
                            if (adminSortBy === "recent") {
                              setAdminSortAsc(!adminSortAsc);
                            } else {
                              setAdminSortBy("recent");
                              setAdminSortAsc(false);
                            }
                          }}>
                          
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Recent {adminSortBy === "recent" ? adminSortAsc ? "↑" : "↓" : ""}
                          </Button>
                          <Button
                          size="sm"
                          variant={adminSortBy === "date" ? "default" : "outline"}
                          className={adminSortBy === "date" ? "bg-sky-600 text-white hover:bg-sky-500" : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"}
                          onClick={() => {
                            if (adminSortBy === "date") {
                              setAdminSortAsc(!adminSortAsc);
                            } else {
                              setAdminSortBy("date");
                              setAdminSortAsc(true);
                            }
                          }}>
                          
                            <CalendarDays className="h-3.5 w-3.5 mr-1" />
                            Date {adminSortBy === "date" ? adminSortAsc ? "↑" : "↓" : ""}
                          </Button>
                          <Button
                          size="sm"
                          variant={adminSortBy === "name" ? "default" : "outline"}
                          className={adminSortBy === "name" ? "bg-sky-600 text-white hover:bg-sky-500" : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"}
                          onClick={() => {
                            if (adminSortBy === "name") {
                              setAdminSortAsc(!adminSortAsc);
                            } else {
                              setAdminSortBy("name");
                              setAdminSortAsc(true);
                            }
                          }}>
                          
                            <Users className="h-3.5 w-3.5 mr-1" />
                            Name {adminSortBy === "name" ? adminSortAsc ? "A→Z" : "Z→A" : ""}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Payment:</span>
                          {(["all", "balance", "paid", "pastdue"] as const).map((f) =>
                        <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox
                            checked={adminPaymentFilter === f}
                            onCheckedChange={() => setAdminPaymentFilter(f)}
                            className="border-slate-500 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500" />
                          
                              <span className={`text-xs capitalize ${f === "pastdue" ? "text-red-300 font-semibold" : "text-slate-300"}`}>
                                {f === "balance" ? "Balance Due" : f === "paid" ? "Paid in Full" : f === "pastdue" ? "Past Due" : "All"}
                              </span>
                            </label>
                        )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Experience:</span>
                          {(["all", "disco", "14", "25", "50"] as const).map((f) =>
                        <Button
                          key={f}
                          size="sm"
                          variant={adminExperienceFilter === f ? "default" : "outline"}
                          className={`text-xs h-7 px-2 ${adminExperienceFilter === f ? "bg-sky-600 text-white hover:bg-sky-500" : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"}`}
                          onClick={() => setAdminExperienceFilter(f)}>
                          
                              {f === "all" ? "All" : f === "disco" ? "Disco" : `${f}p`}
                            </Button>
                        )}
                          <span className="text-slate-600 mx-1">|</span>
                          <Button
                          size="sm"
                          variant={adminShowCompleted ? "default" : "outline"}
                          className={`text-xs h-7 px-2 ${adminShowCompleted ? "bg-slate-600 text-white hover:bg-slate-500" : "bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white"}`}
                          onClick={() => setAdminShowCompleted(!adminShowCompleted)}>
                          
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed Events
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {loadingBookings &&
                    <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-sky-400 mx-auto" />
                          <p className="text-slate-400 text-sm mt-2">Loading bookings...</p>
                        </div>
                    }
                      {!loadingBookings && allBookings.length === 0 &&
                    <p className="text-xs text-slate-500 text-center py-4">No bookings found.</p>
                    }
                      {!loadingBookings && allBookings.
                    filter((b: any) => {
                      // Search filter
                      if (adminSearchQuery) {
                        const name = (b.customer?.name || "").toLowerCase();
                        const query = adminSearchQuery.toLowerCase();
                        if (!name.includes(query)) return false;
                      }
                      // Completed / Upcoming filter
                      const bStart = b.time_slot?.start_at ? new Date(b.time_slot.start_at) : null;
                      const now = new Date();
                      if (bStart) {
                        const isPast = bStart < now;
                        if (adminShowCompleted && !isPast) return false;
                        if (!adminShowCompleted && isPast) return false;
                      }
                      // Payment filter
                      const totalPrice = b.amount || 0;
                      const amountPaid = b.amount_paid || b.deposit_amount || 0;
                      const bal = totalPrice - amountPaid;
                      if (adminPaymentFilter === "balance" && bal <= 0) return false;
                      if (adminPaymentFilter === "paid" && bal > 0) return false;
                      if (adminPaymentFilter === "pastdue") {
                        const bDue = bStart ? addDays(bStart, -14) : null;
                        const daysTilDue = bDue ? differenceInDays(bDue, now) : null;
                        if (bal <= 0 || daysTilDue === null || daysTilDue >= 0) return false;
                      }
                      // Experience filter
                      if (adminExperienceFilter !== "all") {
                        const bIsDisco = b.time_slot?.experience?.type === 'disco_cruise' || b.time_slot?.experience?.type === 'disco';
                        const bBoatName = b.time_slot?.boat?.name || "";
                        const capMap: Record<string, string> = { "Day Tripper": "14", "Meeseeks": "25", "The Irony": "25", "Clever Girl": "50" };
                        if (adminExperienceFilter === "disco" && !bIsDisco) return false;
                        if (["14", "25", "50"].includes(adminExperienceFilter)) {
                          if (bIsDisco) return false;
                          if (capMap[bBoatName] !== adminExperienceFilter) return false;
                        }
                      }
                      return true;
                    }).
                    sort((a: any, b: any) => {
                      const dir = adminSortAsc ? 1 : -1;
                      if (adminSortBy === "name") {
                        const nameA = (a.customer?.name || "").toLowerCase();
                        const nameB = (b.customer?.name || "").toLowerCase();
                        const lastA = nameA.split(" ").slice(-1)[0];
                        const lastB = nameB.split(" ").slice(-1)[0];
                        return lastA.localeCompare(lastB) * dir;
                      }
                      if (adminSortBy === "recent") {
                        const createdA = a.created_at || "";
                        const createdB = b.created_at || "";
                        return createdA.localeCompare(createdB) * dir;
                      }
                      const dateA = a.time_slot?.start_at || "";
                      const dateB = b.time_slot?.start_at || "";
                      return dateA.localeCompare(dateB) * dir;
                    }).
                    map((b: any) => {
                      const bStartDate = b.time_slot?.start_at ? new Date(b.time_slot.start_at) : null;
                      const bDateFormatted = bStartDate ?
                      bStartDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" }) :
                      "No date";
                      const bStartTime = bStartDate ? formatTimeCSTFull(b.time_slot.start_at) : "";
                      const bEndDate = bStartDate ? new Date(bStartDate.getTime() + 4 * 60 * 60 * 1000) : null;
                      const bEndTime = bEndDate ? formatTimeCSTFull(bEndDate.toISOString()) : "";

                      // Determine experience label
                      const bIsDisco = b.time_slot?.experience?.type === 'disco_cruise' || b.time_slot?.experience?.type === 'disco';
                      const bBoatName = b.time_slot?.boat?.name || "TBD";
                      const boatCapacityMap: Record<string, number> = {
                        "Day Tripper": 14, "Clever Girl": 50, "Meeseeks": 25, "The Irony": 25
                      };
                      const boatCap = boatCapacityMap[bBoatName] || 0;
                      const experienceLabel = bIsDisco ?
                      "ATX Disco Cruise" :
                      boatCap > 0 ? `${boatCap}-Person Private Cruise` : "Private Cruise";

                      // Waiver totals
                      const waiverTotal = bIsDisco ?
                      b.headcount :
                      boatCap || b.headcount;
                      const waiverSigned = adminWaiverCounts[b.id] || 0;
                      const waiverPercent = waiverTotal > 0 ? Math.min(waiverSigned / waiverTotal * 100, 100) : 0;
                      const podClickCount = adminPodClicks[b.id] || 0;

                      // Financials
                      const totalPrice = b.amount || 0;
                      const amountPaid = b.amount_paid || b.deposit_amount || 0;
                      const balanceRemaining = totalPrice - amountPaid;
                      const balanceDue = bStartDate ? addDays(bStartDate, -14) : null;
                      const balanceDueStr = balanceDue ?
                      balanceDue.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" }) :
                      "";

                      // Payment urgency
                      const now = new Date();
                      const daysUntilDue = balanceDue ? differenceInDays(balanceDue, now) : null;
                      const isPastDue = balanceRemaining > 0 && daysUntilDue !== null && daysUntilDue < 0;
                      const isDueSoon = balanceRemaining > 0 && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

                      // Parse add-ons from notes
                      const bAddOns = parseAddOnsFromNotes(b.notes);

                      return (
                        <div key={b.id} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50 space-y-2">
                            {/* Row 1: Name + Status + Price */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-bold text-base bg-amber-400 text-black px-2 py-0.5 rounded leading-tight">{b.customer?.name || "Guest"}</span>
                                {b.status === 'confirmed' ?
                              <span className="flex flex-col items-center">
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                    <span className="text-[9px] text-emerald-400 leading-none">Confirmed</span>
                                  </span> :

                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                                    {b.status}
                                  </Badge>
                              }
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-emerald-400 font-bold text-sm">${totalPrice.toFixed(0)}</span>
                                {balanceRemaining <= 0 && <span className="text-emerald-400 text-xs">✅</span>}
                                {isPastDue &&
                              <span className="inline-flex items-center gap-0.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded px-1.5 py-0.5 text-[10px] font-bold">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    PAST DUE
                                  </span>
                              }
                                {isDueSoon && !isPastDue &&
                              <span className="inline-flex items-center gap-0.5 bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded px-1.5 py-0.5 text-[10px] font-bold">
                                    {daysUntilDue === 0 ? "Due Today" : `${daysUntilDue}d`}
                                  </span>
                              }
                              </div>
                            </div>

                            {/* Row 2: Experience + Actions */}
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-sky-300 font-medium">{experienceLabel}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                {(b.stripe_invoice_url || b.stripe_invoice_id) && (() => {
                                const hasPublicUrl = !!b.stripe_invoice_url;
                                const handleViewInvoice = async () => {
                                  if (hasPublicUrl) {
                                    window.open(b.stripe_invoice_url, "_blank");
                                    return;
                                  }
                                  toast.info("Finalizing invoice...");
                                  try {
                                    const { data, error } = await supabase.functions.invoke("finalize-invoice", {
                                      body: { bookingId: b.id }
                                    });
                                    if (error || !data?.invoiceUrl) throw new Error(error?.message || "No URL returned");
                                    window.open(data.invoiceUrl, "_blank");
                                  } catch (e: any) {
                                    toast.error("Failed to finalize invoice: " + e.message);
                                  }
                                };
                                return (
                                  <Button
                                    size="sm"
                                    className="bg-slate-600 text-white border border-slate-500 hover:bg-slate-500 font-semibold h-7 text-xs px-2"
                                    onClick={handleViewInvoice}>
                                    
                                      <ExternalLink className="h-3 w-3 mr-0.5" />
                                      {hasPublicUrl ? "Invoice" : "Draft"}
                                    </Button>);

                              })()}
                                <Button
                                size="sm"
                                className="bg-slate-600 text-white border border-slate-500 hover:bg-slate-500 font-semibold h-7 text-xs px-2"
                                onClick={() => {
                                  const url = `${window.location.origin}/customer-dashboard?booking=${b.id}&admin=1`;
                                  window.open(url, "_blank");
                                }}>
                                
                                  <ExternalLink className="h-3 w-3 mr-0.5" />
                                  View
                                </Button>
                              </div>
                            </div>

                            {/* Row 3: Date, Time, Guests — compact */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                              <span className="text-white font-bold">{bDateFormatted}</span>
                              {bStartTime &&
                            <span className="text-sky-200 text-xs flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {bStartTime} – {bEndTime}
                                </span>
                            }
                              <span className="text-white font-semibold text-sm flex items-center gap-0.5">
                                <Users className="h-3.5 w-3.5 text-sky-400" />
                                {(() => {
                                const bPricing = parsePricingFromNotes(b.notes);
                                return bPricing.guests > 0 ? bPricing.guests : b.headcount;
                              })()}
                              </span>
                            </div>

                            {/* Row 3: Add-ons */}
                            {bAddOns.length > 0 &&
                          <div className="flex flex-wrap gap-1.5">
                                {bAddOns.map((addon, idx) =>
                            <Badge key={idx} className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs font-medium">
                                    {addon.name}{addon.unitPrice > 0 ? ` ($${addon.unitPrice})` : ''}
                                  </Badge>
                            )}
                              </div>
                          }
                            
                            {/* Row 4: Waiver Progress Bar + POD Clicks */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Waivers
                                  </span>
                                  <span className={`font-semibold ${waiverSigned >= waiverTotal ? 'text-emerald-400' : 'text-sky-300'}`}>
                                    {waiverSigned} / {waiverTotal}
                                  </span>
                                </div>
                                <Progress
                                value={waiverPercent}
                                className="h-2 bg-slate-600" />
                              
                              </div>
                              <div className="flex flex-col items-center shrink-0 pl-2 border-l border-slate-600">
                                <div className="flex items-center gap-1.5">
                                  {podClickCount > 0 ?
                                <CheckCircle className="h-4 w-4 text-emerald-400" /> :

                                <Wine className="h-4 w-4 text-slate-500" />
                                }
                                  <span className={`text-xs font-semibold ${podClickCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    POD: {podClickCount}x
                                  </span>
                                </div>
                                {podClickCount > 0 &&
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await supabase.
                                  from("engagement_events").
                                  delete().
                                  eq("event_type", "pod_store_clicked").
                                  filter("event_data->>booking_id", "eq", b.id);
                                  setAdminPodClicks((prev) => ({ ...prev, [b.id]: 0 }));
                                }}
                                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors mt-0.5">
                                
                                    reset
                                  </button>
                              }
                              </div>
                            </div>
                          </div>);

                    })}
                    </div>
                  </TabsContent>

                  {/* Package Guide Tab */}
                  <TabsContent value="package-guide">
                    <PackageGuideTab />
                  </TabsContent>

                  {/* Cruise Prep Tab */}
                  <TabsContent value="cruise-prep">
                    <CruisePrep bookings={allBookings} />
                  </TabsContent>

                  {/* Waiver Template Tab */}
                  <TabsContent value="waiver-template">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-400 text-sm">Preview the waiver template as guests will see it.</p>
                        <Button
                        size="sm"
                        className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
                        onClick={() => window.open(`${window.location.origin}/waiver?booking=demo-preview`, "_blank")}>
                        
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open in New Tab
                        </Button>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-slate-600/50 bg-white">
                        <iframe
                        src={`${window.location.origin}/waiver?booking=demo-preview`}
                        className="w-full border-none"
                        style={{ minHeight: '700px' }}
                        title="Waiver Template Preview" />
                      
                      </div>
                    </div>
                  </TabsContent>

                  {/* Analytics Tab */}
                  <TabsContent value="analytics">
                    <RevenueAnalytics bookings={allBookings} />
                  </TabsContent>

                  {/* Confirmation Email Tab */}
                  <TabsContent value="confirmation-email">
                    <ConfirmationEmailTab />
                  </TabsContent>

                  {/* Confirmation Screen Tab */}
                  <TabsContent value="confirmation-screen">
                    <ConfirmationScreenTab />
                  </TabsContent>

                  {/* Customer Directory Tab */}
                  <TabsContent value="customer-directory">
                    <CustomerDirectory bookings={allBookings} />
                  </TabsContent>

                  {/* Sync with Quote Builder Tab */}
                  <TabsContent value="slot-sync">
                    <BookingSlotSync bookings={allBookings} onSyncComplete={fetchAllBookings} />
                  </TabsContent>

                  {/* Messaging Center Tab */}
                  <TabsContent value="messaging">
                    <AdminMessagingCenter />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        }

        {/* Admin Toolbar - Only visible when admin opens individual dashboard */}
        {isAdminView && bookingId && !customerPreview &&
        <div className="max-w-7xl mx-auto px-4 pt-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-400" />
                <span className="text-amber-300 font-bold text-sm uppercase tracking-wider">Admin Tools</span>
                <span className="text-slate-400 text-sm">— {booking.customer.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {booking.amount - (booking.amount_paid || booking.deposit_amount) > 0 &&
              <Button
                size="sm"
                className="bg-emerald-700 text-white border border-emerald-500 hover:bg-emerald-600 font-semibold"
                onClick={() => setInvoiceDialogBooking(booking)}>
                
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send Invoice — ${(booking.amount - (booking.amount_paid || booking.deposit_amount)).toFixed(0)}
                  </Button>
              }
                {booking.stripe_invoice_url || booking.stripe_invoice_id ? (() => {
                const hasPublicUrl = !!booking.stripe_invoice_url;
                const handleViewInvoice = async () => {
                  if (hasPublicUrl) {
                    window.open(booking.stripe_invoice_url, "_blank");
                    return;
                  }
                  toast.info("Finalizing invoice...");
                  try {
                    const { data, error } = await supabase.functions.invoke("finalize-invoice", {
                      body: { bookingId: booking.id }
                    });
                    if (error || !data?.invoiceUrl) throw new Error(error?.message || "No URL returned");
                    window.open(data.invoiceUrl, "_blank");
                  } catch (e: any) {
                    toast.error("Failed to finalize invoice: " + e.message);
                  }
                };
                const invoiceUrl = booking.stripe_invoice_url || "";
                return (
                  <div className="flex gap-2">
                      <Button
                      size="sm"
                      className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
                      onClick={handleViewInvoice}>
                      
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        {hasPublicUrl ? "View Invoice" : "View Draft Invoice"}
                      </Button>
                      {hasPublicUrl &&
                    <Button
                      size="sm"
                      className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
                      onClick={() => {
                        navigator.clipboard.writeText(invoiceUrl);
                        toast.success("Invoice URL copied!");
                      }}>
                      
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy Link
                        </Button>
                    }
                    </div>);

              })() :
              <span className="text-xs text-slate-500">No invoice yet</span>
              }
                <Button
                size="sm"
                className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold"
                onClick={() => {
                  const url = `${window.location.origin}/customer-dashboard?booking=${booking.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Customer dashboard link copied!");
                }}>
                
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy Dashboard Link
                </Button>
                <Button
                size="sm"
                className="bg-sky-700 text-white border border-sky-500 hover:bg-sky-600 font-semibold"
                onClick={() => setAddOnEditorOpen(true)}>
                
                  <Package className="h-3.5 w-3.5 mr-1" />
                  Edit Add-Ons
                </Button>
              </div>
              {/* Alcohol Delivery URL Editor */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-amber-500/20">
                <Wine className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="text-xs text-slate-400 shrink-0">POD Store URL:</span>
                <Input
                value={editingAlcoholUrl}
                onChange={(e) => setEditingAlcoholUrl(e.target.value)}
                placeholder="https://partyondelivery.com/partners/premier"
                className="flex-1 min-w-[200px] h-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500" />
              
                <Button
                size="sm"
                disabled={savingAlcoholUrl}
                className="bg-purple-700 text-white border border-purple-500 hover:bg-purple-600 font-semibold h-8 text-xs"
                onClick={async () => {
                  setSavingAlcoholUrl(true);
                  try {
                    const newUrl = editingAlcoholUrl.trim() || null;
                    const { error } = await supabase.functions.invoke("admin-edit-booking", {
                      body: { bookingId: booking.id, updates: { alcohol_delivery_url: newUrl } }
                    });
                    if (error) throw error;
                    setBooking({ ...booking, alcohol_delivery_url: newUrl });
                    toast.success(newUrl ? "Alcohol delivery URL saved!" : "URL reset to default");
                  } catch (e: any) {
                    toast.error("Failed to save URL: " + e.message);
                  } finally {
                    setSavingAlcoholUrl(false);
                  }
                }}>
                
                  {savingAlcoholUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </div>
        }

        {/* Tabs at top */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1 sm:py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
            <TabsList className={`${tc.tabList} w-full grid grid-cols-4 sm:grid-cols-7 h-auto p-1.5 gap-1.5 rounded-xl transition-colors duration-300`}>
              {(() => {
                const baseTabs: {value: string;label: string;mobileHidden?: boolean;}[] = [
                { value: "reservation", label: "Reservation" },
                { value: "alcohol", label: "Alcohol & Concierge" },
                { value: "transportation", label: "Transport" },
                { value: "waiver", label: "Waiver" },
                { value: "manage", label: "Add-Ons" },
                { value: "map", label: "Map & Rules" },
                { value: "inbox", label: `Messages${unreadMessageCount > 0 ? ` (${unreadMessageCount})` : ''}` }];

                if (showPhotosTab) baseTabs.push({ value: "photos", label: "Photos", mobileHidden: true });
                if (showStaysTab) baseTabs.push({ value: "stays", label: "Places to Stay", mobileHidden: true });
                const allTabs = baseTabs;
                return allTabs.map((tab) =>
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`text-xs sm:text-sm px-2 py-2.5 leading-tight text-center font-semibold rounded-lg transition-all duration-200 hover:scale-[1.03] ${
                  'mobileHidden' in tab && tab.mobileHidden ? 'hidden sm:inline-flex' : ''} ${

                  activeTab === tab.value ?
                  tc.tabActive :
                  tc.tabInactive}`
                  }>
                  
                    {tab.label}
                  </TabsTrigger>
                );
              })()}
            </TabsList>

            {/* Reservation Info Tab */}
            <TabsContent value="reservation">
              {/* Booking Summary Header */}
              <div className={`${tc.summaryBg} rounded-xl p-3 sm:p-5 mb-3 transition-colors duration-300`}>
                <h2 className={`text-xl sm:text-2xl font-bold ${tc.text} ${tc.font} mb-2`}>
                  {booking.customer.name}'s Cruise Details
                </h2>
                <div className={`flex flex-wrap gap-x-4 gap-y-1 ${tc.textMuted} text-xs sm:text-sm`}>
                  <span className="flex items-center gap-1">
                    <CalendarDays className={`h-3.5 w-3.5 ${tc.textAccent}`} />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className={`h-3.5 w-3.5 ${tc.textAccent}`} />
                    {startTime} – {endTime} CST
                  </span>
                  <span className="flex items-center gap-1">
                    <Ship className={`h-3.5 w-3.5 ${tc.textAccent}`} />
                    {booking.time_slot.experience.title}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className={`h-3.5 w-3.5 ${tc.textAccent}`} />
                    {pricingData.guests > 0 ? pricingData.guests : booking.headcount} guests
                  </span>
                </div>

                {/* Pay Invoice / Paid in Full */}
                {remainingBalance > 0 && (() => {
                  const now = new Date();
                  const isBalanceDue = now >= balanceDueDate;
                  const isUrgent = !isBalanceDue && balanceDueDate.getTime() - now.getTime() <= 14 * 24 * 60 * 60 * 1000;
                  return (
                    <div
                      className={`${isBalanceDue ? 'bg-red-500/15 border-red-500/30' : isUrgent ? 'bg-amber-500/15 border-amber-500/30' : 'bg-amber-500/15 border-amber-500/30'} border rounded-lg px-3 py-2 mt-3 cursor-pointer hover:opacity-90 transition-opacity`}
                      onClick={() => {
                        const el = document.getElementById('pay-balance-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className={`text-[10px] uppercase tracking-wider font-semibold ${isBalanceDue ? 'text-red-300/80' : 'text-amber-300/80'}`}>
                            {isBalanceDue ? '⚠️ Balance Past Due' : 'Balance Due'}
                          </p>
                          <p className={`text-lg font-bold ${isBalanceDue ? 'text-red-300' : 'text-amber-300'}`}>${remainingBalance.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400">Due by {formattedDueDate}</p>
                        </div>
                        <Button
                          size="sm"
                          className={`${isBalanceDue ? 'bg-red-500 hover:bg-red-400' : 'bg-yellow-500 hover:bg-yellow-400'} text-black font-semibold px-4 whitespace-nowrap text-xs`}>
                          
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Pay Now
                        </Button>
                      </div>
                      <p className={`text-[10px] mt-1 ${isBalanceDue ? 'text-red-300 font-semibold animate-pulse' : 'text-sky-300/70'}`}>
                        {isBalanceDue ? '⬇ Your balance is due — scroll down to pay now' : '⬇ Scroll down to pay your balance'}
                      </p>
                    </div>);

                })()}
                {remainingBalance <= 0 &&
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-3 py-2 mt-3 text-center">
                    <p className="text-lg font-bold text-emerald-300">Paid in Full ✅</p>
                  </div>
                }
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className={`${tc.card} transition-colors duration-300`}>
                  <CardHeader>
                    <CardTitle className={`text-lg flex items-center gap-2 ${tc.cardTitle}`}>
                      <Anchor className="h-5 w-5" />
                      Booking Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Experience</span>
                      <span className="font-medium">{booking.time_slot.experience.title}</span>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="flex justify-between">
                      <span className="text-slate-400">Boat</span>
                      <span className="font-medium">{boatName}</span>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="flex justify-between">
                      <span className="text-slate-400">Package</span>
                      <span className="font-medium">{formatPackageName(booking.package_type)}</span>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date</span>
                      <span className="font-medium">{formattedDate}</span>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time</span>
                      <span className="font-medium">{startTime} – {endTime} CST</span>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="flex justify-between">
                      <span className="text-slate-400">Guests</span>
                      <span className="font-medium">{pricingData.guests > 0 ? pricingData.guests : booking.headcount}</span>
                    </div>
                    {partyInfo.averageAge &&
                    <>
                        <Separator className="bg-slate-700" />
                        <div className="flex justify-between">
                          <span className="text-slate-400">Average Age</span>
                          <span className="font-medium">{partyInfo.averageAge}</span>
                        </div>
                      </>
                    }
                  </CardContent>
                </Card>


                <Card className={`${tc.card} transition-colors duration-300`}>
                  <CardHeader>
                    <CardTitle className={`text-lg flex items-center gap-2 ${tc.cardTitle}`}>
                      <Users className="h-5 w-5" />
                      Payment Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {/* Per Person / Cruise Rate */}
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isDisco ? 'Per Person' : 'Cruise Rate'}</span>
                      <span className="font-medium">
                        {isDisco ?
                        `$${perPersonPrice.toFixed(2)} × ${pricingData.ticketCount > 0 ? pricingData.ticketCount : pricingData.guests > 0 ? pricingData.guests : booking.headcount} guests` :
                        `$${estimatedSubtotal.toFixed(2)}`
                        }
                      </span>
                    </div>
                    <Separator className="bg-slate-700" />

                    {/* Ticket Subtotal */}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="font-medium">${estimatedSubtotal.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-slate-700" />

                    {/* Paid Add-Ons as line items (like Xola shows them) */}
                    {paidXolaAddOns.map((addon, idx) =>
                    <div key={`paid-addon-${idx}`}>
                        <div className="flex justify-between">
                          <span className="text-slate-300">
                            {addon.name} {addon.quantity > 1 ? `($${addon.unitPrice.toFixed(2)} × ${addon.quantity})` : ''}
                          </span>
                          <span className="font-medium">${(addon.unitPrice * addon.quantity).toFixed(2)}</span>
                        </div>
                        <Separator className="bg-slate-700" />
                      </div>
                    )}

                    {/* Discount items (only when present) */}
                    {discountAmount > 0 && (() => {
                      // Parse individual discount items from "Discounts:" field
                      const discountItems: {label: string;amount: number;}[] = [];
                      const discountsFieldMatch = booking.notes?.match(/Discounts:\s*(.+?)(?:\s*$)/i);
                      if (discountsFieldMatch) {
                        discountsFieldMatch[1].split(",").forEach((raw: string) => {
                          const parts = raw.trim().match(/^(.+?)=(-?[\d.]+)$/);
                          if (parts) {
                            discountItems.push({ label: parts[1].trim(), amount: Math.abs(Number(parts[2])) });
                          }
                        });
                      }
                      // Fallback: single discount with label detection
                      if (discountItems.length === 0) {
                        const discountLabelMatch = booking.notes?.match(/(?:Add-ons?:.*?)(Free\s+(?:Bride|Groom)\s+Ticket)/i);
                        const discountLabel = discountLabelMatch ? discountLabelMatch[1] : "Discount";
                        discountItems.push({ label: discountLabel, amount: discountAmount });
                      }
                      return (
                        <>
                          {discountItems.map((disc, idx) =>
                          <div key={`disc-${idx}`}>
                              <div className="flex justify-between">
                                <span className="text-emerald-400">{disc.label}</span>
                                <span className="font-medium text-emerald-400">−${disc.amount.toFixed(2)}</span>
                              </div>
                              <Separator className="bg-slate-700" />
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-400">Discounted Subtotal</span>
                            <span className="font-medium">${discountedSubtotal.toFixed(2)}</span>
                          </div>
                          <Separator className="bg-slate-700" />
                        </>);

                    })()}

                    {/* Tax, Tip & Fees — itemized when estimates match, combined otherwise */}
                    {canItemizeFees ?
                    <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tip (20%)</span>
                          <span className="font-medium">${estimatedGratuity.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-slate-700" />
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sales Tax (8.25%)</span>
                          <span className="font-medium">${estimatedTax.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-slate-700" />
                        <div className="flex justify-between">
                          <span className="text-slate-400">Service Fee (3%)</span>
                          <span className="font-medium">${estimatedXolaFee.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-slate-700" />
                      </> :

                    <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tax, Tip & Fees</span>
                          <span className="font-medium">${taxGratFees.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-slate-700" />
                      </>
                    }

                    {/* Cruise Total = authoritative booking.amount from Xola */}
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">Cruise Total</span>
                      <span className="text-white">${booking.amount.toFixed(2)}</span>
                    </div>

                    {/* Cruise Add-Ons — all Xola add-ons (paid + free) in one section */}
                    {xolaAddOns.length > 0 &&
                    <>
                        <Separator className="bg-sky-500/30" />
                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold pt-1">Add-Ons for Your Cruise</p>
                        {xolaAddOns.map((addon, idx) => {
                        const detail = getAddonDetails(addon.name);
                        return (
                          <div key={`xola-${idx}`} className="flex justify-between items-center">
                              <span
                              className={`text-slate-300 ${detail ? 'cursor-pointer hover:text-sky-300 underline decoration-dotted underline-offset-2' : ''}`}
                              onClick={() => {if (detail) setAddonDetailOpen(detail);}}>
                              
                                {addon.name} {addon.quantity > 1 ? `×${addon.quantity}` : ""}
                                {detail && <Info className="h-3 w-3 inline ml-1 text-slate-500" />}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sky-300">
                                  {addon.unitPrice === 0 ? "Free" : `$${(addon.unitPrice * addon.quantity).toFixed(2)}`}
                                </span>
                                {isAdminView && !customerPreview &&
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => setAddOnEditorOpen(true)}
                                title="Edit add-ons">
                                
                                    <Minus className="h-3 w-3" />
                                  </Button>
                              }
                              </div>
                            </div>);

                      })}
                      </>
                    }

                    {/* Newly Added Add-Ons (from store) */}
                    {confirmedAddOns.length > 0 &&
                    <>
                        {xolaAddOns.length === 0 && <Separator className="bg-sky-500/30" />}
                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold pt-1">
                          {xolaAddOns.length > 0 ? "Additional Add-Ons" : "Add-Ons"}
                        </p>
                        {confirmedAddOns.map((addon, idx) =>
                      <div key={`new-${idx}`} className="flex justify-between items-center">
                            <span className="text-slate-300">
                              {addon.name} {addon.quantity > 1 ? `×${addon.quantity}` : ""}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sky-300">
                                {addon.unitPrice === 0 ? "Free" : `+$${(addon.unitPrice * addon.quantity).toFixed(2)}`}
                              </span>
                              {isAdminView && !customerPreview &&
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => {
                              setConfirmedAddOns((prev) => prev.filter((_, i) => i !== idx));
                              toast.success(`Removed "${addon.name}" from session add-ons`);
                            }}
                            title="Remove add-on">
                            
                                  <Minus className="h-3 w-3" />
                                </Button>
                          }
                            </div>
                          </div>
                      )}
                      </>
                    }

                    {/* Grand Total with add-ons */}
                    {(xolaAddOns.length > 0 || confirmedAddOns.length > 0) &&
                    <>
                        <Separator className="bg-slate-700" />
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">Grand Total</span>
                          <span className="text-white">${grandTotal.toFixed(2)}</span>
                        </div>
                      </>
                    }

                    <Separator className="bg-emerald-500/30" />

                    {/* Payment Status - show total amount paid (authoritative from DB) */}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Paid</span>
                      <span className="font-medium text-emerald-400">−${totalAmountPaid.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-amber-300">Balance Due</span>
                      <span className="font-medium text-amber-400">${remainingBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Due By</span>
                      <span className="font-medium text-amber-300">{formattedDueDate}</span>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status</span>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                        {booking.status}
                      </Badge>
                    </div>

                    <Separator className="bg-slate-700" />
                    <div className="pt-2 space-y-2">
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Contact Info</p>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-sky-400" />
                        {booking.customer.email}
                      </div>
                      {booking.customer.phone &&
                      <div className="flex items-center gap-2 text-slate-300">
                          <Phone className="h-3.5 w-3.5 text-sky-400" />
                          {booking.customer.phone}
                        </div>
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Pay Balance Button at bottom of reservation */}
              {remainingBalance > 0 &&
              <div id="pay-balance-section" className="mt-6">
                  <BalancePaymentForm
                  bookingId={booking.id}
                  remainingBalance={remainingBalance}
                  balanceDueDate={formattedDueDate}
                  customerEmail={booking.customer.email}
                  customerName={booking.customer.name}
                  onPaymentSuccess={(amountPaid) => {
                    // Refetch booking to get updated amount_paid
                    setBooking((prev) => prev ? {
                      ...prev,
                      amount_paid: (prev.amount_paid ?? prev.deposit_amount) + amountPaid
                    } : prev);
                  }} />
                
                </div>
              }
            </TabsContent>

            {/* Manage Booking / Add-Ons Tab */}
            <TabsContent value="manage">
              <AddOnStore
                bookingId={booking.id}
                experienceType={experienceType}
                customerEmail={booking.customer.email}
                partyType={booking.party_type}
                onTotalChange={setAddOnTotal}
                onAddOnsConfirmed={async (items) => {
                  // Refetch the booking to get updated notes & amount from the edge function
                  try {
                    const { data } = await supabase.functions.invoke("list-bookings", {
                      body: { bookingId: booking.id }
                    });
                    const found = data?.bookings?.[0];
                    if (found) {
                      setBooking({
                        ...booking,
                        amount: found.amount,
                        amount_paid: found.amount_paid,
                        notes: found.notes,
                        stripe_invoice_id: found.stripe_invoice_id || null,
                        stripe_invoice_url: found.stripe_invoice_url || null
                      });
                      // Clear session-only confirmed add-ons since they're now in the booking notes
                      setConfirmedAddOns([]);
                    }
                  } catch (e) {
                    console.error("Failed to refetch booking after add-ons:", e);
                    // Fallback: keep them in session state
                    setConfirmedAddOns((prev) => [...prev, ...items]);
                  }
                }}
                existingAddOnIds={allExistingIds}
                existingAddOnQuantities={allExistingQuantities} />
              
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos">
              <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Your Boat: {boatName}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Photos of your boat and the cruise experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentBoatPhotos.length > 0 &&
                  <div className="mb-6">
                      <h3 className="text-sm font-semibold text-sky-300 mb-3 uppercase tracking-wider">Boat Photos</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {currentBoatPhotos.map((photo, idx) =>
                      <img
                        key={`boat-${idx}`}
                        src={photo}
                        alt={`${boatName} photo ${idx + 1}`}
                        className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full"
                        onClick={() => openLightbox(currentBoatPhotos, idx)} />

                      )}
                      </div>
                    </div>
                  }
                  <div>
                    <h3 className="text-sm font-semibold text-sky-300 mb-3 uppercase tracking-wider">Experience Photos</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {experiencePhotos.map((photo, idx) =>
                      <img
                        key={`exp-${idx}`}
                        src={photo}
                        alt={`Cruise experience ${idx + 1}`}
                        className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full"
                        onClick={() => openLightbox(experiencePhotos, idx)} />

                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Places to Stay Tab */}
            {showStaysTab && <TabsContent value="stays">
              <div className="space-y-4">
                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Inn Cahoots — Austin's Premier Group Stay
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Condo-style hotel suites on East 6th Street, perfect for bach parties. Private kitchens, living rooms & rooftop bars.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                    {
                      name: "The Penthouse Suite",
                      image: "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87b34dc0a249b136548_inn-cahoots.webp",
                      sleeps: "8–10 guests",
                      beds: "3 Bedrooms • 2 Bathrooms",
                      price: "From $450/night",
                      features: "Floor-to-ceiling windows, private living room, full kitchen, downtown skyline views"
                    },
                    {
                      name: "The Loft Suite",
                      image: "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87aaa98c1dc467768e6_bedroom-1.webp",
                      sleeps: "6–8 guests",
                      beds: "2 Bedrooms • 2 Bathrooms",
                      price: "From $350/night",
                      features: "Modern finishes, spacious bedrooms, fully equipped kitchen, open-concept living"
                    },
                    {
                      name: "The Bunk Suite",
                      image: "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87a1786b90b4c154a39_bedroom.jpg",
                      sleeps: "10–14 guests",
                      beds: "4 Bedrooms • 3 Bathrooms",
                      price: "From $550/night",
                      features: "Built-in bunk beds, great for large groups, private kitchen & living room"
                    },
                    {
                      name: "The Lounge Suite",
                      image: "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/691ba024274e926fffc40fbf_ymu9dUZQ.jpeg",
                      sleeps: "8–12 guests",
                      beds: "3 Bedrooms • 2 Bathrooms",
                      price: "From $400/night",
                      features: "Vibrant decor, expansive common area, downtown views, close to rooftop bars"
                    },
                    {
                      name: "The Kitchen Suite",
                      image: "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87a7f0723612dc62b00_bar.webp",
                      sleeps: "6–8 guests",
                      beds: "2 Bedrooms • 1 Bathroom",
                      price: "From $300/night",
                      features: "Chef-ready kitchen with marble island, cozy living area, perfect for intimate groups"
                    }].
                    map((suite, idx) =>
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 bg-slate-700/40 border border-slate-600/40 rounded-lg overflow-hidden">
                        <img
                        src={suite.image}
                        alt={suite.name}
                        className="w-full sm:w-48 h-36 sm:h-auto object-cover shrink-0" />
                      
                        <div className="p-4 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-white text-base">{suite.name}</h3>
                            <span className="text-emerald-300 font-bold text-sm whitespace-nowrap">{suite.price}</span>
                          </div>
                          <p className="text-xs text-sky-300">{suite.beds} • Sleeps {suite.sleeps}</p>
                          <p className="text-sm text-slate-300">{suite.features}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 text-center space-y-3">
                      <p className="text-sm text-slate-300">
                        📍 <strong className="text-white">1221 E 6th St, Austin, TX 78702</strong> — Heart of East 6th Street
                      </p>
                      <p className="text-xs text-slate-400">Rooftop bars, event spaces, and food trucks on-site. Perfect before or after your cruise!</p>
                      <Button
                        type="button"
                        onClick={() => openExternalLink("https://www.inncahoots.com/listings")}
                        className="bg-sky-600 hover:bg-sky-500 text-white">
                        
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Book a Suite at Inn Cahoots
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>}

            {/* Transportation Tab */}
            <TabsContent value="transportation">
              <TransportTabContent openExternalLink={openExternalLink} openLightbox={openLightbox} guestCount={booking.headcount} partyType={booking.party_type} isBooked={true} defaultDestination="13993 FM 2769, Leander, TX 78641" customerName={booking.customer.name} customerEmail={booking.customer.email} customerPhone={booking.customer.phone || undefined} />
            </TabsContent>

            {/* Waiver Tab */}
            <TabsContent value="waiver">
              <div className="space-y-4">
                {/* Progress Card */}
                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Waiver Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">
                          <strong className="text-white">{waiverCount}</strong> of <strong className="text-white">{booking.headcount}</strong> guests signed
                        </span>
                        <span className={waiverCount >= booking.headcount ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                          {waiverCount >= booking.headcount ? "✅ Complete!" : `${booking.headcount - waiverCount} still needed`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${waiverCount >= booking.headcount ? "bg-emerald-500" : "bg-sky-500"}`}
                          style={{ width: `${Math.min(waiverCount / booking.headcount * 100, 100)}%` }} />
                        
                      </div>
                    </div>

                    {waiverCount < booking.headcount &&
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-300 mb-1">⚠️ Required Before Boarding</h3>
                        <p className="text-sm text-slate-300">Every guest must sign a waiver before boarding. Share the link below with your group!</p>
                      </div>
                    }
                  </CardContent>
                </Card>

                {/* Signed Waivers List - Expandable */}
                {waiverSignatures.length > 0 &&
                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                    <CardHeader className="cursor-pointer" onClick={() => setWaiverListOpen(!waiverListOpen)}>
                      <CardTitle className="text-lg text-sky-300 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Signed Waivers ({waiverSignatures.length})
                        </span>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${waiverListOpen ? "rotate-180" : ""}`} />
                      </CardTitle>
                    </CardHeader>
                    {waiverListOpen &&
                  <CardContent className="pt-0 space-y-2">
                        {waiverSignatures.map((sig, idx) => {
                      const signedDate = new Date(sig.signed_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit",
                        timeZone: "America/Chicago"
                      });
                      return (
                        <div key={sig.id} className="flex items-center justify-between bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-emerald-400 font-mono text-xs bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate">{sig.signer_name}</p>
                                  <p className="text-xs text-slate-400">{signedDate}</p>
                                </div>
                              </div>
                              <Button
                            size="sm"
                            className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold shrink-0"
                            onClick={() => {
                              const w = window.open("", "_blank");
                              if (!w) return;
                              const ini = `<span style="display:inline-block;background:#f5f5f5;border:2px solid #333;border-radius:4px;padding:4px 14px;font-weight:bold;font-size:16px;letter-spacing:2px;font-family:monospace">${sig.initials}</span>`;
                              const initialsRow = `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin:24px 0"><span style="font-size:13px;color:#555">Initials:</span>${ini}</div>`;
                              const dobFormatted = sig.date_of_birth ? new Date(sig.date_of_birth + 'T12:00:00').toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "N/A";
                              const cruiseDateFormatted = sig.cruise_date ? new Date(sig.cruise_date + 'T12:00:00').toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "N/A";
                              const discoCruiseSlot = sig.disco_cruise_slot || "N/A";
                              w.document.write(`<html><head><title>Waiver - ${sig.signer_name}</title>
<style>
@media print{body{margin:10px}}
body{font-family:Georgia,serif;max-width:760px;margin:30px auto;padding:20px 30px;color:#111;font-size:13px;line-height:1.6}
h1{font-size:22px;margin:0;text-align:center}
h2{font-size:18px;margin:4px 0 16px;text-align:center}
h3{text-align:center;font-size:14px;text-decoration:underline;margin:24px 0 12px}
ol{padding-left:24px}ol li{margin-bottom:10px}
.field{margin:10px 0;padding:6px 10px;border:1px solid #ccc;border-radius:4px;background:#fafafa}
.field .lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px}
.field .val{font-size:14px;margin-top:2px;font-weight:600}
.sig-img{border:2px solid #333;border-radius:8px;margin-top:8px;max-width:400px}
.divider{border-top:2px solid #000;margin:30px 0}
.page-break{page-break-after:always}
</style></head><body>
<h1>PREMIER PARTY CRUISES 2026</h1>
<h2>${booking.time_slot?.experience?.type === 'disco_cruise' || booking.time_slot?.experience?.type === 'disco' ? 'Disco Cruise Waiver' : 'Private Cruise Waiver'}</h2>

<p style="text-align:center;font-weight:bold;text-decoration:underline">EVERYONE MUST SIGN BEFORE ARRIVING AT THE MARINA</p>
<p style="text-align:center;font-weight:bold;text-decoration:underline">LIABILITY WAIVER AND RELEASE OF ANY AND ALL CLAIMS</p>

<p>In consideration of being permitted to participate in the watercraft and boating activities (the "Event") with Brian Hill and B Hill Entertainment LLC dba Premier Party Cruises (collectively, "Company"), I, on behalf of myself (or on behalf of any minor for whom I am the parent or legal guardian) and my assigns, heirs, and next of kin hereby acknowledge and agree to the following terms and conditions:</p>

<ol>
<li>I will inspect the facilities and equipment to be used before participating in the Event. If I believe that either the facilities or the equipment is unsafe, I will immediately advise a representative of the Company of such condition. My participation in the Event is purely voluntary, and I currently have no known physical or mental condition that would impair my capability to fully participate in the Event. I verify that I am not under the influence of any drugs or alcohol. I acknowledge and agree that if I am under the age of eighteen (18), I may only participate in the Event with the express permission of my parent or legal guardian, as evidenced by their signature below.</li>

<li><strong><u>EXPRESS ASSUMPTION OF RISK AND RESPONSIBILITY</u></strong>: I acknowledge and fully understand that the Event, as with all events and physical activities including those associated with motorized watercraft, swimming, and other activities on, in, and around the water, involves risks and dangers, including without limitation, serious bodily injury and/or death. I knowingly, freely, and voluntarily assume all risk of accident, injury and/or illness, including, without limitation, injuries, sprains, splinters, torn muscles and/or ligaments, fractures, eye damage, cuts, wounds, scrapes, abrasions and/or contusions, dehydration, drowning, exposure, head, neck and/or spinal injuries, bites, stings and/or allergic reactions, shock, paralysis, medical treatment, disability, death, and any economic losses which may result, not only from my actions, omissions, or negligence, but also from the actions, omissions, or negligence of others, the condition of the premises, or the condition of the equipment. I acknowledge and agree to accept any risk from ongoing pandemics and/or from contracting any and all communicable diseases, including without limitation SARS-CoV-2 and COVID-19. I acknowledge that there may be other risks not known to me or not reasonably foreseeable at this time. I agree to assume responsibility for the risks identified above and any risk not specifically identified.</li>

<li><strong><u>LIABILITY WAIVER AND RELEASE:</u></strong> <strong>I, INDIVIDUALLY (OR ON BEHALF OF ANY MINOR FOR WHOM I AM THE PARENT OR LEGAL GUARDIAN) HEREBY RELEASE COMPANY AND ANY OF ITS OFFICERS, OWNERS, MEMBERS, AGENTS, SERVANTS, ADMINISTRATORS, DIRECTORS, EMPLOYEES, CONTRACTORS, AGENTS, REPRESENTATIVES, AND INSURERS OF COMPANY (EACH A "RELEASEE" AND COLLECTIVELY THE "RELEASEES") IN CONNECTION WITH MY PARTICIPATION IN THE EVENT FROM ANY AND ALL CLAIMS, LIABILITIES, DAMAGES, AND/OR LOSSES TO PERSON OR PROPERTY (COLLECTIVELY, "CLAIMS") CAUSED OR ALLEGED TO BE CAUSED, IN WHOLE OR IN PART, BY THE ACTS OMISSIONS OR NEGLIGENCE OF ME (OR THE MINOR NAMED BELOW) OR ANY OTHER INDIVIDUAL, ENTITY, OR PARTY, <u>EVEN IF CAUSED BY THE NEGLIGENCE OF RELEASEES</u>. I FURTHER AGREE THAT IF, DESPITE THIS LIABILITY WAIVER AND RELEASE OF ANY AND ALL CLAIMS, I OR ANYONE ON MY BEHALF (OR ON BEHALF OF THE MINOR NAMED BELOW) MAKES A CLAIM AGAINST ANY OF RELEASEES, I WILL INDEMNIFY, DEFEND, SAVE, AND HOLD HARMLESS EACH OF RELEASEES FROM ANY CLAIMS, LIABILITY, DAMAGES, COSTS, FEES, AND/OR EXPENSES WHICH MAY BE INCURRED AS A RESULT OF SUCH CLAIM INCLUDING, WITHOUT LIMITATION, LITIGATION EXPENSES, COURT COSTS, AND REASONABLE ATTORNEYS' FEES, <u>EVEN IF SUCH CLAIMS ARE CAUSED BY THE NEGLIGENCE OF RELEASEES</u>.</strong></li>

<li><strong><u>ALCOHOL AND DRUG POLICY:</u></strong> I acknowledge that Releasees do not condone underage drinking, using illegal drugs, or driving under the influence of drugs or alcohol. I acknowledge that Releasees advise drivers, minors, and all attendees and individuals to stay sober and abstain from any dangerous and/or illegal activity.</li>

<li><strong><u>PHOTO/VIDEO RELEASE:</u></strong> I hereby grant permission to Company and hired staff to take photographs, audio, and/or video of me and my participation in the Event ("Content"), and to perpetually use and/or sublicense to third-parties such content which may include, without limitation, my image, name, voice, and/or likeness, for any purpose, including, without limitation, commercial purposes, without compensation or credit to me, in any and all media, worldwide, now known or hereafter devised.</li>

<li>GUEST BEHAVIOR: If a guest or customer is rude, disrespectful, or unruly, the party will end immediately, and the individual will be removed by the governing law enforcement body, and the organizer of the group the person belongs to will be fined $500. No guests are allowed to swim to other boats and/or board other vessels nearby, and I acknowledge that clients and guests of Premier Party Cruises (B Hill Entertainment, LLC) are forbidden from bringing a 3rd party boat to the cove where the boats tie up for swimming. I understand that it is irresponsible and dangerous to do so, and if I ignore or disregard these rules, I will be subject to arrest by law enforcement, and the cruise will end immediately with no refund. I understand the Company reserves the right to refuse service to anyone for any reason, regardless of the opinion of the individual or other guests. Captain and crew have sole discretion to enforce rules and ensure the safety of guests during the entire cruise, and at all times that guests are on marina property. Littering, deliberately damaging the boat or causing excessive mess, or any other illegal behavior that causes extra cleanup for the crew will result in early termination of the cruise to allow extra cleaning time, and a fee will be imposed at the captain's discretion, aligned with the value of the item and/or time to return to original condition.</li>

<li>SAFETY PRECAUTIONS: If any guest or attendee refuses or ignores the instructions of the captain or crew, they will be removed by law enforcement and the event will end promptly with no refund. I acknowledge that everyone, including myself, must stay within 50ft of the boat at all times, and must have a PFD orange life jacket with them at all times, regardless of swimming ability. Furthermore, I acknowledge that there is no lifeguard on duty and I am solely responsible for the safety of myself and my guests. I also agree to stay out of the water if I cannot swim, and will ensure that my intoxication does not create an environment that is unsafe for myself or others. For guests with health issues or risks being outdoors, I acknowledge that it is solely my responsibility to ensure that I have everything necessary to remain safe during the event. I understand that the staff cannot provide medication or epipens in case of allergic reaction, and agree to hold harmless any member of the staff, crew, or party who assists with first aid or CPR of any kind. Company is also not responsible for the actions or behavior of other people on the lake or on other boats.</li>

<li>FINANCIAL RESPONSIBILITIES: I acknowledge that I am financially responsible for any damage caused to boat, equipment, dock, marina, parking lot, driveways, gates, and all other items existing on the marina property. Company (B Hill Entertainment, LLC) is not responsible for lost, broken, or stolen items that may be compromised during the guests' time at the marina, including vehicle damage, tire damage, personal injury, any other personal property or equipment. Company is not responsible for compensating the client for lost time due to the client showing up late, and the Company is not responsible for accommodating for late guests and delaying the departure of the cruise.</li>

<li>By signing this waiver, you acknowledge you're aware that there is no lifeguard on duty, and you have reviewed and understand the safety procedures.</li>
</ol>

<p>I, on behalf of myself or any minor for whom I am the parent or legal guardian, represent that I am over the age of 18, I have read and have had an opportunity to ask any questions about the above Liability Waiver & Release of Any and All Claims, and I voluntarily agree to the terms contained herein.</p>

<p>I hereby agree to hold harmless B Hill Entertainment, LLC, Marine Quest, LLC, and all other employees and staff members from any issues that may arise in any way, regardless of negligence, and give my assurance that I am fully aware of my surroundings and capable of any issue that may arise, regardless of fault.</p>

${initialsRow}

<div class="divider"></div>
<p style="text-align:center;font-size:16px;font-weight:bold">**The Above Is Our Specific Rules** - The Following is our insurance-required waiver information.</p>
<p style="text-align:center;font-weight:bold">** We will NEVER share any of your information, but the insurance company requires it. Please do not be alarmed, but it is absolutely required for you to board any of our boats. <u>FOCUS</u>: you cannot board our boats without signing this waiver.</p>

<div class="divider"></div>

<h3>CONTRACTUAL ASSUMPTION ACKNOWLEDGEMENT OF RISKS AND LIABILITY WAIVER AND RELEASE AGREEMENT</h3>

<p>IN CONSIDERATION of being permitted to participate in the charter/rental provided by Insured name (i) for myself and/or any minor children for whom I am the legal parent/guardian or otherwise responsible, and for my/our heirs, personal representatives, or assigns:</p>

<h3 style="font-weight:normal">ACKNOWLEDGEMENT OF RISKS</h3>

<p>I fully acknowledge that some, but not all of the risks of participating in the charter in which I am about to engage may include:</p>

<ol>
<li>windshear, inclement weather, lightning, variances and extremes of wind, weather and temperature;</li>
<li>any sense of balance, physical condition, ability to operate equipment, swim and/or follow directions;</li>
<li>collision, capsizing, sinking or other hazard which result in wetness, injury, exposure to the elements, hypothermia, impact of the body upon the water, injection of water into my body orifices, and/or drowning;</li>
<li>the presence of and/or injury, illness or death resulting from insects, animals and marine life forms;</li>
<li>equipment failure, operator error, transportation accidents;</li>
<li>heat or sun related injuries or illness, including sunburn, sunstroke or dehydration;</li>
<li>fatigue, chill, and/or dizziness which may diminish my/our reaction time and increase the risk of an accident;</li>
<li>slippery decks and/or steps when wet;</li>
<li>specific activities to be listed that are not mentioned above.</li>
</ol>

${initialsRow}

<p style="text-align:center">I specifically acknowledge that I have been given instructions/training in the safe use of the type of equipment used during this charter to my complete satisfaction, I understand them fully and I am physically/mentally able to participate in the charter which I am about to engage.</p>

${initialsRow}

<p>I understand that past or present medical conditions may be contraindicative to my participation in the charter/rental. I affirm that I am not currently suffering from a cold or congestion or have an ear infection. I affirm that I do not have any infectious disease or illness (e.g., COVID or similar variants). I affirm that I do not have a history of seizures, dizziness, or fainting, nor a history of heart conditions (e.g., cardiovascular disease, angina, heart attack). I further affirm that I do not have a history of respiratory problems (e.g., emphysema or tuberculosis). I affirm that I am not currently suffering from back, spine and/or neck injuries. I affirm that I am not currently taking medication that carries a warning about any impairment of my physical or mental abilities.</p>

${initialsRow}

<h3 style="font-weight:normal">CONTRACTUAL/EXPRESS ASSUMPTION OF RISK AND RESPONSIBILITY</h3>

<p>I fully agree to assume all responsibility for all the risks of the Premier Party Cruises Event (iv) to which I am about to engage, whether identified above or not (I FULLY UNDERSTAND THAT I UNDERTAKE EVEN THOSE RISKS ARISING OUT OF THE NEGLIGENCE OF THE RELEASEES NAMED BELOW). My/Our participation in the charter is completely voluntary. I assume full responsibility for myself and any of my minor children for whom I am responsible. This responsibility that I assume on my behalf and that of my minor children, or those children for whom I am legally responsible, extends to any bodily injury, accidents, illnesses, paralysis, death, loss of personal property and expenses thereof as a result of any accident which may occur while we participate in the activity. I COMPLETELY UNDERSTAND AND AGREE TO ACCEPT ALL RESPONSIBILITY ON BEHALF OF MYSELF AND MY MINOR CHILDREN, OR THOSE CHILDREN FOR WHOM I AM LEGALLY RESPONSIBLE, EVEN IF THESE INJURIES, DEATH, OR LOSS OF PERSONAL PROPERTY ARE CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF THE RELEASEES NAMED BELOW.</p>

${initialsRow}

<p>This Agreement shall be governed by the laws of the United States of America. Any legal action relating to or arising out of this agreement against or with respect to [Insured Name] shall be commenced exclusively in the United States of America. Any legal action relating to or arising out of this Agreement against or with respect to any of it [B Hill Entertainment, LLC] affiliated or related companies shall be commenced exclusively in the Travis County Court, USA. I agree that I will reimburse in full any attorney fees incurred by the assured or their Insurers to defend any legal action under this agreement.</p>

${initialsRow}

<p style="font-weight:bold;font-size:12px">I HEREBY RELEASE [B Hill Entertainment, LLC] THEIR AFFILIATED AND RELATED COMPANIES, THEIR PRINCIPALS, DIRECTORS, OFFICERS, AGENTS, EMPLOYEES, AND VOLUNTEERS, THEIR INSURERS, AND EACH AND EVERY LANDOWNER, MUNICIPAL AND/OR GOVERNMENTAL AGENCY UPON WHOSE PROPERTY AND ACTIVITY IS CONDUCTED, AS WELL AS THEIR INSURERS, IF ANY, EACH AND EVERY CRUISE LINE OR COMPANY WHO FACILITATED PARTICIPATION AND/OR PURCHASE OF TICKETS, OR FROM ANY AND ALL LIABILITY OF ANY NATURE FOR ANY AND ALL INJURY, PROPERTY LOSS OR DAMAGE (INCLUDING DEATH) TO ME OR MY MINOR CHILDREN AS WELL AS OTHER PERSONS AS A RESULT OF MY/OUR PARTICIPATION IN THE ACTIVITY, EVEN IF CAUSED BY MY NEGLIGENCE OR BY THE NEGLIGENCE OF ANY OF THE RELEASEES NAMED ABOVE, OR ANY OTHER PERSON (INCLUDING MYSELF).</p>

${initialsRow}

<p>I have read this assumption and acknowledgement of risks and release of liability agreement I understand fully that it is contractual in nature and binding upon me personally. I further understand that by signing this document I am waiving valuable legal rights including any and all rights I may have against the owner, the renter/charterer, the operator named above, or their employees, agents, servants or assigns. I FULLY AGREE IN CONSIDERATION FOR BEING ALLOWED TO PARTICIPATE IN THE CHARTER TO HOLD HARMLESS AND INDEMNIFY THE OWNER, THE OPERATOR NAMED ABOVE OR THEIR EMPLOYEES, AGENTS, SERVANTS OR ASSIGNS FOR ANY INJURY WHICH MAY BEFALL ME, MY MINOR CHILDREN OR THOSE CHILDREN FOR WHOM I AM LEGALLY RESPONSIBLE (INCLUDING DEATH).</p>

<div class="divider"></div>

<div class="field"><div class="lbl">Full Name</div><div class="val">${sig.signer_name}</div></div>
${sig.signer_email ? `<div class="field"><div class="lbl">Email</div><div class="val">${sig.signer_email}</div></div>` : ""}
<div class="field"><div class="lbl">Date of Birth</div><div class="val">${dobFormatted}</div></div>
<div class="field"><div class="lbl">Cruise Date</div><div class="val">${cruiseDateFormatted}</div></div>
${booking.time_slot?.experience?.type === 'disco_cruise' || booking.time_slot?.experience?.type === 'disco' ? `<div class="field"><div class="lbl">Disco Cruise Slot</div><div class="val">${discoCruiseSlot}</div></div>` : ""}
${sig.organizer_name ? `<div class="field"><div class="lbl">Reservation Organizer</div><div class="val">${sig.organizer_name}</div></div>` : ""}
${sig.address ? `<div class="field"><div class="lbl">Address</div><div class="val">${sig.address}</div></div>` : ""}
${sig.phone ? `<div class="field"><div class="lbl">Phone</div><div class="val">${sig.phone}</div></div>` : ""}
<div class="field"><div class="lbl">Signed At</div><div class="val">${signedDate}</div></div>
<div class="field"><div class="lbl">Signature</div>
${sig.signature_data ? `<img src="${sig.signature_data}" alt="Signature" class="sig-img" />` : "<div class='val'>No signature image</div>"}
</div>

<div style="margin-top:30px;text-align:center;color:#aaa;font-size:11px">
This document was electronically signed via Premier Party Cruises waiver system.<br/>
Booking ID: ${booking.id}
</div>
</body></html>`);
                              w.document.close();
                            }}>
                            
                                <FileDown className="h-3.5 w-3.5 mr-1" />
                                View PDF
                              </Button>
                            </div>);

                    })}
                      </CardContent>
                  }
                  </Card>
                }

                {/* Shareable Link Card */}
                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Share Waiver Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-300">Copy this link and share it with everyone in your group so they can sign the waiver before boarding day.</p>
                    
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-sky-300 truncate font-mono">
                        {`${window.location.origin}/waiver?booking=${booking.id}`}
                      </div>
                      <Button
                        className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/waiver?booking=${booking.id}`);
                          setWaiverCopied(true);
                          setTimeout(() => setWaiverCopied(false), 2000);
                        }}>
                        
                        {waiverCopied ?
                        <><CheckCircle className="h-4 w-4 mr-1" /> Copied!</> :

                        <><Copy className="h-4 w-4 mr-1" /> Copy</>
                        }
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold flex-1"
                        onClick={() => window.open(`/waiver?booking=${booking.id}`, "_blank")}>
                        
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open Waiver
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                  <CardContent className="pt-5 space-y-3 text-sm text-slate-300">
                    <h3 className="font-semibold text-white">What the Waiver Covers</h3>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                      <li>Liability release for water activities</li>
                      <li>Assumption of risk for boating</li>
                      <li>Photo/video consent for promotional use</li>
                      <li>Acknowledgment of boat rules and safety procedures</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Alcohol Delivery & Concierge Tab */}
            <TabsContent value="alcohol">
              <div className="space-y-4">
                {/* CTA Button - top */}
                <div className="w-full rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-amber-500/10 p-4 sm:p-6 flex flex-col items-center gap-3 text-center">
                   <h3 className="text-lg sm:text-xl font-bold text-white whitespace-pre-line">🎉 Hey {booking.customer.name.split(' ')[0]}!{"\n\n\n"}Ready to order your drinks for the boat{"\n"}& stock the house/hotel?</h3>
                   <p className="text-slate-300 text-sm max-w-md">Browse cocktail kits, beer, wine, liquor, and party supplies — delivered straight to your boat or Airbnb.

                  </p>
                   <a
                    href={booking.alcohol_delivery_url || "https://partyondelivery.com/partners/premier"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-lg transition-colors text-lg whitespace-nowrap"
                    onClick={() => {
                      if (booking?.id && !isAdminView) {
                        supabase.from("engagement_events").insert({
                          event_type: "pod_store_clicked",
                          session_id: booking.id,
                          event_data: { booking_id: booking.id },
                          page_url: window.location.href
                        }).then(() => {});
                      }
                    }}>
                    
                     <ExternalLink className="h-5 w-5" />
                     Open {booking.customer.name.split(' ')[0]}'s Drink Delivery Page
                   </a>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed mt-1">
                    Brian Hill, owner of Premier Party Cruises, started <span className="font-semibold text-slate-300">Party On Delivery</span> to provide delivery and concierge services to our amazing guests. Party On Delivery is the official delivery partner of Premier Party Cruises.
                  </p>
                </div>

                {/* Service Photo Tiles - full width */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                  {[
                  { label: "Pre-Arrival Alcohol Delivery", img: tileSuiteDelivery },
                  { label: "Direct-to-Boat Alcohol Delivery", img: tileBoatDelivery },
                  { label: "Cocktail Bar Setups", img: tileCocktailBar },
                  { label: "Stock the Fridge Service", img: tileStockFridge },
                  { label: "Group Ordering & Split Pay", img: tileGroupOrdering }].
                  map((tile) =>
                  <div key={tile.label} className="relative rounded-xl overflow-hidden aspect-square">
                      <img src={tile.img} alt={tile.label} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col items-center justify-end p-3">
                        <span className="text-white text-xs sm:text-sm font-bold text-center leading-tight">{tile.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cocktail Kits Hero Image - full width */}
                <a href={booking.alcohol_delivery_url || "https://partyondelivery.com/partners/premier"} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-purple-500/20">
                  <img src={cocktailKitsHero} alt="Lake-Ready Cocktail Kits & Bar Setups" className="w-full h-auto" />
                </a>
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
                        title="Anderson Mill Marina Location" />
                      
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-white">Anderson Mill Marina</p>
                      <p>13993 FM 2769</p>
                      <p>Leander, TX 78641</p>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openExternalLink("https://www.google.com/maps/dir/?api=1&destination=Anderson+Mill+Marina,+13993+FM+2769,+Leander,+TX+78641")}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline mt-2 p-0 h-auto">
                        
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
                        <span>Arrive {isDiscoEligiblePartyType(booking.party_type) ? '25' : '15'} minutes before departure</span>
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

            {/* Inbox Tab */}
            <TabsContent value="inbox">
              <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                    <InboxIcon className="h-5 w-5" /> Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardInbox bookingId={booking.id} onBack={() => setActiveTab("reservation")} onNavigateTab={(tab) => setActiveTab(tab)} isAdminView={isAdminView} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pay Balance tab removed - payment form is now inside Reservation tab */}
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
        onClose={() => setLightboxOpen(false)} />
      

      <AdminInvoiceDialog
        open={!!invoiceDialogBooking}
        onOpenChange={(open) => {if (!open) setInvoiceDialogBooking(null);}}
        booking={invoiceDialogBooking} />
      

      {booking &&
      <AdminAddOnEditor
        open={addOnEditorOpen}
        onOpenChange={setAddOnEditorOpen}
        booking={booking}
        onBookingUpdated={(updated) => {
          setBooking({ ...booking, ...updated });
        }} />

      }

      {/* Add-on Detail Dialog */}
      <Dialog open={!!addonDetailOpen} onOpenChange={(open) => {if (!open) setAddonDetailOpen(null);}}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-300">{addonDetailOpen?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">{addonDetailOpen?.description}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 mt-2">
            {addonDetailOpen?.items.map((item, i) =>
            <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="text-amber-400 mt-0.5">•</span>
                {item}
              </li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>);

};

export default CustomerDashboard;