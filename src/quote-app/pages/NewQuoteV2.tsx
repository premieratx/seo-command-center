import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { QuoteBuilderHeader } from "@/quote-app/components/quote-builder/QuoteBuilderHeader";
import { DateSelector } from "@/quote-app/components/quote-builder/DateSelector";
import { PartyTypeSelector } from "@/quote-app/components/quote-builder/PartyTypeSelector";
import { GuestCountSelector } from "@/quote-app/components/quote-builder/GuestCountSelector";
import { SelectionSummaryHeader } from "@/quote-app/components/quote-builder/SelectionSummaryHeader";
import { DiscoCruiseSelectorV2 } from "@/quote-app/components/quote-builder/DiscoCruiseSelectorV2";
import { PrivateCruiseSelector } from "@/quote-app/components/quote-builder/PrivateCruiseSelector";
import { LeadCaptureForm } from "@/quote-app/components/quote-builder/LeadCaptureForm";
import { FormalQuoteDisplay } from "@/quote-app/components/quote-builder/FormalQuoteDisplay";
import { getMidnightDeadline } from "@/quote-app/components/quote-builder/EOYSaleBanner";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";
import { SEOHead } from "@/quote-app/components/SEOHead";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, Anchor } from "lucide-react";
import { Button } from "@/quote-app/components/ui/button";
import { useToast } from "@/quote-app/hooks/use-toast";
import { useQuoteAnalytics } from "@/quote-app/hooks/useQuoteAnalytics";
import { useAbandonedBookingTracking } from "@/quote-app/hooks/useAbandonedBookingTracking";
import { useEngagementTracking, useScrollTracking } from "@/quote-app/hooks/useEngagementTracking";
import { validateDiscoSlot } from "@/quote-app/lib/discoRules";
import { generateStaticSlots } from "@/quote-app/lib/staticSchedule";
import { ScrollingBackground } from "@/quote-app/components/ScrollingBackground";

// Lazy load non-critical components for faster initial render when embedded
const HeroSection = lazy(() => import("@/quote-app/components/HeroSection").then(m => ({ default: m.HeroSection })));
const AlternativeDatesSelector = lazy(() => import("@/quote-app/components/quote-builder/AlternativeDatesSelector").then(m => ({ default: m.AlternativeDatesSelector })));
const PricingComparison = lazy(() => import("@/quote-app/components/quote-builder/PricingComparison").then(m => ({ default: m.PricingComparison })));
const SmallerBoatSuggestion = lazy(() => import("@/quote-app/components/quote-builder/SmallerBoatSuggestion").then(m => ({ default: m.SmallerBoatSuggestion })));

const isInIframe = () => {
  try { return window.self !== window.top; } catch { return true; }
};
const NewQuoteV2 = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent, abVariant } = useQuoteAnalytics();
  const { leadInfo, trackAbandoned, captureLeadInfo } = useAbandonedBookingTracking();
  const [leadId, setLeadId] = useState<string | undefined>();
  const engagement = useEngagementTracking(leadId, undefined); // quoteNumber set later
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
  const [quoteCreatedAt, setQuoteCreatedAt] = useState<string | undefined>();
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<string | null | undefined>(undefined);
  const [sliderTouched, setSliderTouched] = useState(false);
  const [nextButtonFlash, setNextButtonFlash] = useState(false);
  
  const quoteBuilderRef = useRef<HTMLDivElement>(null);
  const xolaWidgetRef = useRef<HTMLDivElement>(null);
  
  // Initialize scroll tracking for step 5 (window scroll since content flows with page)
  // Only track when at step 5 and lead is captured
  useScrollTracking(step === 5 && isLeadCaptured ? null : { current: null }, engagement);
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
      if (restoredState) return;
      const quoteNum = searchParams.get("quoteNumber");
      
      let savedQuote: any = null;

      try {
        if (quoteNum) {
          // Direct lookup by quote number
          const { data, error } = await supabase
            .from('saved_quotes')
            .select('*')
            .eq('quote_number', quoteNum)
            .single();
          if (!error && data) savedQuote = data;
        }
        
        // No fallback lookup - quoteNumber is required to load a saved quote
        // This prevents loading the wrong person's quote when params match


        if (!savedQuote) return;

        // Restore all saved state
        setSavedQuoteId(savedQuote.id);
        setQuoteNumber(savedQuote.quote_number);
        setQuoteCreatedAt(savedQuote.created_at);
        // Set expires_at - null means use global Jan 16 deadline (existing quotes)
        setQuoteExpiresAt(savedQuote.expires_at || null);
        
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
      // Only skip lead capture if this is a returning visitor with a real saved quote
      // (identified by ?quoteNumber=...). Otherwise, require lead capture before showing results.
      const hasQuoteNumber = !!searchParams.get("quoteNumber");
      const requestedStep = parseInt(searchParams.get("step") || "0", 10);
      if (hasQuoteNumber) {
        setIsLeadCaptured(true);
        setStep(5);
        fetchAvailableSlots(chicagoNoon, normalizedType || (undefined as any), guests);
      } else {
        // Land on the lead capture step (or whatever step the URL explicitly requested, max 4)
        setStep(Math.min(Math.max(requestedStep || 4, 1), 4));
      }
    } else if (stepParam) {
      // If only step parameter exists (user navigating back/forward), validate required data
      const urlStep = parseInt(stepParam);
      
      // A/B Test validation: 
      // Variant A = Date first (step 1), Party Type (step 2)
      // Variant B = Party Type first (step 1), Date (step 2)
      const step1Data = abVariant === 'A' ? selectedDate : partyType;
      const step2Data = abVariant === 'A' ? partyType : selectedDate;
      
      // Validate that required data exists for the requested step
      // If not, redirect to the appropriate earlier step
      if (urlStep >= 2 && !step1Data) {
        // Need step 1 data for step 2+, go back to step 1
        setStep(1);
        updateStepInUrl(1);
      } else if (urlStep >= 3 && !step2Data) {
        // Need step 2 data for step 3+, go back to step 2
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

  // Real-time subscriptions removed — static schedule doesn't need live updates

  // Notify parent (lead dashboard) when party type or guest count changes
  useEffect(() => {
    if (!isInIframe()) return;
    window.parent.postMessage({
      type: 'quote-v2-selections',
      partyType,
      guestCount,
    }, '*');
  }, [partyType, guestCount]);


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
        
        // Send exact content height — no multipliers or padding
        const adjustedHeight = contentHeight;
        
        window.parent.postMessage({ type: 'quote-v2-resize', height: adjustedHeight }, '*');
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
  }, [quoteBuilderRef, step]);

  // Entrance animation for step 3: flash Next button after slider flash
  useEffect(() => {
    if (step !== 3) {
      setNextButtonFlash(false);
      return;
    }
    
    // Flash Next button 4 times with slow, relaxing pulses then stop
    const flash1 = setTimeout(() => setNextButtonFlash(true), 1300);
    const flash1Off = setTimeout(() => setNextButtonFlash(false), 1800);
    const flash2 = setTimeout(() => setNextButtonFlash(true), 2400);
    const flash2Off = setTimeout(() => setNextButtonFlash(false), 2900);
    const flash3 = setTimeout(() => setNextButtonFlash(true), 3500);
    const flash3Off = setTimeout(() => setNextButtonFlash(false), 4000);
    const flash4 = setTimeout(() => setNextButtonFlash(true), 4600);
    const flash4Off = setTimeout(() => setNextButtonFlash(false), 5100);
    
    return () => {
      clearTimeout(flash1);
      clearTimeout(flash1Off);
      clearTimeout(flash2);
      clearTimeout(flash2Off);
      clearTimeout(flash3);
      clearTimeout(flash3Off);
      clearTimeout(flash4);
      clearTimeout(flash4Off);
    };
  }, [step]);

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
    // Automatically advance to next step (guest count)
    setTimeout(() => {
      setStep(3);
      updateStepInUrl(3);
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

  const fetchAvailableSlots = (date?: Date, party?: string, guests?: number) => {
    const useDate = date || selectedDate;
    const useParty = party || partyType;
    const useGuests = guests || guestCount;
    
    if (!useDate || !useParty || !useGuests) {
      console.error('fetchAvailableSlots: Missing required parameters', { useDate, useParty, useGuests });
      return;
    }

    // Generate static slots — no database lookups
    const { discoSlots: disco, privateSlots: priv, smallerBoatSlots: smaller } = generateStaticSlots(useDate, useParty, useGuests);
    
    setDiscoSlots(disco);
    setPrivateSlots(priv);
    setSmallerBoatSlots(smaller);
    setIsLoadingSlots(false);
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

  const handleLeadCaptured = (data: { firstName: string; lastName: string; email: string; phone: string; quoteNumber?: string; leadId?: string }) => {
    setCustomerData(data);
    setQuoteNumber(data.quoteNumber);
    if (data.leadId) {
      setLeadId(data.leadId);
    }
    setIsLeadCaptured(true);
    
    // Track lead form completion
    trackEvent('lead_form_completed', {
      date: selectedDate?.toISOString().split('T')[0],
      partyType,
      guestCount,
    });
    
    // Track engagement - quote opened for the first time
    engagement.trackQuoteOpened();
    
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
        // Update existing - do NOT modify expires_at
        await supabase
          .from('saved_quotes')
          .update(saveData)
          .eq('id', savedQuoteId);
      } else {
        // Create new - set expires_at to 10 days from now
        const newExpiresAt = getMidnightDeadline(10);
        const { data, error } = await supabase
          .from('saved_quotes')
          .insert({ ...saveData, expires_at: newExpiresAt })
          .select()
          .single();
        
        if (data && !error) {
          setSavedQuoteId(data.id);
          setQuoteCreatedAt(data.created_at);
          setQuoteExpiresAt(newExpiresAt);
          // Add quoteNumber to URL so reopening restores the saved quote data
          const newParams = new URLSearchParams(searchParams);
          newParams.set('quoteNumber', quoteNum);
          setSearchParams(newParams, { replace: true });
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
    if (quoteNumber) {
      params.set('quoteNumber', quoteNumber);
    }
    return `/quote-v2?${params.toString()}`;
  };

  const isBachParty = !!(partyType && ["bachelor_party", "bachelorette_party", "combined_bach"].includes(partyType));

  const handleBack = () => {
    if (step > 1) {
      updateStepInUrl(step - 1);
    }
  };

  const handleForward = () => {
    // A/B Test: Variant A = Date first (step 1), Variant B = Party Type first (step 1)
    if (step === 1) {
      const step1Complete = abVariant === 'A' ? !!selectedDate : !!partyType;
      if (step1Complete) updateStepInUrl(2);
    } else if (step === 2) {
      const step2Complete = abVariant === 'A' ? !!partyType : !!selectedDate;
      if (step2Complete) updateStepInUrl(3);
    } else if (step === 3 && guestCount) {
      updateStepInUrl(4);
    } else if (step === 4 && isLeadCaptured) {
      updateStepInUrl(5);
    }
  };

  const canGoForward = () => {
    // A/B Test: Variant A = Date first (step 1), Variant B = Party Type first (step 1)
    if (step === 1) return abVariant === 'A' ? !!selectedDate : !!partyType;
    if (step === 2) return abVariant === 'A' ? !!partyType : !!selectedDate;
    if (step === 3) return guestCount > 0;
    if (step === 4) return isLeadCaptured;
    return false;
  };

  return (
    <>
      <SEOHead 
        title={quoteNumber && customerData.firstName 
          ? `${customerData.firstName}'s Party Quote - Premier Party Cruises` 
          : "Instant Quote - Premier Party Cruises | Lake Travis Boat Rentals"}
        description="Get an instant quote for private boat cruises and disco party experiences on Lake Travis. Bachelor parties, corporate events, birthdays. Up to 75 guests."
        image="/og-images/instant-quote.png"
        url="/quote-v2"
        quoteNumber={quoteNumber}
      />
    <div ref={quoteBuilderRef} className="relative min-h-screen">
      {/* Scrolling Background - always visible */}
      <ScrollingBackground />
      
      <div className={`max-w-6xl mx-auto px-2 sm:px-4 relative z-10 ${step === 5 ? 'py-0 sm:py-2' : 'pt-4'}`}>
        {/* Banner removed from /quote-v2 - keep at /eoy-sale-banner-embed etc. */}
        {/* Standardized Container for Steps 1-4 - Fixed height with locked header/footer */}
        {step >= 1 && step <= 4 && (
          <div className="w-full max-w-[700px] mx-auto h-[600px] flex flex-col">
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border-4 border-primary/80 shadow-2xl overflow-hidden flex flex-col h-full">
              {/* Fixed Header Area - Only for steps 1-3 */}
              {step <= 3 && (
                <div className="border-b border-primary/20 bg-background/50 p-4 sm:p-6 flex-shrink-0">
                  {/* A/B Test: Variant A = Date first, Variant B = Party Type first */}
                  {step === 1 && abVariant === 'A' && (
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-0.5">
                        When's Your Cruise?
                      </h2>
                      <p className="text-base sm:text-lg md:text-xl font-semibold text-foreground/80">
                        Request Your Instant Quote to Lock In Your $150 Discount!
                      </p>
                    </div>
                  )}
                  {step === 1 && abVariant === 'B' && (
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                        What's the Occasion?
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Choose your party type
                      </p>
                    </div>
                  )}
                  {step === 2 && abVariant === 'A' && (
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                        What's the Occasion?
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Choose your party type
                      </p>
                    </div>
                  )}
                  {step === 2 && abVariant === 'B' && (
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-0.5">
                        When's Your Cruise?
                      </h2>
                      <p className="text-base sm:text-lg md:text-xl font-semibold text-foreground/80">
                        Request Your Instant Quote to Lock In Your $150 Discount!
                      </p>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                        How Many Guests?
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Enter your guest count
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Scrollable Content Container (no scroll on step 4) */}
              <div className={`flex-1 ${step === 4 ? 'p-4 sm:p-6' : 'overflow-y-auto p-4 sm:p-6'}`}>
                {/* Step 1: Variant A = Date, Variant B = Party Type */}
                {step === 1 && abVariant === 'A' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col items-center justify-center">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">Select your desired date</p>
                    <DateSelector 
                      selectedDate={selectedDate} 
                      onDateSelect={handleDateSelect}
                    />
                  </div>
                )}
                {step === 1 && abVariant === 'B' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                    <PartyTypeSelector
                      selectedType={partyType}
                      onTypeSelect={handlePartyTypeSelect}
                    />
                  </div>
                )}

                {/* Step 2: Variant A = Party Type, Variant B = Date */}
                {step === 2 && abVariant === 'A' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                    <PartyTypeSelector
                      selectedType={partyType}
                      onTypeSelect={handlePartyTypeSelect}
                    />
                  </div>
                )}
                {step === 2 && abVariant === 'B' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col items-center justify-center">
                    {partyType && ['bachelor_party', 'bachelorette_party', 'combined_bach'].includes(partyType) && (
                      <p className="text-xs text-center text-muted-foreground mb-3">
                        🪩 ATX Disco Cruise starts in March and runs through the end of October.
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">Select your desired date</p>
                    <DateSelector 
                      selectedDate={selectedDate} 
                      onDateSelect={handleDateSelect}
                    />
                  </div>
                )}

                {/* Step 3: Guest Count */}
                {step === 3 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                    <GuestCountSelector
                      guestCount={guestCount}
                      onGuestCountChange={(count) => {
                        handleGuestCountChange(count);
                        setSliderTouched(true);
                      }}
                    />
                  </div>
                )}

                {/* Step 4: Lead Capture */}
                {step === 4 && selectedDate && partyType && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                    <LeadCaptureForm
                      eventDate={selectedDate}
                      partyType={partyType}
                      guestCount={guestCount}
                      quoteUrl={getQuoteUrl()}
                      onLeadCreated={handleLeadCaptured}
                    />
                  </div>
                )}
              </div>

              {/* Fixed Navigation Footer - Always visible at bottom */}
              {/* Uses sticky positioning with high z-index to ensure visibility on all devices */}
              <div className="border-t border-primary/20 bg-background/95 backdrop-blur-sm p-4 flex-shrink-0 sticky bottom-0 z-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex justify-between items-center">
                  <div className="w-24">
                    {step > 1 && (
                      <Button
                        onClick={handleBack}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        Back
                      </Button>
                    )}
                  </div>
                  <div className="w-24 flex justify-end">
                    {step < 4 && (
                      <Button
                        onClick={handleForward}
                        disabled={!canGoForward()}
                        size="lg"
                        className={`gap-2 transition-all duration-200 ${
                          step === 3 && nextButtonFlash 
                            ? 'ring-4 ring-yellow-400/60 ring-offset-2 ring-offset-background shadow-[0_0_15px_rgba(234,179,8,0.6)]' 
                            : ''
                        }`}
                      >
                        Next
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    )}
                    {step === 4 && isLeadCaptured && (
                      <Button
                        onClick={handleForward}
                        size="lg"
                        className="gap-2"
                      >
                        View Quote
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Cruise Selection (shown after lead capture OR deep-link) */}
        {step === 5 && selectedDate && partyType && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Back button removed - users navigate via quote steps */}
            {isLoadingSlots && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Finding your perfect cruise...</p>
              </div>
            )}

            {!isLoadingSlots && (
              <>
                {/* Show unified quote display for all party types - same as /new-quote */}
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
                    useV2DiscoPricing={true}
                    quoteCreatedAt={quoteCreatedAt}
                    quoteExpiresAt={quoteExpiresAt}
                    onRestartTimer={async () => {
                      const now = new Date();
                      // Expires at 11:59:59 PM CST on the 9th day after today
                      // (so timer never exceeds 10 days total)
                      const cstOffset = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
                      const endOfDay9 = new Date(cstOffset);
                      endOfDay9.setDate(endOfDay9.getDate() + 9);
                      endOfDay9.setHours(23, 59, 59, 999);
                      // Convert back: calculate the UTC equivalent
                      const diffMs = now.getTime() - cstOffset.getTime();
                      const newExpires = new Date(endOfDay9.getTime() + diffMs);
                      const newExpiresIso = newExpires.toISOString();
                      
                      // Update database
                      if (savedQuoteId) {
                        await supabase
                          .from('saved_quotes')
                          .update({ expires_at: newExpiresIso, created_at: now.toISOString() })
                          .eq('id', savedQuoteId);
                      } else if (quoteNumber) {
                        await supabase
                          .from('saved_quotes')
                          .update({ expires_at: newExpiresIso, created_at: now.toISOString() })
                          .eq('quote_number', quoteNumber);
                      }
                      
                      // Update local state
                      setQuoteCreatedAt(now.toISOString());
                      setQuoteExpiresAt(newExpiresIso);
                    }}
                  />
                )}
                
                {/* Xola Booking Widget - hidden when embedded in lead dashboard */}
                {searchParams.get('sourceType') === 'lead_dashboard' ? (
                  <div className="mt-8 -mx-2 sm:mx-0 text-center">
                    <Button
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg"
                      onClick={() => {
                        try {
                          window.parent.postMessage({ type: 'switch-to-booking-tab' }, '*');
                        } catch {
                          // fallback: scroll to top
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      <Anchor className="h-5 w-5 mr-2" />
                      Ready to Book? Click Here!
                    </Button>
                  </div>
                ) : (
                  <div ref={xolaWidgetRef} className="mt-8 -mx-2 sm:mx-0">
                    <XolaBookingWidget leadId={leadId} quoteNumber={quoteNumber} />
                  </div>
                )}

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
    </>
  );
};

export default NewQuoteV2;
