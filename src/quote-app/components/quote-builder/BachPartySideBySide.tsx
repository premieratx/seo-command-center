import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Badge } from "@/quote-app/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/quote-app/components/ui/collapsible";
import { ChevronDown, Music, Ship, Clock, AlertCircle, Copy, Share2, LinkIcon } from "lucide-react";
import { format, addDays, getDay } from "date-fns";
import { EmbeddedStripeCheckout } from "./EmbeddedStripeCheckout";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Alert, AlertDescription } from "@/quote-app/components/ui/alert";
import { Slider } from "@/quote-app/components/ui/slider";
import { useToast } from "@/quote-app/hooks/use-toast";
import { cn, formatTimeCSTFull } from "@/quote-app/lib/utils";
import { useIsMobile } from "@/quote-app/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/quote-app/components/ui/tooltip";

interface BachPartySideBySideProps {
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
  disableStickyHeaders?: boolean;
}

export const BachPartySideBySide = ({
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
  disableStickyHeaders = false
}: BachPartySideBySideProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const discoRef = useRef<HTMLDivElement>(null);
  const privateRef = useRef<HTMLDivElement>(null);
  const [selectedDiscoSlot, setSelectedDiscoSlot] = useState<any>(null);
  const [selectedPrivateSlot, setSelectedPrivateSlot] = useState<any>(null);
  // No more package tiers — single per-slot pricing
  const selectedDiscoPackage = 'disco-ticket';
  const [selectedPrivatePackage, setSelectedPrivatePackage] = useState<string>("standard");
  const [privateDuration, setPrivateDuration] = useState<string>("4");
  const [selectedPrivateTimeSlotId, setSelectedPrivateTimeSlotId] = useState<string>("");
  const [discoTicketCount, setDiscoTicketCount] = useState<number>(guestCount);
  const [privateGuestCount, setPrivateGuestCount] = useState<number>(guestCount);
  const [activeCruiseTab, setActiveCruiseTab] = useState<'disco' | 'private'>('disco');
  const [selectedPrivateAddOns, setSelectedPrivateAddOns] = useState<string[]>([]);
  const [discoTimeExpanded, setDiscoTimeExpanded] = useState<boolean>(true);
  const [discoPackageExpanded, setDiscoPackageExpanded] = useState<boolean>(false);
  const [discoTicketsExpanded, setDiscoTicketsExpanded] = useState<boolean>(false);
  const [privateTimeExpanded, setPrivateTimeExpanded] = useState<boolean>(true);
  const [privatePackageExpanded, setPrivatePackageExpanded] = useState<boolean>(false);
  const [privateGuestsExpanded, setPrivateGuestsExpanded] = useState<boolean>(false);

  // Notify parent when disco selections change
  useEffect(() => {
    if (selectedDiscoSlot && selectedDiscoPackage && onDiscoSelectionChange) {
      const startTime = formatTimeCSTFull(selectedDiscoSlot.start_at);
      const endTime = formatTimeCSTFull(selectedDiscoSlot.end_at);
      onDiscoSelectionChange({
        experienceType: 'disco_cruise',
        packageType: selectedDiscoPackage,
        timeStart: startTime,
        timeEnd: endTime,
        boatName: "ATX Disco Cruise",
        ticketCount: discoTicketCount
      });
    }
  }, [selectedDiscoSlot, selectedDiscoPackage, discoTicketCount, onDiscoSelectionChange]);

  // Notify parent when private selections change
  useEffect(() => {
    if (selectedPrivateSlot && selectedPrivatePackage && onPrivateSelectionChange) {
      const startTime = formatTimeCSTFull(selectedPrivateSlot.start_at);
      const endTime = formatTimeCSTFull(selectedPrivateSlot.end_at);
      onPrivateSelectionChange({
        experienceType: 'private_cruise',
        packageType: selectedPrivatePackage,
        timeStart: startTime,
        timeEnd: endTime,
        boatName: selectedPrivateSlot.boat?.name || "Private Boat",
        guestCount: privateGuestCount
      });
    }
  }, [selectedPrivateSlot, selectedPrivatePackage, privateGuestCount, onPrivateSelectionChange]);

  // Notify parent of guest count changes
  useEffect(() => {
    if (onGuestCountChange) {
      if (activeCruiseTab === 'disco') {
        onGuestCountChange(discoTicketCount);
      } else {
        onGuestCountChange(privateGuestCount);
      }
    }
  }, [discoTicketCount, privateGuestCount, activeCruiseTab, onGuestCountChange]);

  const dayOfWeek = getDay(eventDate); // 0 = Sunday, 6 = Saturday
  const isSaturday = dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;
  const isSunday = dayOfWeek === 0;
  const isWeekend = isFriday || isSaturday || isSunday;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4; // Monday-Thursday

  // Add-ons configuration
  const addOns = [
    { id: "lily_pad", name: "Lily Pad Float", price: 50 },
    { id: "dj", name: "Book a DJ", price: 600 },
    { id: "photographer", name: "Book a Photographer", price: 600 }
  ];

  const togglePrivateAddOn = (addOnId: string) => {
    setSelectedPrivateAddOns(prev => 
      prev.includes(addOnId) 
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const getPrivateAddOnsTotal = () => {
    return selectedPrivateAddOns.reduce((total, addOnId) => {
      const addOn = addOns.find(a => a.id === addOnId);
      return total + (addOn?.price || 0);
    }, 0);
  };

  // Per-slot pricing helper
  const getDiscoSlotPrice = (slot: any): number => {
    if (!slot) return 95;
    const startTime = formatTimeCSTFull(slot.start_at);
    const slotDate = new Date(slot.start_at);
    const day = format(slotDate, 'EEEE');
    if (day === 'Friday') return 95;
    if (day === 'Saturday' && startTime.includes('11:00')) return 105;
    if (day === 'Saturday' && (startTime.includes('3:30') || startTime.includes('15:30'))) return 85;
    if (day === 'Sunday' && startTime.includes('11:00')) return 105;
    return 95;
  };


  const getPrivatePackagePrice = (packageId: string) => {
    if (packageId === "standard") return 0;
    
    const pricing = {
      essentials: guestCount <= 14 ? 100 : guestCount <= 30 ? 150 : 200,
      ultimate: guestCount <= 14 ? 250 : guestCount <= 30 ? 300 : 350
    };
    
    return pricing[packageId as keyof typeof pricing] || 0;
  };

  const privatePackages = [
    { 
      id: "standard", 
      name: "Standard Package", 
      getPrice: () => 0,
      details: [
        "Your Private Boat & Captain",
        "Safety Equipment",
        "2 Empty Coolers",
        "Comfortable Seating",
        "Bluetooth Speaker",
        "Shade & Sun Areas",
        "Restroom Onboard",
        "Life Jackets Provided"
      ]
    },
    { 
      id: "essentials", 
      name: "Essentials Package", 
      getPrice: () => getPrivatePackagePrice("essentials"),
      details: [
        "Everything in Standard",
        "Coolers with Ice",
        "Ice Water Dispenser",
        "Cups & Napkins",
        "Water & Cups",
        "Ice Restocking",
        "Table Setup",
        "Trash Service"
      ]
    },
    { 
      id: "ultimate", 
      name: "Ultimate Disco Party Package", 
      getPrice: () => getPrivatePackagePrice("ultimate"),
      details: [
        "Everything in Essentials",
        "Champagne Setup",
        "Lily Pad Floats",
        "Disco Balls & Decor",
        "Unicorn/Ring Floats",
        "SPF-50 Sunscreen",
        "Disco Cups",
        "Pool Noodles",
        "Bubble Guns & Wands",
        "Waterproof Bluetooth Speaker",
        "Party Games"
      ]
    }
  ];

  const getDiscoPricePerPerson = () => {
    return getDiscoSlotPrice(selectedDiscoSlot);
  };

  const getPrivateBasePrice = (slot: any) => {
    if (!slot) return 0;
    const duration = (new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / (1000 * 60 * 60);
    return slot.hourly_rate * duration;
  };

  const getPrivatePackageAddOn = () => {
    const pkg = privatePackages.find(p => p.id === selectedPrivatePackage);
    return pkg ? pkg.getPrice() : 0;
  };

  // Filter private slots by duration and day restrictions
  const filteredPrivateSlots = useMemo(() => {
    return privateSlots.filter((slot: any) => {
      const duration = (new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / (1000 * 60 * 60);
      const roundedDuration = Math.round(duration);
      
      // Friday, Saturday, Sunday: only 4-hour cruises
      if (isWeekend) {
        return roundedDuration === 4;
      }
      
      // Weekdays (Mon-Thu): 3 or 4 hour
      if (isWeekday) {
        return roundedDuration === parseInt(privateDuration);
      }
      
      return roundedDuration === parseInt(privateDuration);
    });
  }, [privateSlots, privateDuration, isWeekend, isWeekday]);

  // Find next available disco cruise date
  const findNextDiscoCruiseDate = () => {
    const month = eventDate.getMonth();
    // No disco cruises between November (10) and February (1)
    if (month >= 10 || month <= 1) {
      return null; // Off-season
    }
    
    // Find next Friday
    let nextDate = addDays(eventDate, 1);
    while (getDay(nextDate) !== 5) { // 5 = Friday
      nextDate = addDays(nextDate, 1);
    }
    return nextDate;
  };

  const nextDiscoCruiseDate = discoSlots.length === 0 ? findNextDiscoCruiseDate() : null;
  const isOffSeason = eventDate.getMonth() >= 10 || eventDate.getMonth() <= 1;

  // Get the starting hourly rate for private cruises
  const getPrivateStartingRate = () => {
    if (privateSlots.length === 0) return 0;
    const rates = privateSlots.map((slot: any) => slot.hourly_rate);
    return Math.min(...rates);
  };

  const handleCopyLink = async () => {
    try {
      // Build canonical URL on the booking domain
      let url = window.location.href;
      try {
        const u = new URL(window.location.href);
        u.protocol = 'https:';
        u.hostname = 'booking.premierpartycruises.com';
        url = u.toString();
      } catch {}

      const copyWithFallback = async (text: string) => {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
          } catch {
            return false;
          }
        }
      };

      const ok = await copyWithFallback(url);
      if (!ok) throw new Error('copy failed');
      console.log("Copied quote link to clipboard:", url);
      toast({ title: "Link Copied!", description: "Quote link copied to clipboard" });
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast({ 
        title: "Copy Failed", 
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Premier Party Cruises Quote",
        url: window.location.href
      });
    } else {
      handleCopyLink();
    }
  };

  const formattedDate = eventDate ? format(eventDate, "EEEE, MMMM d, yyyy") : "";
  const formattedDateShort = eventDate ? format(eventDate, "MMM d, yyyy") : "";
  const dayOfWeekString = eventDate ? format(eventDate, "EEEE") : "";
  const formattedPartyType = partyType
    ? partyType
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "";

  // Calculate crew fee based on guest count
  const getCrewFee = (duration: number) => {
    if (guestCount >= 26 && guestCount <= 30) {
      return 50 * duration;
    } else if (guestCount >= 51 && guestCount <= 75) {
      return 100 * duration;
    }
    return 0;
  };

  // Check if this is a bachelor/bachelorette party
  const isBachParty = partyType.toLowerCase().includes('bachelor') || 
                      partyType.toLowerCase().includes('bachelorette');

  const scrollToSection = (section: 'disco' | 'private') => {
    setActiveCruiseTab(section);
    const ref = section === 'disco' ? discoRef : privateRef;
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Selection summary for sticky header
  const getDiscoSummary = () => {
    if (!selectedDiscoSlot) return null;
    const startTime = formatTimeCSTFull(selectedDiscoSlot.start_at);
    const endTime = formatTimeCSTFull(selectedDiscoSlot.end_at);
    const price = getDiscoSlotPrice(selectedDiscoSlot);
    return {
      time: `${startTime} - ${endTime}`,
      package: `$${price}/person`,
      tickets: discoTicketCount
    };
  };

  const getPrivateSummary = () => {
    if (!selectedPrivateSlot) return null;
    const startTime = formatTimeCSTFull(selectedPrivateSlot.start_at);
    const endTime = formatTimeCSTFull(selectedPrivateSlot.end_at);
    const pkg = privatePackages.find(p => p.id === selectedPrivatePackage);
    return {
      time: `${startTime} - ${endTime}`,
      package: pkg?.name || 'Package',
      guests: privateGuestCount,
      boat: selectedPrivateSlot.boats?.name || 'Boat'
    };
  };

  return (
    <div className="space-y-6">
      {/* Elegant Header */}
      <div className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          Select Your Experience & Book Your Cruise
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose between our exclusive disco cruise or a private charter tailored just for your group
        </p>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="bg-white hover:bg-blue-50"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Copy Quote Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="bg-white hover:bg-blue-50"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Quote
          </Button>
        </div>
      </div>

      {/* Sticky Summary Header - only show if not disabled */}
      {!disableStickyHeaders && (selectedDiscoSlot || selectedPrivateSlot) && (
        <div className="bg-background/95 backdrop-blur-sm border-b-2 border-primary/20 shadow-md mb-4">
          <div className="container mx-auto px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedDiscoSlot && getDiscoSummary() && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-300">
                  <Music className="h-5 w-5 text-purple-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Disco Cruise</p>
                    <p className="text-sm font-bold truncate">{getDiscoSummary()?.time}</p>
                    <p className="text-xs text-muted-foreground truncate">{getDiscoSummary()?.package} • {getDiscoSummary()?.tickets} tickets</p>
                  </div>
                </div>
              )}
              {selectedPrivateSlot && getPrivateSummary() && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-300">
                  <Ship className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Private Cruise</p>
                    <p className="text-sm font-bold truncate">{getPrivateSummary()?.time}</p>
                    <p className="text-xs text-muted-foreground truncate">{getPrivateSummary()?.package} • {getPrivateSummary()?.guests} guests</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tabs for Bach Parties */}
      {isBachParty && isMobile && discoSlots.length > 0 && privateSlots.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 sticky top-[120px] z-40 bg-background/95 backdrop-blur-sm pb-2 px-1">
          <Button
            variant={activeCruiseTab === 'disco' ? 'default' : 'outline'}
            onClick={() => scrollToSection('disco')}
            className={cn(
              "font-semibold transition-all text-xs py-2 h-auto",
              activeCruiseTab === 'disco' 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600" 
                : "hover:bg-purple-50"
            )}
          >
            <Music className="h-3 w-3 mr-1.5" />
            Disco Cruise
          </Button>
          <Button
            variant={activeCruiseTab === 'private' ? 'default' : 'outline'}
            onClick={() => scrollToSection('private')}
            className={cn(
              "font-semibold transition-all text-xs py-2 h-auto",
              activeCruiseTab === 'private'
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
                : "hover:bg-blue-50"
            )}
          >
            <Ship className="h-3 w-3 mr-1.5" />
            Private Cruise
          </Button>
        </div>
      )}
      
      {/* No Disco Alert and Alternative Date */}
      {discoSlots.length === 0 && !isOffSeason && nextDiscoCruiseDate && (
        <Alert className="mt-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>
            No Disco Cruises available on this weekday. Next available: <strong>{format(nextDiscoCruiseDate, "EEEE, MMMM d")}</strong>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 ml-2"
              onClick={() => window.location.href = `/?date=${format(nextDiscoCruiseDate, "yyyy-MM-dd")}&partyType=${partyType}&guests=${guestCount}`}
            >
              View that date →
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {discoSlots.length === 0 && isOffSeason && (
        <Alert className="mt-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>
            Disco Cruises are not available from late October through early March. Private Cruises are still available year-round!
          </AlertDescription>
        </Alert>
      )}

      {/* Time Slot Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Disco Cruise Slots */}
        {discoSlots.length > 0 && (
          <div className="relative">
            {/* Sticky Header for Disco Cruise */}
            <div className="sticky top-[72px] md:top-[134px] z-30 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-3 sm:px-4 rounded-t-lg shadow-lg mb-2">
              <div className="flex items-center justify-center gap-2">
                <Music className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-bold text-base sm:text-lg">🎉 Book Disco Cruise</span>
              </div>
            </div>
            
            <Card ref={discoRef} className="border-2 border-purple-500 scroll-mt-24">
              <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              
              {/* Step 1: Time Selection - Collapsible */}
              <Collapsible open={discoTimeExpanded} onOpenChange={setDiscoTimeExpanded}>
                <CollapsibleTrigger className="w-full">
                  <div className="border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-3 mb-4 hover:bg-purple-100/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-purple-500 text-purple-600 font-bold">1</span>
                        Choose Your Time
                      </h3>
                      {selectedDiscoSlot && !discoTimeExpanded && (
                        <span className="text-sm font-semibold text-purple-700">
                          {formatTimeCSTFull(selectedDiscoSlot.start_at)} - {formatTimeCSTFull(selectedDiscoSlot.end_at)}
                        </span>
                      )}
                      <ChevronDown className={cn("h-5 w-5 text-purple-600 transition-transform", discoTimeExpanded && "rotate-180")} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">
              <RadioGroup
                value={selectedDiscoSlot?.id || ""} 
                onValueChange={(slotId) => {
                  const slot = discoSlots.find((s: any) => s.id === slotId);
                  setSelectedDiscoSlot(slot || null);
                }}
                className="space-y-2"
              >
                {discoSlots.map((slot: any) => {
                  const startTime = formatTimeCSTFull(slot.start_at);
                  const endTime = formatTimeCSTFull(slot.end_at);
                  const isSelected = selectedDiscoSlot?.id === slot.id;
                  
                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        "flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
                        isSelected ? "border-green-500 bg-green-50/50" : "border-input"
                      )}
                    >
                      <RadioGroupItem value={slot.id} id={`disco-slot-${slot.id}`} />
                      <Label htmlFor={`disco-slot-${slot.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-semibold">{startTime} - {endTime}</span>
                          </div>
                          <Badge variant="secondary">${getDiscoPricePerPerson()}/pp</Badge>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
              {selectedDiscoSlot && (
                <Button 
                  onClick={() => {
                    setDiscoTimeExpanded(false);
                    setDiscoPackageExpanded(true);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Continue to Package Selection
                </Button>
              )}
              </CollapsibleContent>
              </Collapsible>

              {selectedDiscoSlot && (
                <>
                  {/* Price display for selected slot */}
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
                    <span className="text-lg font-bold text-primary">${getDiscoSlotPrice(selectedDiscoSlot)}/person</span>
                    <p className="text-xs text-muted-foreground mt-1">All-inclusive per-person pricing</p>
                  </div>

                  {/* Step 3: Ticket Count - Collapsible */}
                  <Collapsible open={discoTicketsExpanded} onOpenChange={setDiscoTicketsExpanded}>
                    <CollapsibleTrigger className="w-full">
                      <div className="border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-3 hover:bg-purple-100/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-purple-500 text-purple-600 font-bold">3</span>
                            Number of Tickets
                          </h3>
                          {!discoTicketsExpanded && (
                            <span className="text-sm font-semibold text-purple-700">
                              {discoTicketCount} tickets
                            </span>
                          )}
                          <ChevronDown className={cn("h-5 w-5 text-purple-600 transition-transform", discoTicketsExpanded && "rotate-180")} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Number of Tickets: {discoTicketCount}</Label>
                      <Slider
                        value={[discoTicketCount]}
                        onValueChange={(val) => setDiscoTicketCount(val[0])}
                        min={1}
                        max={Math.min(selectedDiscoSlot.capacity_available, 75)}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjust the number of tickets for your group
                      </p>
                    </div>
                    <Button 
                      onClick={() => setDiscoTicketsExpanded(false)}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Confirm Tickets
                    </Button>
                    </CollapsibleContent>
                  </Collapsible>

                   {(() => {
                    const perPerson = getDiscoPricePerPerson();
                    const subtotal = perPerson * discoTicketCount;
                    const taxRate = 0.0825;
                    const tipRate = 0.20;
                    const tax = subtotal * taxRate;
                    const gratuity = subtotal * tipRate;
                    const total = subtotal + tax + gratuity;
                    const totalCents = Math.round(total * 100);
                    
                    // Calculate days until event
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const eventDateOnly = new Date(eventDate);
                    eventDateOnly.setHours(0, 0, 0, 0);
                    const daysUntilEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // Use 50% deposit if event is less than 30 days away, otherwise 25%
                    const depositPct = daysUntilEvent < 30 ? 0.50 : 0.25;
                    const depositCents = Math.round(totalCents * depositPct);
                    
                    const selectedPackageName = `ATX Disco Cruise - $${perPerson}/person`;
                    
                    return (
                      <>
                        {/* Single Consolidated Pricing Section with Blue Border */}
                        <div className="space-y-4 pt-4 border-t-2">
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
                          <h5 className="text-lg font-bold text-blue-900">Price Breakdown</h5>
                          
                        </div>
                        
                          <div className="border-2 border-purple-500 bg-background/50 rounded-lg p-3">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                              <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-purple-500 text-purple-600 font-bold">4</span>
                              Confirm Your Disco Cruise Booking
                            </h3>
                          </div>

                        <EmbeddedStripeCheckout
                          timeSlotId={selectedDiscoSlot.id}
                          customerEmail={customerEmail}
                          customerName={customerName}
                          customerPhone={customerPhone}
                          guestCount={discoTicketCount}
                          ticketCount={discoTicketCount}
                          partyType={partyType}
                          packageType={selectedDiscoPackage}
                          amount={totalCents}
                          depositAmount={depositCents}
                          subtotal={Math.round(subtotal * 100)}
                          eventDate={eventDate.toISOString().split('T')[0]}
                          startTime={formatTimeCSTFull(selectedDiscoSlot.start_at)}
                          endTime={formatTimeCSTFull(selectedDiscoSlot.end_at)}
                          boatName={selectedDiscoSlot.boat?.name || "Disco Boat"}
                          experienceType="Disco Cruise"
                        />
                        </div>
                      </>
                    );
                  })()}
                </>
               )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Private Cruise Slots */}
        {privateSlots.length > 0 && (
          <div className="relative">
            {/* Sticky Header for Private Cruise */}
            <div className="sticky top-[72px] md:top-[134px] z-30 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 px-3 sm:px-4 rounded-t-lg shadow-lg mb-2">
              <div className="flex items-center justify-center gap-2">
                <Ship className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-bold text-base sm:text-lg">⚓ Book Private Cruise</span>
              </div>
            </div>
            
            <Card ref={privateRef} className="border-2 border-blue-500 scroll-mt-24">
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              
              {/* Step 1: Time Selection - Collapsible */}
              <Collapsible open={privateTimeExpanded} onOpenChange={setPrivateTimeExpanded}>
                <CollapsibleTrigger className="w-full">
                  <div className="border-2 border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 mb-4 hover:bg-blue-100/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold">1</span>
                        Choose Your Time
                      </h3>
                      {selectedPrivateSlot && !privateTimeExpanded && (
                        <span className="text-sm font-semibold text-blue-700">
                          {formatTimeCSTFull(selectedPrivateSlot.start_at)} - {formatTimeCSTFull(selectedPrivateSlot.end_at)}
                        </span>
                      )}
                      <ChevronDown className={cn("h-5 w-5 text-blue-600 transition-transform", privateTimeExpanded && "rotate-180")} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">

              {/* Duration Selection - hide on weekends (Fri, Sat, Sun) */}
              {!isWeekend && (
                <RadioGroup value={privateDuration} onValueChange={(val) => {
                  setPrivateDuration(val);
                  setSelectedPrivateSlot(null);
                  setSelectedPrivateTimeSlotId("");
                }} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="3hr" />
                    <Label htmlFor="3hr" className="cursor-pointer">3-Hour Cruise</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="4hr" />
                    <Label htmlFor="4hr" className="cursor-pointer">4-Hour Cruise</Label>
                  </div>
                </RadioGroup>
              )}

              {/* Time Slot Selection - Direct display if 4 or fewer, dropdown otherwise */}
              {filteredPrivateSlots.length <= 4 ? (
                <RadioGroup 
                  value={selectedPrivateSlot?.id || ""} 
                  onValueChange={(slotId) => {
                    const slot = filteredPrivateSlots.find((s: any) => s.id === slotId);
                    setSelectedPrivateSlot(slot || null);
                  }}
                  className="space-y-2"
                >
                  {filteredPrivateSlots.map((slot: any) => {
                    const startTime = formatTimeCSTFull(slot.start_at);
                    const endTime = formatTimeCSTFull(slot.end_at);
                    const duration = (new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / (1000 * 60 * 60);
                    const basePrice = getPrivateBasePrice(slot);
                    const isSelected = selectedPrivateSlot?.id === slot.id;
                    
                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          "flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
                          isSelected ? "border-green-500 bg-green-50/50" : "border-input"
                        )}
                      >
                        <RadioGroupItem value={slot.id} id={`private-slot-${slot.id}`} />
                        <Label htmlFor={`private-slot-${slot.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span className="font-semibold">{startTime} - {endTime}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{slot.boat?.name}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-bold">${basePrice.toFixed(0)}</span>
                              <span className="text-xs text-muted-foreground">({duration}hr)</span>
                            </div>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              ) : (
                <Select value={selectedPrivateTimeSlotId} onValueChange={(slotId) => {
                  setSelectedPrivateTimeSlotId(slotId);
                  const slot = filteredPrivateSlots.find((s: any) => s.id === slotId);
                  setSelectedPrivateSlot(slot || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPrivateSlots.map((slot: any) => {
                      const startTime = formatTimeCSTFull(slot.start_at);
                      const endTime = formatTimeCSTFull(slot.end_at);
                      const duration = (new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / (1000 * 60 * 60);
                      const basePrice = getPrivateBasePrice(slot);
                      
                      return (
                        <SelectItem key={slot.id} value={slot.id}>
                          <div className="flex justify-between w-full gap-4">
                            <span>{startTime} - {endTime} ({slot.boat?.name})</span>
                            <span className="font-semibold">${basePrice.toFixed(0)} ({duration}hr)</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {selectedPrivateSlot && (
                <Button 
                  onClick={() => {
                    setPrivateTimeExpanded(false);
                    setPrivatePackageExpanded(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Continue to Package Selection
                </Button>
              )}
              </CollapsibleContent>
              </Collapsible>

              {selectedPrivateSlot && (
                <>
                  {/* Step 2: Package Selection - Collapsible */}
                  <Collapsible open={privatePackageExpanded} onOpenChange={setPrivatePackageExpanded}>
                    <CollapsibleTrigger className="w-full">
                      <div className="border-2 border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 hover:bg-blue-100/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold">2</span>
                            Choose Your Package
                          </h3>
                          {!privatePackageExpanded && (
                            <span className="text-sm font-semibold text-blue-700">
                              {privatePackages.find(p => p.id === selectedPrivatePackage)?.name}
                            </span>
                          )}
                          <ChevronDown className={cn("h-5 w-5 text-blue-600 transition-transform", privatePackageExpanded && "rotate-180")} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                  
                  <RadioGroup value={selectedPrivatePackage} onValueChange={setSelectedPrivatePackage}>
                    {privatePackages.map((pkg) => (
                      <div 
                        key={pkg.id} 
                        className={cn(
                          "border-2 rounded-lg overflow-hidden transition-colors",
                          selectedPrivatePackage === pkg.id ? "border-green-500 bg-green-50/50" : "border-input bg-background"
                        )}
                      >
                        <Label 
                          htmlFor={`private-pkg-${pkg.id}`}
                          className="flex items-center space-x-3 p-4 cursor-pointer"
                        >
                          <RadioGroupItem value={pkg.id} id={`private-pkg-${pkg.id}`} />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="font-semibold">{pkg.name}</span>
                            <Badge variant="outline" className="bg-orange-500 text-white border-orange-600">
                              {pkg.getPrice() > 0 ? `+$${pkg.getPrice()}` : '+$0'}
                            </Badge>
                          </div>
                        </Label>
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center justify-center w-full text-sm py-2 hover:bg-accent/50 border-t">
                            <span className="text-primary font-semibold">View Details</span>
                            <ChevronDown className="h-4 w-4 ml-1" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 py-3 bg-background">
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                              {pkg.details.map((detail, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <span className="text-primary font-bold text-base">✓</span>
                                  <span className="text-sm font-medium">{detail}</span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button 
                    onClick={() => {
                      setPrivatePackageExpanded(false);
                      setPrivateGuestsExpanded(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Continue to Guest Count
                  </Button>

                  {/* Add-ons Section for Private - Show as Checkboxes */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-base">Add-Ons</h4>
                    <div className="space-y-2">
                      {addOns.map((addOn) => (
                        <div 
                          key={addOn.id}
                          className={cn(
                            "p-2 border-2 rounded-lg cursor-pointer transition-colors",
                            selectedPrivateAddOns.includes(addOn.id)
                              ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                              : "border-input bg-background hover:bg-accent/50"
                          )}
                          onClick={() => togglePrivateAddOn(addOn.id)}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPrivateAddOns.includes(addOn.id)}
                              onChange={() => togglePrivateAddOn(addOn.id)}
                              className="w-4 h-4"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Label className="cursor-pointer text-sm">{addOn.name}</Label>
                            <span className="ml-auto text-sm font-semibold">${addOn.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  </CollapsibleContent>
                  </Collapsible>

                  {/* Step 3: Guest Count - Collapsible */}
                  <Collapsible open={privateGuestsExpanded} onOpenChange={setPrivateGuestsExpanded}>
                    <CollapsibleTrigger className="w-full">
                      <div className="border-2 border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 hover:bg-blue-100/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold">3</span>
                            Number of Guests
                          </h3>
                          {!privateGuestsExpanded && (
                            <span className="text-sm font-semibold text-blue-700">
                              {privateGuestCount} guests
                            </span>
                          )}
                          <ChevronDown className={cn("h-5 w-5 text-blue-600 transition-transform", privateGuestsExpanded && "rotate-180")} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Number of People: {privateGuestCount}</Label>
                      <Slider
                        value={[privateGuestCount]}
                        onValueChange={(val) => setPrivateGuestCount(val[0])}
                        min={1}
                        max={75}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjust if your group size has changed - this may affect pricing
                      </p>
                    </div>
                    <Button 
                      onClick={() => setPrivateGuestsExpanded(false)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Confirm Guest Count
                    </Button>
                    </CollapsibleContent>
                  </Collapsible>

                  {(() => {
                    const basePrice = getPrivateBasePrice(selectedPrivateSlot);
                    const packageAddOn = getPrivatePackageAddOn();
                    const duration = (new Date(selectedPrivateSlot.end_at).getTime() - new Date(selectedPrivateSlot.start_at).getTime()) / (1000 * 60 * 60);
                    const crewFee = getCrewFee(duration);
                    const addOnsTotal = getPrivateAddOnsTotal();
                    const subtotal = basePrice + crewFee + packageAddOn + addOnsTotal;
                    const taxRate = 0.0825;
                    const tipRate = 0.20;
                    const tax = subtotal * taxRate;
                    const gratuity = subtotal * tipRate;
                    const total = subtotal + tax + gratuity;
                    const totalCents = Math.round(total * 100);
                    
                    // Calculate days until event
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const eventDateOnly = new Date(eventDate);
                    eventDateOnly.setHours(0, 0, 0, 0);
                    const daysUntilEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // Use 50% deposit if event is less than 30 days away, otherwise 25%
                    const depositPct = daysUntilEvent < 30 ? 0.50 : 0.25;
                    const depositCents = Math.round(totalCents * depositPct);
                    
                     return (
                      <>
                        {/* Single Consolidated Pricing Section with Blue Border */}
                        <div className="space-y-4 pt-4 border-t-2">
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
                          <h5 className="text-lg font-bold text-blue-900">Price Breakdown</h5>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">Hourly Rate:</span>
                              <span className="font-semibold">${(basePrice/duration).toFixed(2)}/hr × {duration}hrs = ${basePrice.toFixed(2)}</span>
                            </div>
                             {crewFee > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="font-medium flex items-center gap-1">
                                  Crew Fee ({privateGuestCount} guests)
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
                                <span className="font-semibold">${crewFee.toFixed(2)}</span>
                              </div>
                            )}
                             {packageAddOn > 0 && (
                              <div className="flex justify-between">
                                <span className="font-medium">
                                  {selectedPrivatePackage === 'essentials' ? 'Essentials Package' : 
                                   selectedPrivatePackage === 'ultimate' ? 'Ultimate Disco Party Package' : 
                                   'Package Add-on'}:
                                </span>
                                <span className="font-semibold">+${packageAddOn.toFixed(2)}</span>
                              </div>
                            )}
                            {selectedPrivateAddOns.map(addOnId => {
                              const addOn = addOns.find(a => a.id === addOnId);
                              return addOn ? (
                                <div key={addOnId} className="flex justify-between">
                                  <span className="font-medium">{addOn.name}:</span>
                                  <span className="font-semibold">+${addOn.price.toFixed(2)}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                          
                          <div className="border-2 border-blue-600 bg-background/50 rounded-lg p-3">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                              <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold">4</span>
                              Complete Your Payment and Confirm Your Private Cruise Booking
                            </h3>
                          </div>

                        <EmbeddedStripeCheckout
                          timeSlotId={selectedPrivateSlot.id}
                          customerEmail={customerEmail}
                          customerName={customerName}
                          customerPhone={customerPhone}
                          guestCount={privateGuestCount}
                          partyType={partyType}
                          packageType={selectedPrivatePackage}
                          amount={totalCents}
                          depositAmount={depositCents}
                          subtotal={Math.round(subtotal * 100)}
                          eventDate={eventDate.toISOString().split('T')[0]}
                          startTime={formatTimeCSTFull(selectedPrivateSlot.start_at)}
                          endTime={formatTimeCSTFull(selectedPrivateSlot.end_at)}
                          boatName={selectedPrivateSlot.boat?.name || "Private Boat"}
                          experienceType="Private Cruise"
                        />
                        </div>
                      </>
                    );
                  })()}
                </>
               )}
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
};
