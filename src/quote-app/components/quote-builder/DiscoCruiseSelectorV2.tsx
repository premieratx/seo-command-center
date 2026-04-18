import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Clock, Music, AlertCircle } from "lucide-react";
import { format, getDay } from "date-fns";
import { Alert, AlertDescription } from "@/quote-app/components/ui/alert";
import { validateDiscoSlot, getNextDiscoDate, isDiscoSeason, isDiscoCruiseDay } from "@/quote-app/lib/discoRules";
import { formatTimeCSTFull } from "@/quote-app/lib/utils";

interface DiscoSlot {
  id: string;
  start_at: string;
  end_at: string;
  capacity_available: number;
}

interface DiscoCruiseSelectorV2Props {
  slots: DiscoSlot[];
  eventDate: Date;
  guestCount: number;
  partyType: string;
  onSlotSelected?: (slotId: string) => void;
  onPackageSelected?: (data: { slotId: string; packageType: string; boatName: string; startTime: string; endTime: string; ticketCount: number; }) => void;
}

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

export const DiscoCruiseSelectorV2 = ({ slots, eventDate, guestCount, partyType, onSlotSelected, onPackageSelected }: DiscoCruiseSelectorV2Props) => {
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  // Check if date is valid for disco cruise
  const dateValidation = !isDiscoSeason(eventDate) || !isDiscoCruiseDay(eventDate);
  const nextDiscoDate = dateValidation ? getNextDiscoDate(eventDate) : null;

  const formatTime = (dateStr: string) => {
    return formatTimeCSTFull(dateStr);
  };

  // Get price based on time slot
  const getSlotPrice = (slot: DiscoSlot) => {
    const slotTime = formatTime(slot.start_at);
    const slotDay = format(new Date(slot.start_at), 'EEEE');
    
    if (slotDay === 'Friday' && slotTime.includes('12:00')) return 95;
    if (slotDay === 'Saturday' && slotTime.includes('11:00')) return 105;
    if (slotDay === 'Saturday' && slotTime.includes('3:30')) return 85;
    if (slotDay === 'Sunday' && slotTime.includes('11:00')) return 105;
    
    return 95; // default
  };

  // Show alert if date is not valid for disco cruise
  if (dateValidation && slots.length === 0) {
    const isInSeason = isDiscoSeason(eventDate);
    const isWrongDay = isInSeason && !isDiscoCruiseDay(eventDate);
    
    return (
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20 mb-4">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <p className="font-semibold mb-2">ATX Disco Cruise Not Available</p>
          {isWrongDay ? (
            <p className="text-sm">
              Disco cruises are only available <strong>Friday & Saturday</strong>.
            </p>
          ) : (
            <p className="text-sm">
              Disco cruises are only available <strong>Friday & Saturday</strong> from <strong>March through October</strong>.
            </p>
          )}
          {nextDiscoDate && (
            <p className="text-sm mt-2">
              Next available: <strong>{format(nextDiscoDate, "EEEE, MMMM d, yyyy")}</strong>
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const noSlotsAvailable = slots.length === 0;

  if (noSlotsAvailable) {
    return (
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
    );
  }

  return (
    <div className="relative mb-8">
      <Card className="border-4 border-purple-500 shadow-2xl bg-background">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Music className="h-6 w-6" />
            ATX Disco Cruise Options
          </CardTitle>
          <CardDescription className="text-white/90 font-semibold text-xs sm:text-sm">
            Per-Person Tickets • Single Price Per Time Slot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Disco Cruise Selling Points */}
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

          {/* Time Slot Selection - Organized by Day */}
          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-bold">Select Your Time Slot</Label>
            <RadioGroup value={selectedSlot} onValueChange={(id) => {
              setSelectedSlot(id);
              const slot = slots.find(s => s.id === id);
              if (slot) {
                if (onSlotSelected) {
                  onSlotSelected(id);
                }
                if (onPackageSelected) {
                  onPackageSelected({
                    slotId: id,
                    packageType: 'disco-ticket',
                    boatName: "ATX Disco Cruise",
                    startTime: formatTime(slot.start_at),
                    endTime: formatTime(slot.end_at),
                    ticketCount: guestCount,
                  });
                }
              }
            }}>
              <div className="space-y-4">
                {/* Group slots by day */}
                {Object.entries(
                  slots.reduce((acc, slot) => {
                    const slotDay = format(new Date(slot.start_at), 'EEEE');
                    if (!acc[slotDay]) acc[slotDay] = [];
                    acc[slotDay].push(slot);
                    return acc;
                  }, {} as Record<string, typeof slots>)
                ).map(([day, daySlots]) => (
                  <div key={day} className="space-y-2">
                    <h4 className="font-bold text-sm text-primary">{day}</h4>
                    {daySlots.map((slot) => {
                      const slotPrice = getSlotPrice(slot);
                      
                      return (
                        <div key={slot.id} className="flex items-center space-x-2 p-3 rounded-lg border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all">
                          <RadioGroupItem value={slot.id} id={slot.id} />
                          <Label
                            htmlFor={slot.id}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-semibold">
                                  {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-primary">${slotPrice}/person</span>
                                <span className="text-xs text-muted-foreground block">
                                  {slot.capacity_available} spots left
                                </span>
                              </div>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Info about continuing to private cruise options */}
          {selectedSlot && (
            <Alert className="bg-primary/10 border-primary/30">
              <AlertDescription className="text-sm text-center">
                ✨ Continue below to see private cruise options or complete your disco cruise booking
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
