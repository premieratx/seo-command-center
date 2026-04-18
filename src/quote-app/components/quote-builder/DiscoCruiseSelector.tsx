import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Clock, Music, Calendar, AlertCircle } from "lucide-react";
import { format, addDays, getDay } from "date-fns";
import { EmbeddedStripeCheckout } from "./EmbeddedStripeCheckout";
import { SelectionSummaryHeader } from "./SelectionSummaryHeader";
import { Alert, AlertDescription } from "@/quote-app/components/ui/alert";
import { validateDiscoSlot, getNextDiscoDate, isDiscoSeason, isDiscoCruiseDay } from "@/quote-app/lib/discoRules";
import { formatTimeCSTFull } from "@/quote-app/lib/utils";

interface DiscoSlot {
  id: string;
  start_at: string;
  end_at: string;
  capacity_available: number;
}

interface DiscoCruiseSelectorProps {
  slots: DiscoSlot[];
  eventDate: Date;
  guestCount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  partyType: string;
  onBook: (slotId: string, packageType: string, ticketCount: number) => void;
  onCheckoutStarted?: (data: any) => void;
  onPackageSelected?: (data: { slotId: string; packageType: string; boatName: string; startTime: string; endTime: string; ticketCount: number; }) => void;
  onSlotSelected?: (slotId: string) => void;
  onTicketCountChange?: (count: number) => void;
  disableStickyHeaders?: boolean;
  hideSectionHeader?: boolean;
}

// Single per-slot pricing — no more package tiers
const DISCO_INCLUSIONS = [
  'GIANT 25-ft Inflatable Unicorn Float - Biggest in the Country!',
  'Incredible DJ Spinnin\' All Day',
  'Pro Photographer & Free Photos!',
  '3 Giant Lily Pad Floats',
  'Cups, Koozies, Bubbles, Name Tags',
  'Shared Community Coolers w/Ice',
  'BYOB & Carry Drinks Down the Hill to the Boat',
  'Ice in Coolers, Ice Water, Cups, Koozies, Bubbles & Name Tags'
];

/**
 * Get ticket price based on time slot day/time
 */
const getSlotPrice = (slot: DiscoSlot): number => {
  const slotDate = new Date(slot.start_at);
  const day = format(slotDate, 'EEEE');
  const hour = slotDate.getUTCHours(); // approximate — formatTime handles CST
  const timeStr = formatTimeCSTFull(slot.start_at);
  
  if (day === 'Friday') return 95;
  if (day === 'Saturday' && timeStr.includes('11:00')) return 105;
  if (day === 'Saturday' && (timeStr.includes('3:30') || timeStr.includes('15:30'))) return 85;
  return 95; // default
};

const DISCO_SELLING_POINTS = [
  {
    title: 'Experience Something New!',
    points: [
      'The ONLY all-inclusive boat party in Austin & ONLY joint party EXCLUSIVELY for Bach parties!',
      'Party on the BIGGEST Unicorn Float in the Country!',
      'Meet & Mingle w/Other Bachelorette & Bachelor Parties from All Over the Country',
      'You can rent a boat anywhere - this is an EXPERIENCE you\'ll remember forever!'
    ]
  },
  {
    title: 'Priceless Memories & Amazing Vibes',
    points: [
      'The Disco Cruise is seriously MAGIC - you never know what you\'ll see',
      'The energy is amazing, everyone is celebrating the same occasion!',
      'Enjoy some of the BEST people watching on the planet!',
      'This is SERIOUSLY the highlight of the weekend EVERY single time',
      'Make new memories, meet new people & have stories for the wedding!'
    ]
  },
  {
    title: 'All-Inclusive, Nothing to Plan',
    points: [
      'Flat-rate, Per-Person Pricing Makes it Easy to Split Payment',
      'EVERYTHING you need is ready on the boat, just order booze!',
      'DJ has the music covered & photographer captures the moment',
      'Order drinks from Party On Delivery & have them in your cooler when you arrive!'
    ]
  }
];

export const DiscoCruiseSelector = ({ slots, eventDate, guestCount: initialGuestCount, customerEmail, customerName, customerPhone, partyType, onBook, onCheckoutStarted, onPackageSelected, onSlotSelected, onTicketCountChange, disableStickyHeaders = false, hideSectionHeader = false }: DiscoCruiseSelectorProps) => {
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  // Package is always 'disco-ticket' now (single tier)
  const selectedPackage = 'disco-ticket';
  const [ticketCount, setTicketCount] = useState(initialGuestCount);
  const [ticketCountConfirmed, setTicketCountConfirmed] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);

  // Persist selection per date + party type to prevent cross-session bleed
  const contextKey = `${format(eventDate, 'yyyy-MM-dd')}|${partyType}|disco`;

  // Check if date is valid for disco cruise
  const dateValidation = !isDiscoSeason(eventDate) || !isDiscoCruiseDay(eventDate);
  const nextDiscoDate = dateValidation ? getNextDiscoDate(eventDate) : null;

  // Sync with external guest count changes
  useEffect(() => {
    setTicketCount(initialGuestCount);
  }, [initialGuestCount]);

  // Restore saved progress for Disco tab (scoped by date + party type)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('disco.selection');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && saved.contextKey === contextKey && saved.initialGuestCount === initialGuestCount) {
        if (saved.selectedSlot && slots.some(s => s.id === saved.selectedSlot)) {
          setSelectedSlot(saved.selectedSlot);
        }
        // selectedPackage is now always 'disco-ticket'
        if (typeof saved.ticketCount === 'number') setTicketCount(saved.ticketCount);
        setTicketCountConfirmed(!!saved.ticketCountConfirmed);
        setCheckoutMode(!!saved.checkoutMode);
      } else {
        sessionStorage.removeItem('disco.selection');
      }
    } catch {}
  }, [slots, contextKey, initialGuestCount]);

  // Auto-save progress (scoped by date + party type)
  useEffect(() => {
    try {
      sessionStorage.setItem('disco.selection', JSON.stringify({
        contextKey,
        initialGuestCount,
        selectedSlot,
        selectedPackage,
        ticketCount,
        ticketCountConfirmed,
        checkoutMode,
      }));
    } catch {}
  }, [contextKey, initialGuestCount, selectedSlot, selectedPackage, ticketCount, ticketCountConfirmed, checkoutMode]);

  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  const pkgRef = useRef<HTMLDivElement>(null);
  const ticketsRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<null | 'pkg' | 'tickets' | 'price'>(null);
  const scrollAndHighlight = (ref: any, key: 'pkg' | 'tickets' | 'price') => {
    // Only scroll if element is not in viewport to prevent excessive scrolling
    if (ref?.current) {
      const rect = ref.current.getBoundingClientRect();
      const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!isInViewport) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setHighlight(key);
    setTimeout(() => setHighlight(null), 1500);
  };

  // Enter checkout mode when user selects a time slot
  useEffect(() => {
    if (selectedSlot) {
      setCheckoutMode(true);
      if (onSlotSelected) {
        onSlotSelected(selectedSlot);
      }
    }
  }, [selectedSlot, onSlotSelected]);

  // Notify parent when slot is selected or ticket count changes
  useEffect(() => {
    if (selectedSlotData && onPackageSelected) {
      onPackageSelected({
        slotId: selectedSlot,
        packageType: 'disco-ticket',
        boatName: "ATX Disco Cruise",
        startTime: formatTime(selectedSlotData.start_at),
        endTime: formatTime(selectedSlotData.end_at),
        ticketCount: ticketCount,
      });
    }
  }, [selectedSlot, ticketCount]);

  // Notify parent of ticket count changes ONLY when user actively changes it
  // Skip notifications during mount and auto-sync
  const didMountRef = useRef(false);
  const isUserChangeRef = useRef(false);
  useEffect(() => {
    if (!onTicketCountChange) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return; // prevent initial emit on mount
    }
    // Only notify if this was a user-initiated change (not auto-sync)
    if (isUserChangeRef.current) {
      onTicketCountChange(ticketCount);
      isUserChangeRef.current = false;
    }
  }, [ticketCount, onTicketCountChange]);

  // Guide user through next steps with scroll + highlight
  useEffect(() => {
    if (selectedSlot && !ticketCountConfirmed) {
      scrollAndHighlight(ticketsRef, 'tickets');
    }
  }, [selectedSlot]);

  useEffect(() => {
    if (ticketCountConfirmed) {
      scrollAndHighlight(priceRef, 'price');
    }
  }, [ticketCountConfirmed]);

  const formatTime = (dateStr: string) => {
    return formatTimeCSTFull(dateStr);
  };

const perPersonPrice = selectedSlotData ? getSlotPrice(selectedSlotData) : 95;
const subtotal = perPersonPrice * ticketCount;
const tax = subtotal * 0.0825;
const gratuity = subtotal * 0.20;
const total = subtotal + tax + gratuity;

  // Central Time 'today' for deposit rules
  const getCentralToday = () => {
    const now = new Date();
    const centralStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now);
    const [m, d, y] = centralStr.split('/');
    return new Date(`${y}-${m}-${d}`);
  };
  const today = getCentralToday();
  const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const daysUntilEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const requiresHigherDeposit = daysUntilEvent < 14;
  const depositPercentage = requiresHigherDeposit ? 0.5 : 0.25;

  const getDueDate = () => {
    if (requiresHigherDeposit) {
      const due = new Date(today);
      due.setDate(due.getDate() + 3);
      return format(due, 'MMMM d, yyyy');
    } else {
      const due = new Date(eventDateOnly);
      due.setDate(due.getDate() - 14);
      return format(due, 'MMMM d, yyyy');
    }
  };

  // Show alert if date is not valid for disco cruise
  if (dateValidation && slots.length === 0) {
    const isInSeason = isDiscoSeason(eventDate);
    const isWrongDay = isInSeason && !isDiscoCruiseDay(eventDate);
    
    return (
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <p className="font-semibold mb-2">ATX Disco Cruise Not Available</p>
          {isWrongDay ? (
            <>
              <p className="text-sm mb-3">
                Disco cruises are only available <strong>Friday & Saturday</strong>.
              </p>
              {nextDiscoDate && (
                <div className="space-y-2">
                  <p className="text-sm">
                    Next available: <strong>{format(nextDiscoDate, "EEEE, MMMM d, yyyy")}</strong>
                  </p>
                  <Button
                    onClick={() => {
                      const dateStr = format(nextDiscoDate, "yyyy-MM-dd");
                      window.location.href = `/?date=${dateStr}&partyType=${partyType}&guests=${ticketCount}`;
                    }}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    Switch to {format(nextDiscoDate, "EEEE, MMM d")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm mb-2">
                Disco cruises are only available <strong>Friday & Saturday</strong> from <strong>March through October</strong>.
              </p>
              {nextDiscoDate && (
                <div className="space-y-2">
                  <p className="text-sm">
                    Next available: <strong>{format(nextDiscoDate, "EEEE, MMMM d, yyyy")}</strong>
                  </p>
                  <Button
                    onClick={() => {
                      const dateStr = format(nextDiscoDate, "yyyy-MM-dd");
                      window.location.href = `/?date=${dateStr}&partyType=${partyType}&guests=${ticketCount}`;
                    }}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    Switch to {format(nextDiscoDate, "EEEE, MMM d")}
                  </Button>
                </div>
              )}
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Check if this is a weekday with no disco cruises available
  const isWeekday = getDay(eventDate) >= 1 && getDay(eventDate) <= 4;
  const noSlotsAvailable = slots.length === 0;

  return (
    <div className="relative">
      {/* Section Header (optional) */}
      {!hideSectionHeader && (
        <div className={`${disableStickyHeaders ? 'relative' : 'sticky top-0'} z-40 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-t-lg shadow-lg mb-3`}>
          <div className="flex items-center justify-center gap-3">
            <Music className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="font-bold text-xl sm:text-2xl">🎉 Book Disco Cruise</span>
          </div>
        </div>
      )}

      {/* No Slots Available Warning */}
      {noSlotsAvailable && (
        <Alert variant="destructive" className="border-orange-500 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>No Disco Cruises Available on This Date</strong>
            <p className="mt-2 text-sm">
              Disco Cruises run <strong>Friday & Saturday only</strong> from <strong>March-October</strong>.
              {nextDiscoDate && (
                <span className="block mt-1">
                  The next available Disco Cruise is on <strong>{format(nextDiscoDate, "EEEE, MMMM d")}</strong>.
                </span>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!noSlotsAvailable && (


      <Card className="border-4 border-purple-500 shadow-2xl bg-background rounded-t-none">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Music className="h-6 w-6" />
            ATX Disco Cruise
          </CardTitle>
          <CardDescription className="text-white/90 font-semibold text-xs sm:text-sm">
            {format(eventDate, "EEEE, MMMM d")} • Per-Person Tickets • $85-$105/person
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
        {/* Disco Cruise Selling Points - Ultra Condensed */}
        <details className="bg-gradient-to-br from-primary/10 to-accent/10 p-2 sm:p-3 rounded-lg group">
          <summary className="cursor-pointer text-xs sm:text-sm font-bold text-primary text-center list-none flex items-center justify-center gap-1">
            <span>✨ Why Book Disco Cruise?</span>
            <span className="inline-block transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-2 space-y-1.5 text-[10px] sm:text-xs">
            {DISCO_SELLING_POINTS.map((section, idx) => (
              <div key={idx}>
                <p className="font-semibold text-primary">{section.title}</p>
                <ul className="space-y-0.5 ml-3">
                  {section.points.map((point, pointIdx) => (
                    <li key={pointIdx}>• {point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>

        {/* Guest Count Selector - Always Visible */}
        <div className="space-y-3 bg-gradient-to-br from-primary/5 to-accent/5 p-4 rounded-lg border-2 border-primary/20">
          <Label className="text-sm font-semibold text-center block">Number of Guests</Label>
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                const newCount = Math.max(1, ticketCount - 1);
                isUserChangeRef.current = true; // Mark as user change
                setTicketCount(newCount);
              }}
              className="h-10 w-10"
            >
              -
            </Button>
            <div className="text-center min-w-[80px]">
              <div className="text-3xl font-bold text-primary">{ticketCount}</div>
              <div className="text-xs text-muted-foreground">Guests</div>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                const newCount = Math.min(Math.min(selectedSlotData?.capacity_available || 100, 50), ticketCount + 1);
                isUserChangeRef.current = true; // Mark as user change
                setTicketCount(newCount);
              }}
              className="h-10 w-10"
            >
              +
            </Button>
          </div>
        </div>

        {/* Step 1: Select Time Slot */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Select Your Time Slot</Label>
          <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot}>
            {slots.map((slot) => {
              const slotPrice = getSlotPrice(slot);
              return (
              <div key={slot.id} className="flex items-center space-x-2 p-3 border-2 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all">
                <RadioGroupItem value={slot.id} id={`disco-${slot.id}`} />
                <Label htmlFor={`disco-${slot.id}`} className="flex-1 cursor-pointer text-xs sm:text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-primary">${slotPrice}/person</span>
                      <span className="text-[10px] text-muted-foreground block">
                        {slot.capacity_available} spots left
                      </span>
                    </div>
                  </div>
                </Label>
              </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Step 2: Confirm Ticket Count (was Step 3) */}
        {selectedSlot && !ticketCountConfirmed && (
          <div ref={ticketsRef} className={`space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300 bg-gradient-to-br from-primary/5 to-accent/5 p-4 rounded-lg border-2 border-primary/20 ${highlight === 'tickets' ? 'ring-2 ring-purple-500/50 animate-heartbeat' : ''}`}>
            <Label className="text-base font-bold text-center block">Confirm Your Total Number of Tickets</Label>
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                className="h-12 w-12 text-xl"
              >
                -
              </Button>
              <div className="text-center min-w-[100px]">
                <div className="text-4xl font-bold text-primary">{ticketCount}</div>
                <div className="text-xs text-muted-foreground">Tickets</div>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setTicketCount(Math.min(Math.min(selectedSlotData?.capacity_available || 100, 50), ticketCount + 1))}
                className="h-12 w-12 text-xl"
              >
                +
              </Button>
            </div>
            <Button 
              onClick={() => setTicketCountConfirmed(true)} 
              className="w-full text-lg py-6"
              size="lg"
            >
              Confirm {ticketCount} Ticket{ticketCount !== 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {/* Step 4: Price Breakdown */}
        {selectedPackage && ticketCountConfirmed && (
          <div ref={priceRef} className={`space-y-2 pt-2 border-t animate-in fade-in slide-in-from-bottom-4 duration-300 ${highlight === 'price' ? 'ring-2 ring-purple-500/50 rounded-lg animate-heartbeat' : ''}`}>

<EmbeddedStripeCheckout
  timeSlotId={selectedSlot}
  customerEmail={customerEmail}
  customerName={customerName}
  customerPhone={customerPhone}
  guestCount={ticketCount}
  partyType={partyType}
  packageType={selectedPackage}
  amount={Math.round(total * 100)}
  depositAmount={Math.round((total * depositPercentage) * 100)}
  subtotal={Math.round(subtotal * 100)}
  eventDate={format(eventDate, "EEEE, MMMM d, yyyy")}
  startTime={selectedSlotData ? formatTime(selectedSlotData.start_at) : ""}
  endTime={selectedSlotData ? formatTime(selectedSlotData.end_at) : ""}
  boatName="ATX Disco Cruise"
  experienceType="Disco Cruise"
  ticketCount={ticketCount}
  onCheckoutStarted={onCheckoutStarted}
/>
          </div>
        )}
      </CardContent>
    </Card>
      )}
    </div>
  );
};
