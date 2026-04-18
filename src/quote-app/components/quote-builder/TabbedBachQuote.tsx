import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { DiscoCruiseSelector } from "./DiscoCruiseSelector";
import { PrivateCruiseSelector } from "./PrivateCruiseSelector";

interface TabbedBachQuoteProps {
  discoSlots: any[];
  privateSlots: any[];
  guestCount: number;
  eventDate: Date;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  partyType: string;
  onDiscoSelectionChange?: (data: { experienceType: 'disco_cruise'; packageType: string; timeStart: string; timeEnd: string; boatName: string; ticketCount: number }) => void;
  onPrivateSelectionChange?: (data: { experienceType: 'private_cruise'; packageType: string; timeStart: string; timeEnd: string; boatName: string; guestCount: number }) => void;
  onGuestCountChange?: (count: number) => void;
  onDiscoBook: (slotId: string, packageType: string, ticketCount: number) => void;
  onPrivateBook: (slotId: string, packageType: 'standard' | 'essentials' | 'ultimate') => void;
}

export const TabbedBachQuote = ({
  discoSlots,
  privateSlots,
  guestCount,
  eventDate,
  customerEmail,
  customerName,
  customerPhone,
  partyType,
  onDiscoSelectionChange,
  onPrivateSelectionChange,
  onGuestCountChange,
  onDiscoBook,
  onPrivateBook,
}: TabbedBachQuoteProps) => {
  const [activeTab, setActiveTab] = useState<'disco' | 'private'>(() =>
    discoSlots.length > 0 ? 'disco' : 'private'
  );
  const topRef = useRef<HTMLDivElement>(null);
  const [pulseSequence, setPulseSequence] = useState<'disco' | 'private' | null>(null);

  // Sequential heartbeat pulse on mount - left to right
  useEffect(() => {
    // First pulse disco tab
    setTimeout(() => setPulseSequence('disco'), 500);
    setTimeout(() => setPulseSequence(null), 2000);
    
    // Then pulse private tab
    setTimeout(() => setPulseSequence('private'), 2500);
    setTimeout(() => setPulseSequence(null), 4000);
    
    // Repeat sequence once more
    setTimeout(() => setPulseSequence('disco'), 4500);
    setTimeout(() => setPulseSequence(null), 6000);
    setTimeout(() => setPulseSequence('private'), 6500);
    setTimeout(() => setPulseSequence(null), 8000);
  }, []);

  return (
    <div className="w-full" ref={topRef}>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} activationMode="automatic">
        {/* Sticky Tabs on mobile, sits below the main selection header */}
        <div className="sticky top-[64px] md:top-[72px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b pb-2">
          {/* Heading above tabs */}
          <div className="text-center pt-3 pb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Choose Your Experience First</h3>
          </div>
          
          <TabsList className="w-full grid grid-cols-2 gap-2 p-1 bg-transparent">
            <TabsTrigger
              value="disco"
              className={`rounded-md w-full data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 bg-muted/60 transition-all ${pulseSequence === 'disco' ? 'animate-heartbeat-disco' : ''}`}
            >
              🎉 Book ATX Disco Cruise
            </TabsTrigger>
            <TabsTrigger
              value="private"
              className={`rounded-md w-full data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 bg-muted/60 transition-all ${pulseSequence === 'private' ? 'animate-heartbeat-private' : ''}`}
            >
              ⚓ Book Private Cruise
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab contents - disco first */}
        <div className="mt-3">
          <TabsContent value="disco" className="m-0">
            <DiscoCruiseSelector
              slots={discoSlots}
              eventDate={eventDate}
              guestCount={guestCount}
              customerEmail={customerEmail}
              customerName={customerName}
              customerPhone={customerPhone}
              partyType={partyType}
              disableStickyHeaders
              hideSectionHeader
              onBook={onDiscoBook}
              onPackageSelected={(data) => {
                onDiscoSelectionChange?.({
                  experienceType: 'disco_cruise',
                  packageType: data.packageType,
                  timeStart: data.startTime,
                  timeEnd: data.endTime,
                  boatName: data.boatName,
                  ticketCount: data.ticketCount,
                });
              }}
              onTicketCountChange={(count) => onGuestCountChange?.(count)}
            />
          </TabsContent>

          <TabsContent value="private" className="m-0">
            <PrivateCruiseSelector
              slots={privateSlots}
              guestCount={guestCount}
              eventDate={eventDate}
              customerEmail={customerEmail}
              customerName={customerName}
              customerPhone={customerPhone}
              partyType={partyType}
              disableStickyHeaders
              hideSectionHeader
              onBook={onPrivateBook}
              onPackageSelected={(data) => {
                onPrivateSelectionChange?.({
                  experienceType: 'private_cruise',
                  packageType: data.packageType,
                  timeStart: data.startTime,
                  timeEnd: data.endTime,
                  boatName: data.boatName,
                  guestCount: guestCount,
                });
              }}
              onGuestCountChange={(count) => onGuestCountChange?.(count)}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
