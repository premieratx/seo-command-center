import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { QuoteBuilderHeader } from "@/quote-app/components/quote-builder/QuoteBuilderHeader";
import { DateSelector } from "@/quote-app/components/quote-builder/DateSelector";
import { PartyTypeSelector } from "@/quote-app/components/quote-builder/PartyTypeSelector";
import { GuestCountSelector } from "@/quote-app/components/quote-builder/GuestCountSelector";
import { SelectionSummaryHeader } from "@/quote-app/components/quote-builder/SelectionSummaryHeader";
import { DiscoCruiseSelector } from "@/quote-app/components/quote-builder/DiscoCruiseSelector";
import { PrivateCruiseSelector } from "@/quote-app/components/quote-builder/PrivateCruiseSelector";
import { LeadCaptureForm } from "@/quote-app/components/quote-builder/LeadCaptureForm";
import { FormalQuoteDisplay } from "@/quote-app/components/quote-builder/FormalQuoteDisplay";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/quote-app/components/ui/button";
import { useToast } from "@/quote-app/hooks/use-toast";
import { useQuoteAnalytics } from "@/quote-app/hooks/useQuoteAnalytics";
import { useAbandonedBookingTracking } from "@/quote-app/hooks/useAbandonedBookingTracking";
import { validateDiscoSlot } from "@/quote-app/lib/discoRules";

// Lazy load non-critical components for faster initial render when embedded
const HeroSection = lazy(() => import("@/quote-app/components/HeroSection").then(m => ({ default: m.HeroSection })));
const ScrollingBackground = lazy(() => import("@/quote-app/components/ScrollingBackground").then(m => ({ default: m.ScrollingBackground })));
const AlternativeDatesSelector = lazy(() => import("@/quote-app/components/quote-builder/AlternativeDatesSelector").then(m => ({ default: m.AlternativeDatesSelector })));
const PricingComparison = lazy(() => import("@/quote-app/components/quote-builder/PricingComparison").then(m => ({ default: m.PricingComparison })));
const SmallerBoatSuggestion = lazy(() => import("@/quote-app/components/quote-builder/SmallerBoatSuggestion").then(m => ({ default: m.SmallerBoatSuggestion })));

const isInIframe = () => {
  try { return window.self !== window.top; } catch { return true; }
};
const NewQuote = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = useQuoteAnalytics();
  const { leadInfo, trackAbandoned, captureLeadInfo } = useAbandonedBookingTracking();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [partyType, setPartyType] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(10);
  const [discoSlots, setDiscoSlots] = useState<any[]>([]);
  const [privateSlots, setPrivateSlots] = useState<any[]>([]);
  const [smallerBoatSlots, setSmallerBoatSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLeadCaptured, setIsLeadCaptured] = useState(false);
  const [customerData, setCustomerData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [quoteNumber, setQuoteNumber] = useState<string | undefined>();
  
  // Track the most recent selections for sticky header
  const [mostRecentDate, setMostRecentDate] = useState<Date | undefined>();
  const [mostRecentPartyType, setMostRecentPartyType] = useState<string | null>(null);
  const [mostRecentGuestCount, setMostRecentGuestCount] = useState<number>(0);
  const [mostRecentExperienceType, setMostRecentExperienceType] = useState<'disco_cruise' | 'private_cruise' | null>(null);
  const [mostRecentPackageType, setMostRecentPackageType] = useState<string | null>(null);
  const [mostRecentTimeStart, setMostRecentTimeStart] = useState<string | null>(null);
  const [mostRecentTimeEnd, setMostRecentTimeEnd] = useState<string | null>(null);
  const [mostRecentBoatName, setMostRecentBoatName] = useState<string | null>(null);
  const [selectedExperienceType, setSelectedExperienceType] = useState<'disco_cruise' | 'private_cruise' | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<'14' | '25' | '50' | undefined>();
  const [selectedDiscoPackage, setSelectedDiscoPackage] = useState<'basic' | 'queen' | 'sparkle' | undefined>();
  const [savedQuoteId, setSavedQuoteId] = useState<string | undefined>();
  const [restoredState, setRestoredState] = useState(false);
  const [restoredSlotId, setRestoredSlotId] = useState<string | undefined>();
  const [restoredPackage, setRestoredPackage] = useState<string | undefined>();
  const [restoredAddons, setRestoredAddons] = useState<any>();
  
  const quoteBuilderRef = useRef<HTMLDivElement>(null);
  const xolaWidgetRef = useRef<HTMLDivElement>(null);
  // Throttle/guard availability fetches to prevent loops
  const fetchGuardRef = useRef<{ inFlight: boolean; lastKey: string; lastTime: number }>({
    inFlight: false,
    lastKey: '',
    lastTime: 0,
  });


  const normalizePartyType = (value: string | null): string | null => {
    if (!value) return null;
    const v = value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const map: Record<string, string> = {
      'bachelor_party': 'bachelor_party',
      'bachelor': 'bachelor_party',
      'bach_party': 'bachelor_party',
      'bachparty': 'bachelor_party',
      'bachelorette_party': 'bachelorette_party',
      'bachelorette': 'bachelorette_party',
      'bacheloretteparty': 'bachelorette_party',
      'combined_bach_party': 'combined_bach',
      'combined_bach': 'combined_bach',
      'combinedbachparty': 'combined_bach',
      'combinedbach': 'combined_bach',
      'wedding_event': 'wedding_event',
      'wedding': 'wedding_event',
      'weddingevent': 'wedding_event',
      'corporate_event': 'corporate_event',
      'corporate': 'corporate_event',
      'corporateevent': 'corporate_event',
      'birthday_party': 'birthday_party',
      'birthday': 'birthday_party',
      'birthdayparty': 'birthday_party',
      'graduation_party': 'graduation',
      'graduation': 'graduation',
      'graduationparty': 'graduation',
      'other': 'other',
      'private_cruise': 'other',
      'privatecruise': 'other',
      'disco_cruise': 'combined_bach',
      'discocruise': 'combined_bach',
    };
    return map[v] || 'other';
  };

  // Restore saved quote state
  useEffect(() => {
    const restoreSavedQuote = async () => {
      const quoteNum = searchParams.get("quoteNumber");
      if (!quoteNum || restoredState) return;

      try {
        const { data: savedQuote, error } = await supabase
          .from('saved_quotes')
          .select('*')
          .eq('quote_number', quoteNum)
          .single();

        if (error || !savedQuote) return;

        // Restore all saved state
        setSavedQuoteId(savedQuote.id);
        setQuoteNumber(savedQuote.quote_number);
        
        if (savedQuote.event_date) {
          const [yy, mm, dd] = savedQuote.event_date.split("-").map((n: string) => parseInt(n, 10));
          const pad = (n: number) => String(n).padStart(2, "0");
          const tempUtcNoon = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1, 12, 0, 0));
          const tzParts = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Chicago",
            timeZoneName: "short",
          }).formatToParts(tempUtcNoon);
          const tzName = tzParts.find((p: any) => p.type === "timeZoneName")?.value || "";
          const offset = tzName.includes("CDT") ? "-05:00" : "-06:00";
          const chicagoNoon = new Date(`${pad(yy)}-${pad(mm)}-${pad(dd)}T12:00:00${offset}`);
          setSelectedDate(chicagoNoon);
          setMostRecentDate(chicagoNoon);
        }
        
        if (savedQuote.party_type) {
          const normalizedType = normalizePartyType(savedQuote.party_type);
          setPartyType(normalizedType);
          setMostRecentPartyType(normalizedType);
        }
        
        if (savedQuote.guest_count) {
          setGuestCount(savedQuote.guest_count);
          setMostRecentGuestCount(savedQuote.guest_count);
        }
        
        if (savedQuote.experience_type && (savedQuote.experience_type === 'disco_cruise' || savedQuote.experience_type === 'private_cruise')) {
          setSelectedExperienceType(savedQuote.experience_type);
          setMostRecentExperienceType(savedQuote.experience_type);
        }
        
        if (savedQuote.disco_package) {
          setSelectedDiscoPackage(savedQuote.disco_package as any);
          setMostRecentPackageType(savedQuote.disco_package);
        }
        
        if (savedQuote.private_capacity) {
          setSelectedCapacity(savedQuote.private_capacity as any);
        }
        
        if (savedQuote.package_type) {
          setMostRecentPackageType(savedQuote.package_type);
        }
        
        if (savedQuote.selected_boat_name) {
          setMostRecentBoatName(savedQuote.selected_boat_name);
        }
        
        if (savedQuote.selected_time_start) {
          setMostRecentTimeStart(savedQuote.selected_time_start);
        }
        
        if (savedQuote.selected_time_end) {
          setMostRecentTimeEnd(savedQuote.selected_time_end);
        }
        
        if (savedQuote.customer_name) {
          const nameParts = savedQuote.customer_name.split(' ');
          setCustomerData({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: savedQuote.customer_email || '',
            phone: savedQuote.customer_phone || ''
          });
          setIsLeadCaptured(true);
        } else if (savedQuote.customer_email) {
          // If we have email but no name, still mark as lead captured
          setCustomerData({
            firstName: '',
            lastName: '',
            email: savedQuote.customer_email || '',
            phone: savedQuote.customer_phone || ''
          });
          setIsLeadCaptured(true);
        }
        
        // Store restored data for FormalQuoteDisplay
        if (savedQuote.time_slot_id) {
          setRestoredSlotId(savedQuote.time_slot_id);
        }
        if (savedQuote.disco_package) {
          setRestoredPackage(savedQuote.disco_package);
        }
        if (savedQuote.selected_addons) {
          setRestoredAddons(savedQuote.selected_addons);
        }
        // Don't restore pricing_details - always recalculate with current pricing logic
        
        // Always go to step 5 if we have saved state
        setStep(5);
        setRestoredState(true);
        
        // Fetch slots with restored data
        if (savedQuote.event_date && savedQuote.party_type && savedQuote.guest_count) {
          const [yy, mm, dd] = savedQuote.event_date.split("-").map((n: string) => parseInt(n, 10));
          const pad = (n: number) => String(n).padStart(2, "0");
          const tempUtcNoon = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1, 12, 0, 0));
          const tzParts = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Chicago",
            timeZoneName: "short",
          }).formatToParts(tempUtcNoon);
          const tzName = tzParts.find((p: any) => p.type === "timeZoneName")?.value || "";
          const offset = tzName.includes("CDT") ? "-05:00" : "-06:00";
          const chicagoNoon = new Date(`${pad(yy)}-${pad(mm)}-${pad(dd)}T12:00:00${offset}`);
          
          fetchAvailableSlots(chicagoNoon, normalizePartyType(savedQuote.party_type), savedQuote.guest_count);
        }
      } catch (err) {
        console.error('Error restoring saved quote:', err);
      }
    };

    restoreSavedQuote();
  }, [searchParams.get("quoteNumber")]);

  // Check URL params for direct quote view and sync step with URL
  useEffect(() => {
    // Skip if we're restoring a saved quote
    if (restoredState) return;
    
    const dateParam = searchParams.get("date");
    const partyTypeParam = searchParams.get("partyType");
    const guestsParam = searchParams.get("guestCount") || searchParams.get("guests"); // Support both parameter names
    const stepParam = searchParams.get("step");

    // Full quote link takes precedence - if all params present, show results
    if (dateParam && partyTypeParam && guestsParam) {
      // Parse YYYY-MM-DD as a Chicago date (no timezone shifts)
      const [yy, mm, dd] = dateParam.split("-").map((n) => parseInt(n, 10));
      const pad = (n: number) => String(n).padStart(2, "0");
      // Use UTC noon to avoid DST edge cases, then compute the proper Central offset
      const tempUtcNoon = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1, 12, 0, 0));
      const tzParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        timeZoneName: "short",
      }).formatToParts(tempUtcNoon);
      const tzName = tzParts.find((p) => p.type === "timeZoneName")?.value || "";
      const offset = tzName.includes("CDT") ? "-05:00" : "-06:00";
      const chicagoNoon = new Date(`${pad(yy)}-${pad(mm)}-${pad(dd)}T12:00:00${offset}`);

      const type = partyTypeParam;
      const normalizedType = normalizePartyType(type);
      const guests = parseInt(guestsParam);

      setSelectedDate(chicagoNoon);
      setPartyType(normalizedType);
      setGuestCount(guests);
      setMostRecentDate(chicagoNoon);
      setMostRecentPartyType(normalizedType);
      setMostRecentGuestCount(guests);
      // When arriving via a quote link, render results immediately
      setIsLeadCaptured(true);
      setStep(5);
      fetchAvailableSlots(chicagoNoon, normalizedType || (undefined as any), guests);
    } else if (stepParam) {
      // If only step parameter exists (user navigating back/forward), validate required data
      const urlStep = parseInt(stepParam);
      
      // Validate that required data exists for the requested step
      // If not, redirect to the appropriate earlier step
      if (urlStep >= 2 && !partyType) {
        // Need party type for step 2+, go back to step 1
        setStep(1);
        updateStepInUrl(1);
      } else if (urlStep >= 3 && !selectedDate) {
        // Need date for step 3+, go back to step 2
        setStep(2);
        updateStepInUrl(2);
      } else if (urlStep >= 4 && (!selectedDate || !partyType)) {
        // Need both date and party type for step 4+, go back to step 1
        setStep(1);
        updateStepInUrl(1);
      } else if (urlStep >= 1 && urlStep <= 5) {
        // All required data exists, sync with URL
        setStep(urlStep);
      }
    } else if (!dateParam && !partyTypeParam && !guestsParam && !stepParam) {
      // No parameters at all - ensure we start at step 1
      setStep(1);
      updateStepInUrl(1);
    }
  }, [searchParams, restoredState]);

  // Set up real-time subscriptions for booking and time slot changes
  useEffect(() => {
    if (step < 5 || !isLeadCaptured || !selectedDate || !partyType) return;

    const bookingsChannel = supabase
      .channel('newquote-bookings-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload: any) => {
        try {
          const tsId = payload?.new?.time_slot_id;
          const tsStart = payload?.new?.start_at || payload?.new?.time_slot_start_at;
          if (tsStart) {
            const slotDate = new Date(tsStart);
            const s = getChicagoDateParts(slotDate);
            const d = getChicagoDateParts(selectedDate);
            if (s.y === d.y && s.m === d.m && s.d === d.d) {
              fetchAvailableSlots(selectedDate, partyType, guestCount);
            }
          } else if (tsId) {
            // Fallback: refetch for potential same-day impact
            fetchAvailableSlots(selectedDate, partyType, guestCount);
          }
        } catch {}
      })
      .subscribe();

    const slotsChannel = supabase
      .channel('newquote-slots-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'time_slots' }, (payload: any) => {
        try {
          const startAt = payload?.new?.start_at || payload?.old?.start_at;
          if (!startAt) return;
          const slotDate = new Date(startAt);
          const s = getChicagoDateParts(slotDate);
          const d = getChicagoDateParts(selectedDate);
          if (s.y === d.y && s.m === d.m && s.d === d.d) {
            fetchAvailableSlots(selectedDate, partyType, guestCount);
          }
        } catch {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(slotsChannel);
    };
  }, [step, isLeadCaptured, selectedDate, partyType, guestCount]);

  // Auto-resize the iframe when embedded and opt-in via ?autoResize=1
  useEffect(() => {
    try {
      if (!isInIframe()) return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('autoResize') !== '1') return;

      const measure = () => {
        const el = quoteBuilderRef.current;
        const contentHeight = Math.max(
          el ? el.scrollHeight : 0,
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        window.parent.postMessage({ type: 'new-quote-resize', height: contentHeight }, '*');
      };

      // Initial measure
      measure();

      let rafId: number | null = null;
      const ro = new ResizeObserver(() => {
        if (rafId) cancelAnimationFrame(rafId!);
        rafId = requestAnimationFrame(measure);
      });

      if (quoteBuilderRef.current) ro.observe(quoteBuilderRef.current);
      window.addEventListener('load', measure);

      return () => {
        ro.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('load', measure);
      };
    } catch {}
  }, [step, isLoadingSlots, discoSlots.length, privateSlots.length, guestCount, partyType]);

  const updateStepInUrl = (newStep: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("step", newStep.toString());
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleGetStarted = () => {
    setStep(1);
    updateStepInUrl(1);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handlePartyTypeSelect = (type: string) => {
    setPartyType(type);
    trackEvent('party_type_selected', { partyType: type });
    setTimeout(() => {
      setStep(2);
      updateStepInUrl(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Reset all selections when date changes
    setMostRecentTimeStart(null);
    setMostRecentTimeEnd(null);
    setMostRecentBoatName(null);
    setMostRecentPackageType(null);
    setMostRecentExperienceType(null);
    if (date) {
      trackEvent('date_selected', { date: date.toISOString().split('T')[0] });
      setTimeout(() => {
        setStep(3);
        updateStepInUrl(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
    }
  };

  const handleGuestCountChange = (count: number) => {
    setGuestCount(count);
    setMostRecentGuestCount(count); // Update sticky header immediately
  };

  const handleGuestCountSubmit = () => {
    if (guestCount >= 1) {
      trackEvent('guest_count_selected', { guestCount });
      trackEvent('lead_form_shown', { 
        date: selectedDate?.toISOString().split('T')[0],
        partyType,
        guestCount
      });
      setTimeout(() => {
        setStep(4);
        updateStepInUrl(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
    }
  };

  const getCentralOffsetForDate = (date: Date): string => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' }).formatToParts(date);
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
    return tzName.includes('CDT') ? '-05:00' : '-06:00';
  };

  const getChicagoDateParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const y = parts.find(p => p.type === 'year')?.value || '1970';
    const m = parts.find(p => p.type === 'month')?.value || '01';
    const d = parts.find(p => p.type === 'day')?.value || '01';
    return { y, m, d };
  };

  const getChicagoDayBounds = (date: Date) => {
    const { y, m, d } = getChicagoDateParts(date);
    const offset = getCentralOffsetForDate(date);
    const startISO = `${y}-${m}-${d}T00:00:00${offset}`;
    const startDate = new Date(`${y}-${m}-${d}T00:00:00${offset}`);
    const nextDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    const nextParts = getChicagoDateParts(nextDate);
    const nextOffset = getCentralOffsetForDate(nextDate);
    const endISO = `${nextParts.y}-${nextParts.m}-${nextParts.d}T00:00:00${nextOffset}`;
    return { startISO, endISO };
  };

  const fetchAvailableSlots = async (date?: Date, party?: string, guests?: number) => {
    const useDate = date || selectedDate;
    const useParty = party || partyType;
    const useGuests = guests || guestCount;
    
    if (!useDate || !useParty || !useGuests) {
      console.error('fetchAvailableSlots: Missing required parameters', { useDate, useParty, useGuests });
      toast({ title: "Error", description: "Missing booking details", variant: "destructive" });
      return;
    }
    
    // Throttle duplicate/synchronous requests for same params
    const key = `${(useDate as Date).toISOString().slice(0,10)}|${useParty}|${useGuests}`;
    const now = Date.now();
    if (
      fetchGuardRef.current.inFlight ||
      (fetchGuardRef.current.lastKey === key && now - fetchGuardRef.current.lastTime < 3000)
    ) {
      return;
    }
    fetchGuardRef.current.inFlight = true;
    fetchGuardRef.current.lastKey = key;

    setIsLoadingSlots(true);

    // Safety: auto-clear spinner if request hangs
    const slowLoadTimer = window.setTimeout(() => {
      if (fetchGuardRef.current.inFlight) {
        setIsLoadingSlots(false);
        fetchGuardRef.current.inFlight = false;
        fetchGuardRef.current.lastTime = Date.now();
        toast({ title: "Still loading", description: "Availability is taking longer than expected. Please try again.", variant: "destructive" });
      }
    }, 15000);
    
    try {
      // If selected date is Friday, Saturday, or Sunday, fetch all three days
      const dayOfWeek = useDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
      
      let startISO: string, endISO: string;
      
      if (isWeekend) {
        // Get the Friday of this weekend
        let fridayDate: Date;
        if (dayOfWeek === 5) {
          // Selected date is Friday
          fridayDate = useDate;
        } else if (dayOfWeek === 6) {
          // Selected date is Saturday, go back 1 day to Friday
          fridayDate = new Date(useDate);
          fridayDate.setDate(fridayDate.getDate() - 1);
        } else {
          // Selected date is Sunday, go back 2 days to Friday
          fridayDate = new Date(useDate);
          fridayDate.setDate(fridayDate.getDate() - 2);
        }
        
        // Get Monday (day after Sunday)
        const mondayDate = new Date(fridayDate);
        mondayDate.setDate(mondayDate.getDate() + 3);
        
        // Get bounds from Friday 00:00 to Monday 00:00 (includes Friday, Saturday, Sunday)
        const fridayBounds = getChicagoDayBounds(fridayDate);
        const mondayBounds = getChicagoDayBounds(mondayDate);
        
        startISO = fridayBounds.startISO;
        endISO = mondayBounds.startISO; // Monday 00:00 (exclusive)
      } else {
        // Not a weekend day, fetch only the selected date
        const bounds = getChicagoDayBounds(useDate);
        startISO = bounds.startISO;
        endISO = bounds.endISO;
      }
      
      // Fetch all time slots for the selected date range
      const { data, error } = await supabase
        .from("time_slots")
        .select(`
          *,
          boat:boats(*),
          experience:experiences(*)
        `)
        .gte("start_at", startISO)
        .lt("start_at", endISO)
        .in("status", ["open", "held"]) 
        .order("start_at");

      if (error) throw error;

      // Fetch all confirmed bookings for the selected date to check for conflicts
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          time_slot:time_slots(
            start_at,
            end_at,
            boat_id
          )
        `)
        .in("status", ["confirmed", "deposit_paid"]);

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
      }

      // Filter bookings to only those on the selected date
      const dayBookings = (bookingsData || []).filter((booking: any) => {
        if (!booking.time_slot) return false;
        const bookingDate = new Date(booking.time_slot.start_at);
        const { y: bY, m: bM, d: bD } = getChicagoDateParts(bookingDate);
        const { y: sY, m: sM, d: sD } = getChicagoDateParts(useDate as Date);
        return bY === sY && bM === sM && bD === sD;
      });

      // Filter slots to exclude conflicts for private cruises only (disco is per-person)
      const availableSlots = (data || []).filter((slot: any) => {
        // For Disco Cruise (per-person), do not exclude due to existing bookings; capacity check already applied
        if (slot.experience?.type === 'disco_cruise') return true;

        if (!dayBookings || dayBookings.length === 0) return true;
        
        // Check if this slot conflicts with any existing booking on the same boat
        const hasConflict = dayBookings.some((booking: any) => {
          if (!booking.time_slot) return false;
          
          // Only check bookings on the same boat
          if (booking.time_slot.boat_id !== slot.boat_id) return false;
          
          const bookingStart = new Date(booking.time_slot.start_at);
          const bookingEnd = new Date(booking.time_slot.end_at);
          // Add 30-minute buffer after booking ends
          const bookingEndWithBuffer = new Date(bookingEnd.getTime() + 30 * 60 * 1000);
          
          const slotStart = new Date(slot.start_at);
          const slotEnd = new Date(slot.end_at);
          
          // Check if slot overlaps with booking + buffer
          // Conflict if: slot starts before booking ends (with buffer) AND slot ends after booking starts
          return slotStart < bookingEndWithBuffer && slotEnd > bookingStart;
        });
        
        return !hasConflict;
      });

      const normalizedForDisco = normalizePartyType(useParty);
      const discoEligible = ['bachelor_party','bachelorette_party','combined_bach'].includes(normalizedForDisco || '');

      const discoByWindow = new Map<string, any>();
      availableSlots.forEach((slot: any) => {
        if (slot.experience?.type !== 'disco_cruise' || !discoEligible) return;

        const slotDate = new Date(slot.start_at);
        const validation = validateDiscoSlot(slotDate, slot.boat?.name || '', slot.experience?.type || '');
        if (!validation.isValid) return;

        const chicagoDay = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Chicago',
          weekday: 'short'
        }).format(slotDate);
        const chicagoStart = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Chicago',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        }).format(slotDate);

        const isCanonicalDiscoSlot =
          (chicagoDay === 'Fri' && chicagoStart === '12:00') ||
          (chicagoDay === 'Sat' && chicagoStart === '11:00') ||
          (chicagoDay === 'Sat' && chicagoStart === '15:30');

        if (!isCanonicalDiscoSlot) return;

        const windowKey = `${slot.start_at}_${slot.end_at}`;
        const existing = discoByWindow.get(windowKey);

        if (!existing || (slot.capacity_available ?? 0) > (existing.capacity_available ?? 0)) {
          discoByWindow.set(windowKey, slot);
        }
      });

      const disco = Array.from(discoByWindow.values()).sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );

      const privateCruiseSlots = availableSlots.filter((slot: any) => slot.experience?.type === 'private_cruise');

      const slotGroups = new Map<string, any[]>();
      privateCruiseSlots.forEach((slot: any) => {
        const boatCapacity = (slot.boat?.capacity ?? slot.capacity_total ?? 0);
        const boatGroup = slot.boat?.boat_group ?? null;
        const timeKey = `${slot.start_at}_${slot.end_at}`;

        if (useGuests > 14 && useGuests <= 30) {
          if (boatGroup) {
            const groupKey = `${boatGroup}_${timeKey}`;
            if (!slotGroups.has(groupKey)) slotGroups.set(groupKey, []);
            slotGroups.get(groupKey)!.push(slot);
          } else if (boatCapacity >= useGuests && boatCapacity <= 30) {
            slotGroups.set(slot.id, [slot]);
          }
        } else if (useGuests <= 14) {
          if (boatCapacity >= useGuests && boatCapacity <= 14) {
            slotGroups.set(slot.id, [slot]);
          }
        } else if (useGuests > 30) {
          if (boatCapacity >= useGuests) {
            slotGroups.set(slot.id, [slot]);
          }
        }
      });

      // Convert grouped slots to display format
      const privateCruises = Array.from(slotGroups.entries()).map(([key, slots]) => {
        if (slots.length > 1) {
          const maxCapacity = Math.max(...slots.map(s => (s.boat?.capacity ?? s.capacity_total ?? 0)));
          const groupLabel = slots[0].boat?.boat_group || `${slots[0].boat?.name || 'Boat'} Group`;
          return {
            ...slots[0],
            boat: {
              name: groupLabel,
              capacity: maxCapacity
            },
            grouped_slot_ids: slots.map(s => s.id),
            availability_count: slots.length
          };
        } else {
          // Single boat slot
          return slots[0];
        }
      });

      setDiscoSlots(disco);
      setPrivateSlots(privateCruises);

      // If no private slots found for requested capacity, check for smaller boats
      if (privateCruises.length === 0 && useGuests > 14) {
        const { data: allSlotsData, error: allSlotsError } = await supabase
          .from("time_slots")
          .select(`
            *,
            boat:boats(*),
            experience:experiences(*)
          `)
          .gte("start_at", startISO)
          .lt("start_at", endISO)
          .in("status", ["open", "held"])
          .order("start_at");

        if (!allSlotsError && allSlotsData) {
          const smallerSlots = allSlotsData
            .filter((slot: any) => {
              if (slot.experience?.type !== 'private_cruise') return false;
              
              // Check if this slot conflicts with any existing booking
              if (dayBookings && dayBookings.length > 0) {
                const hasConflict = dayBookings.some((booking: any) => {
                  if (!booking.time_slot || booking.time_slot.boat_id !== slot.boat_id) return false;
                  const bookingStart = new Date(booking.time_slot.start_at);
                  const bookingEnd = new Date(booking.time_slot.end_at);
                  const bookingEndWithBuffer = new Date(bookingEnd.getTime() + 30 * 60 * 1000);
                  const slotStart = new Date(slot.start_at);
                  const slotEnd = new Date(slot.end_at);
                  return slotStart < bookingEndWithBuffer && slotEnd > bookingStart;
                });
                if (hasConflict) return false;
              }
              
              // Only include boats smaller than what they requested but with reasonable capacity
              const capacity = slot.capacity_total;
              if (useGuests > 30) {
                // They requested Clever Girl, suggest Meeseeks/Irony (30)
                return capacity === 30;
              } else if (useGuests > 14) {
                // They requested Meeseeks/Irony, suggest Day Tripper (14)
                return capacity === 14;
              }
              return false;
            })
            .map((slot: any) => ({
              id: slot.id,
              boat_name: slot.boat?.name || 'Boat',
              capacity: slot.capacity_total,
              start_at: slot.start_at,
              end_at: slot.end_at
            }));

          setSmallerBoatSlots(smallerSlots);
        } else {
          setSmallerBoatSlots([]);
        }
      } else {
        setSmallerBoatSlots([]);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to load available slots", 
        variant: "destructive" 
      });
      // Reset slots to empty arrays on error
      setDiscoSlots([]);
      setPrivateSlots([]);
      setSmallerBoatSlots([]);
    } finally {
      setIsLoadingSlots(false);
      fetchGuardRef.current.inFlight = false;
      fetchGuardRef.current.lastTime = Date.now();
      clearTimeout(slowLoadTimer);
    }
  };

  const handleDiscoBook = async (slotId: string, packageType: string, ticketCount: number) => {
    // Track package selection
    const slot = discoSlots.find(s => s.id === slotId);
    if (slot && selectedDate && partyType) {
      trackEvent('package_selected', {
        date: selectedDate.toISOString().split('T')[0],
        partyType,
        guestCount,
        packageType,
        boatName: slot.boat?.name,
        timeSlotId: slotId,
      });
      
      trackAbandoned({
        eventDate: selectedDate,
        partyType,
        guestCount,
        timeSlotId: slotId,
        boatName: slot.boat?.name,
        startTime: slot.start_at,
        endTime: slot.end_at,
        packageType,
        ticketCount,
      }, 'selected_package');
    }
    
    toast({ title: "Booking in progress", description: "Redirecting to payment..." });
    // TODO: Implement payment flow
  };

  const handlePrivateBook = async (slotId: string, packageType: 'standard' | 'essentials' | 'ultimate') => {
    // Track package selection
    const slot = privateSlots.find(s => s.id === slotId);
    if (slot && selectedDate && partyType) {
      trackEvent('package_selected', {
        date: selectedDate.toISOString().split('T')[0],
        partyType,
        guestCount,
        packageType,
        boatName: slot.boat?.name,
        timeSlotId: slotId,
      });
      
      trackAbandoned({
        eventDate: selectedDate,
        partyType,
        guestCount,
        timeSlotId: slotId,
        boatName: slot.boat?.name,
        startTime: slot.start_at,
        endTime: slot.end_at,
        packageType,
      }, 'selected_package');
    }
    
    toast({ title: "Booking in progress", description: "Redirecting to payment..." });
    // TODO: Implement payment flow
  };

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    setMostRecentDate(newDate);
    if (step >= 5 && isLeadCaptured) {
      fetchAvailableSlots(newDate, partyType!, guestCount);
    }
  };

  const handlePartyTypeChange = (type: string) => {
    setPartyType(type);
    setMostRecentPartyType(type);
    if (step >= 5 && isLeadCaptured) {
      fetchAvailableSlots(selectedDate!, type, guestCount);
    }
  };

  const handleGuestCountEditChange = (count: number) => {
    setGuestCount(count);
    setMostRecentGuestCount(count);
    if (step >= 5 && isLeadCaptured) {
      fetchAvailableSlots(selectedDate!, partyType!, count);
    }
  };

  const handleLeadCaptured = (data: { firstName: string; lastName: string; email: string; phone: string; quoteNumber?: string }) => {
    setCustomerData(data);
    setQuoteNumber(data.quoteNumber);
    setIsLeadCaptured(true);
    
    // Track lead form completion
    trackEvent('lead_form_completed', {
      date: selectedDate?.toISOString().split('T')[0],
      partyType,
      guestCount,
    });
    
    // Capture lead info for abandoned booking tracking
    captureLeadInfo({
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    
    // Clear any previous selection saved for a different session/date
    try {
      sessionStorage.removeItem('private.selection');
      sessionStorage.removeItem('disco.selection');
    } catch {}
    
    // Track abandoned booking at lead capture stage
    if (selectedDate && partyType) {
      trackAbandoned({
        eventDate: selectedDate,
        partyType,
        guestCount,
      }, 'lead_capture');
    }
    
    // Create initial saved quote record
    saveQuoteState({
      quoteNumber: data.quoteNumber,
      customerName: `${data.firstName} ${data.lastName}`,
      customerEmail: data.email,
      customerPhone: data.phone,
    });
    
    setTimeout(() => {
      setStep(5);
      updateStepInUrl(5);
      fetchAvailableSlots(selectedDate!, partyType!, guestCount);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  // Save quote state to database
  const saveQuoteState = async (updates: {
    quoteNumber?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    experienceType?: 'disco_cruise' | 'private_cruise';
    discoPackage?: string;
    privateCapacity?: string;
    packageType?: string;
    selectedBoatName?: string;
    selectedTimeStart?: string;
    selectedTimeEnd?: string;
    timeSlotId?: string;
    selectedAddons?: any;
    pricingDetails?: any;
    lastStep?: string;
  }) => {
    if (!selectedDate || !partyType) return;

    try {
      const quoteNum = updates.quoteNumber || quoteNumber;
      if (!quoteNum) return;

      // Construct full customer name, ensuring we don't save empty string
      const fullName = updates.customerName || `${customerData.firstName} ${customerData.lastName}`.trim();
      const customerNameToSave = fullName || null; // Save null instead of empty string

      const saveData = {
        quote_number: quoteNum,
        event_date: format(selectedDate, 'yyyy-MM-dd'),
        party_type: partyType,
        guest_count: guestCount,
        customer_name: customerNameToSave,
        customer_email: updates.customerEmail || customerData.email || null,
        customer_phone: updates.customerPhone || customerData.phone || null,
        experience_type: updates.experienceType || selectedExperienceType,
        disco_package: updates.discoPackage || selectedDiscoPackage,
        private_capacity: updates.privateCapacity || selectedCapacity,
        package_type: updates.packageType || mostRecentPackageType,
        selected_boat_name: updates.selectedBoatName || mostRecentBoatName,
        selected_time_start: updates.selectedTimeStart || mostRecentTimeStart,
        selected_time_end: updates.selectedTimeEnd || mostRecentTimeEnd,
        time_slot_id: updates.timeSlotId,
        selected_addons: updates.selectedAddons,
        pricing_details: updates.pricingDetails,
        last_step: updates.lastStep || 'quote_display',
        status: 'active',
        last_viewed_at: new Date().toISOString(),
      };

      if (savedQuoteId) {
        // Update existing
        await supabase
          .from('saved_quotes')
          .update(saveData)
          .eq('id', savedQuoteId);
      } else {
        // Create new
        const { data, error } = await supabase
          .from('saved_quotes')
          .insert(saveData)
          .select()
          .single();
        
        if (data && !error) {
          setSavedQuoteId(data.id);
        }
      }
    } catch (err) {
      console.error('Error saving quote state:', err);
    }
  };

  const getQuoteUrl = () => {
    // Format date in Chicago timezone to prevent day shifts
    const chicagoDateStr = selectedDate ? 
      new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Chicago', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(selectedDate) : '';
    
    const params = new URLSearchParams({
      date: chicagoDateStr,
      partyType: partyType || '',
      guestCount: guestCount.toString()
    });
    return `/new-quote?${params.toString()}`;
  };

  const isBachParty = !!(partyType && ["bachelor_party", "bachelorette_party", "combined_bach"].includes(partyType));

  return (
    <div ref={quoteBuilderRef} className={`bg-gradient-to-b from-background to-muted/30 relative ${!isInIframe() ? 'min-h-screen' : ''}`}>
      {/* Scrolling Background - Always show for visual appeal */}
      <Suspense fallback={null}>
        <ScrollingBackground />
      </Suspense>
      
      {/* Quote Builder Header - only on Step 1 */}
      {step === 1 && (
        <QuoteBuilderHeader
          selectedDate={selectedDate}
          partyType={undefined}
          guestCount={undefined}
          showStaticInfo
        />
      )}
      
      <div className={`max-w-6xl mx-auto px-2 sm:px-4 relative z-10 ${step === 5 ? 'py-0 sm:py-2' : 'py-3 sm:py-6 md:py-8'}`}>
        {/* Step 1: Party Type */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 border-4 border-primary/80 shadow-2xl max-w-full">
            <PartyTypeSelector
              selectedType={partyType}
              onTypeSelect={handlePartyTypeSelect}
            />
          </div>
        )}

        {/* Step 2: Date Selection */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <DateSelector 
                selectedDate={selectedDate} 
                onDateSelect={handleDateSelect}
              />
            </div>
          )}

        {/* Step 3: Guest Count */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 border-4 border-primary/80 shadow-2xl">
            <GuestCountSelector
              guestCount={guestCount}
              onGuestCountChange={handleGuestCountChange}
              onSubmit={handleGuestCountSubmit}
            />
          </div>
        )}

        {/* Step 4: Lead Capture (Embedded) */}
        {step === 4 && selectedDate && partyType && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 border-4 border-primary/80 shadow-2xl">
            <LeadCaptureForm
              eventDate={selectedDate}
              partyType={partyType}
              guestCount={guestCount}
              quoteUrl={getQuoteUrl()}
              onLeadCreated={handleLeadCaptured}
            />
          </div>
        )}

        {/* Step 5: Cruise Selection (shown after lead capture OR deep-link) */}
        {step === 5 && selectedDate && partyType && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isLoadingSlots && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Finding your perfect cruise...</p>
              </div>
            )}

            {!isLoadingSlots && (
              <>
                {/* Show formal quote display for all party types */}
                {(discoSlots.length > 0 || privateSlots.length > 0) && (
                  <FormalQuoteDisplay
                    discoSlots={discoSlots}
                    privateSlots={privateSlots}
                    guestCount={guestCount}
                    eventDate={selectedDate}
                    customerEmail={customerData.email}
                    customerName={`${customerData.firstName} ${customerData.lastName}`.trim()}
                    customerPhone={customerData.phone}
                    partyType={partyType}
                    quoteNumber={quoteNumber}
                    onDiscoBook={handleDiscoBook}
                    onPrivateBook={handlePrivateBook}
                    onGuestCountChange={(newCount) => {
                      setGuestCount(newCount);
                      setMostRecentGuestCount(newCount);
                      fetchAvailableSlots(selectedDate, partyType, newCount);
                    }}
                    onEventDateChange={(newDate) => {
                      setSelectedDate(newDate);
                      setMostRecentDate(newDate);
                      fetchAvailableSlots(newDate, partyType, guestCount);
                    }}
                    onPartyTypeChange={(newType) => {
                      setPartyType(newType);
                      setMostRecentPartyType(newType);
                      fetchAvailableSlots(selectedDate, newType, guestCount);
                    }}
                     onBookOnline={(experienceType, capacity, discoPackage) => {
                      setSelectedExperienceType(experienceType);
                      setSelectedCapacity(capacity);
                      setSelectedDiscoPackage(discoPackage);
                      
                      // Scroll to widget after a short delay to allow state to update
                      setTimeout(() => {
                        xolaWidgetRef.current?.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center' 
                        });
                      }, 100);
                    }}
                    onSelectionChange={(updates) => {
                      // Save state whenever selections change
                      saveQuoteState(updates);
                    }}
                    savedQuoteId={savedQuoteId}
                    restoredSlotId={restoredSlotId}
                    restoredPackage={restoredPackage}
                    restoredAddons={restoredAddons}
                  />
                )}
                
                {/* Xola Booking Widget - Always visible after lead capture */}
                <div ref={xolaWidgetRef} className="mt-8 -mx-2 sm:mx-0">
                  <XolaBookingWidget />
                </div>

                {/* No Availability - Show Smaller Boat Suggestion if available, then Alternative Dates */}
                {discoSlots.length === 0 && privateSlots.length === 0 && (
                  <Suspense fallback={<div className="py-4 text-center text-muted-foreground">Loading alternatives...</div>}>
                    <div className="space-y-4">
                      {smallerBoatSlots.length > 0 && (
                        <SmallerBoatSuggestion
                          requestedGuestCount={guestCount}
                          eventDate={selectedDate}
                          availableSlots={smallerBoatSlots}
                          onGuestCountChange={(newCount) => {
                            setGuestCount(newCount);
                            fetchAvailableSlots(selectedDate, partyType, newCount);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      )}
                      <AlternativeDatesSelector
                        currentDate={selectedDate}
                        onDateChange={(date) => {
                          setSelectedDate(date);
                          fetchAvailableSlots(date, partyType, guestCount);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    </div>
                  </Suspense>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewQuote;
