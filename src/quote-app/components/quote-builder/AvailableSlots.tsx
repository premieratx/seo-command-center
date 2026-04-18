import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { calculatePricing, getRecommendedBoat } from "@/quote-app/lib/pricing";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/quote-app/components/ui/tooltip";
import { BoatLink } from "@/quote-app/components/BoatLink";

/**
 * Smart scarcity display for disco cruise tickets.
 * Generates a deterministic fake "tickets left" number per slot that:
 * - Is unique per slot (no two slots on the same quote show the same number)
 * - Falls within a range based on the time-of-day tier
 * - Never exceeds the real available count
 * - Hands off to the real count once real <= 28
 */
function getDiscoDisplayTickets(slotId: string, startAt: string, realAvailable: number, slotIndex: number): number {
  const SCARCITY_CAP = 95; // Max displayed capacity
  const REAL_TAKEOVER = 28; // Below this, show real number

  // Cap real available at 95
  const cappedReal = Math.min(realAvailable, SCARCITY_CAP);

  // If real availability is at or below threshold, just show real
  if (cappedReal <= REAL_TAKEOVER) return cappedReal;

  // Determine fake range based on Chicago time of the slot
  const chicagoHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date(startAt)));
  // Saturday 3:30-7:30 PM (hour >= 15) → less popular, higher fake range ~38-44
  // Friday 12-4 PM & Saturday 11 AM-3 PM (hour < 15) → lower fake range ~28-34
  let fakeMin: number, fakeMax: number;
  if (chicagoHour >= 15) {
    fakeMin = 38; fakeMax = 44;
  } else {
    fakeMin = 28; fakeMax = 34;
  }

  // Generate deterministic number from slot ID
  let hash = 0;
  for (let i = 0; i < slotId.length; i++) {
    hash = ((hash << 5) - hash + slotId.charCodeAt(i)) | 0;
  }
  const range = fakeMax - fakeMin + 1;
  let fakeNumber = fakeMin + (Math.abs(hash) % range);

  // Offset by slotIndex to guarantee uniqueness across slots in same quote
  fakeNumber = fakeMin + ((fakeNumber - fakeMin + slotIndex * 3) % range);

  // Never show more than real
  return Math.min(fakeNumber, cappedReal);
}

interface AvailableSlotsProps {
  eventDate: Date;
  partyType: string;
  guestCount: number;
}

export const AvailableSlots = ({ eventDate, partyType, guestCount }: AvailableSlotsProps) => {
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAvailableSlots();
  }, [eventDate, partyType, guestCount]);

  const fetchAvailableSlots = async () => {
    setIsLoading(true);
    try {
      const { startISO, endISO } = getChicagoDayBounds(eventDate);
      const recommendedBoat = getRecommendedBoat(guestCount);
      
      // Query time slots for the selected Chicago date with available capacity
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

      const discoEligible = ["bachelor party", "bachelorette party", "combined bach party"].includes(partyType.toLowerCase());

      // Filter for appropriate experiences/boats based on guest count and party type
      // Deduplicate disco slots by (start_at, end_at) - keep first occurrence
      const seenDiscoKeys = new Set<string>();
      const filteredSlots = (data || []).filter((slot: any) => {
        const isDisco = slot.experience?.type === 'disco_cruise';
        if (isDisco) {
          const key = `${slot.start_at}-${slot.end_at}`;
          if (seenDiscoKeys.has(key)) return false;
          seenDiscoKeys.add(key);
          // Disco slots are always available — capacity managed by Xola, not us
          return discoEligible && slot.boat?.name === "Clever Girl";
        }
        // Private cruise — check capacity fits guest count
        if (slot.capacity_available < guestCount) return false;
        if (guestCount <= 14) {
          return slot.boat?.name === "Day Tripper" && slot.experience?.type === 'private_cruise';
        } else if (guestCount <= 30) {
          return (slot.boat?.name === "Meeseeks" || slot.boat?.name === "The Irony") && slot.experience?.type === 'private_cruise';
        } else {
          return slot.boat?.name === "Clever Girl" && slot.experience?.type === 'private_cruise';
        }
      });

      setSlots(filteredSlots);
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setIsLoading(false);
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
    // Compute next day using Chicago TZ by adding 24h to Chicago midnight
    const startDate = new Date(`${y}-${m}-${d}T00:00:00${offset}`);
    const nextDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    const nextParts = getChicagoDateParts(nextDate);
    const nextOffset = getCentralOffsetForDate(nextDate);
    const endISO = `${nextParts.y}-${nextParts.m}-${nextParts.d}T00:00:00${nextOffset}`;
    return { startISO, endISO };
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  if (isLoading) {
    return (
      <Card className="border-2 shadow-lg bg-background/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card className="border-2 shadow-lg bg-background/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">No Available Cruises</CardTitle>
          <CardDescription>
            Sorry, no cruises are available for your selected date and party size. Please try different dates or contact us directly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-lg bg-background/80 backdrop-blur-sm bg-gradient-to-br from-primary/10 to-accent/10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Your Quote</CardTitle>
          <CardDescription className="text-base flex items-center justify-center gap-6 flex-wrap mt-4">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {eventDate.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {guestCount} guests
            </span>
            <span>{partyType}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Count how many 25-30 person boats are available per time window */}
      <div className="grid gap-4 md:grid-cols-2">
        {slots.map((slot, slotIndex) => {
          const isMeeseeksOrIrony = slot.boat?.name === "Meeseeks" || slot.boat?.name === "The Irony";
          // Check if only one 25-30 person boat is available for this exact time window
          const sameTimeSlots = isMeeseeksOrIrony ? slots.filter(s => 
            s.start_at === slot.start_at && s.end_at === slot.end_at && 
            (s.boat?.name === "Meeseeks" || s.boat?.name === "The Irony")
          ) : [];
          const onlyOneLeft = isMeeseeksOrIrony && sameTimeSlots.length === 1;
          const duration = calculateDuration(slot.start_at, slot.end_at);
          const isDisco = slot.experience?.type === 'disco_cruise';
          const discoTicketsDisplay = isDisco ? getDiscoDisplayTickets(slot.id, slot.start_at, slot.capacity_available, slotIndex) : 0;
          const pricing = !isDisco ? calculatePricing({
            date: new Date(slot.start_at),
            guestCount,
            duration,
            boatCapacity: slot.boat.capacity
          }) : null as any;

          return (
            <Card key={slot.id} className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BoatLink boatName={slot.boat.name} />
                  {onlyOneLeft && (
                    <span className="text-red-500 text-[11px] font-medium underline">Only one left!</span>
                  )}
                </CardTitle>
                <CardDescription>{slot.experience.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(slot.start_at)} - {formatTime(slot.end_at)}</span>
                  <span className="text-muted-foreground">({duration} hours)</span>
                </div>
                
                {isDisco ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Tickets from:</span>
                      <span>$85/person</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Select your preferred time and disco package on the next step.</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Hourly Rate:</span>
                      <span>${pricing.hourlyRate}/hr × {duration}hrs = ${(pricing.hourlyRate * duration).toFixed(2)}</span>
                    </div>
                    {pricing.additionalCrewFee > 0 && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="flex items-center gap-1">
                          Additional Crew Fee
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Required by state law for 26-30 guests and 51-75 guests</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                        <span>${pricing.additionalCrewFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>Subtotal:</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (8.25%):</span>
                      <span>${pricing.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Gratuity (20%):</span>
                      <span>${pricing.gratuity.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t-2">
                      <span>Total:</span>
                      <span>${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Button className="w-full" size="lg">
                    {isDisco
                      ? `Continue — choose package & tickets`
                      : `Book with 25% Deposit ($${(pricing.total * 0.25).toFixed(2)})`}
                  </Button>
                  {isDisco && (
                    <p className="text-xs text-center font-semibold text-destructive">
                      🔥 Only {discoTicketsDisplay} tickets left!
                    </p>
                  )}
                  {!isDisco && (
                    <p className="text-xs text-center text-muted-foreground">
                      Capacity: {slot.capacity_available} / {slot.capacity_total} available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
