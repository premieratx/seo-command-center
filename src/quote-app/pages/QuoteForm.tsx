import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { DateSelector } from "@/quote-app/components/quote-builder/DateSelector";
import { PartyTypeSelector } from "@/quote-app/components/quote-builder/PartyTypeSelector";
import { GuestCountSelector } from "@/quote-app/components/quote-builder/GuestCountSelector";
import { FormalQuoteDisplay } from "@/quote-app/components/quote-builder/FormalQuoteDisplay";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { useToast } from "@/quote-app/hooks/use-toast";
import { useQuoteAnalytics } from "@/quote-app/hooks/useQuoteAnalytics";
import { useAbandonedBookingTracking } from "@/quote-app/hooks/useAbandonedBookingTracking";
import { validateDiscoSlot } from "@/quote-app/lib/discoRules";
import { ScrollingBackground } from "@/quote-app/components/ScrollingBackground";
import { AlternativeDatesSelector } from "@/quote-app/components/quote-builder/AlternativeDatesSelector";
import { SmallerBoatSuggestion } from "@/quote-app/components/quote-builder/SmallerBoatSuggestion";

const isInIframe = () => {
  try { return window.self !== window.top; } catch { return true; }
};

const QuoteForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = useQuoteAnalytics();
  const { leadInfo, trackAbandoned, captureLeadInfo } = useAbandonedBookingTracking();
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [partyType, setPartyType] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(10);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState<string | undefined>();
  
  // Slots state
  const [discoSlots, setDiscoSlots] = useState<any[]>([]);
  const [privateSlots, setPrivateSlots] = useState<any[]>([]);
  const [smallerBoatSlots, setSmallerBoatSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  // Selection state for booking
  const [selectedExperienceType, setSelectedExperienceType] = useState<'disco_cruise' | 'private_cruise' | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<'14' | '25' | '50' | undefined>();
  const [selectedDiscoPackage, setSelectedDiscoPackage] = useState<'basic' | 'queen' | 'sparkle' | undefined>();
  const [savedQuoteId, setSavedQuoteId] = useState<string | undefined>();
  const [quoteCreatedAt, setQuoteCreatedAt] = useState<string | undefined>();
  
  // Restored state
  const [restoredState, setRestoredState] = useState(false);
  const [restoredSlotId, setRestoredSlotId] = useState<string | undefined>();
  const [restoredPackage, setRestoredPackage] = useState<string | undefined>();
  const [restoredAddons, setRestoredAddons] = useState<any>();
  
  const quoteBuilderRef = useRef<HTMLDivElement>(null);
  const xolaWidgetRef = useRef<HTMLDivElement>(null);
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

        setSavedQuoteId(savedQuote.id);
        setQuoteNumber(savedQuote.quote_number);
        setQuoteCreatedAt(savedQuote.created_at);
        
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
        }
        
        if (savedQuote.party_type) {
          setPartyType(normalizePartyType(savedQuote.party_type));
        }
        
        if (savedQuote.guest_count) {
          setGuestCount(savedQuote.guest_count);
        }
        
        if (savedQuote.experience_type && (savedQuote.experience_type === 'disco_cruise' || savedQuote.experience_type === 'private_cruise')) {
          setSelectedExperienceType(savedQuote.experience_type);
        }
        
        if (savedQuote.disco_package) {
          setSelectedDiscoPackage(savedQuote.disco_package as any);
        }
        
        if (savedQuote.private_capacity) {
          setSelectedCapacity(savedQuote.private_capacity as any);
        }
        
        if (savedQuote.customer_name) {
          const nameParts = savedQuote.customer_name.split(' ');
          setFormData({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: savedQuote.customer_email || '',
            phone: savedQuote.customer_phone || ''
          });
        } else if (savedQuote.customer_email) {
          setFormData({
            firstName: '',
            lastName: '',
            email: savedQuote.customer_email || '',
            phone: savedQuote.customer_phone || ''
          });
        }
        
        if (savedQuote.time_slot_id) {
          setRestoredSlotId(savedQuote.time_slot_id);
        }
        if (savedQuote.disco_package) {
          setRestoredPackage(savedQuote.disco_package);
        }
        if (savedQuote.selected_addons) {
          setRestoredAddons(savedQuote.selected_addons);
        }
        
        setIsSubmitted(true);
        setRestoredState(true);
        
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

  // Auto-resize for embedded iframe
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
        
        const heightMultiplier = isSubmitted ? 1.8 : 1;
        const adjustedHeight = Math.round(contentHeight * heightMultiplier);
        
        window.parent.postMessage({ type: 'quote-form-resize', height: adjustedHeight }, '*');
      };

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
  }, [quoteBuilderRef, isSubmitted]);

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
      return;
    }
    
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

    const slowLoadTimer = window.setTimeout(() => {
      if (fetchGuardRef.current.inFlight) {
        setIsLoadingSlots(false);
        fetchGuardRef.current.inFlight = false;
        fetchGuardRef.current.lastTime = Date.now();
        toast({ title: "Still loading", description: "Availability is taking longer than expected. Please try again.", variant: "destructive" });
      }
    }, 15000);
    
    try {
      const dayOfWeek = useDate.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4;
      
      let startISO: string, endISO: string;
      
      let fridayDate: Date;
      if (dayOfWeek === 5) {
        fridayDate = useDate;
      } else if (dayOfWeek === 6) {
        fridayDate = new Date(useDate);
        fridayDate.setDate(fridayDate.getDate() - 1);
      } else if (dayOfWeek === 0) {
        fridayDate = new Date(useDate);
        fridayDate.setDate(fridayDate.getDate() - 2);
      } else {
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
        fridayDate = new Date(useDate);
        fridayDate.setDate(fridayDate.getDate() + daysUntilFriday);
      }
      
      if (isWeekday) {
        const weekdayBounds = getChicagoDayBounds(useDate);
        const mondayDate = new Date(fridayDate);
        mondayDate.setDate(mondayDate.getDate() + 3);
        const mondayBounds = getChicagoDayBounds(mondayDate);
        
        startISO = weekdayBounds.startISO;
        endISO = mondayBounds.startISO;
      } else {
        const mondayDate = new Date(fridayDate);
        mondayDate.setDate(mondayDate.getDate() + 3);
        const fridayBounds = getChicagoDayBounds(fridayDate);
        const mondayBounds = getChicagoDayBounds(mondayDate);
        
        startISO = fridayBounds.startISO;
        endISO = mondayBounds.startISO;
      }
      
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

      const dayBookings = (bookingsData || []).filter((booking: any) => {
        if (!booking.time_slot) return false;
        const bookingDate = new Date(booking.time_slot.start_at);
        const { y: bY, m: bM, d: bD } = getChicagoDateParts(bookingDate);
        const { y: sY, m: sM, d: sD } = getChicagoDateParts(useDate as Date);
        return bY === sY && bM === sM && bD === sD;
      });

      const availableSlots = (data || []).filter((slot: any) => {
        if (slot.experience?.type === 'disco_cruise') return true;

        if (!dayBookings || dayBookings.length === 0) return true;
        
        const hasConflict = dayBookings.some((booking: any) => {
          if (!booking.time_slot) return false;
          if (booking.time_slot.boat_id !== slot.boat_id) return false;
          
          const bookingStart = new Date(booking.time_slot.start_at);
          const bookingEnd = new Date(booking.time_slot.end_at);
          const bookingEndWithBuffer = new Date(bookingEnd.getTime() + 30 * 60 * 1000);
          
          const slotStart = new Date(slot.start_at);
          const slotEnd = new Date(slot.end_at);
          
          return slotStart < bookingEndWithBuffer && slotEnd > bookingStart;
        });
        
        return !hasConflict;
      });

      const normalizedForDisco = normalizePartyType(useParty);
      const discoEligible = ['bachelor_party','bachelorette_party','combined_bach'].includes(normalizedForDisco || '');

      const disco = availableSlots.filter((slot: any) => {
        if (slot.experience?.type !== 'disco_cruise' || !discoEligible) return false;
        if (typeof slot.capacity_available === 'number' && slot.capacity_available < useGuests) return false;
        const slotDate = new Date(slot.start_at);
        const validation = validateDiscoSlot(slotDate, slot.boat?.name || '', slot.experience?.type || '');
        return validation.isValid;
      });

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
          return slots[0];
        }
      });

      setDiscoSlots(disco);
      setPrivateSlots(privateCruises);

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
              
              const capacity = slot.capacity_total;
              if (useGuests > 30) {
                return capacity === 30;
              } else if (useGuests > 14) {
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

  const getQuoteUrl = () => {
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
    return `/quote-form?${params.toString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !partyType || !formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const fullQuoteUrl = `https://booking.premierpartycruises.com${getQuoteUrl()}`;
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const isEmbedded = window.self !== window.top;
      const urlParams = new URLSearchParams(window.location.search);
      const paramSourceUrl = urlParams.get('sourceUrl');
      const paramSourceType = urlParams.get('sourceType');
      
      let sourceUrl: string;
      if (paramSourceUrl) {
        sourceUrl = paramSourceUrl;
      } else if (isEmbedded) {
        sourceUrl = document.referrer || window.location.href;
      } else {
        sourceUrl = window.location.href;
      }
      
      let sourceType: string;
      if (paramSourceType) {
        sourceType = paramSourceType;
      } else if (isEmbedded) {
        sourceType = 'embedded_quote_form';
      } else if (window.location.hostname === 'booking.premierpartycruises.com') {
        sourceType = 'quote_form';
      } else {
        sourceType = 'quote_form';
      }
      
      const { getAffiliateData, getAffiliateLandingUrl } = await import("@/quote-app/lib/affiliateTracking");
      const affiliateData = getAffiliateData();
      const affiliateLandingUrl = getAffiliateLandingUrl();
      
      const { data, error } = await supabase.functions.invoke("create-lead", {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          eventDate: formattedDate,
          partyType,
          guestCount,
          quoteUrl: fullQuoteUrl,
          sourceType,
          sourceUrl: affiliateLandingUrl || sourceUrl,
          affiliateId: affiliateData?.affiliateId,
          affiliateCodeId: affiliateData?.codeId,
          affiliateClickId: affiliateData?.clickId,
        },
      });

      if (error) throw error;

      const { trackAffiliateConversion } = await import("@/quote-app/lib/affiliateTracking");
      await trackAffiliateConversion(
        sourceType as any,
        'lead',
        { leadId: data?.leadId }
      );

      trackEvent('lead_form_completed', {
        date: selectedDate?.toISOString().split('T')[0],
        partyType,
        guestCount,
      });
      
      captureLeadInfo({
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      
      if (selectedDate && partyType) {
        trackAbandoned({
          eventDate: selectedDate,
          partyType,
          guestCount,
        }, 'lead_capture');
      }

      setQuoteNumber(data?.quoteNumber);
      setQuoteCreatedAt(new Date().toISOString());
      
      // Save quote state
      await saveQuoteState({
        quoteNumber: data?.quoteNumber,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
      });

      toast({
        title: "Success!",
        description: "Your quote is ready. See your personalized options below!",
      });

      setIsSubmitted(true);
      fetchAvailableSlots(selectedDate, partyType, guestCount);
      
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

      const fullName = updates.customerName || `${formData.firstName} ${formData.lastName}`.trim();
      const customerNameToSave = fullName || null;

      const saveData = {
        quote_number: quoteNum,
        event_date: format(selectedDate, 'yyyy-MM-dd'),
        party_type: partyType,
        guest_count: guestCount,
        customer_name: customerNameToSave,
        customer_email: updates.customerEmail || formData.email || null,
        customer_phone: updates.customerPhone || formData.phone || null,
        experience_type: updates.experienceType || selectedExperienceType,
        disco_package: updates.discoPackage || selectedDiscoPackage,
        private_capacity: updates.privateCapacity || selectedCapacity,
        package_type: updates.packageType,
        selected_boat_name: updates.selectedBoatName,
        selected_time_start: updates.selectedTimeStart,
        selected_time_end: updates.selectedTimeEnd,
        time_slot_id: updates.timeSlotId,
        selected_addons: updates.selectedAddons,
        pricing_details: updates.pricingDetails,
        last_step: updates.lastStep || 'quote_display',
        status: 'active',
        last_viewed_at: new Date().toISOString(),
      };

      if (savedQuoteId) {
        await supabase
          .from('saved_quotes')
          .update(saveData)
          .eq('id', savedQuoteId);
      } else {
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

  const handleDiscoBook = async (slotId: string, packageType: string, ticketCount: number) => {
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
  };

  const handlePrivateBook = async (slotId: string, packageType: 'standard' | 'essentials' | 'ultimate') => {
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
  };

  const handleBackToForm = () => {
    setIsSubmitted(false);
  };

  // Check if form is complete
  const isFormComplete = selectedDate && partyType && formData.firstName && formData.lastName && formData.email && formData.phone;

  return (
    <div ref={quoteBuilderRef} className="relative min-h-screen">
      <ScrollingBackground />
      
      <div className={`max-w-6xl mx-auto px-2 sm:px-4 relative z-10 ${isSubmitted ? 'py-0 sm:py-2' : 'py-4'}`}>
        {/* Single Page Form - Before Submission */}
        {!isSubmitted && (
          <div className="w-full max-w-[800px] mx-auto">
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border-4 border-primary/80 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-primary/20 bg-background/50 p-4 sm:p-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-center mb-1">
                  Get Your Cruise Quote
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                  Fill out all fields to see real-time availability and pricing
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                {/* Date Selection */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">When's Your Cruise? *</Label>
                  <div className="flex justify-center">
                    <DateSelector 
                      selectedDate={selectedDate} 
                      onDateSelect={setSelectedDate}
                    />
                  </div>
                </div>

                {/* Party Type Selection */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">What's the Occasion? *</Label>
                  <PartyTypeSelector
                    selectedType={partyType}
                    onTypeSelect={setPartyType}
                  />
                </div>

                {/* Guest Count */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">How Many Guests? *</Label>
                  <GuestCountSelector
                    guestCount={guestCount}
                    onGuestCountChange={setGuestCount}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-4 pt-4 border-t border-primary/20">
                  <h3 className="text-base font-semibold">Your Contact Information</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        disabled={isSubmitting}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        disabled={isSubmitting}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-sm">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={isSubmitting}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      disabled={isSubmitting}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full text-lg py-6"
                  disabled={isSubmitting || !isFormComplete}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Getting Your Quote...
                    </>
                  ) : (
                    "View My Quote"
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Quote Display - After Submission */}
        {isSubmitted && selectedDate && partyType && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-start mb-4 px-2 sm:px-4">
              <Button
                onClick={handleBackToForm}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                ← Edit My Information
              </Button>
            </div>
            
            {isLoadingSlots && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Finding your perfect cruise...</p>
              </div>
            )}

            {!isLoadingSlots && (
              <>
                {(discoSlots.length > 0 || privateSlots.length > 0) && (
                  <FormalQuoteDisplay
                    discoSlots={discoSlots}
                    privateSlots={privateSlots}
                    guestCount={guestCount}
                    eventDate={selectedDate}
                    customerEmail={formData.email}
                    customerName={`${formData.firstName} ${formData.lastName}`.trim()}
                    customerPhone={formData.phone}
                    partyType={partyType}
                    quoteNumber={quoteNumber}
                    onDiscoBook={handleDiscoBook}
                    onPrivateBook={handlePrivateBook}
                    onGuestCountChange={(newCount) => {
                      setGuestCount(newCount);
                      fetchAvailableSlots(selectedDate, partyType, newCount);
                    }}
                    onEventDateChange={(newDate) => {
                      setSelectedDate(newDate);
                      fetchAvailableSlots(newDate, partyType, guestCount);
                    }}
                    onPartyTypeChange={(newType) => {
                      setPartyType(newType);
                      fetchAvailableSlots(selectedDate, newType, guestCount);
                    }}
                    onBookOnline={(experienceType, capacity, discoPackage) => {
                      setSelectedExperienceType(experienceType);
                      setSelectedCapacity(capacity);
                      setSelectedDiscoPackage(discoPackage);
                      
                      setTimeout(() => {
                        xolaWidgetRef.current?.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center' 
                        });
                      }, 100);
                    }}
                    onSelectionChange={(updates) => {
                      saveQuoteState(updates);
                    }}
                    savedQuoteId={savedQuoteId}
                    restoredSlotId={restoredSlotId}
                    restoredPackage={restoredPackage}
                    restoredAddons={restoredAddons}
                    useV2DiscoPricing={true}
                    quoteCreatedAt={quoteCreatedAt}
                  />
                )}
                
                <div ref={xolaWidgetRef} className="mt-8 -mx-2 sm:mx-0">
                  <XolaBookingWidget />
                </div>

                {discoSlots.length === 0 && privateSlots.length === 0 && (
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
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteForm;
