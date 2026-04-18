import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Clock, Ship, AlertCircle, Calendar, Circle } from "lucide-react";
import { format, getDay } from "date-fns";
import { calculatePricing, getPackagePrice } from "@/quote-app/lib/pricing";
import { EmbeddedStripeCheckout } from "./EmbeddedStripeCheckout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/quote-app/components/ui/tooltip";
import { BoatLink } from "@/quote-app/components/BoatLink";
import { SelectionSummaryHeader } from "./SelectionSummaryHeader";
import { getRecommendedBoat, shouldChangeBoat } from "@/quote-app/lib/boatSelection";
import { Alert, AlertDescription } from "@/quote-app/components/ui/alert";
import { Checkbox } from "@/quote-app/components/ui/checkbox";
import { cn, formatTimeCSTFull } from "@/quote-app/lib/utils";

interface PrivateSlot {
  id: string;
  start_at: string;
  end_at: string;
  capacity_available: number;
  boat: { name: string; capacity: number };
  grouped_slot_ids?: string[];
  availability_count?: number;
}

interface PrivateCruiseSelectorProps {
  slots: PrivateSlot[];
  eventDate: Date;
  guestCount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  partyType: string;
  onBook: (slotId: string, packageType: 'standard' | 'essentials' | 'ultimate') => void;
  onCheckoutStarted?: (data: any) => void;
  onPackageSelected?: (data: { slotId: string; packageType: string; boatName: string; startTime: string; endTime: string; }) => void;
  onSlotSelected?: (slotId: string) => void;
  onGuestCountChange?: (count: number) => void;
  disableStickyHeaders?: boolean;
  hideSectionHeader?: boolean;
}

export const PrivateCruiseSelector = ({ 
  slots, 
  eventDate, 
  guestCount: initialGuestCount, 
  customerEmail,
  customerName,
  customerPhone,
  partyType,
  onBook,
  onCheckoutStarted,
  onPackageSelected,
  onSlotSelected,
  onGuestCountChange,
  disableStickyHeaders = false,
  hideSectionHeader = false
}: PrivateCruiseSelectorProps) => {
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [selectedPackage, setSelectedPackage] = useState<'standard' | 'essentials' | 'ultimate' | "">("");
  const [checkoutGuestCount, setCheckoutGuestCount] = useState(initialGuestCount);
  const [guestCountConfirmed, setGuestCountConfirmed] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [guestRange, setGuestRange] = useState<'15-25' | '26-30' | '31-50' | '51-75' | ''>("");
  
  // Add-ons state for private cruises
  const [addOns, setAddOns] = useState({
    dj: false,
    photographer: false,
    bartender: false,
    lilyPadCount: 0,
    avPackage: false
  });

  // Persist selection per date + party type to prevent cross-session bleed
  const contextKey = `${format(eventDate, 'yyyy-MM-dd')}|${partyType}|private`;

  // Restore saved progress for Private tab (scoped by date + party type)
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return; // Only restore once
    
    try {
      const raw = sessionStorage.getItem('private.selection');
      if (!raw) {
        hasRestoredRef.current = true;
        return;
      }
      const saved = JSON.parse(raw);
      if (saved && saved.contextKey === contextKey && saved.initialGuestCount === initialGuestCount) {
        if (saved.selectedDuration) setSelectedDuration(saved.selectedDuration);
        if (saved.selectedSlot && slots.some((s: any) => s.id === saved.selectedSlot)) setSelectedSlot(saved.selectedSlot);
        if (saved.selectedPackage) setSelectedPackage(saved.selectedPackage);
        if (typeof saved.checkoutGuestCount === 'number') setCheckoutGuestCount(saved.checkoutGuestCount);
        if (saved.guestCountConfirmed) setGuestCountConfirmed(!!saved.guestCountConfirmed);
        if (saved.checkoutMode) setCheckoutMode(!!saved.checkoutMode);
        if (saved.guestRange) setGuestRange(saved.guestRange);
        if (saved.addOns) setAddOns(saved.addOns);
      } else {
        // Stale selection from different session/date — clear it
        sessionStorage.removeItem('private.selection');
      }
      hasRestoredRef.current = true;
    } catch {}
  }, [contextKey, initialGuestCount]); // Removed slots from dependencies

  // Auto-save progress (scoped by date + party type)
  useEffect(() => {
    try {
      sessionStorage.setItem('private.selection', JSON.stringify({
        contextKey,
        initialGuestCount,
        selectedDuration,
        selectedSlot,
        selectedPackage,
        checkoutGuestCount,
        guestCountConfirmed,
        checkoutMode,
        guestRange,
        addOns,
      }));
    } catch {}
  }, [contextKey, initialGuestCount, selectedDuration, selectedSlot, selectedPackage, checkoutGuestCount, guestCountConfirmed, checkoutMode, guestRange, addOns]);

  // Refs + guided highlight
  const guestsRef = useRef<HTMLDivElement>(null);
  const pkgRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<null | 'guests' | 'pkg' | 'price'>(null);
  // Watch for guest count changes that require boat change
  useEffect(() => {
    if (initialGuestCount !== checkoutGuestCount) {
      const needsChange = shouldChangeBoat(checkoutGuestCount, initialGuestCount);
      if (needsChange && selectedSlot) {
        // Reset selections when boat capacity needs to change
        setSelectedSlot("");
        setSelectedPackage("");
        setGuestCountConfirmed(false);
        setCheckoutMode(false);
        setCheckoutGuestCount(initialGuestCount);
      } else if (!selectedSlot) {
        // Update guest count if no slot selected yet
        setCheckoutGuestCount(initialGuestCount);
      }
    }
  }, [initialGuestCount]);

  const scrollAndHighlight = (ref: any, key: 'guests' | 'pkg' | 'price') => {
    // Only scroll if element is not in viewport to prevent excessive scrolling
    if (ref?.current) {
      const rect = ref.current.getBoundingClientRect();
      const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!isInViewport) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setHighlight(key);
    setTimeout(() => setHighlight(null), 2500);
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

  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  // Notify parent when package is selected
  useEffect(() => {
    if (selectedPackage && selectedSlotData && onPackageSelected) {
      onPackageSelected({
        slotId: selectedSlot,
        packageType: selectedPackage,
        boatName: selectedSlotData.boat.name,
        startTime: formatTime(selectedSlotData.start_at),
        endTime: formatTime(selectedSlotData.end_at),
      });
    }
  }, [selectedPackage, selectedSlot]);

  // Notify parent of guest count changes in real-time
  // Notify parent of guest count changes ONLY when user actively changes it
  // Skip notifications during: mount, auto-sync, or slot selection
  const didMountRef = useRef(false);
  const isUserChangeRef = useRef(false);
  useEffect(() => {
    if (!onGuestCountChange) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return; // prevent initial emit on mount
    }
    // Only notify if this was a user-initiated change (not auto-sync)
    if (isUserChangeRef.current) {
      onGuestCountChange(checkoutGuestCount);
      isUserChangeRef.current = false;
    }
  }, [checkoutGuestCount, onGuestCountChange]);

  const dayOfWeek = getDay(eventDate);
  const isMonThu = dayOfWeek >= 1 && dayOfWeek <= 4;
  const isFriSunSat = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  
  console.log('🔵 PrivateCruiseSelector RENDER - dayOfWeek:', dayOfWeek, 'isMonThu:', isMonThu, 'selectedDuration:', selectedDuration);

  const formatTime = (dateStr: string) => {
    return formatTimeCSTFull(dateStr);
  };

  const calculateDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  // Use checkout guest count for all calculations (must be defined early)
  const guestCount = checkoutMode ? checkoutGuestCount : initialGuestCount;

  // Group slots by duration for Mon-Thu
  const slotsByDuration = useMemo(() => {
    const grouped: { [key: string]: PrivateSlot[] } = { '3': [], '4': [] };
    slots.forEach(slot => {
      const duration = calculateDuration(slot.start_at, slot.end_at);
      if (duration === 3 || duration === 4) {
        grouped[duration.toString()].push(slot);
      }
    });
    return grouped;
  }, [slots]);

  // Filter slots by duration AND guest count capacity
  let availableSlots = isMonThu && selectedDuration 
    ? slotsByDuration[selectedDuration] 
    : slots;
  
  // Only show boats that can accommodate the guest count
  availableSlots = availableSlots.filter(slot => slot.boat.capacity >= guestCount);

  // Check for available boats with different capacities
  const boatsAvailableByCapacity = useMemo(() => {
    const allAvailableSlots = isMonThu && selectedDuration ? slotsByDuration[selectedDuration] : slots;
    const capacities = new Set(allAvailableSlots.map(slot => slot.boat.capacity));
    return Array.from(capacities).sort((a, b) => a - b);
  }, [slots, isMonThu, selectedDuration, slotsByDuration]);

  // Determine what boats are available
  const smallerBoatsAvailable = boatsAvailableByCapacity.filter(cap => cap < guestCount);
  const largerBoatsAvailable = boatsAvailableByCapacity.filter(cap => cap >= guestCount);
  const maxAvailableCapacity = boatsAvailableByCapacity.length > 0 
    ? Math.max(...boatsAvailableByCapacity) 
    : 0;

  const duration = selectedSlotData ? calculateDuration(selectedSlotData.start_at, selectedSlotData.end_at) : 4;
  
  // Check if selected boat can accommodate guest count
  const needsDifferentBoat = selectedSlotData && selectedSlotData.boat.capacity < guestCount;

  // Determine crew fee based on selected guest range
  const crewFeePerHour = useMemo(() => {
    if (!selectedSlotData || !guestRange) return 0;
    
    // For 26-30 guests: add $50/hr
    if (guestRange === '26-30') {
      return 50;
    }
    // For 51-75 guests: add $100/hr
    if (guestRange === '51-75') {
      return 100;
    }
    return 0;
  }, [selectedSlotData, guestRange]);

  // Recalculate pricing whenever guest count, slot, duration, or guest range changes
  const pricing = useMemo(() => {
    if (!selectedSlotData) return null;
    const calcDuration = calculateDuration(selectedSlotData.start_at, selectedSlotData.end_at);
    
    // Use new pricing function that accepts crew fee explicitly
    return calculatePricing({
      date: new Date(selectedSlotData.start_at),
      guestCount,
      duration: calcDuration,
      boatCapacity: selectedSlotData.boat.capacity,
      crewFeePerHour: crewFeePerHour // Pass crew fee explicitly
    });
  }, [selectedSlotData, guestCount, crewFeePerHour]);

  const essentialsPrice = getPackagePrice(guestCount, 'essentials');
  const ultimatePrice = getPackagePrice(guestCount, 'ultimate');

// Calculate add-ons pricing
const packageAddOn = selectedPackage === 'standard' ? 0 : selectedPackage === 'essentials' ? essentialsPrice : ultimatePrice;
const djCost = addOns.dj ? 600 : 0;
const photographerCost = addOns.photographer ? 600 : 0;
const bartenderCost = addOns.bartender ? 600 : 0;
const lilyPadCost = addOns.lilyPadCount * 50;
const avPackageCost = addOns.avPackage ? 300 : 0;

// Items that DO include gratuity: package, lily pads, A/V
const addOnsWithGratuity = packageAddOn + lilyPadCost + avPackageCost;
// Items that DO NOT include gratuity: DJ, photographer, bartender
const addOnsWithoutGratuity = djCost + photographerCost + bartenderCost;

// Build unified pricing breakdown
const baseSubtotal = pricing ? pricing.subtotal : 0;
const subtotalForGratuity = baseSubtotal + addOnsWithGratuity;
const fullSubtotal = subtotalForGratuity + addOnsWithoutGratuity;
const xolaFee = fullSubtotal * 0.03;
const tax = fullSubtotal * 0.0825;
const gratuity = subtotalForGratuity * 0.20; // Only on base + add-ons with gratuity
const total = fullSubtotal + xolaFee + tax + gratuity;

// Guide user to next step with scroll + highlight (order: package -> guests -> price)
useEffect(() => {
  if (selectedSlot) {
    scrollAndHighlight(pkgRef, 'pkg');
  }
}, [selectedSlot]);

useEffect(() => {
  if (selectedPackage && !guestCountConfirmed) {
    scrollAndHighlight(guestsRef, 'guests');
  }
}, [selectedPackage, guestCountConfirmed]);

useEffect(() => {
  if (guestCountConfirmed && selectedPackage && !needsDifferentBoat) {
    scrollAndHighlight(priceRef, 'price');
  }
}, [guestCountConfirmed, selectedPackage, needsDifferentBoat]);
  
  // Calculate days until event in Central Time
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
  const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const daysUntilEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
const requiresHigherDeposit = daysUntilEvent < 14;
const depositPercentage = requiresHigherDeposit ? 0.5 : 0.25;
  
  // Calculate due date for remaining balance
  const getDueDate = () => {
    if (requiresHigherDeposit) {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 3);
      return format(dueDate, 'MMMM d, yyyy');
    } else {
      const dueDate = new Date(eventDateOnly);
      dueDate.setDate(dueDate.getDate() - 14);
      return format(dueDate, 'MMMM d, yyyy');
    }
  };
  
  const packageName = selectedPackage === 'standard' ? 'Standard Private Cruise' : 
                      selectedPackage === 'essentials' ? 'Standard Essentials' : 
                      'Ultimate Disco Party Package';

  return (
    <div className="relative">
      {/* Section Header (optional) */}
      {!hideSectionHeader && (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 px-4 rounded-t-lg shadow-lg mb-3">
          <div className="flex items-center justify-center gap-3">
            <Ship className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="font-bold text-xl sm:text-2xl">⚓ Book Private Cruise</span>
          </div>
        </div>
      )}

      
      <Card className="border-4 border-blue-600 shadow-2xl bg-background rounded-t-none">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Ship className="h-6 w-6" />
            Private Cruise
          </CardTitle>
          <CardDescription className="text-white/90 font-semibold text-xs sm:text-sm">
            {format(eventDate, "EEEE, MMMM d")} • Exclusive Boat for Your Group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
        {/* Guest Count Selector - Always Visible */}
        <div className="space-y-3 bg-gradient-to-br from-primary/5 to-accent/5 p-4 rounded-lg border-2 border-primary/20">
          <Label className="text-sm font-semibold text-center block">Number of Guests</Label>
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                const newCount = Math.max(1, checkoutGuestCount - 1);
                isUserChangeRef.current = true; // Mark as user change
                setCheckoutGuestCount(newCount);
                // Auto-reset slot if current boat can't fit new count
                if (selectedSlotData && selectedSlotData.boat.capacity < newCount) {
                  setSelectedSlot("");
                  setSelectedDuration("");
                }
              }}
              className="h-10 w-10"
            >
              -
            </Button>
            <div className="text-center min-w-[80px]">
              <div className="text-3xl font-bold text-primary">{checkoutGuestCount}</div>
              <div className="text-xs text-muted-foreground">Guests</div>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                const newCount = checkoutGuestCount + 1;
                isUserChangeRef.current = true; // Mark as user change
                setCheckoutGuestCount(newCount);
                // Auto-reset slot if current boat can't fit new count
                if (selectedSlotData && selectedSlotData.boat.capacity < newCount) {
                  setSelectedSlot("");
                  setSelectedDuration("");
                }
              }}
              className="h-10 w-10"
            >
              +
            </Button>
          </div>
        </div>

        {/* Step 1: Duration Selection (Mon-Thu only) */}
        {isMonThu && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cruise Duration</Label>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start h-auto p-3 border-2",
                  selectedDuration === "3" 
                    ? "border-green-600 bg-green-50 dark:bg-green-900/20" 
                    : "border-gray-300"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('⏱️ 3-HOUR BUTTON CLICKED');
                  setSelectedDuration("3");
                  setSelectedSlot("");
                }}
              >
                <div className="flex items-center space-x-2 w-full">
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selectedDuration === "3" ? "border-green-600" : "border-gray-400"
                  )}>
                    {selectedDuration === "3" && (
                      <Circle className="h-3 w-3 fill-current text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-sm sm:text-base">🚢 3-Hour Private Cruise</span>
                    <span className="text-xs text-muted-foreground ml-2">({slotsByDuration['3'].length} available)</span>
                  </div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start h-auto p-3 border-2",
                  selectedDuration === "4" 
                    ? "border-green-600 bg-green-50 dark:bg-green-900/20" 
                    : "border-gray-300"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('⏱️ 4-HOUR BUTTON CLICKED');
                  setSelectedDuration("4");
                  setSelectedSlot("");
                }}
              >
                <div className="flex items-center space-x-2 w-full">
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selectedDuration === "4" ? "border-green-600" : "border-gray-400"
                  )}>
                    {selectedDuration === "4" && (
                      <Circle className="h-3 w-3 fill-current text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-sm sm:text-base">🚢 4-Hour Private Cruise</span>
                    <span className="text-xs text-muted-foreground ml-2">({slotsByDuration['4'].length} available)</span>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* No Slots Available - Smart Suggestions */}
        {((!isMonThu) || (isMonThu && selectedDuration)) && availableSlots.length === 0 && (
          <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-3">
                <p className="font-bold text-amber-700 dark:text-amber-300">
                  No Private Cruises Available for {guestCount} Guests
                </p>
                
                {/* Show intelligent suggestions based on what's actually available */}
                {boatsAvailableByCapacity.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    All boats are booked on this date. Please try a different date or contact us for availability.
                  </p>
                ) : (
                  <>
                    {smallerBoatsAvailable.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          We have boats available for up to {Math.max(...smallerBoatsAvailable)} guests on this date.
                        </p>
                         {onGuestCountChange && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              isUserChangeRef.current = true;
                              onGuestCountChange(Math.max(...smallerBoatsAvailable));
                            }}
                            className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                          >
                            Adjust to {Math.max(...smallerBoatsAvailable)} Guests
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {smallerBoatsAvailable.length === 0 && largerBoatsAvailable.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          The smallest boat available on this date accommodates {Math.min(...largerBoatsAvailable)} guests. 
                          {Math.min(...largerBoatsAvailable) > guestCount && 
                            ` Please increase your guest count to at least ${Math.min(...largerBoatsAvailable)} to see available options.`
                          }
                        </p>
                        {onGuestCountChange && Math.min(...largerBoatsAvailable) > guestCount && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onGuestCountChange(Math.min(...largerBoatsAvailable))}
                            className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                          >
                            Adjust to {Math.min(...largerBoatsAvailable)} Guests
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Time Slot Selection */}
        {((!isMonThu) || (isMonThu && selectedDuration)) && availableSlots.length > 0 && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Label className="text-sm font-semibold">Select Your Time Slot</Label>
            
            {/* Use radio buttons for better UX - works on all days */}
            {availableSlots.length <= 10 ? (
              <RadioGroup value={selectedSlot} onValueChange={(val) => {
                console.log('🎯 Time slot selected:', val);
                setSelectedSlot(val);
                setGuestRange(""); // Reset guest range when changing slots
              }}>
                {availableSlots.map((slot) => {
                  const boatNameLower = slot.boat.name.toLowerCase();
                  const isMeeseeksOrIrony = boatNameLower.includes("meeseeks") || boatNameLower.includes("irony");
                  const isCleverGirl = boatNameLower.includes("clever");
                  const showMeeseeksRange = isMeeseeksOrIrony && guestCount >= 15 && guestCount <= 30;
                  const showCleverGirlRange = isCleverGirl && guestCount >= 31 && guestCount <= 75;
                  
                  // Format boat display name - use proper case
                  let displayBoatName = slot.boat.name;
                  if (isMeeseeksOrIrony) {
                    displayBoatName = "Meeseeks / The Irony (Up to 30 Guests)";
                  } else if (isCleverGirl) {
                    displayBoatName = "Clever Girl (Up to 75 Guests)";
                  } else if (boatNameLower.includes("day tripper")) {
                    displayBoatName = "Day Tripper (Up to 14 Guests)";
                  }
                  
                  return (
                    <div key={slot.id} className="border rounded overflow-hidden">
                      <Label 
                        htmlFor={`slot-${slot.id}`}
                        className="flex items-center space-x-2 p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <RadioGroupItem value={slot.id} id={`slot-${slot.id}`} />
                        <div className="flex-1">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {slot.availability_count > 1 && `${slot.availability_count} avail`}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>{displayBoatName}</span>
                              {slot.availability_count === 1 && isMeeseeksOrIrony && (
                                <span className="text-red-500 text-[11px] font-medium underline">Only one left!</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Label>
                      
                      {/* Guest Range Selection - Inside Slot Option */}
                      {selectedSlot === slot.id && (showMeeseeksRange || showCleverGirlRange) && (
                        <div 
                          className="px-3 pb-3 bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-300 dark:border-blue-700"
                        >
                          <Label className="text-xs font-semibold block mb-2 mt-3">Confirm max # of guests:</Label>
                          <div className="space-y-2">
                            {showMeeseeksRange && (
                              <>
                                <div 
                                  className={cn(
                                    "flex items-center space-x-2 p-2 border-2 rounded cursor-pointer transition-all bg-white dark:bg-gray-800",
                                    guestRange === '15-25' 
                                      ? "border-green-600 bg-green-50 dark:bg-green-900/20" 
                                      : "border-gray-300 hover:border-green-400 hover:bg-accent/50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('👥 Guest range clicked: 15-25');
                                    setGuestRange('15-25');
                                    setCheckoutGuestCount(Math.min(checkoutGuestCount, 25));
                                  }}
                                >
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                    guestRange === '15-25' ? "border-green-600" : "border-gray-400"
                                  )}>
                                    {guestRange === '15-25' && (
                                      <Circle className="h-2.5 w-2.5 fill-current text-green-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">15-25 guests</span>
                                      <span className="text-xs text-muted-foreground">+$0</span>
                                    </div>
                                  </div>
                                </div>
                                <div 
                                  className={cn(
                                    "flex items-center space-x-2 p-2 border-2 rounded cursor-pointer transition-all bg-white dark:bg-gray-800",
                                    guestRange === '26-30' 
                                      ? "border-green-600 bg-green-50 dark:bg-green-900/20" 
                                      : "border-gray-300 hover:border-green-400 hover:bg-accent/50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('👥 Guest range clicked: 26-30');
                                    setGuestRange('26-30');
                                    setCheckoutGuestCount(Math.max(checkoutGuestCount, 26));
                                  }}
                                >
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                    guestRange === '26-30' ? "border-green-600" : "border-gray-400"
                                  )}>
                                    {guestRange === '26-30' && (
                                      <Circle className="h-2.5 w-2.5 fill-current text-green-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">26-30 guests</span>
                                      <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">+$50/hr</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                            {showCleverGirlRange && (
                              <>
                                <div 
                                  className={cn(
                                    "flex items-center space-x-2 p-2 border-2 rounded cursor-pointer transition-all bg-white dark:bg-gray-800",
                                    guestRange === '31-50' 
                                      ? "border-green-600 bg-green-50 dark:bg-green-900/20" 
                                      : "border-gray-300 hover:border-green-400 hover:bg-accent/50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('👥 Guest range clicked: 31-50');
                                    setGuestRange('31-50');
                                    setCheckoutGuestCount(Math.min(checkoutGuestCount, 50));
                                  }}
                                >
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                    guestRange === '31-50' ? "border-green-600" : "border-gray-400"
                                  )}>
                                    {guestRange === '31-50' && (
                                      <Circle className="h-2.5 w-2.5 fill-current text-green-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">31-50 guests</span>
                                      <span className="text-xs text-muted-foreground">+$0</span>
                                    </div>
                                  </div>
                                </div>
                                <div 
                                  className={cn(
                                    "flex items-center space-x-2 p-2 border-2 rounded cursor-pointer transition-all bg-white dark:bg-gray-800",
                                    guestRange === '51-75' 
                                      ? "border-green-600 bg-green-50 dark:bg-green-900/20" 
                                      : "border-gray-300 hover:border-green-400 hover:bg-accent/50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('👥 Guest range clicked: 51-75');
                                    setGuestRange('51-75');
                                    setCheckoutGuestCount(Math.max(checkoutGuestCount, 51));
                                  }}
                                >
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                    guestRange === '51-75' ? "border-green-600" : "border-gray-400"
                                  )}>
                                    {guestRange === '51-75' && (
                                      <Circle className="h-2.5 w-2.5 fill-current text-green-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">51-75 guests</span>
                                      <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">+$100/hr</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              /* Clickable list instead of broken Select dropdown */
              <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-primary rounded-lg p-2 bg-background">
                {availableSlots.map((slot) => {
                  const boatNameLower = slot.boat.name.toLowerCase();
                  let displayBoatName = slot.boat.name;
                  if (boatNameLower.includes("meeseeks") || boatNameLower.includes("irony")) {
                    displayBoatName = "Meeseeks / The Irony (Up to 30 Guests)";
                  } else if (boatNameLower.includes("clever")) {
                    displayBoatName = "Clever Girl (Up to 75 Guests)";
                  } else if (boatNameLower.includes("day tripper")) {
                    displayBoatName = "Day Tripper (Up to 14 Guests)";
                  }
                  
                  return (
                    <Button
                      key={slot.id}
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start h-auto p-3 border-2",
                        selectedSlot === slot.id
                          ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-300"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎯 TIME SLOT BUTTON CLICKED:', slot.id);
                        setSelectedSlot(slot.id);
                        setGuestRange("");
                      }}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          selectedSlot === slot.id ? "border-green-600" : "border-gray-400"
                        )}>
                          {selectedSlot === slot.id && (
                            <Circle className="h-3 w-3 fill-current text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>
                              {displayBoatName}
                              {slot.availability_count > 1 && ` • ${slot.availability_count} available`}
                            </span>
                            {slot.availability_count === 1 && (boatNameLower.includes("meeseeks") || boatNameLower.includes("irony")) && (
                              <span className="text-red-500 text-[11px] font-medium underline">Only one left!</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
            
            {/* Guest Count Range Confirmation - Shows after slot selected (for dropdown mode) */}
            {!isFriSunSat && selectedSlot && selectedSlotData && (() => {
              const boatNameLower = selectedSlotData.boat.name.toLowerCase();
              const isMeeseeksOrIrony = boatNameLower.includes("meeseeks") || boatNameLower.includes("irony");
              const showMeeseeksRange = isMeeseeksOrIrony && guestCount >= 15 && guestCount <= 30;
              const showCleverGirlRange = boatNameLower.includes("clever") && guestCount >= 31 && guestCount <= 75;
              
              if (!showMeeseeksRange && !showCleverGirlRange) return null;
              
              return (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-sm font-semibold block mb-3">Please confirm max # of guests:</Label>
                  <RadioGroup value={guestRange} onValueChange={(val) => {
                    setGuestRange(val as any);
                    if (val === '15-25') {
                      setCheckoutGuestCount(Math.min(checkoutGuestCount, 25));
                    } else if (val === '26-30') {
                      setCheckoutGuestCount(Math.max(checkoutGuestCount, 26));
                    } else if (val === '31-50') {
                      setCheckoutGuestCount(Math.min(checkoutGuestCount, 50));
                    } else if (val === '51-75') {
                      setCheckoutGuestCount(Math.max(checkoutGuestCount, 51));
                    }
                  }}>
                    {showMeeseeksRange && (
                      <>
                        <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                          <RadioGroupItem value="15-25" id="range-15-25" />
                          <Label htmlFor="range-15-25" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">15-25 guests</span>
                              <span className="text-sm text-muted-foreground">+$0</span>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                          <RadioGroupItem value="26-30" id="range-26-30" />
                          <Label htmlFor="range-26-30" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">26-30 guests</span>
                              <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold">+$50/hr</span>
                            </div>
                          </Label>
                        </div>
                      </>
                    )}
                    {showCleverGirlRange && (
                      <>
                        <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                          <RadioGroupItem value="31-50" id="range-31-50" />
                          <Label htmlFor="range-31-50" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">31-50 guests</span>
                              <span className="text-sm text-muted-foreground">+$0</span>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                          <RadioGroupItem value="51-75" id="range-51-75" />
                          <Label htmlFor="range-51-75" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">51-75 guests</span>
                              <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold">+$100/hr</span>
                            </div>
                          </Label>
                        </div>
                      </>
                    )}
                  </RadioGroup>
                </div>
              );
            })()}
          </div>
        )}

        {/* Guest Count Confirmation - After Package Selection */}
        {selectedPackage && !guestCountConfirmed && (
          <div ref={guestsRef} className={`space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300 bg-gradient-to-br from-primary/5 to-accent/5 p-4 rounded-lg border-2 border-primary/20 ${highlight === 'guests' ? 'ring-2 ring-blue-500/50 animate-heartbeat' : ''}`}>
            {needsDifferentBoat && (
              <div className="bg-orange-100 dark:bg-orange-900/20 border-2 border-orange-500 rounded p-3 text-sm mb-3">
                <p className="font-bold text-orange-700 dark:text-orange-400 mb-1">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  Boat Capacity Issue
                </p>
                <p className="text-orange-600 dark:text-orange-300">
                  The selected boat ({selectedSlotData?.boat.name}) can only fit {selectedSlotData?.boat.capacity} guests. You need a larger boat for {checkoutGuestCount} guests.
                </p>
              </div>
            )}
            <Label className="text-base font-bold text-center block">Confirm Your Total Number of Guests</Label>
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCheckoutGuestCount(Math.max(1, checkoutGuestCount - 1))}
                className="h-12 w-12 text-xl"
              >
                -
              </Button>
              <div className="text-center min-w-[100px]">
                <div className="text-4xl font-bold text-primary">{checkoutGuestCount}</div>
                <div className="text-xs text-muted-foreground">Guests</div>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  const newCount = checkoutGuestCount + 1;
                  setCheckoutGuestCount(newCount);
                  // Auto-reset slot if current boat can't fit new count
                  if (selectedSlotData && selectedSlotData.boat.capacity < newCount) {
                    setSelectedSlot("");
                    setSelectedDuration("");
                  }
                }}
                className="h-12 w-12 text-xl"
              >
                +
              </Button>
            </div>
            
            <Button 
              onClick={() => {
                if (needsDifferentBoat) {
                  setSelectedSlot("");
                  setSelectedDuration("");
                }
                setGuestCountConfirmed(true);
              }}
              className="w-full text-lg py-6"
              size="lg"
            >
              {needsDifferentBoat ? 'Update & Select New Boat' : `Confirm ${checkoutGuestCount} Guest${checkoutGuestCount !== 1 ? 's' : ''}`}
            </Button>
            
            {needsDifferentBoat && (
              <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                <AlertCircle className="inline h-3 w-3 mr-1" />
                Your current boat can't fit {checkoutGuestCount} guests. You'll need to select a larger boat.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Add-Ons Section (Only for non-bach parties) */}
        {selectedSlot && pricing && !needsDifferentBoat && (() => {
          // Check if guest range selection is required
          const boatNameLower = selectedSlotData?.boat.name?.toLowerCase() || "";
          const isMeeseeksOrIrony = boatNameLower.includes("meeseeks") || boatNameLower.includes("irony");
          const isCleverGirl = boatNameLower.includes("clever");
          const requiresRangeSelection = 
            (isMeeseeksOrIrony && guestCount >= 15 && guestCount <= 30) ||
            (isCleverGirl && guestCount >= 31 && guestCount <= 75);
          
          // Only show add-ons if range is either selected or not required
          if (requiresRangeSelection && !guestRange) return null;
          
          // Check if this is a bach party (don't show add-ons for bach parties)
          const isBachParty = ['bachelor_party', 'bachelorette_party', 'combined_bach'].includes(partyType.toLowerCase());
          
          if (isBachParty) {
            // For bach parties, just auto-set to standard and don't show add-ons
            if (!selectedPackage) {
              setSelectedPackage('standard');
            }
            return null;
          }
          
          return (
          <div ref={pkgRef} className={`space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${highlight === 'pkg' ? 'ring-2 ring-blue-500/50 rounded-lg animate-heartbeat' : ''}`}>
            <Label className="text-sm font-semibold">Add-Ons (Optional)</Label>
            
            {/* Package Selection - Mutually Exclusive */}
            <div className="space-y-2 p-3 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20">
              <Label className="text-xs font-semibold text-muted-foreground">PACKAGES (Choose One or None)</Label>
              
              <div className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="pkg-essentials"
                  checked={selectedPackage === 'essentials'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedPackage('essentials');
                    } else {
                      setSelectedPackage('standard');
                    }
                  }}
                />
                <Label htmlFor="pkg-essentials" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">{duration}hr w/Essentials</span>
                      <p className="text-[10px] text-muted-foreground">Ice water, coolers, cups, tables</p>
                    </div>
                    <span className="font-bold text-primary">+${essentialsPrice}</span>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="pkg-ultimate"
                  checked={selectedPackage === 'ultimate'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedPackage('ultimate');
                    } else {
                      setSelectedPackage('standard');
                    }
                  }}
                />
                <Label htmlFor="pkg-ultimate" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">Ultimate Disco Party</span>
                      <p className="text-[10px] text-muted-foreground">Essentials + lily pads, floats, disco cups, bubbles, champagne setup</p>
                    </div>
                    <span className="font-bold text-primary">+${ultimatePrice}</span>
                  </div>
                </Label>
              </div>
            </div>

            {/* Professional Services */}
            <div className="space-y-2 p-3 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20">
              <Label className="text-xs font-semibold text-muted-foreground">PROFESSIONAL SERVICES</Label>
              
              <div className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="addon-dj"
                  checked={addOns.dj}
                  onCheckedChange={(checked) => {
                    setAddOns({...addOns, dj: !!checked});
                    // Auto-set to standard if not already set to a package
                    if (!selectedPackage && checked) {
                      setSelectedPackage('standard');
                    }
                  }}
                />
                <Label htmlFor="addon-dj" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Professional DJ</span>
                    <span className="font-bold text-primary">+$600</span>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="addon-photographer"
                  checked={addOns.photographer}
                  onCheckedChange={(checked) => {
                    setAddOns({...addOns, photographer: !!checked});
                    // Auto-set to standard if not already set to a package
                    if (!selectedPackage && checked) {
                      setSelectedPackage('standard');
                    }
                  }}
                />
                <Label htmlFor="addon-photographer" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Professional Photographer</span>
                    <span className="font-bold text-primary">+$600</span>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="addon-bartender"
                  checked={addOns.bartender}
                  onCheckedChange={(checked) => {
                    setAddOns({...addOns, bartender: !!checked});
                    // Auto-set to standard if not already set to a package
                    if (!selectedPackage && checked) {
                      setSelectedPackage('standard');
                    }
                  }}
                />
                <Label htmlFor="addon-bartender" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Bartender Service</span>
                    <span className="font-bold text-primary">+$600</span>
                  </div>
                </Label>
              </div>
            </div>

            {/* Equipment & Extras */}
            <div className="space-y-2 p-3 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20">
              <Label className="text-xs font-semibold text-muted-foreground">EQUIPMENT & EXTRAS</Label>
              
              <div className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="addon-av"
                  checked={addOns.avPackage}
                  onCheckedChange={(checked) => {
                    setAddOns({...addOns, avPackage: !!checked});
                    // Auto-set to standard if not already set to a package
                    if (!selectedPackage && checked) {
                      setSelectedPackage('standard');
                    }
                  }}
                />
                <Label htmlFor="addon-av" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">A/V Package</span>
                      <p className="text-[10px] text-muted-foreground">Projector, screen, setup, wireless mic</p>
                    </div>
                    <span className="font-bold text-primary">+$300</span>
                  </div>
                </Label>
              </div>
              
              <div className="p-2 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm">Lily Pad (6'x20' Giant Float)</span>
                    <p className="text-[10px] text-muted-foreground">$50 each • Max 3</p>
                  </div>
                  <span className="font-bold text-primary">+${(addOns.lilyPadCount * 50).toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const newCount = Math.max(0, addOns.lilyPadCount - 1);
                      setAddOns({...addOns, lilyPadCount: newCount});
                    }}
                    disabled={addOns.lilyPadCount === 0}
                  >
                    -
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <div className="text-2xl font-bold text-primary">{addOns.lilyPadCount}</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const newCount = Math.min(3, addOns.lilyPadCount + 1);
                      setAddOns({...addOns, lilyPadCount: newCount});
                      // Auto-set to standard if not already set to a package and adding first lily pad
                      if (!selectedPackage && newCount > 0) {
                        setSelectedPackage('standard');
                      }
                    }}
                    disabled={addOns.lilyPadCount === 3}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
            
            {!selectedPackage && (
              <Button 
                onClick={() => setSelectedPackage('standard')}
                variant="outline"
                className="w-full"
              >
                Continue Without Add-Ons
              </Button>
            )}
          </div>
          );
        })()}

        {/* Step 5: Price Breakdown & Checkout */}
        {selectedSlot && selectedPackage && pricing && guestCountConfirmed && !needsDifferentBoat && (
          <div ref={priceRef} className={`space-y-3 pt-3 border-t-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${highlight === 'price' ? 'ring-2 ring-blue-500/50 rounded-lg animate-heartbeat' : ''}`}>
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm">Price Breakdown</h4>
              <div className="space-y-1 text-xs">
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
                 {packageAddOn > 0 && (
                  <div className="flex justify-between">
                    <span>{packageName}:</span>
                    <span>+${packageAddOn.toFixed(2)}</span>
                  </div>
                )}
                {addOns.dj && (
                  <div className="flex justify-between">
                    <span>Professional DJ:</span>
                    <span>+${djCost.toFixed(2)}</span>
                  </div>
                )}
                {addOns.photographer && (
                  <div className="flex justify-between">
                    <span>Professional Photographer:</span>
                    <span>+${photographerCost.toFixed(2)}</span>
                  </div>
                )}
                {addOns.bartender && (
                  <div className="flex justify-between">
                    <span>Bartender Service:</span>
                    <span>+${bartenderCost.toFixed(2)}</span>
                  </div>
                )}
                {addOns.lilyPadCount > 0 && (
                  <div className="flex justify-between">
                    <span>Lily Pad (×{addOns.lilyPadCount}):</span>
                    <span>+${lilyPadCost.toFixed(2)}</span>
                  </div>
                )}
                {addOns.avPackage && (
                  <div className="flex justify-between">
                    <span>A/V Package:</span>
                    <span>+${avPackageCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Subtotal:</span>
                  <span>${fullSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Xola Booking Fee (3%):</span>
                  <span>${xolaFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sales Tax (8.25%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Gratuity (20%):</span>
                  <span>${gratuity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-base font-bold text-primary">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
<EmbeddedStripeCheckout
  timeSlotId={selectedSlot}
  customerEmail={customerEmail}
  customerName={customerName}
  customerPhone={customerPhone}
  guestCount={guestCount}
  partyType={partyType}
  packageType={selectedPackage}
  amount={Math.round(total * 100)}
  depositAmount={Math.round(total * depositPercentage * 100)}
  subtotal={Math.round(fullSubtotal * 100)}
  eventDate={format(eventDate, "EEEE, MMMM d, yyyy")}
  startTime={selectedSlotData ? formatTime(selectedSlotData.start_at) : ""}
  endTime={selectedSlotData ? formatTime(selectedSlotData.end_at) : ""}
  boatName={selectedSlotData?.boat.name || ""}
  experienceType="Private Cruise"
  onCheckoutStarted={onCheckoutStarted}
/>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
