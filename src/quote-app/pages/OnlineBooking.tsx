import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, Check, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/quote-app/components/ui/button";
import { Label } from "@/quote-app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { Card } from "@/quote-app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { cn } from "@/quote-app/lib/utils";
import { useToast } from "@/quote-app/hooks/use-toast";
import { calculatePricing, getPackagePrice } from "@/quote-app/lib/pricing";
import { getRecommendedBoat, shouldChangeBoat } from "@/quote-app/lib/boatSelection";
import { validateDiscoSlot } from "@/quote-app/lib/discoRules";
import { EmbeddedStripeCheckout } from "@/quote-app/components/quote-builder/EmbeddedStripeCheckout";

const OnlineBooking = () => {
  const { toast } = useToast();
  
  const [selectedBoatCategory, setSelectedBoatCategory] = useState<'up-to-14' | 'up-to-15-30' | 'up-to-31-75' | 'disco-cruise' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [guestCount, setGuestCount] = useState(10);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);

  const isStep1Complete = guestCount > 0;
  const isStep2Complete = selectedDate !== undefined;
  const isStep3Complete = selectedSlotId !== null;
  const isStep4Complete = selectedPackage !== null;
  const showBookNow = !!(isStep1Complete && isStep2Complete && isStep3Complete && isStep4Complete && !showConfirmation && !showStripeCheckout);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedBoatCategory, guestCount]);

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

  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(dateStr));
  };

  const calculateDuration = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;
    
    setIsLoadingSlots(true);
    try {
      const { startISO, endISO } = getChicagoDayBounds(selectedDate);
      const capacityFilter = guestCount;
      
      const { data, error } = await supabase
        .from("time_slots")
        .select(`
          *,
          boat:boats(*),
          experience:experiences(*)
        `)
        .gte("start_at", startISO)
        .lt("start_at", endISO)
        .gte("capacity_available", capacityFilter)
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
        const { y: sY, m: sM, d: sD } = getChicagoDateParts(selectedDate);
        return bY === sY && bM === sM && bD === sD;
      });

      let availableSlots = (data || []).filter((slot: any) => {
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

      if (selectedBoatCategory) {
        availableSlots = availableSlots.filter((slot: any) => {
          const boatCapacity = slot.boat?.capacity || 0;
          const experienceType = slot.experience?.type;
          
          if (selectedBoatCategory === 'disco-cruise') {
            if (experienceType !== 'disco_cruise') return false;
            
            const slotDate = new Date(slot.start_at);
            const validation = validateDiscoSlot(slotDate, slot.boat?.name || '', experienceType || '');
            return validation.isValid;
          } else if (selectedBoatCategory === 'up-to-14') {
            return boatCapacity <= 14 && experienceType === 'private_cruise';
          } else if (selectedBoatCategory === 'up-to-15-30') {
            return boatCapacity >= 15 && boatCapacity <= 30 && experienceType === 'private_cruise';
          } else if (selectedBoatCategory === 'up-to-31-75') {
            return boatCapacity >= 31 && boatCapacity <= 75 && experienceType === 'private_cruise';
          }
          return true;
        });
      }

      setAllSlots(availableSlots);
    } catch (error) {
      console.error("Error fetching slots:", error);
      toast({ title: "Error", description: "Failed to load available slots", variant: "destructive" });
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBoatCategorySelect = (category: 'up-to-14' | 'up-to-15-30' | 'up-to-31-75' | 'disco-cruise' | null) => {
    setSelectedBoatCategory(category);
    setSelectedSlotId(null);
    
    if (category === 'up-to-14') {
      setGuestCount(10);
    } else if (category === 'up-to-15-30') {
      setGuestCount(25);
    } else if (category === 'up-to-31-75') {
      setGuestCount(50);
    } else if (category === 'disco-cruise') {
      setGuestCount(20);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlotId(null);
  };

  const handleGuestCountChange = (count: number) => {
    // Only reset selections if the boat needs to change (crossing 14→15 or 30→31 thresholds)
    const needsBoatChange = shouldChangeBoat(guestCount, count);
    
    setGuestCount(count);
    
    // Only reset time slot and package if we're changing boats
    if (needsBoatChange) {
      setSelectedSlotId(null);
      setSelectedPackage(null);
      
      toast({
        title: "Boat Changed",
        description: "Time slots reset due to capacity change. Please select a new time slot.",
        duration: 3000,
      });
    }
    
    const recommended = getRecommendedBoat(count);
    if (recommended.boatName === "Day Tripper") {
      setSelectedBoatCategory('up-to-14');
    } else if (recommended.boatName === "Meeseeks / The Irony") {
      setSelectedBoatCategory('up-to-15-30');
    } else {
      setSelectedBoatCategory('up-to-31-75');
    }
  };

  const calculateRealTimePricing = () => {
    const selectedSlot = allSlots.find(slot => slot.id === selectedSlotId);
    if (!selectedSlot || !selectedDate) return null;

    const duration = calculateDuration(selectedSlot.start_at, selectedSlot.end_at);
    const experienceType = selectedSlot.experience?.type;
    const isDiscoCruise = experienceType === 'disco_cruise';

    if (isDiscoCruise) {
      const ticketPrice = selectedSlot.price_override || selectedSlot.hourly_rate || 85;
      const baseSubtotal = ticketPrice * guestCount;
      
      let packageAddOn = 0;
      if (selectedPackage === 'vip') packageAddOn = 10 * guestCount;
      if (selectedPackage === 'premium') packageAddOn = 20 * guestCount;
      
      const subtotal = baseSubtotal + packageAddOn;
      const tax = subtotal * 0.0825;
      const total = subtotal + tax;
      
      return {
        hourlyRate: ticketPrice,
        packageAddOn,
        subtotal,
        tax,
        gratuity: 0,
        total,
        isDiscoCruise: true,
      };
    } else {
      const pricing = calculatePricing({
        date: selectedDate,
        guestCount,
        duration,
        boatCapacity: selectedSlot.boat?.capacity || 14,
      });
      
      const packageAddOn = selectedPackage ? getPackagePrice(guestCount, selectedPackage as any) : 0;
      
      return {
        hourlyRate: pricing.hourlyRate,
        additionalCrewFee: pricing.additionalCrewFee,
        packageAddOn,
        subtotal: pricing.subtotal + packageAddOn,
        tax: pricing.tax,
        gratuity: pricing.gratuity,
        total: pricing.total + packageAddOn,
        isDiscoCruise: false,
      };
    }
  };

  const pricingDetails = calculateRealTimePricing();
  const selectedSlot = allSlots.find(slot => slot.id === selectedSlotId);
  const isDiscoCruise = selectedSlot?.experience?.type === 'disco_cruise';
  
  const packageOptions = isDiscoCruise ? [
    { id: 'basic', label: 'Basic Bach', price: 0 },
    { id: 'vip', label: 'Disco Queen', price: 10 },
    { id: 'premium', label: 'Super Sparkle Platinum', price: 20 },
  ] : [
    { id: 'standard', label: 'Standard (No Add-Ons)', price: 0 },
    { id: 'essentials', label: 'Essentials Package', price: getPackagePrice(guestCount, 'essentials') },
    { id: 'ultimate', label: 'Ultimate Disco Party Package', price: getPackagePrice(guestCount, 'ultimate') },
  ];

  const getCheckoutData = () => {
    if (!selectedSlot || !selectedDate || !selectedPackage || !pricingDetails) return null;

    const totalAmount = Math.round(pricingDetails.total * 100);
    
    const getCentralDate = () => {
      const now = new Date();
      const centralDateStr = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'America/Chicago', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(now);
      const [month, day, year] = centralDateStr.split('/');
      return new Date(`${year}-${month}-${day}`);
    };
    
    const today = getCentralDate();
    const eventDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const daysUntilEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const requiresHigherDeposit = daysUntilEvent < 14;
    const depositPercentage = requiresHigherDeposit ? 0.5 : 0.25;
    const depositAmount = Math.round(totalAmount * depositPercentage);

    return {
      timeSlotId: selectedSlot.id,
      customerEmail: "",
      customerName: "",
      customerPhone: "",
      guestCount: pricingDetails.isDiscoCruise ? guestCount : guestCount,
      partyType: pricingDetails.isDiscoCruise ? 'disco_cruise' : 'private',
      packageType: selectedPackage,
      amount: totalAmount,
      depositAmount,
      subtotal: Math.round(pricingDetails.subtotal * 100),
      eventDate: format(selectedDate, "yyyy-MM-dd"),
      startTime: formatTime(selectedSlot.start_at),
      endTime: formatTime(selectedSlot.end_at),
      boatName: selectedSlot.boat?.name || '',
      experienceType: selectedSlot.experience?.type,
      ticketCount: pricingDetails.isDiscoCruise ? guestCount : undefined,
      daysUntilEvent,
      depositPercentage,
    };
  };

  const checkoutData = getCheckoutData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="bg-primary text-primary-foreground py-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-3">Book Your Cruise</h1>
          
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
            {[
              { num: 1, label: 'Guests', complete: isStep1Complete },
              { num: 2, label: 'Date', complete: isStep2Complete },
              { num: 3, label: 'Time', complete: isStep3Complete },
              { num: 4, label: 'Package', complete: isStep4Complete },
              { num: 5, label: 'Payment', complete: showStripeCheckout }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  step.complete 
                    ? "bg-primary-foreground text-primary scale-110" 
                    : "bg-primary-foreground/20 text-primary-foreground/60",
                  !step.complete && idx === [isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete, showStripeCheckout].filter(Boolean).length
                    && "ring-2 ring-primary-foreground/50 animate-pulse"
                )}>
                  {step.complete ? <Check className="w-4 h-4" /> : step.num}
                </div>
                <span className="ml-1 text-xs hidden sm:inline">{step.label}</span>
                {idx < 4 && <div className="w-3 sm:w-4 h-0.5 bg-primary-foreground/30 mx-1" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            {(['up-to-14', 'up-to-15-30', 'up-to-31-75', 'disco-cruise'] as const).map((cat, idx) => (
              <button
                key={cat}
                onClick={() => handleBoatCategorySelect(selectedBoatCategory === cat ? null : cat)}
                className={cn(
                  "rounded-md border-2 transition-all p-2 text-center text-sm",
                  selectedBoatCategory === cat 
                    ? "border-primary-foreground bg-primary-foreground/20 scale-105" 
                    : "border-primary-foreground/30 hover:border-primary-foreground"
                )}
              >
                <div className="text-lg mb-0.5">{['⛵', '🚤', '🛥️', '🪩'][idx]}</div>
                <div className="font-bold text-xs">
                  {cat === 'up-to-14' && 'Up to 14'}
                  {cat === 'up-to-15-30' && '15-30 Guests'}
                  {cat === 'up-to-31-75' && '31-75 Guests'}
                  {cat === 'disco-cruise' && 'ATX Disco Cruise'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Steps 1-4: Mobile stacked (order-1), Desktop 2 columns spanning 2/3 width */}
          <div className="lg:col-span-2 order-1 lg:order-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Container 1: Steps 1 (Guests) + 2 (Date) */}
              <Card className="shadow-xl border-2">
                <div className="p-3 sm:p-4 space-y-4">
                  {/* Step 1: Number of Guests */}
                  <div className={cn("p-3 rounded-lg border-2 transition-all duration-300", !isStep1Complete ? "border-primary shadow-lg shadow-primary/20 scale-105" : "border-border")}>
                    <Label className="text-sm font-bold mb-2 flex items-center">
                      <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 transition-all", isStep1Complete ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground animate-pulse")}>1</span>
                      Number of Guests
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-10 w-10 hover:scale-110 transition-transform" onClick={() => handleGuestCountChange(Math.max(1, guestCount - 1))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <div className="text-3xl font-bold text-primary">{guestCount}</div>
                        <div className="text-xs text-muted-foreground">guests</div>
                      </div>
                      <Button variant="outline" size="icon" className="h-10 w-10 hover:scale-110 transition-transform" onClick={() => handleGuestCountChange(guestCount + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedBoatCategory && (
                      <div className="mt-2 p-2 bg-primary/10 rounded text-xs text-center font-medium">
                        {selectedBoatCategory === 'up-to-14' && "Day Tripper (1-14)"}
                        {selectedBoatCategory === 'up-to-15-30' && "Meeseeks/Irony (15-30)"}
                        {selectedBoatCategory === 'up-to-31-75' && "Clever Girl (31-75)"}
                        {selectedBoatCategory === 'disco-cruise' && "ATX Disco Cruise"}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Select Date */}
                  {isStep1Complete && (
                    <div className={cn("p-3 rounded-lg border-2 transition-all duration-300", isStep1Complete && !isStep2Complete ? "border-primary shadow-lg shadow-primary/20 scale-105" : "border-border")}>
                      <Label className="text-sm font-bold mb-2 flex items-center">
                        <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 transition-all", isStep2Complete ? "bg-primary text-primary-foreground" : isStep1Complete ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted text-muted-foreground")}>2</span>
                        Select Date
                      </Label>
                      <div className="flex justify-center -mx-2">
                        <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} disabled={(date) => date < new Date()} className="rounded-md border-0 scale-75 pointer-events-auto" />
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Container 2: Steps 3 (Time Slot) + 4 (Package) */}
              {isStep2Complete && (
                <Card className="shadow-xl border-2">
                  <div className="p-3 sm:p-4 space-y-4">
                    {/* Step 3: Select Time Slot */}
                    <div className={cn("p-3 rounded-lg border-2 transition-all duration-300", isStep2Complete && !isStep3Complete ? "border-primary shadow-lg shadow-primary/20 scale-105" : "border-border")}>
                      <Label className="text-sm font-bold mb-2 flex items-center">
                        <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 transition-all", isStep3Complete ? "bg-primary text-primary-foreground" : isStep2Complete ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted text-muted-foreground")}>3</span>
                        Select Time Slot
                      </Label>
                      {isLoadingSlots ? (
                        <div className="flex flex-col items-center justify-center py-6">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                          <p className="text-xs text-muted-foreground">Loading available times...</p>
                        </div>
                      ) : allSlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No times available for this date</p>
                      ) : selectedSlotId ? (
                        <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                          <SelectTrigger className="w-full h-auto py-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background max-h-[300px]">
                            {allSlots.map((slot) => (
                              <SelectItem key={slot.id} value={slot.id} className="py-2">
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span className="font-medium text-sm">{slot.boat?.name}</span>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <RadioGroup value={selectedSlotId || ""} onValueChange={setSelectedSlotId} className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                          {allSlots.map((slot) => (
                            <div key={slot.id} className="flex items-start gap-2">
                              <RadioGroupItem value={slot.id} id={slot.id} className="shrink-0 mt-1.5" />
                              <Label htmlFor={slot.id} className="flex-1 cursor-pointer border rounded-md p-2 hover:bg-accent/50 hover:border-primary/50 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs sm:text-sm truncate">{slot.boat?.name}</div>
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                      {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                                    {slot.capacity_available} spots
                                  </div>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>

                    {/* Step 4: Select Package */}
                    {isStep3Complete && (
                      <div className={cn("p-3 rounded-lg border-2 transition-all duration-300", isStep3Complete && !isStep4Complete ? "border-primary shadow-lg shadow-primary/20 scale-105" : "border-border")}>
                        <Label className="text-sm font-bold mb-2 flex items-center">
                          <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 transition-all", isStep4Complete ? "bg-primary text-primary-foreground" : isStep3Complete ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted text-muted-foreground")}>4</span>
                          Select Package
                        </Label>
                        <RadioGroup value={selectedPackage || ""} onValueChange={setSelectedPackage} className="space-y-2">
                          {packageOptions.map((pkg) => (
                            <div key={pkg.id} className="flex items-start gap-2">
                              <RadioGroupItem value={pkg.id} id={pkg.id} className="shrink-0 mt-1.5" />
                              <Label htmlFor={pkg.id} className="flex-1 cursor-pointer border rounded-md p-2 hover:bg-accent/50 hover:border-primary/50 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-xs sm:text-sm">{pkg.label}</span>
                                  {pkg.price > 0 && (
                                    <span className="text-xs sm:text-sm font-semibold text-primary">+${pkg.price}</span>
                                  )}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Booking Summary: Mobile after steps (order-2), Desktop third column at 1/3 width */}
          <Card className="lg:col-span-1 order-2 lg:order-2 shadow-xl border-2 bg-gradient-to-br from-background to-primary/5 lg:sticky lg:top-4 lg:self-start">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Booking Summary
              </h3>

              {pricingDetails && selectedDate && selectedSlot ? (
                <div className="space-y-3">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-2 text-sm">Event Details</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{format(selectedDate, "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium">{formatTime(selectedSlot.start_at)} - {formatTime(selectedSlot.end_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Boat:</span>
                        <span className="font-medium">{selectedSlot.boat?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guests:</span>
                        <span className="font-medium">{guestCount}</span>
                      </div>
                      {selectedPackage && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Package:</span>
                          <span className="font-medium">{packageOptions.find(p => p.id === selectedPackage)?.label}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {pricingDetails.isDiscoCruise ? (
                      <>
                        <div className="flex justify-between">
                          <span>Ticket Price (${pricingDetails.hourlyRate}/person × {guestCount})</span>
                          <span>${(pricingDetails.hourlyRate * guestCount).toFixed(2)}</span>
                        </div>
                        {pricingDetails.packageAddOn > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>Package Add-On</span>
                            <span>+${pricingDetails.packageAddOn.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Hourly Rate (${pricingDetails.hourlyRate}/hr × {calculateDuration(selectedSlot.start_at, selectedSlot.end_at)}hrs)</span>
                          <span>${(pricingDetails.hourlyRate * calculateDuration(selectedSlot.start_at, selectedSlot.end_at)).toFixed(2)}</span>
                        </div>
                        {pricingDetails.additionalCrewFee > 0 && (
                          <div className="flex justify-between">
                            <span>Additional Crew Fee</span>
                            <span>${pricingDetails.additionalCrewFee.toFixed(2)}</span>
                          </div>
                        )}
                        {pricingDetails.packageAddOn > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>Package Add-On</span>
                            <span>+${pricingDetails.packageAddOn.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${pricingDetails.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (8.25%)</span>
                      <span>${pricingDetails.tax.toFixed(2)}</span>
                    </div>
                    {pricingDetails.gratuity > 0 && (
                      <div className="flex justify-between">
                        <span>Gratuity (20%)</span>
                        <span>${pricingDetails.gratuity.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-primary/20 my-2" />
                    <div className="flex justify-between text-lg font-bold text-primary">
                      <span>Total Price</span>
                      <span>${pricingDetails.total.toFixed(2)}</span>
                    </div>
                    
                    {checkoutData && (
                      <>
                        <div className="h-px bg-border my-3" />
                        <div className="flex justify-between text-sm bg-accent/20 p-2 rounded">
                          <span>Deposit ({Math.round(checkoutData.depositPercentage * 100)}%)</span>
                          <span className="font-semibold">${(checkoutData.depositAmount / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Remaining Balance</span>
                          <span className="font-semibold">${((checkoutData.amount - checkoutData.depositAmount) / 100).toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Balance due: {format(addDays(selectedDate, -14), "MMM d, yyyy")}
                        </div>
                      </>
                    )}
                  </div>

                  {showBookNow && !showConfirmation && !showStripeCheckout && (
                    <Button onClick={() => setShowConfirmation(true)} className="w-full h-auto py-4 text-base font-bold bg-gradient-to-r from-primary to-accent hover:scale-105 transition-all duration-300 shadow-lg" size="lg">
                      <Check className="mr-2 h-5 w-5" />
                      Book This Experience Now
                    </Button>
                  )}

                  {showConfirmation && !showStripeCheckout && checkoutData && (
                    <div className="mt-4 p-4 bg-primary/5 border-2 border-primary rounded-lg space-y-3 animate-fade-in">
                      <h4 className="font-bold text-center text-lg">Confirm Your Booking</h4>
                      <p className="text-sm text-center font-medium">
                        {pricingDetails.isDiscoCruise ? 'ATX Disco Cruise' : 'Private Cruise'} for Up to {guestCount} Guests
                      </p>
                      <p className="text-sm text-center">
                        {format(selectedDate, "EEEE, MMMM d, yyyy")} • {formatTime(selectedSlot.start_at)} - {formatTime(selectedSlot.end_at)}
                      </p>
                      {selectedPackage && (
                        <p className="text-sm text-center text-primary font-medium">
                          with {packageOptions.find(p => p.id === selectedPackage)?.label}
                        </p>
                      )}
                      <div className="text-center space-y-1 py-2">
                        <div className="text-2xl font-bold text-primary">${pricingDetails.total.toFixed(2)} Total</div>
                        <div className="text-sm">
                          ${(checkoutData.depositAmount / 100).toFixed(2)} due now • 
                          Remainder due {format(addDays(selectedDate, -14), "MMM d")}
                        </div>
                      </div>
                      <Button onClick={() => setShowStripeCheckout(true)} className="w-full h-12 text-base font-bold animate-pulse hover:animate-none">
                        Confirm & Continue to Payment
                      </Button>
                      <Button variant="outline" onClick={() => setShowConfirmation(false)} className="w-full">
                        Go Back
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Complete the form to see your price</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {showStripeCheckout && checkoutData && (
          <Card className="mt-4 shadow-2xl border-2 border-primary animate-slide-in-right overflow-hidden">
            <div className="p-4 sm:p-6 bg-gradient-to-r from-primary/10 to-accent/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm">5</span>
                Payment Information
              </h3>
              <EmbeddedStripeCheckout
                {...checkoutData}
                onCheckoutStarted={(data) => {
                  console.log('Checkout started:', data);
                }}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OnlineBooking;
