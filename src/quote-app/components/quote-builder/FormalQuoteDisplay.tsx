import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Separator } from "@/quote-app/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Input } from "@/quote-app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { format, getDay, getHours, getMinutes, addDays, startOfWeek } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { EmbeddedStripeCheckout } from "./EmbeddedStripeCheckout";
import { DiscoCruiseSelectorV2 } from "./DiscoCruiseSelectorV2";
import { EOYSaleDealsSelector, type EOYDealType } from "./EOYSaleDealsSelector";
import { calculatePricing, getPackagePrice } from "@/quote-app/lib/pricing";
import ppcLogo from "@/quote-app/assets/ppc-logo.png";
import gammaPresentationPreview from "@/quote-app/assets/gamma-presentation-preview.jpg";
import bacheloretteOptionsComparison from "@/quote-app/assets/bachelorette-options-comparison.png";
import bachelorOptionsComparison from "@/quote-app/assets/bachelor-options-comparison.png";
import combinedBachOptionsComparison from "@/quote-app/assets/combined-bach-options-comparison.png";
// Non-bach party slides by capacity
import nonBachSlide14 from "@/quote-app/assets/non-bach-slides/private-cruise-14.png";
import nonBachSlide25 from "@/quote-app/assets/non-bach-slides/private-cruise-25.png";
import nonBachSlide50 from "@/quote-app/assets/non-bach-slides/private-cruise-50.png";
import { Edit2, CalendarIcon, Plus, Minus, Check, X, Printer, Download, Share2, FileText, ArrowDown, Copy, ExternalLink } from "lucide-react";
import { cn, formatTimeCSTFull } from "@/quote-app/lib/utils";
import { Checkbox } from "@/quote-app/components/ui/checkbox";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { ShareQuoteDialog } from "./ShareQuoteDialog";
import { useIsMobile } from "@/quote-app/hooks/use-mobile";

// Current deal configuration - update this when deal changes
const CURRENT_DEAL = {
  discountAmount: 150,
  promoCode: 'PREMIERNEWYEAR',
  dealName: 'Early Bird'
};
// Dynamic 10-day deadline for display purposes
const getDaysUntilDeadline = () => 10;

interface FormalQuoteDisplayProps {
  discoSlots: any[];
  privateSlots: any[];
  guestCount: number;
  eventDate: Date | undefined;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  partyType: string | null;
  quoteNumber?: string;
  quoteCreatedAt?: string;
  /** Quote-specific expiration date - if null, use legacy Jan 16; if undefined, use dynamic 10 days */
  quoteExpiresAt?: string | null;
  onDiscoBook?: (slotId: string, packageType: string, ticketCount: number) => void;
  onPrivateBook?: (slotId: string, packageType: string) => void;
  onGuestCountChange?: (count: number) => void;
  onEventDateChange?: (date: Date) => void;
  onPartyTypeChange?: (type: string) => void;
  onBookOnline?: (experienceType: 'disco_cruise' | 'private_cruise', capacity?: '14' | '25' | '50', discoPackage?: 'basic' | 'queen' | 'sparkle') => void;
  onSelectionChange?: (updates: any) => void;
  savedQuoteId?: string;
  restoredSlotId?: string;
  restoredPackage?: string;
  restoredAddons?: any;
  useV2DiscoPricing?: boolean;
  onRestartTimer?: () => void;
}

interface DiscoOption {
  id: string;
  packageId: 'basic' | 'disco-queen' | 'super-sparkle';
  packageName: string;
  slotId: string;
  date: Date;
  dayName: string;
  timeRange: string;
  pricePerPerson: number;
  slotData: any;
}

interface PrivateOption {
  id: string;
  packageId: 'standard' | 'essentials' | 'ultimate';
  packageName: string;
  slotId: string;
  date: Date;
  dayName: string;
  timeRange: string;
  duration: number; // Add duration field
  basePrice: number;
  packageAddOn: number;
  totalPrice: number;
  slotData: any;
  boatName: string;
}

// Disco cruise now uses single per-slot pricing, not packages
const getDiscoSlotPriceForFormal = (slot: any): number => {
  const slotDate = new Date(slot.start_at);
  const dayName = format(slotDate, 'EEEE');
  const timeStr = formatTimeCSTFull(slot.start_at);
  if (dayName === 'Friday') return 95;
  if (dayName === 'Saturday' && timeStr.includes('11:00')) return 105;
  if (dayName === 'Saturday' && timeStr.includes('3:30')) return 85;
  if (dayName === 'Sunday' && timeStr.includes('11:00')) return 105;
  return 95;
};

const PRIVATE_PACKAGES = [
  { 
    id: 'standard', 
    name: 'Private Cruise w/Captain',
    description: ''
  },
  { 
    id: 'essentials', 
    name: 'Add Essentials Package',
    description: ''
  },
  { 
    id: 'ultimate', 
    name: 'Add Ultimate Disco Party Package',
    description: ''
  }
];

export const FormalQuoteDisplay = ({
  discoSlots,
  privateSlots,
  guestCount,
  eventDate,
  customerEmail,
  customerName,
  customerPhone,
  partyType,
  quoteNumber,
  quoteCreatedAt,
  quoteExpiresAt,
  onDiscoBook,
  onPrivateBook,
  onGuestCountChange,
  onEventDateChange,
  onPartyTypeChange,
  onBookOnline,
  onSelectionChange,
  savedQuoteId,
  restoredSlotId,
  restoredPackage,
  restoredAddons,
  useV2DiscoPricing = false,
  onRestartTimer,
}: FormalQuoteDisplayProps) => {
  // Calculate quote-specific countdown to March 24th deadline
  const quoteCreatedDate = useMemo(() => {
    if (quoteCreatedAt) {
      return new Date(quoteCreatedAt);
    }
    return new Date(); // Default to now if no creation date
  }, [quoteCreatedAt]);
  
  const quoteDeadline = useMemo(() => {
    // Prefer explicit expires_at from database (anchored to quote creation)
    if (quoteExpiresAt) {
      const expiresDate = new Date(quoteExpiresAt);
      if (!isNaN(expiresDate.getTime())) {
        return expiresDate;
      }
    }
    // Fallback: calculate from creation date + 10 days
    return addDays(quoteCreatedDate, 10);
  }, [quoteExpiresAt, quoteCreatedDate]);
  
  // Live countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      let diff = quoteDeadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds, expired: false });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [quoteDeadline]);
  
  // Discount name based on quote context
  const discountLabel = useMemo(() => {
    // All current quotes use the same deal
    return `${CURRENT_DEAL.dealName} Discount`;
  }, []);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [discoTicketCount, setDiscoTicketCount] = useState(guestCount);
  const [selectedPrivateSlotId, setSelectedPrivateSlotId] = useState<string>("");
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingPartyType, setIsEditingPartyType] = useState(false);
  const [isEditingGuestCount, setIsEditingGuestCount] = useState(false);
  const [tempGuestCount, setTempGuestCount] = useState(guestCount);
  
  // Track expanded "see more" sections for weekday slots
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Add-ons state for private cruises
  const [confirmedGuestCount, setConfirmedGuestCount] = useState(guestCount);
  // Initialize guest range as empty for 15-75 to force confirmation modal
  const [guestRange, setGuestRange] = useState<'15-25' | '26-30' | '31-50' | '51-75' | ''>(
    guestCount >= 15 && guestCount <= 75 ? '' : 
    '' // For 1-14, no range selection; use exact guestCount
  );
  const [selectedPrivatePackage, setSelectedPrivatePackage] = useState<'standard' | 'essentials' | 'ultimate'>('standard');
  const [addOns, setAddOns] = useState({
    dj: false,
    photographer: false,
    bartender: false,
    lilyPadCount: 0,
    avPackage: false
  });
  
  // Disco-specific add-ons
  const [discoAddOns, setDiscoAddOns] = useState({
    mimosaCooler: false,
    sparklePackage: false,
  });
  
  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [selectedEOYDeal, setSelectedEOYDeal] = useState<EOYDealType>('nye-deposit');
  // nye-deposit = Book before deadline (gets $150 discount), nye-full = Full Price (no discount)
  const hasEarlyBirdDiscount = selectedEOYDeal === 'nye-deposit';
  const dealHasAllPerks = false; // No longer offering free perks with pay-in-full
  const [presentationModalOpen, setPresentationModalOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // EOY deal behavior useEffect is moved below where selectedPrivateOption/selectedDiscoSlot/selectedDiscoOption are defined

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoError("");
      setPromoDiscount(0);
      setPromoCode("");
      return;
    }

    setPromoValidating(true);
    setPromoError("");

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setPromoError("Invalid promo code");
        setPromoDiscount(0);
        setPromoCode("");
        setPromoValidating(false);
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError("This promo code has expired");
        setPromoDiscount(0);
        setPromoCode("");
        setPromoValidating(false);
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setPromoError("This promo code has reached its usage limit");
        setPromoDiscount(0);
        setPromoCode("");
        setPromoValidating(false);
        return;
      }

      // Apply discount
      if (data.type === 'percent' || data.type === 'percentage') {
        setPromoDiscount(data.value / 100); // Convert to decimal (25% = 0.25)
        setPromoCode(code.toUpperCase());
        toast({
          title: "Promo code applied!",
          description: `${data.value}% discount has been applied to your quote.`,
        });
      } else if (data.type === 'fixed') {
        // For fixed amount discounts - we'll handle this as a dollar amount
        setPromoDiscount(data.value);
        setPromoCode(code.toUpperCase());
        toast({
          title: "Promo code applied!",
          description: `$${data.value} discount has been applied to your quote.`,
        });
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoError("Error validating code");
      setPromoDiscount(0);
      setPromoCode("");
    }

    setPromoValidating(false);
  };

  const handleApplyPromoCode = () => {
    validatePromoCode(promoCodeInput);
  };

  const handleRemovePromoCode = () => {
    setPromoCode("");
    setPromoCodeInput("");
    setPromoDiscount(0);
    setPromoError("");
  };

  // Print functionality
  const handlePrint = () => {
    window.print();
  };

  // Download functionality
  const handleDownload = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const quoteElement = document.getElementById('quote-printable-area');
      
      if (!quoteElement) {
        toast({
          title: "Error",
          description: "Could not find quote content to download.",
          variant: "destructive",
        });
        return;
      }

      // Hide buttons temporarily
      const buttons = quoteElement.querySelectorAll('.no-print');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(quoteElement, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Show buttons again
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${customerName.replace(/\s+/g, '_')}_Quote_${format(eventDate || new Date(), 'yyyy-MM-dd')}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          toast({
            title: "Quote Downloaded!",
            description: "Your quote has been saved as an image.",
          });
        }
      });
    } catch (error) {
      console.error('Error downloading quote:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // PDF Export functionality
  const handleExportPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const quoteElement = document.getElementById('quote-printable-area');
      
      if (!quoteElement) {
        toast({
          title: "Error",
          description: "Could not find quote content to export.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Generating PDF...",
        description: "This may take a moment.",
      });

      // Hide buttons temporarily
      const buttons = quoteElement.querySelectorAll('.no-print');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(quoteElement, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Show buttons again
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add footer with terms on last page
      const pageCount = pdf.internal.pages.length - 1;
      pdf.setPage(pageCount);
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text('Terms: All bookings subject to availability. Full payment or deposit required. Cancellation policy applies.', 10, pageHeight - 10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()} | Premier Party Cruises`, 10, pageHeight - 5);

      pdf.save(`${customerName.replace(/\s+/g, '_')}_Quote_${format(eventDate || new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "PDF Exported!",
        description: "Your quote has been saved as a PDF.",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your quote. Please try again.",
        variant: "destructive",
      });
    }
  };
  

  if (!eventDate) return null;

  // Get package pricing based on guest count/range
  const getPackagePricing = () => {
    const effectiveCount = guestRange === '15-25' || guestRange === '26-30' ? 25 : 
                           guestRange === '31-50' || guestRange === '51-75' ? 50 : 
                           guestCount;
    
    if (effectiveCount <= 14) {
      return { essentials: 100, ultimate: 250 };
    } else if (effectiveCount <= 30) {
      return { essentials: 150, ultimate: 300 };
    } else {
      return { essentials: 200, ultimate: 350 };
    }
  };

  // Find closest weekend (Friday, Saturday, Sunday)
  const getClosestWeekend = (date: Date) => {
    const dayOfWeek = getDay(date);
    const friday = addDays(date, (5 - dayOfWeek + 7) % 7 || 0);
    const saturday = addDays(friday, 1);
    const sunday = addDays(friday, 2);
    
    // If the selected date is before Friday, use the upcoming weekend
    // If it's on or after Friday, use that weekend
    if (dayOfWeek === 0) { // Sunday
      return [addDays(date, -2), addDays(date, -1), date];
    } else if (dayOfWeek === 6) { // Saturday
      return [addDays(date, -1), date, addDays(date, 1)];
    } else if (dayOfWeek === 5) { // Friday
      return [date, addDays(date, 1), addDays(date, 2)];
    } else {
      return [friday, saturday, sunday];
    }
  };

  const [fridayDate, saturdayDate, sundayDate] = getClosestWeekend(eventDate);

  // Build disco options
  const buildDiscoOptions = (): DiscoOption[] => {
    const options: DiscoOption[] = [];
    
    discoSlots.forEach((slot) => {
      const slotDate = new Date(slot.start_at);
      const dayName = format(slotDate, "EEEE");
      const price = getDiscoSlotPriceForFormal(slot);
      
      options.push({
        id: `disco-${slot.id}`,
        packageId: 'disco-ticket' as any,
        packageName: `ATX Disco Cruise Tickets - ${dayName} ${format(slotDate, "MMMM do, yyyy")}`,
        slotId: slot.id,
        date: slotDate,
        dayName,
        timeRange: `${formatTimeCSTFull(slot.start_at)} - ${formatTimeCSTFull(slot.end_at)}`,
        pricePerPerson: price,
        slotData: slot,
      });
    });
    
    return options;
  };

  // Build private options - one option per time slot only
  const buildPrivateOptions = (): PrivateOption[] => {
    return privateSlots.map((slot) => {
      const slotDate = new Date(slot.start_at);
      const dayName = format(slotDate, "EEEE");
      const duration = (new Date(slot.end_at).getTime() - slotDate.getTime()) / (1000 * 60 * 60);
      
      // Use BASE pricing only - no crew fees in time slot display
      // Crew fees are added separately when user selects guest range
      const pricing = calculatePricing({
        date: slotDate,
        guestCount: guestCount, // Use actual guest count to determine tier
        duration,
        boatCapacity: slot.boat?.capacity || 75,
        crewFeePerHour: 0 // Always 0 for time slot base pricing
      });
      
      return {
        id: `private-${slot.id}`,
        packageId: 'standard' as const,
        packageName: 'Private Cruise w/Captain',
        slotId: slot.id,
        date: slotDate,
        dayName,
        timeRange: `${formatTimeCSTFull(slot.start_at)} - ${formatTimeCSTFull(slot.end_at)}`,
        duration,
        basePrice: pricing.subtotal,
        packageAddOn: 0,
        totalPrice: pricing.subtotal,
        slotData: slot,
        boatName: slot.boat?.name || 'Private Boat',
      };
    });
  };

  const discoOptions = buildDiscoOptions();
  const privateOptions = buildPrivateOptions();
  
  // Auto-select first available private slot to reveal add-ons by default
  useEffect(() => {
    // If we have a restored slot, select it
    if (restoredSlotId && (discoOptions.length > 0 || privateOptions.length > 0)) {
      const discoMatch = discoOptions.find(opt => opt.slotId === restoredSlotId);
      const privateMatch = privateOptions.find(opt => opt.slotId === restoredSlotId);
      
      if (discoMatch && restoredPackage) {
        // Find the specific package option
        const packageMatch = discoOptions.find(opt => 
          opt.slotId === restoredSlotId && opt.packageId === restoredPackage
        );
        if (packageMatch) {
          setSelectedOptionId(packageMatch.id);
          if (restoredAddons?.mimosaCooler) {
            setDiscoAddOns(prev => ({ ...prev, mimosaCooler: true }));
          }
          if (restoredAddons?.sparklePackage) {
            setDiscoAddOns(prev => ({ ...prev, sparklePackage: true }));
          }
        }
      } else if (privateMatch) {
        setSelectedOptionId(privateMatch.id);
        setSelectedPrivateSlotId(restoredSlotId);
        if (restoredPackage) {
          setSelectedPrivatePackage(restoredPackage as 'standard' | 'essentials' | 'ultimate');
        }
        if (restoredAddons) {
          setAddOns(restoredAddons);
        }
      }
      
      return; // Skip auto-selection if we're restoring
    }
    
    if (!selectedOptionId && privateOptions.length > 0) {
      // Prioritize weekday slots (Mon-Thu) for auto-selection
      const weekdayOptions = privateOptions.filter(opt => {
        const slotDate = opt.slotData?.start_at ? new Date(opt.slotData.start_at) : opt.date;
        const slotDay = getDay(slotDate);
        return slotDay >= 1 && slotDay <= 4; // Mon-Thu
      });
      
      if (weekdayOptions.length > 0) {
        // Auto-select earliest weekday option
        // Group by date and duration to get the proper option ID
        const firstWeekday = weekdayOptions[0];
        const slotDate = firstWeekday.slotData?.start_at ? new Date(firstWeekday.slotData.start_at) : firstWeekday.date;
        const dateKey = formatInTimeZone(toZonedTime(slotDate, 'America/Chicago'), 'America/Chicago', 'yyyy-MM-dd');
        const duration = firstWeekday.duration;
        
        setSelectedOptionId(`weekday-${duration}hr-${dateKey}`);
        setSelectedPrivateSlotId(firstWeekday.slotId);
      } else {
        // Fall back to first available option (weekend)
        const firstSlot = privateOptions[0];
        if (firstSlot) {
          setSelectedOptionId(firstSlot.id);
          setSelectedPrivateSlotId(firstSlot.slotId);
        }
      }
    } else if (selectedOptionId) {
      const wasDiscoSelection = selectedOptionId.startsWith('disco-');
      const isWeekdaySelection = selectedOptionId.startsWith('weekday-');

      const discoExists = wasDiscoSelection
        ? discoSlots.some((slot) => `disco-${slot.id}` === selectedOptionId)
        : false;

      // Weekday selections use a synthetic option id; validate by slot id instead.
      const privateExists = isWeekdaySelection
        ? !!selectedPrivateSlotId && privateOptions.some((opt) => opt.slotId === selectedPrivateSlotId)
        : privateOptions.some((opt) => opt.id === selectedOptionId);

      // Only reset if the option doesn't exist. Prefer keeping the user on the same cruise type.
      if (!discoExists && !privateExists) {
        if (wasDiscoSelection && discoSlots.length > 0) {
          setSelectedOptionId(`disco-${discoSlots[0].id}`);
          setSelectedPrivateSlotId("");
        } else if (privateOptions.length > 0) {
          const firstSlot = privateOptions[0];
          setSelectedOptionId(firstSlot.id);
          setSelectedPrivateSlotId(firstSlot.slotId);
        }
      }

      // Don't reset guestRange during restoration
    }

    // Don't auto-initialize guest range - let the user confirm via modal
  }, [privateOptions, discoOptions, guestCount, selectedOptionId, guestRange, restoredSlotId, restoredPackage, restoredAddons]);
  
  // Save selection state when user makes choices
  useEffect(() => {
    if (!onSelectionChange || !selectedOptionId) return;
    
    // Get the selected option (V2 disco slot, V1 disco option, or private option)
    const selectedOption = selectedDiscoSlot || selectedDiscoOption || selectedPrivateOption;
    if (!selectedOption) return;

    // Show auto-saving indicator
    setAutoSaving(true);
    
    const updates: any = {
      lastStep: 'quote_selection',
      timeSlotId: selectedDiscoSlot?.id || selectedOption.slotId,
      selectedBoatName: selectedDiscoSlot?.boat?.name || selectedOption.slotData?.boat?.name || 'Boat',
      selectedTimeStart: selectedDiscoSlot 
        ? new Date(selectedDiscoSlot.start_at).toISOString()
        : new Date(selectedOption.slotData.start_at).toISOString(),
      selectedTimeEnd: selectedDiscoSlot
        ? new Date(selectedDiscoSlot.end_at).toISOString()
        : new Date(selectedOption.slotData.end_at).toISOString(),
    };
    
    if (selectedDiscoSlot || selectedDiscoOption) {
      // Disco cruise selected (V2 or V1)
      const slotDate = selectedDiscoSlot 
        ? new Date(selectedDiscoSlot.start_at) 
        : selectedDiscoOption!.date;
      const slotTime = formatTimeCSTFull(selectedDiscoSlot ? selectedDiscoSlot.start_at : selectedDiscoOption!.date.toISOString());
      const slotDay = format(slotDate, 'EEEE');
      
      // Get price based on time slot
      let pricePerPerson = 95;
      if (slotDay === 'Friday' && slotTime.includes('12:00')) pricePerPerson = 95;
      else if (slotDay === 'Saturday' && slotTime.includes('11:00')) pricePerPerson = 105;
      else if (slotDay === 'Saturday' && slotTime.includes('3:30')) pricePerPerson = 85;
      else if (slotDay === 'Sunday' && slotTime.includes('11:00')) pricePerPerson = 105;
      
      updates.experienceType = 'disco_cruise';
      updates.discoPackage = selectedDiscoOption?.packageId || 'basic';
      updates.packageType = selectedDiscoOption?.packageName || 'ATX Disco Cruise - Basic Bach Package';
      
      // Save disco pricing details with add-ons
      const ticketSubtotal = pricePerPerson * discoTicketCount;
      const mimosaCoolerCost = discoAddOns.mimosaCooler ? 100 : 0;
      
      // Sparkle package cost varies by party type
      let sparklePackageCost = 0;
      if (discoAddOns.sparklePackage) {
        if (partyType === 'combined_bach') {
          sparklePackageCost = 150;
        } else {
          sparklePackageCost = 100;
        }
      }
      
      const originalSubtotal = ticketSubtotal + mimosaCoolerCost + sparklePackageCost;
      const discountAmount = typeof promoDiscount === 'number' && promoDiscount < 1 
        ? Math.round(originalSubtotal * promoDiscount * 100) / 100
        : Math.round(promoDiscount * 100) / 100;
      const subtotal = Math.round((originalSubtotal - discountAmount) * 100) / 100;
      const gratuity = Math.round(subtotal * 0.20 * 100) / 100;
      // Xola fee is calculated on subtotal + gratuity
      const xolaFee = Math.round((subtotal + gratuity) * 0.03 * 100) / 100;
      const salesTax = Math.round(subtotal * 0.0825 * 100) / 100;
      const total = Math.round((subtotal + xolaFee + gratuity + salesTax) * 100) / 100;
      
      updates.pricingDetails = {
        ticketCount: discoTicketCount,
        pricePerPerson: pricePerPerson,
        ticketSubtotal,
        mimosaCoolerCost,
        sparklePackageCost,
        originalSubtotal,
        discountAmount,
        subtotal,
        xolaFee,
        gratuity,
        salesTax,
        total,
        promoCode,
        promoDiscount,
      };
      updates.selectedAddons = {
        discoAddOns,
      };
    } else if (selectedPrivateOption) {
      updates.experienceType = 'private_cruise';
      updates.packageType = selectedPrivatePackage;
      let capacity = '14';
      if (guestCount <= 14) capacity = '14';
      else if (guestCount <= 30) capacity = '25';
      else capacity = '50';
      updates.privateCapacity = capacity;
      updates.selectedAddons = {
        package: selectedPrivatePackage,
        addOns,
        guestRange,
        confirmedGuestCount,
      };
      
      // Save private cruise pricing details with add-ons
      const crewFeePerHour = guestRange === '26-30' ? 50 : guestRange === '51-75' ? 100 : 0;
      const additionalCrewFee = crewFeePerHour * selectedPrivateOption.duration;
      
      // Package costs vary by boat size/guest count using guest range
      const effectiveCount = guestRange === '15-25' || guestRange === '26-30' ? 25 : 
                             guestRange === '31-50' || guestRange === '51-75' ? 50 : 
                             guestCount;
      
      let packageCost = 0;
      if (selectedPrivatePackage === 'essentials') {
        if (effectiveCount <= 14) packageCost = 100;
        else if (effectiveCount <= 30) packageCost = 150;
        else packageCost = 200;
      } else if (selectedPrivatePackage === 'ultimate') {
        if (effectiveCount <= 14) packageCost = 250;
        else if (effectiveCount <= 30) packageCost = 300;
        else packageCost = 350;
      }
      const canHaveDJ = effectiveCount > 14;
      const djCost = canHaveDJ && addOns.dj ? 600 : 0;
      const photographerCost = addOns.photographer ? 600 : 0;
      const bartenderCost = addOns.bartender ? 600 : 0;
      const avPackageCost = addOns.avPackage ? 300 : 0;
      const lilyPadCost = addOns.lilyPadCount * 50;
      
      const subtotalBeforeAddOns = selectedPrivateOption.basePrice;
      const originalSubtotal = subtotalBeforeAddOns + additionalCrewFee + packageCost + djCost + photographerCost + bartenderCost + avPackageCost + lilyPadCost;
      
      const discountAmount = typeof promoDiscount === 'number' && promoDiscount < 1 
        ? Math.round(originalSubtotal * promoDiscount * 100) / 100
        : Math.round(promoDiscount * 100) / 100;
      const subtotal = Math.round((originalSubtotal - discountAmount) * 100) / 100;
      const gratuity = Math.round(subtotal * 0.20 * 100) / 100;
      // Xola fee is calculated on subtotal + gratuity
      const xolaFee = Math.round((subtotal + gratuity) * 0.03 * 100) / 100;
      const salesTax = Math.round(subtotal * 0.0825 * 100) / 100;
      const total = Math.round((subtotal + xolaFee + gratuity + salesTax) * 100) / 100;
      
      updates.pricingDetails = {
        basePrice: subtotalBeforeAddOns,
        additionalCrewFee,
        packageCost,
        djCost,
        photographerCost,
        bartenderCost,
        avPackageCost,
        lilyPadCost,
        originalSubtotal,
        discountAmount,
        subtotal,
        xolaFee,
        gratuity,
        salesTax,
        total,
        promoCode,
        promoDiscount,
      };
    }
    
    onSelectionChange(updates);

    // Hide auto-saving indicator after a delay
    const timer = setTimeout(() => setAutoSaving(false), 1500);
    return () => clearTimeout(timer);
  }, [selectedOptionId, selectedPrivatePackage, addOns, guestRange, confirmedGuestCount, discoTicketCount, promoCode, promoDiscount, discoAddOns]);
  
  // Removed separate promo code state saving - now included in main useEffect above
  
  // For V2 mode, detect disco selections by ID prefix
  const isDiscoSelected = useV2DiscoPricing && selectedOptionId.startsWith('disco-');
  const selectedDiscoSlot = isDiscoSelected 
    ? discoSlots.find(slot => `disco-${slot.id}` === selectedOptionId)
    : null;
  
  const selectedDiscoOption = useV2DiscoPricing ? null : discoOptions.find(opt => opt.id === selectedOptionId);
  const selectedPrivateOption = privateOptions.find(opt => opt.id === selectedOptionId)
    || (selectedPrivateSlotId ? privateOptions.find(opt => opt.slotId === selectedPrivateSlotId) : null);

  // EOY deal behavior: clear promo codes when changing deal (avoid stacking)
  useEffect(() => {
    setPromoCode("");
    setPromoCodeInput("");
    setPromoDiscount(0);
    setPromoError("");
  }, [selectedEOYDeal]);

  const formatPartyType = (type: string | null) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleBookOnline = () => {
    if (!selectedOptionId || !onBookOnline) return;
    
    // Determine which experience type and configuration
    if (useV2DiscoPricing && isDiscoSelected) {
      // V2 disco selection - default to basic package for now
      onBookOnline('disco_cruise', undefined, 'basic');
    } else if (selectedDiscoOption) {
      let discoPackage: 'basic' | 'queen' | 'sparkle' = 'basic';
      if (selectedDiscoOption.packageId === 'disco-queen') discoPackage = 'queen';
      if (selectedDiscoOption.packageId === 'super-sparkle') discoPackage = 'sparkle';
      
      onBookOnline('disco_cruise', undefined, discoPackage);
    } else if (selectedPrivateOption) {
      let capacity: '14' | '25' | '50' = '14';
      if (guestCount <= 14) capacity = '14';
      else if (guestCount <= 30) capacity = '25';
      else capacity = '50';
      
      onBookOnline('private_cruise', capacity, undefined);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-3 md:px-6" style={{ marginTop: '20px' }}>
      {/* Action Buttons - compact single row */}
      <div className="flex items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2 text-xs">
          {autoSaving ? (
            <>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-green-600" />
              <span className="text-muted-foreground">Saved</span>
            </>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button onClick={() => setShareDialogOpen(true)} variant="outline" size="sm" className="gap-1.5 h-7 text-xs px-2">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5 h-7 text-xs px-2">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>
      </div>

      {/* Share Dialog */}
      {savedQuoteId && (
        <ShareQuoteDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          quoteId={savedQuoteId}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerName={customerName}
        />
      )}

      <div id="quote-printable-area">
      <Card className="border-2 shadow-lg overflow-hidden" style={{ borderColor: '#0066CC' }}>
        <CardHeader className="space-y-2 px-2 sm:px-3 md:px-6 py-2 sm:py-3">
          <div className="text-center space-y-2">
            {/* Logo - 2/3 size */}
            <div className="flex justify-center pt-1">
              <img 
                src={ppcLogo.src} 
                alt="Premier Party Cruises" 
                className="h-auto w-[27%] max-w-[100px] sm:w-[22%] sm:max-w-[130px]"
              />
            </div>
            
            {/* Lead Name & Event Date Header */}
            <div className="space-y-1 pb-2 border-b border-border/50">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                {customerName ? `${customerName}'s ${partyType === 'bachelor' ? 'Bachelor' : partyType === 'bachelorette' ? 'Bachelorette' : 'Private'} Party Quote` : 'Your Custom Quote'}
              </h1>
              {eventDate && (
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-medium">
                  Event Date: {format(eventDate, 'EEEE, MMMM d, yyyy')}
                </p>
              )}
              <div className="space-y-3 pt-2">
                <p className="text-xs sm:text-sm font-bold" style={{ color: '#0066CC' }}>
                  We Just Sent This Quote to Your Email - It Will Always Show Real-Time Availability
                </p>
                
                {/* Countdown Timer - Dark theme, compact block */}
                <div className="flex flex-col items-center">
                  <div className="bg-gray-900 rounded-lg py-2.5 px-5 border-2 border-yellow-400/70 shadow-xl inline-block">
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                      <span className="text-sm sm:text-base font-bold text-yellow-300 whitespace-nowrap">⏰ Book in the next {getDaysUntilDeadline()} days for ${CURRENT_DEAL.discountAmount} off!</span>
                      {!countdown.expired ? (
                        <div className="flex items-center gap-1 font-mono font-bold">
                          <span className="bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded text-sm sm:text-base">{countdown.days}d</span>
                          <span className="text-yellow-400">:</span>
                          <span className="bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded text-sm sm:text-base">{String(countdown.hours).padStart(2, '0')}h</span>
                          <span className="text-yellow-400">:</span>
                          <span className="bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded text-sm sm:text-base">{String(countdown.minutes).padStart(2, '0')}m</span>
                          <span className="text-yellow-400">:</span>
                          <span className="bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded text-sm sm:text-base">{String(countdown.seconds).padStart(2, '0')}s</span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <span className="text-red-400 font-bold text-sm">⚠️ EXPIRED</span>
                          {onRestartTimer && (
                            <button
                              onClick={onRestartTimer}
                              className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Restart My 10-Day Discount Timer!
                              <span className="block text-[10px] font-normal opacity-70">(just this once)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-yellow-200/80 text-center mt-1.5">
                      Your quote expires on{' '}
                      <span className="font-bold text-yellow-300 underline decoration-yellow-400 decoration-2 whitespace-nowrap">
                        {quoteDeadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })}
                      </span>
                      {' '}at 11:59 PM CST
                    </p>
                  </div>
                  {/* Perks - 50% larger and bold */}
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3">
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" />${CURRENT_DEAL.discountAmount} Discount</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" />25% Off Transportation</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" />$50 Party On Delivery Voucher</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" />$100 Airbnb Concierge Voucher</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Weekend Options Note */}
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-base sm:text-lg md:text-xl font-semibold text-center leading-tight">
                Here are the options for the weekend of {format(fridayDate, "MMMM d, yyyy")}
              </p>
            </div>
            
            {/* Bach Party Options Comparison Image - Only for bachelor/bachelorette/combined bach */}
            {(() => {
              const isBachParty = ['bachelorette', 'bachelor', 'combined_bach', 'bachelorette_party', 'bachelor_party'].some(type => 
                partyType?.toLowerCase().includes(type.replace('_', ' ')) || 
                partyType?.toLowerCase().replace(/[^a-z]/g, '') === type.replace('_', '')
              );
              
              if (!isBachParty) return null;
              
              // Determine which comparison image to show based on party type
              const normalizedType = partyType?.toLowerCase().replace(/[^a-z]/g, '') || '';
              let comparisonImage = bacheloretteOptionsComparison;
              let altText = "Bachelorette Party Boat Options - Private Cruise vs ATX Disco Cruise";
              
              if (normalizedType.includes('combined')) {
                comparisonImage = combinedBachOptionsComparison;
                altText = "Combined Bachelorette/Bachelor Party Boat Options - Private Cruise vs ATX Disco Cruise";
              } else if (normalizedType.includes('bachelor') && !normalizedType.includes('bachelorette')) {
                comparisonImage = bachelorOptionsComparison;
                altText = "Bachelor Party Boat Options - Private Cruise vs ATX Disco Cruise";
              }
              
              return (
                <div className="mt-6">
                  <img 
                    src={comparisonImage} 
                    alt={altText}
                    className="w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
              );
            })()}
            
            {/* Wedding Event Presentation - Only for wedding_event */}
            {(() => {
              const isWeddingParty = partyType?.toLowerCase().includes('wedding') || 
                partyType?.toLowerCase().replace(/[^a-z]/g, '') === 'weddingevent';
              
              if (!isWeddingParty) return null;
              
              const weddingGammaUrl = 'https://wedding-party-cruises-5qh0w9f.gamma.site/';
              
              return (
                <div className="mt-6">
                  {/* Link to view full slide deck - with pulsing animation */}
                  <a 
                    href={weddingGammaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium mb-3 text-sm px-4 py-2 rounded-lg shadow-md animate-[pulse_2s_ease-in-out_infinite]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Click-to-view Wedding Party Cruise presentation
                  </a>
                  
                  {/* Mobile/Tablet: Show preview image that opens in new tab */}
                  {isMobile ? (
                    <a 
                      href={weddingGammaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-pointer rounded-lg overflow-hidden shadow-lg"
                    >
                      <img 
                        src={gammaPresentationPreview.src} 
                        alt="Wedding Party Cruise Options Preview"
                        className="w-full h-auto"
                      />
                    </a>
                  ) : (
                    /* Desktop: Show embedded iframe */
                    <iframe 
                      src={weddingGammaUrl} 
                      style={{ width: '100%', height: '450px', border: 'none' }}
                      allow="fullscreen" 
                      title="Wedding Party Cruise Options"
                    />
                  )}
                </div>
              );
            })()}
            
            {/* Non-Bach Party Slides - For corporate, birthday, graduation, other etc. */}
            {(() => {
              // Check if this is a bach party type - exclude those
              const isBachParty = ['bachelorette', 'bachelor', 'combined_bach', 'bachelorette_party', 'bachelor_party'].some(type => 
                partyType?.toLowerCase().includes(type.replace('_', ' ')) || 
                partyType?.toLowerCase().replace(/[^a-z]/g, '') === type.replace('_', '')
              );
              
              // Check if this is a wedding party - already handled separately
              const isWeddingParty = partyType?.toLowerCase().includes('wedding') || 
                partyType?.toLowerCase().replace(/[^a-z]/g, '') === 'weddingevent';
              
              // Only show for non-bach, non-wedding party types
              if (isBachParty || isWeddingParty) return null;
              
              // Determine which slide to show based on guest count
              let slideImage = nonBachSlide14;
              let altText = "Private Cruise for Up to 14 Guests - Day Tripper";
              
              if (guestCount >= 31) {
                slideImage = nonBachSlide50;
                altText = "Private Cruise for 31-75 Guests - Clever Girl";
              } else if (guestCount >= 15) {
                slideImage = nonBachSlide25;
                altText = "Private Cruise for 15-30 Guests - Meeseeks / The Irony";
              }
              
              return (
                <div className="mt-6">
                  <img 
                    src={slideImage} 
                    alt={altText}
                    className="w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
              );
            })()}
          </div>
          
          {/* Three white blocks with event details */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <div className="bg-background rounded-lg p-2.5 sm:p-3 md:p-4 border shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Event Date</p>
                <Popover open={isEditingDate} onOpenChange={setIsEditingDate}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 sm:h-6 sm:w-6 p-0 no-print">
                      <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => {
                        if (date && onEventDateChange) {
                          onEventDateChange(date);
                          setIsEditingDate(false);
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-tight break-words">{format(eventDate, "MMMM d, yyyy")}</p>
            </div>
            <div className="bg-background rounded-lg p-2.5 sm:p-3 md:p-4 border shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Party Type</p>
                {!isEditingPartyType ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 no-print"
                    onClick={() => setIsEditingPartyType(true)}
                  >
                    <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                ) : null}
              </div>
              {isEditingPartyType ? (
                <Select
                  value={partyType || ''}
                  onValueChange={(value) => {
                    if (onPartyTypeChange) {
                      onPartyTypeChange(value);
                      setIsEditingPartyType(false);
                    }
                  }}
                >
                  <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bachelor_party">Bachelor Party</SelectItem>
                    <SelectItem value="bachelorette_party">Bachelorette Party</SelectItem>
                    <SelectItem value="combined_bach">Combined Bach Party</SelectItem>
                    <SelectItem value="birthday_party">Birthday Party</SelectItem>
                    <SelectItem value="wedding_event">Wedding Event</SelectItem>
                    <SelectItem value="corporate_event">Corporate Event</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs sm:text-sm font-semibold leading-tight break-words">{formatPartyType(partyType)}</p>
              )}
            </div>
            <div className="bg-background rounded-lg p-2.5 sm:p-3 md:p-4 border shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Party Size</p>
                {!isEditingGuestCount ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 no-print"
                    onClick={() => {
                      setIsEditingGuestCount(true);
                      setTempGuestCount(guestCount);
                    }}
                  >
                    <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                ) : null}
              </div>
              {isEditingGuestCount ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={tempGuestCount}
                    onChange={(e) => setTempGuestCount(parseInt(e.target.value) || 1)}
                    className="h-7 sm:h-8 w-16 sm:w-20 text-xs sm:text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-7 sm:h-8 text-xs"
                    onClick={() => {
                      if (onGuestCountChange && tempGuestCount >= 1) {
                        onGuestCountChange(tempGuestCount);
                        setIsEditingGuestCount(false);
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-semibold leading-tight">{guestCount} {guestCount === 1 ? 'guest' : 'guests'}</p>
              )}
            </div>
          </div>

          <Separator />
          
           <p className="text-xs sm:text-sm md:text-base font-medium text-center leading-tight">
            Note: this tool provides pricing only. For current availability, please refer to our <a href="https://x2-checkout.xola.app/flows/mvp?button=6915747a162501edc00f1519&view=grid" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">booking calendar</a> or contact us at 512.488.5892.
          </p>
          <p className="text-xs sm:text-sm md:text-base font-medium text-center leading-tight mt-2">
            Cruises are all first come, first serve, reservable only with a 25% deposit.
          </p>
        </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-3 md:px-6 py-3 sm:py-4 md:py-6">
        {/* V2: Merged Disco + Private Options by Day */}
        {useV2DiscoPricing ? (
          <div className="space-y-4 sm:space-y-6">
            <RadioGroup value={selectedOptionId} onValueChange={(value) => {
              setSelectedOptionId(value);
              
              // Check if this is a disco slot or private slot by checking the value prefix
              if (value.startsWith('disco-')) {
                // Disco slot selected - no additional action needed
                console.log('Disco slot selected:', value);
              } else {
                // Handle private slot selection
                const privateOption = privateOptions.find(opt => opt.id === value);
                if (privateOption) {
                  setSelectedPrivateSlotId(privateOption.slotId);
                }
              }
            }}>
              {/* Merge disco and private slots, then group by day */}
              {(() => {
                // Separate weekdays from weekends
                const allOptionsByDay: Record<string, Array<{type: 'disco' | 'private', data: any}>> = {};
                const weekdaysByDay: Record<string, Array<{type: 'private', data: any}>> = {};
                
                // Add disco slots - group by Central Time day (weekends only)
                discoSlots.forEach(slot => {
                  const zoned = toZonedTime(new Date(slot.start_at), 'America/Chicago');
                  const slotDay = getDay(zoned); // 0=Sunday, 5=Friday, 6=Saturday
                  
                  // Include disco slots on Friday (5), Saturday (6), or Sunday (0) for holiday exceptions
                  if (slotDay === 5 || slotDay === 6 || slotDay === 0) {
                    const dateKey = formatInTimeZone(zoned, 'America/Chicago', "yyyy-MM-dd");
                    if (!allOptionsByDay[dateKey]) allOptionsByDay[dateKey] = [];
                    allOptionsByDay[dateKey].push({ type: 'disco', data: slot });
                  }
                });
                
                // Add private options - separate weekdays from weekends
                privateOptions.forEach(option => {
                  const baseDate = option.slotData?.start_at ? new Date(option.slotData.start_at) : option.date;
                  const zoned = toZonedTime(baseDate, 'America/Chicago');
                  const slotDay = getDay(zoned); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
                  const dateKey = formatInTimeZone(zoned, 'America/Chicago', "yyyy-MM-dd");
                  
                  if (slotDay >= 1 && slotDay <= 4) {
                    // Weekday (Mon-Thu)
                    if (!weekdaysByDay[dateKey]) weekdaysByDay[dateKey] = [];
                    weekdaysByDay[dateKey].push({ type: 'private', data: option });
                  } else {
                    // Weekend (Fri-Sun)
                    if (!allOptionsByDay[dateKey]) allOptionsByDay[dateKey] = [];
                    allOptionsByDay[dateKey].push({ type: 'private', data: option });
                  }
                });
                
                // Ensure we always show Fri/Sat/Sun for the selected weekend in Central Time
                const chicago = 'America/Chicago';
                const fridayKey = formatInTimeZone(toZonedTime(fridayDate, chicago), chicago, "yyyy-MM-dd");
                const saturdayKey = formatInTimeZone(toZonedTime(saturdayDate, chicago), chicago, "yyyy-MM-dd");
                const sundayKey = formatInTimeZone(toZonedTime(sundayDate, chicago), chicago, "yyyy-MM-dd");
                if (!allOptionsByDay[fridayKey]) allOptionsByDay[fridayKey] = [];
                if (!allOptionsByDay[saturdayKey]) allOptionsByDay[saturdayKey] = [];
                if (!allOptionsByDay[sundayKey]) allOptionsByDay[sundayKey] = [];
                
                // Render weekdays first (if any), then weekends
                const weekdayKeys = Object.keys(weekdaysByDay).sort();
                const weekendKeys = [fridayKey, saturdayKey, sundayKey];
                
                return (
                  <>
                    {/* Weekday slots - compact format with collapsible time slots */}
                    {weekdayKeys.map(dateKey => {
                      const dayOptions = weekdaysByDay[dateKey] || [];
                      if (dayOptions.length === 0) return null;
                      
                      const firstOption = dayOptions[0].data;
                      const baseDate = firstOption.slotData?.start_at ? new Date(firstOption.slotData.start_at) : firstOption.date;
                      const zoned = toZonedTime(baseDate, 'America/Chicago');
                      const dayName = formatInTimeZone(zoned, 'America/Chicago', "EEEE");
                      const dateDisplay = formatInTimeZone(zoned, 'America/Chicago', "MMMM d");
                      
                      // Group by duration (3hr vs 4hr)
                      const by3hr = dayOptions.filter(opt => opt.data.duration === 3).map(opt => opt.data);
                      const by4hr = dayOptions.filter(opt => opt.data.duration === 4).map(opt => opt.data);
                      
                      // Helper to check if time starts at top of hour
                      const isTopOfHour = (timeRange: string) => {
                        const match = timeRange.match(/(\d+):(\d+)/);
                        return match && match[2] === '00';
                      };
                      
                      // Split slots by top-of-hour vs half-hour (skip collapsing if ≤3 total slots)
                      const top3hr = by3hr.length <= 3 ? by3hr : by3hr.filter(slot => isTopOfHour(slot.timeRange));
                      const half3hr = by3hr.length <= 3 ? [] : by3hr.filter(slot => !isTopOfHour(slot.timeRange));
                      const top4hr = by4hr.length <= 3 ? by4hr : by4hr.filter(slot => isTopOfHour(slot.timeRange));
                      const half4hr = by4hr.length <= 3 ? [] : by4hr.filter(slot => !isTopOfHour(slot.timeRange));
                      
                      // Check if this date/duration has a selection
                      const selected3hrSlot = selectedPrivateSlotId && by3hr.find(slot => slot.slotId === selectedPrivateSlotId);
                      const selected4hrSlot = selectedPrivateSlotId && by4hr.find(slot => slot.slotId === selectedPrivateSlotId);
                      const has3hrSelection = !!selected3hrSlot;
                      const has4hrSelection = !!selected4hrSlot;
                      
                      // Keys for tracking expanded state
                      const expand3hrKey = `${dateKey}-3hr`;
                      const expand4hrKey = `${dateKey}-4hr`;
                      
                      return (
                        <div key={dateKey} className="space-y-1.5 sm:space-y-2 md:space-y-1.5">
                          <h3 className="text-sm sm:text-base md:text-sm font-bold leading-tight break-words px-1">
                            {dayName}, {dateDisplay}
                          </h3>
                          
                          {/* 3-hour cruise option */}
                          {by3hr.length > 0 && (
                            <div className="p-2 sm:p-3 md:p-2 border rounded-lg bg-card">
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <p className="font-bold text-sm sm:text-base md:text-xs leading-tight flex-shrink-0">
                                  🚤 3-Hour Private Cruise
                                </p>
                                <div className="flex flex-wrap gap-1.5 md:gap-1">
                                   {top3hr.map((slot) => {
                                     const isSelected = selectedPrivateSlotId === slot.slotId && has3hrSelection;
                                     return (
                                       <button
                                         key={slot.slotId}
                                         type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedOptionId(slot.id);
                                        setSelectedPrivateSlotId(slot.slotId);
                                      }}
                                         className={cn(
                                           "flex items-center gap-1.5 md:gap-1 px-2 py-1.5 md:px-2 md:py-1 border rounded text-xs md:text-[11px] transition-colors whitespace-nowrap pointer-events-auto cursor-pointer",
                                           isSelected
                                             ? "bg-primary text-primary-foreground border-primary"
                                             : "hover:bg-accent"
                                         )}
                                       >
                                         <div className={cn(
                                           "h-3 w-3 md:h-2.5 md:w-2.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 pointer-events-none",
                                           isSelected ? "border-primary-foreground" : "border-primary"
                                         )}>
                                           {isSelected && <div className="h-1.5 w-1.5 md:h-1 md:w-1 rounded-full bg-primary-foreground" />}
                                         </div>
                                         <span className="pointer-events-none">{slot.timeRange}</span>
                                       </button>
                                     );
                                   })}
                                   {half3hr.length > 0 && expandedSections[expand3hrKey] && half3hr.map((slot) => {
                                     const isSelected = selectedPrivateSlotId === slot.slotId && has3hrSelection;
                                     return (
                                       <button
                                         key={slot.slotId}
                                         type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedOptionId(slot.id);
                                            setSelectedPrivateSlotId(slot.slotId);
                                          }}
                                         className={cn(
                                           "flex items-center gap-1.5 md:gap-1 px-2 py-1.5 md:px-2 md:py-1 border rounded text-xs md:text-[11px] transition-colors whitespace-nowrap pointer-events-auto cursor-pointer",
                                           isSelected
                                             ? "bg-primary text-primary-foreground border-primary"
                                             : "hover:bg-accent"
                                         )}
                                       >
                                         <div className={cn(
                                           "h-3 w-3 md:h-2.5 md:w-2.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 pointer-events-none",
                                           isSelected ? "border-primary-foreground" : "border-primary"
                                         )}>
                                           {isSelected && <div className="h-1.5 w-1.5 md:h-1 md:w-1 rounded-full bg-primary-foreground" />}
                                         </div>
                                         <span className="pointer-events-none">{slot.timeRange}</span>
                                       </button>
                                     );
                                   })}
                                   {half3hr.length > 0 && (
                                     <button
                                       type="button"
                                       onClick={() => setExpandedSections(prev => ({ ...prev, [expand3hrKey]: !prev[expand3hrKey] }))}
                                       className="text-xs md:text-[10px] text-primary hover:underline self-center"
                                     >
                                       {expandedSections[expand3hrKey] ? 'Less' : `+${half3hr.length} more`}
                                     </button>
                                   )}
                                </div>
                                <div className="text-right flex-shrink-0 md:ml-auto">
                                  <p className="font-bold text-lg md:text-base leading-none">
                                    ${by3hr[0]?.totalPrice.toLocaleString()}
                                  </p>
                                  <p className="text-xs md:text-[10px] text-muted-foreground">starting at</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 4-hour cruise option */}
                          {by4hr.length > 0 && (
                            <div className="p-2 sm:p-3 md:p-2 border rounded-lg bg-card">
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <p className="font-bold text-sm sm:text-base md:text-xs leading-tight flex-shrink-0">
                                  🚤 4-Hour Private Cruise
                                </p>
                                <div className="flex flex-wrap gap-1.5 md:gap-1">
                                   {top4hr.map((slot) => {
                                     const isSelected = selectedPrivateSlotId === slot.slotId && has4hrSelection;
                                     return (
                                       <button
                                         key={slot.slotId}
                                         type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedOptionId(slot.id);
                                            setSelectedPrivateSlotId(slot.slotId);
                                          }}
                                         className={cn(
                                           "flex items-center gap-1.5 md:gap-1 px-2 py-1.5 md:px-2 md:py-1 border rounded text-xs md:text-[11px] transition-colors whitespace-nowrap pointer-events-auto cursor-pointer",
                                           isSelected
                                             ? "bg-primary text-primary-foreground border-primary"
                                             : "hover:bg-accent"
                                         )}
                                       >
                                         <div className={cn(
                                           "h-3 w-3 md:h-2.5 md:w-2.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 pointer-events-none",
                                           isSelected ? "border-primary-foreground" : "border-primary"
                                         )}>
                                           {isSelected && <div className="h-1.5 w-1.5 md:h-1 md:w-1 rounded-full bg-primary-foreground" />}
                                         </div>
                                         <span className="pointer-events-none">{slot.timeRange}</span>
                                       </button>
                                     );
                                   })}
                                   {half4hr.length > 0 && expandedSections[expand4hrKey] && half4hr.map((slot) => {
                                     const isSelected = selectedPrivateSlotId === slot.slotId && has4hrSelection;
                                     return (
                                       <button
                                         key={slot.slotId}
                                         type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedOptionId(slot.id);
                                            setSelectedPrivateSlotId(slot.slotId);
                                          }}
                                         className={cn(
                                           "flex items-center gap-1.5 md:gap-1 px-2 py-1.5 md:px-2 md:py-1 border rounded text-xs md:text-[11px] transition-colors whitespace-nowrap pointer-events-auto cursor-pointer",
                                           isSelected
                                             ? "bg-primary text-primary-foreground border-primary"
                                             : "hover:bg-accent"
                                         )}
                                       >
                                         <div className={cn(
                                           "h-3 w-3 md:h-2.5 md:w-2.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 pointer-events-none",
                                           isSelected ? "border-primary-foreground" : "border-primary"
                                         )}>
                                           {isSelected && <div className="h-1.5 w-1.5 md:h-1 md:w-1 rounded-full bg-primary-foreground" />}
                                         </div>
                                         <span className="pointer-events-none">{slot.timeRange}</span>
                                       </button>
                                     );
                                   })}
                                   {half4hr.length > 0 && (
                                     <button
                                       type="button"
                                       onClick={() => setExpandedSections(prev => ({ ...prev, [expand4hrKey]: !prev[expand4hrKey] }))}
                                       className="text-xs md:text-[10px] text-primary hover:underline self-center"
                                     >
                                       {expandedSections[expand4hrKey] ? 'Less' : `+${half4hr.length} more`}
                                     </button>
                                   )}
                                </div>
                                <div className="text-right flex-shrink-0 md:ml-auto">
                                  <p className="font-bold text-lg md:text-base leading-none">
                                    ${by4hr[0]?.totalPrice.toLocaleString()}
                                  </p>
                                  <p className="text-xs md:text-[10px] text-muted-foreground">starting at</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Weekend slots - compact format matching weekdays */}
                    {weekendKeys.map(dateKey => {
                      const dayItems = allOptionsByDay[dateKey] || [];
                      let baseDate: Date;
                      if (dayItems.length > 0) {
                        const first = dayItems[0];
                        baseDate = first.type === 'disco'
                          ? new Date(first.data.start_at)
                          : (first.data.slotData?.start_at ? new Date(first.data.slotData.start_at) : first.data.date);
                      } else {
                        baseDate = new Date(dateKey + 'T12:00:00');
                      }
                      const zoned = toZonedTime(baseDate, 'America/Chicago');
                      const dayName = formatInTimeZone(zoned, 'America/Chicago', "EEEE");
                      const dateDisplay = formatInTimeZone(zoned, 'America/Chicago', "MMMM d");
                      
                      // Separate disco and private items
                      const discoItems = dayItems.filter(item => item.type === 'disco');
                      const privateItems = dayItems.filter(item => item.type === 'private');
                      
                      return (
                        <div key={dateKey} className="space-y-1.5 sm:space-y-2 md:space-y-1.5">
                          <h3 className="text-sm sm:text-base md:text-sm font-bold leading-tight break-words px-1">
                            {dayName}, {dateDisplay}
                          </h3>
                          
                          {/* Disco Cruises */}
                          {discoItems.map((item) => {
                            const slot = item.data;
                            const slotTime = formatTimeCSTFull(slot.start_at);
                            const slotEndTime = formatTimeCSTFull(slot.end_at);
                            const slotDay = format(new Date(slot.start_at), 'EEEE');
                            
                            let price = 95;
                            if (slotDay === 'Friday' && slotTime.includes('12:00')) price = 95;
                            else if (slotDay === 'Saturday' && slotTime.includes('11:00')) price = 105;
                            else if (slotDay === 'Saturday' && slotTime.includes('3:30')) price = 85;
                            else if (slotDay === 'Sunday' && slotTime.includes('11:00')) price = 105;
                            
                            const optionId = `disco-${slot.id}`;
                            const isSelected = selectedOptionId === optionId;
                            
                            return (
                              <div key={optionId} className="p-2 sm:p-3 md:p-2 border rounded-lg bg-card">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                  <p className="font-bold text-sm sm:text-base md:text-xs leading-tight text-purple-600 dark:text-purple-400 flex-shrink-0">
                                    🪩 ATX Disco Cruise
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedOptionId(optionId);
                                        setSelectedPrivateSlotId(null);
                                      }}
                                      className={cn(
                                        "flex items-center gap-1.5 sm:gap-2 md:gap-1.5 px-2 py-1.5 sm:px-4 sm:py-3 md:px-3 md:py-1.5 border rounded text-xs sm:text-sm md:text-xs transition-colors whitespace-nowrap pointer-events-auto cursor-pointer",
                                        isSelected
                                          ? "bg-purple-600 text-white border-purple-600"
                                          : "hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                      )}
                                    >
                                      <div className={cn(
                                        "h-3 w-3 sm:h-4 sm:w-4 md:h-3 md:w-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 pointer-events-none",
                                        isSelected ? "border-white" : "border-purple-600"
                                      )}>
                                        {isSelected && <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 md:h-1.5 md:w-1.5 rounded-full bg-white" />}
                                      </div>
                                      <span className="pointer-events-none font-medium">{slotTime} - {slotEndTime}</span>
                                    </button>
                                  </div>
                                  <div className="text-right flex-shrink-0 md:ml-auto">
                                    <p className="font-bold text-lg md:text-base leading-none text-purple-600 dark:text-purple-400">
                                      ${price}<span className="text-xs md:text-[10px]">/person</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Private Cruises - group by duration */}
                          {privateItems.length > 0 && (() => {
                            const privateOptions = privateItems.map(item => item.data);
                            const by3hr = privateOptions.filter(opt => opt.duration === 3);
                            const by4hr = privateOptions.filter(opt => opt.duration === 4);
                            
                            return (
                              <>
                                {by3hr.length > 0 && (
                                  <div className="p-2 sm:p-3 md:p-2 border rounded-lg bg-card">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                      <p className="font-bold text-sm sm:text-base md:text-xs leading-tight flex-shrink-0">
                                        🚤 3-Hour Private Cruise
                                      </p>
                                      <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-1.5">
                                        {by3hr.map((slot) => {
                                          const isSelected = selectedPrivateSlotId === slot.slotId;
                                          return (
                                            <button
                                              key={slot.slotId}
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedOptionId(slot.id);
                                                setSelectedPrivateSlotId(slot.slotId);
                                              }}
                                              className={cn(
                                                "flex items-center gap-1.5 sm:gap-2 md:gap-1.5 px-2 py-1.5 sm:px-4 sm:py-3 md:px-3 md:py-1.5 border rounded text-xs sm:text-sm md:text-xs transition-colors whitespace-nowrap pointer-events-auto cursor-pointer",
                                                isSelected
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : "hover:bg-accent"
                                              )}
                                            >
                                              <div className={cn(
                                                "h-3 w-3 sm:h-4 sm:w-4 md:h-3 md:w-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 pointer-events-none",
                                                isSelected ? "border-primary-foreground" : "border-primary"
                                              )}>
                                                {isSelected && <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 md:h-1.5 md:w-1.5 rounded-full bg-primary-foreground" />}
                                              </div>
                                              <span className="pointer-events-none font-medium">{slot.timeRange}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <div className="text-right flex-shrink-0 md:ml-auto">
                                        <p className="font-bold text-lg md:text-base leading-none">
                                          ${by3hr[0]?.totalPrice.toLocaleString()}
                                        </p>
                                        <p className="text-xs md:text-[10px] text-muted-foreground">starting at</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {by4hr.length > 0 && (
                                  <div className="p-2 sm:p-3 md:p-2 border rounded-lg bg-card">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                      <p className="font-bold text-sm sm:text-base md:text-xs leading-tight flex-shrink-0">
                                        🚤 4-Hour Private Cruise
                                      </p>
                                      <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-1.5">
                                        {by4hr.map((slot) => {
                                          const isSelected = selectedPrivateSlotId === slot.slotId;
                                          return (
                                            <button
                                              key={slot.slotId}
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedOptionId(slot.id);
                                                setSelectedPrivateSlotId(slot.slotId);
                                              }}
                                              className={cn(
                                                "flex items-center gap-1.5 sm:gap-2 md:gap-1.5 px-2 py-1.5 sm:px-4 sm:py-3 md:px-3 md:py-1.5 border rounded text-xs sm:text-sm md:text-xs transition-colors whitespace-nowrap pointer-events-auto cursor-pointer",
                                                isSelected
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : "hover:bg-accent"
                                              )}
                                            >
                                              <div className={cn(
                                                "h-3 w-3 sm:h-4 sm:w-4 md:h-3 md:w-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 pointer-events-none",
                                                isSelected ? "border-primary-foreground" : "border-primary"
                                              )}>
                                                {isSelected && <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 md:h-1.5 md:w-1.5 rounded-full bg-primary-foreground" />}
                                              </div>
                                              <span className="pointer-events-none font-medium">{slot.timeRange}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <div className="text-right flex-shrink-0 md:ml-auto">
                                        <p className="font-bold text-lg md:text-base leading-none">
                                          ${by4hr[0]?.totalPrice.toLocaleString()}
                                        </p>
                                        <p className="text-xs md:text-[10px] text-muted-foreground">starting at</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </RadioGroup>
            
            {/* Disco Ticket Count Selector - Show after disco slot selected in V2 mode */}
            {isDiscoSelected && selectedDiscoSlot && (
              <div className="mt-6 p-4 sm:p-6 border-2 border-purple-500 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <h4 className="font-bold text-lg sm:text-xl md:text-2xl mb-4 text-center">
                  How many tickets do you need?
                </h4>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDiscoTicketCount(Math.max(1, discoTicketCount - 1))}
                    disabled={discoTicketCount <= 1}
                    className="h-10 w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="text-center min-w-[80px]">
                    <p className="text-3xl sm:text-4xl font-bold text-purple-600 dark:text-purple-400">
                      {discoTicketCount}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {discoTicketCount === 1 ? 'ticket' : 'tickets'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDiscoTicketCount(Math.min(selectedDiscoSlot?.capacity_available || 100, discoTicketCount + 1))}
                    disabled={discoTicketCount >= (selectedDiscoSlot?.capacity_available || 100)}
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Removed spots remaining display per request */}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Original Disco Cruise Options - Grouped by Time Slot */}
            {discoOptions.length > 0 && (
              <div className="space-y-4 sm:space-y-6">
                <RadioGroup value={selectedOptionId} onValueChange={setSelectedOptionId}>
                  {/* Group options by slot */}
                  {Object.entries(
                    discoOptions.reduce((groups, option) => {
                      const key = `${option.slotId}`;
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(option);
                      return groups;
                    }, {} as Record<string, DiscoOption[]>)
                  ).map(([slotId, slotOptions]) => {
                    const firstOption = slotOptions[0];
                    return (
                      <div key={slotId} className="space-y-2 sm:space-y-3">
                        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-tight break-words px-1">
                          ATX Disco Cruise Options - {firstOption.dayName}, {format(firstOption.date, "MMMM d")}, {firstOption.timeRange}
                        </h3>
                        {slotOptions.map((option) => (
                      <div
                        key={option.id}
                        className="p-2 sm:p-3 md:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                          <RadioGroupItem 
                            value={option.id} 
                            id={option.id}
                            className="flex-shrink-0 mt-0.5 sm:mt-1"
                          />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer min-w-0">
                            {/* Mobile: Stack vertically, Desktop: Horizontal grid */}
                            <div className="flex flex-col sm:grid sm:grid-cols-[2fr_auto_1fr] sm:items-center gap-2 sm:gap-3 md:gap-4">
                              <p className="font-semibold text-xs sm:text-sm md:text-base leading-tight break-words">
                                {option.packageName}
                              </p>
                              {/* Quantity selector */}
                              <div className="flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2">
                                <Label className="text-xs sm:text-sm font-medium sm:hidden">Qty:</Label>
                                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                                  <Label className="text-xs sm:text-sm font-medium hidden sm:inline">Qty:</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0 text-sm no-print"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (selectedOptionId !== option.id) {
                                        setSelectedOptionId(option.id);
                                        setDiscoTicketCount(1);
                                      } else {
                                        setDiscoTicketCount(Math.max(1, discoTicketCount - 1));
                                      }
                                    }}
                                  >
                                    -
                                  </Button>
                                  <span className="min-w-[32px] sm:min-w-[36px] md:min-w-[40px] text-center font-bold text-sm sm:text-base">
                                    {selectedOptionId === option.id ? discoTicketCount : 1}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0 text-sm no-print"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (selectedOptionId !== option.id) {
                                        setSelectedOptionId(option.id);
                                        setDiscoTicketCount(2);
                                      } else {
                                        setDiscoTicketCount(discoTicketCount + 1);
                                      }
                                    }}
                                  >
                                    +
                                  </Button>
                                </div>
                                {/* Price on same row on mobile, separate column on desktop */}
                                <div className="text-right sm:hidden">
                                  <p className="font-bold text-base sm:text-lg leading-none">${option.pricePerPerson}</p>
                                  <p className="text-[10px] text-muted-foreground">per person</p>
                                </div>
                              </div>
                              {/* Price column - hidden on mobile, shown on desktop */}
                              <div className="text-right hidden sm:block">
                                <p className="font-bold text-lg md:text-xl lg:text-2xl leading-none">${option.pricePerPerson}</p>
                                <p className="text-xs text-muted-foreground">per person</p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        )}
        </>
        )}

         {/* Private Cruise Options - Grouped by Day (only shown when NOT using V2) */}
        {!useV2DiscoPricing && privateOptions.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            <RadioGroup value={selectedOptionId} onValueChange={(value) => {
              setSelectedOptionId(value);
              const option = privateOptions.find(opt => opt.id === value);
              if (option) {
                setSelectedPrivateSlotId(option.slotId);
              }
            }}>
              {/* Group private options by date (day) */}
              {Object.entries(
                privateOptions.reduce((groups, option) => {
                  const dateKey = format(option.date, "yyyy-MM-dd");
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(option);
                  return groups;
                }, {} as Record<string, PrivateOption[]>)
              ).map(([dateKey, dayOptions]) => {
                const firstOption = dayOptions[0];
                
                return (
                  <div key={dateKey} className="space-y-2 sm:space-y-3">
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-tight break-words px-1">
                      Private Cruise Options - {firstOption.dayName}, {format(firstOption.date, "MMMM d")}
                    </h3>
                    
                    {dayOptions.map((option) => (
                      <div key={option.id} className="p-2 sm:p-3 md:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                          <RadioGroupItem 
                            value={option.id} 
                            id={option.id}
                            className="flex-shrink-0 mt-0.5 sm:mt-1"
                          />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer min-w-0">
                            <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto] sm:items-center gap-2 sm:gap-3 md:gap-4">
                               <div className="min-w-0">
                               <p className="font-semibold text-xs sm:text-sm md:text-base leading-tight break-words">
                                  {Math.round(option.duration)}-Hour Private Cruise for {guestRange || `${guestCount}`} {guestRange ? 'people' : 'guests'} with Captain ({option.timeRange})
                                </p>
                                <p className="text-[10px] sm:text-xs md:text-sm text-left text-muted-foreground mt-0.5 sm:mt-1 break-words">
                                  {option.boatName === 'Meeseeks' || option.boatName === 'The Irony' 
                                    ? 'Meeseeks / The Irony - Max 25-30 Guests (add\'l crew fee for 26-30ppl)'
                                    : option.boatName === 'Clever Girl'
                                    ? 'Clever Girl - Max 31-75 Guests (add\'l crew fee for 51-75ppl)'
                                    : `${option.boatName} (up to ${option.slotData.boat?.capacity || guestCount} guests)`}
                                </p>
                              </div>
                              <div className="text-left sm:text-right flex-shrink-0">
                                <p className="font-bold text-base sm:text-lg md:text-xl lg:text-2xl leading-none">${option.totalPrice.toLocaleString()}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">flat rate</p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        )}

        {discoOptions.length === 0 && privateOptions.length === 0 && !useV2DiscoPricing && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No availability found for the selected weekend and party size.</p>
          </div>
        )}

        {/* Guest Range Confirmation - Shows after private option selected and stays visible */}
        {selectedPrivateOption && (guestCount >= 15 && guestCount <= 30 || guestCount >= 31 && guestCount <= 75) && (
          <div className="space-y-4 p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <h4 className="font-bold text-lg sm:text-xl text-center">Confirm Max # of Guests</h4>
            <p className="text-sm text-center text-muted-foreground">Please select your guest count range to see accurate pricing</p>
            <RadioGroup value={guestRange} onValueChange={(val) => {
              setGuestRange(val as any);
              setConfirmedGuestCount(val === '15-25' ? Math.min(guestCount, 25) : 
                                    val === '26-30' ? Math.max(guestCount, 26) : 
                                    val === '31-50' ? Math.min(guestCount, 50) : 
                                    val === '51-75' ? Math.max(guestCount, 51) : guestCount);
            }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guestCount >= 15 && guestCount <= 30 && (
                <>
                  <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                    <RadioGroupItem value="15-25" id="range-15-25-confirm" />
                    <Label htmlFor="range-15-25-confirm" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-base">15-25 people</span>
                        <span className="text-sm text-muted-foreground">+$0</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                    <RadioGroupItem value="26-30" id="range-26-30-confirm" />
                    <Label htmlFor="range-26-30-confirm" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-base">26-30 people</span>
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold">+$50/hr crew fee</span>
                      </div>
                    </Label>
                  </div>
                </>
              )}
              {guestCount >= 31 && guestCount <= 75 && (
                <>
                  <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                    <RadioGroupItem value="31-50" id="range-31-50-confirm" />
                    <Label htmlFor="range-31-50-confirm" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-base">31-50 people</span>
                        <span className="text-sm text-muted-foreground">+$0</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors bg-white dark:bg-gray-800">
                    <RadioGroupItem value="51-75" id="range-51-75-confirm" />
                    <Label htmlFor="range-51-75-confirm" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-base">51-75 people</span>
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold">+$100/hr crew fee</span>
                      </div>
                    </Label>
                  </div>
                </>
              )}
            </RadioGroup>
          </div>
        )}

        {/* Disco Cruise Add-Ons - Only show after ticket count confirmed */}
        {(selectedDiscoSlot || selectedDiscoOption) && discoTicketCount > 0 && (
          <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t-2">
            <h4 className="font-bold text-xl sm:text-2xl md:text-3xl text-center">Disco Cruise Add-Ons (Optional)</h4>
            
            <div className="space-y-3">
              {/* Mimosa Party Cooler - Available for all groups */}
              <div className={cn(
                "flex items-start gap-3 p-3 border-2 rounded-lg",
                dealHasAllPerks ? "border-primary/40 bg-primary/5" : "border-purple-300 dark:border-purple-700"
              )}>
                <Checkbox 
                  id="disco-addon-mimosa" 
                  checked={dealHasAllPerks ? true : discoAddOns.mimosaCooler}
                  onCheckedChange={(checked) => {
                    if (dealHasAllPerks) return;
                    setDiscoAddOns({ ...discoAddOns, mimosaCooler: !!checked });
                  }}
                  disabled={dealHasAllPerks}
                  className="flex-shrink-0 mt-1"
                />
                <Label htmlFor="disco-addon-mimosa" className={cn("flex-1", dealHasAllPerks ? "cursor-not-allowed" : "cursor-pointer")}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">🍾 Mimosa Party Cooler</p>
                      <p className="text-xs text-muted-foreground">Extra cooler with ice, 3 fruit juices, champagne flutes, Chambong, 3 bubble wands</p>
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400">+${dealHasAllPerks ? 0 : 100}</span>
                  </div>
                  {dealHasAllPerks && (
                    <p className="text-xs text-primary font-semibold mt-1">Included with your deal</p>
                  )}
                </Label>
              </div>

              {/* Sparkle Package - Varies by party type */}
              {partyType === 'bachelorette_party' && (
                <div className={cn(
                  "flex items-start gap-3 p-3 border-2 rounded-lg",
                  dealHasAllPerks ? "border-primary/40 bg-primary/5" : "border-purple-300 dark:border-purple-700"
                )}>
                  <Checkbox 
                    id="disco-addon-sparkle" 
                    checked={dealHasAllPerks ? true : discoAddOns.sparklePackage}
                    onCheckedChange={(checked) => {
                      if (dealHasAllPerks) return;
                      setDiscoAddOns({ ...discoAddOns, sparklePackage: !!checked });
                    }}
                    disabled={dealHasAllPerks}
                    className="flex-shrink-0 mt-1"
                  />
                  <Label htmlFor="disco-addon-sparkle" className={cn("flex-1", dealHasAllPerks ? "cursor-not-allowed" : "cursor-pointer")}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">✨ Bride Sparkle Package</p>
                        <p className="text-xs text-muted-foreground">Disco ball cup for bride, bubble gun, disco bopper headband, personal unicorn float, SPF-50 spray (1 per 5 people), disco ball necklaces</p>
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">+${dealHasAllPerks ? 0 : 100}</span>
                    </div>
                    {dealHasAllPerks && (
                      <p className="text-xs text-primary font-semibold mt-1">Included with your deal</p>
                    )}
                  </Label>
                </div>
              )}
              
              {partyType === 'bachelor_party' && (
                <div className={cn(
                  "flex items-start gap-3 p-3 border-2 rounded-lg",
                  dealHasAllPerks ? "border-primary/40 bg-primary/5" : "border-purple-300 dark:border-purple-700"
                )}>
                  <Checkbox 
                    id="disco-addon-sparkle" 
                    checked={dealHasAllPerks ? true : discoAddOns.sparklePackage}
                    onCheckedChange={(checked) => {
                      if (dealHasAllPerks) return;
                      setDiscoAddOns({ ...discoAddOns, sparklePackage: !!checked });
                    }}
                    disabled={dealHasAllPerks}
                    className="flex-shrink-0 mt-1"
                  />
                  <Label htmlFor="disco-addon-sparkle" className={cn("flex-1", dealHasAllPerks ? "cursor-not-allowed" : "cursor-pointer")}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">🎉 Groom Manly Sparkle Package</p>
                        <p className="text-xs text-muted-foreground">Disco ball cup for groom, disco ball necklaces for crew, "Bad Day to Be a Beer" flag, SPF-50 spray (1 per 5 people), personal unicorn float</p>
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">+${dealHasAllPerks ? 0 : 100}</span>
                    </div>
                    {dealHasAllPerks && (
                      <p className="text-xs text-primary font-semibold mt-1">Included with your deal</p>
                    )}
                  </Label>
                </div>
              )}
              
              {partyType === 'combined_bach' && (
                <div className={cn(
                  "flex items-start gap-3 p-3 border-2 rounded-lg",
                  dealHasAllPerks ? "border-primary/40 bg-primary/5" : "border-purple-300 dark:border-purple-700"
                )}>
                  <Checkbox 
                    id="disco-addon-sparkle" 
                    checked={dealHasAllPerks ? true : discoAddOns.sparklePackage}
                    onCheckedChange={(checked) => {
                      if (dealHasAllPerks) return;
                      setDiscoAddOns({ ...discoAddOns, sparklePackage: !!checked });
                    }}
                    disabled={dealHasAllPerks}
                    className="flex-shrink-0 mt-1"
                  />
                  <Label htmlFor="disco-addon-sparkle" className={cn("flex-1", dealHasAllPerks ? "cursor-not-allowed" : "cursor-pointer")}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">💫 Sparkle Together Package</p>
                        <p className="text-xs text-muted-foreground">Disco ball cups for bride & groom, disco ball necklaces, "Bad Day to Be a Beer" flag, SPF-50 spray (1 per 5 people), personal floats for both, 2 bubble guns, disco bopper headband</p>
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">+${dealHasAllPerks ? 0 : 150}</span>
                    </div>
                    {dealHasAllPerks && (
                      <p className="text-xs text-primary font-semibold mt-1">Included with your deal</p>
                    )}
                  </Label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add-Ons Section - Only for Private Cruises */}
        {selectedPrivateOption && (guestRange || guestCount <= 14) && (
          <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t-2">
            <h4 className="font-bold text-xl sm:text-2xl md:text-3xl text-center">Private Cruise Add-Ons (Optional)</h4>
            
            {/* Packages - Radio buttons with descriptions */}
            <div className="space-y-3">
              <h5 className="font-semibold text-sm sm:text-base uppercase text-muted-foreground">Choose Your Package</h5>
              <RadioGroup
                value={selectedPrivatePackage}
                onValueChange={(val) => {
                  // If the deal includes the Ultimate package for free, keep it selected.
                  if (dealHasAllPerks) return;
                  setSelectedPrivatePackage(val as 'standard' | 'essentials' | 'ultimate');
                }}
                className="space-y-3"
              >
                {/* Standard Package */}
                <div className={cn(
                  "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                  dealHasAllPerks ? "opacity-50" : "hover:bg-accent/50"
                )}>
                  <RadioGroupItem value="standard" id="pkg-standard" className="flex-shrink-0 mt-1" disabled={dealHasAllPerks} />
                  <Label htmlFor="pkg-standard" className={cn("flex-1", dealHasAllPerks ? "cursor-not-allowed" : "cursor-pointer")}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Standard Private Cruise</span>
                      <span className="font-bold text-green-600">+$0</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Professional Captain, High-End BT Speaker System, Clean Restroom{getPackagePricing().essentials >= 200 ? 's' : ''}, Plenty of Sun & Shade, Coolers Provided, Bench Seating for {getPackagePricing().essentials <= 100 ? '14' : getPackagePricing().essentials <= 150 ? '20' : '30'}
                    </p>
                  </Label>
                </div>
                
                {/* Essentials Package */}
                <div className={cn(
                  "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                  dealHasAllPerks ? "opacity-50" : "hover:bg-accent/50"
                )}>
                  <RadioGroupItem value="essentials" id="pkg-essentials" className="flex-shrink-0 mt-1" disabled={dealHasAllPerks} />
                  <Label htmlFor="pkg-essentials" className={cn("flex-1", dealHasAllPerks ? "cursor-not-allowed" : "cursor-pointer")}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Add Essentials Package</span>
                      <span className="font-bold text-green-600">+${getPackagePricing().essentials}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getPackagePricing().essentials <= 100 
                        ? '3 bubble wands, 6-ft table, 2 large coolers, 40 lbs ice, 5-gallon water dispenser, 10 gallons water, 30 solo cups. All set up when you arrive!' 
                        : getPackagePricing().essentials <= 150 
                        ? '3 bubble wands, 6-ft table, 2 large coolers, 40 lbs ice, 5-gallon water dispenser, 10 gallons water, 30 solo cups. All set up when you arrive!' 
                        : '3 bubble wands, 2 six-foot tables, 3 five-foot coolers, 80 lbs ice, 5-gallon water dispenser, 25 gallons water, 100 solo cups. Ready when you arrive!'}
                    </p>
                  </Label>
                </div>
                
                {/* Ultimate Package */}
                <div className={cn(
                  "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                  dealHasAllPerks ? "border-primary bg-primary/10" : "hover:bg-accent/50"
                )}>
                  <RadioGroupItem value="ultimate" id="pkg-ultimate" className="flex-shrink-0 mt-1" />
                  <Label htmlFor="pkg-ultimate" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Add Ultimate Disco Party Package</span>
                        {dealHasAllPerks && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground font-semibold">Included</span>
                        )}
                      </div>
                      <span className="font-bold text-green-600">+${dealHasAllPerks ? 0 : getPackagePricing().ultimate}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getPackagePricing().ultimate <= 250 
                        ? 'Everything in Essentials plus: unicorn float, 3 disco balls, bubble gun, giant lily pad, 3 disco cups, 20 champagne flutes, 3 fruit juices, 2 bottles SPF 50 sunscreen' 
                        : getPackagePricing().ultimate <= 300 
                        ? 'Everything in Essentials plus: 2 unicorn floats, 3 disco balls, 2 bubble guns, 2 giant lily pads, 10 disco cups, 30 champagne flutes, 3 fruit juices, 4 bottles SPF 50 sunscreen' 
                        : 'Everything in Essentials plus: 3 unicorn floats, 15 disco balls, 2 bubble guns, 3 giant lily pads (6\' x 20\'), 10 disco cups, 50 champagne flutes, 3 giant 5-foot coolers, 6 bottles SPF 50 sunscreen'}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Professional Services */}
            <div className="space-y-3">
              <h5 className="font-semibold text-sm sm:text-base uppercase text-muted-foreground">Professional Services</h5>
              
              {/* DJ only when capacity allows (15+ guests) */}
              {((guestRange === '15-25' || guestRange === '26-30') || (!guestRange && guestCount > 14) || (guestRange === '31-50' || guestRange === '51-75')) && (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox 
                    id="addon-dj" 
                    checked={addOns.dj}
                    onCheckedChange={(checked) => setAddOns({...addOns, dj: !!checked})}
                    className="flex-shrink-0 mt-1"
                  />
                  <Label htmlFor="addon-dj" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Professional DJ</span>
                      <span className="font-bold text-green-600">+$600</span>
                    </div>
                  </Label>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox 
                  id="addon-photographer" 
                  checked={addOns.photographer}
                  onCheckedChange={(checked) => setAddOns({...addOns, photographer: !!checked})}
                  className="flex-shrink-0 mt-1"
                />
                <Label htmlFor="addon-photographer" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Professional Photographer</span>
                    <span className="font-bold text-green-600">+$600</span>
                  </div>
                </Label>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox 
                  id="addon-bartender" 
                  checked={addOns.bartender}
                  onCheckedChange={(checked) => setAddOns({...addOns, bartender: !!checked})}
                  className="flex-shrink-0 mt-1"
                />
                <Label htmlFor="addon-bartender" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Bartender Service</span>
                    <span className="font-bold text-green-600">+$600</span>
                  </div>
                </Label>
              </div>

              {/* Lily Pad - inline with quantity selector */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">Lily Pad (6'x20' Giant Float)</span>
                  <span className="text-xs text-muted-foreground ml-2">$50 each - Max 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddOns({...addOns, lilyPadCount: Math.max(0, addOns.lilyPadCount - 1)})}
                    disabled={addOns.lilyPadCount === 0}
                    className="no-print h-7 w-7 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-base font-bold w-6 text-center">{addOns.lilyPadCount}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddOns({...addOns, lilyPadCount: Math.min(3, addOns.lilyPadCount + 1)})}
                    disabled={addOns.lilyPadCount === 3}
                    className="no-print h-7 w-7 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="font-bold text-green-600 min-w-[60px] text-right">+${addOns.lilyPadCount * 50}</span>
              </div>
            </div>

            {/* Equipment & Extras - A/V Package only for corporate and wedding events */}
            {(partyType === 'corporate_event' || partyType === 'wedding_event') && (
              <div className="space-y-3">
                <h5 className="font-semibold text-sm sm:text-base uppercase text-muted-foreground">Equipment & Extras</h5>
                
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox 
                    id="addon-av" 
                    checked={addOns.avPackage}
                    onCheckedChange={(checked) => setAddOns({...addOns, avPackage: !!checked})}
                    className="flex-shrink-0 mt-1"
                  />
                  <Label htmlFor="addon-av" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">A/V Package</p>
                        <p className="text-xs text-muted-foreground">Projector, screen, setup, wireless mic</p>
                      </div>
                      <span className="font-bold text-green-600">+$300</span>
                    </div>
                  </Label>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedOptionId && (
          <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t-2">
            {/* Line item breakdown */}
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-bold text-2xl sm:text-3xl md:text-4xl text-center underline">Quote Summary</h4>
              
              {/* EOY Deal Selector (replaces the old 25% discount / full price toggle) */}
              <div className="border rounded-lg p-4 space-y-3 bg-accent/20 no-print">
                {/* Quote-specific deadline reminder */}
                <p className="text-center text-lg sm:text-xl font-bold underline text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded px-3 py-2">
                  🎉 Book in the next {getDaysUntilDeadline()} days for ${CURRENT_DEAL.discountAmount} off your entire booking!
                </p>

                {(() => {
                  const computeBasePrice = () => {
                    // Use the current selection to compute a "regular" subtotal (before EOY discount/freebies)
                    if (selectedPrivateOption) {
                      const crewFeePerHour = guestRange === '26-30' ? 50 : guestRange === '51-75' ? 100 : 0;
                      const additionalCrewFee = crewFeePerHour * selectedPrivateOption.duration;

                      const effectiveCount = guestRange === '15-25' || guestRange === '26-30' ? 25 :
                        guestRange === '31-50' || guestRange === '51-75' ? 50 :
                        guestCount;

                      let packageCost = 0;
                      if (selectedPrivatePackage === 'essentials') {
                        if (effectiveCount <= 14) packageCost = 100;
                        else if (effectiveCount <= 30) packageCost = 150;
                        else packageCost = 200;
                      } else if (selectedPrivatePackage === 'ultimate') {
                        if (effectiveCount <= 14) packageCost = 250;
                        else if (effectiveCount <= 30) packageCost = 300;
                        else packageCost = 350;
                      }

                      const canHaveDJ = effectiveCount > 14;
                      const djCost = canHaveDJ && addOns.dj ? 600 : 0;
                      const photographerCost = addOns.photographer ? 600 : 0;
                      const bartenderCost = addOns.bartender ? 600 : 0;
                      const avPackageCost = addOns.avPackage ? 300 : 0;
                      const lilyPadCost = addOns.lilyPadCount * 50;

                      return Math.round((selectedPrivateOption.basePrice + additionalCrewFee + packageCost + djCost + photographerCost + bartenderCost + avPackageCost + lilyPadCost) * 100) / 100;
                    }

                    if (selectedDiscoSlot || selectedDiscoOption) {
                      const slotDate = selectedDiscoSlot
                        ? new Date(selectedDiscoSlot.start_at)
                        : selectedDiscoOption!.date;
                      const slotTime = formatTimeCSTFull(selectedDiscoSlot ? selectedDiscoSlot.start_at : selectedDiscoOption!.date.toISOString());
                      const slotDay = format(slotDate, 'EEEE');

                      let pricePerPerson = 95;
                      if (slotDay === 'Friday' && slotTime.includes('12:00')) pricePerPerson = 95;
                      else if (slotDay === 'Saturday' && slotTime.includes('11:00')) pricePerPerson = 105;
                      else if (slotDay === 'Saturday' && slotTime.includes('3:30')) pricePerPerson = 85;
                      else if (slotDay === 'Sunday' && slotTime.includes('11:00')) pricePerPerson = 105;

                      const ticketSubtotal = pricePerPerson * discoTicketCount;
                      const mimosaCoolerCost = discoAddOns.mimosaCooler ? 100 : 0;

                      let sparklePackageCost = 0;
                      if (discoAddOns.sparklePackage) {
                        sparklePackageCost = partyType === 'combined_bach' ? 150 : 100;
                      }

                      return Math.round((ticketSubtotal + mimosaCoolerCost + sparklePackageCost) * 100) / 100;
                    }

                    return 0;
                  };

                  // Compute the ultimate package value for the "pay in full" deal
                  const computeUltimatePackageValue = () => {
                    if (selectedPrivateOption) {
                      // Ultimate package value varies by boat size
                      const effectiveCount = guestRange === '15-25' || guestRange === '26-30' ? 25 :
                        guestRange === '31-50' || guestRange === '51-75' ? 50 :
                        guestCount;

                      if (effectiveCount <= 14) return 250;
                      else if (effectiveCount <= 30) return 300;
                      else return 350;
                    }

                    if (selectedDiscoSlot || selectedDiscoOption) {
                      // For disco: sparkle package + mimosa cooler
                      const sparkleValue = partyType === 'combined_bach' ? 150 : 100;
                      const mimosaValue = 100;
                      return sparkleValue + mimosaValue;
                    }

                    return 300; // Default
                  };

                  // IMPORTANT: keep the comparison chart totals stable (no "jumping") when toggling the deal.
                  const computeFullDealBasePrice = () => {
                    const base = computeBasePrice();
                    const perkValue = computeUltimatePackageValue();

                    if (selectedPrivateOption) {
                      // Add the ultimate line-item only if it isn't already selected.
                      return base + (selectedPrivatePackage === 'ultimate' ? 0 : perkValue);
                    }

                    if (selectedDiscoSlot || selectedDiscoOption) {
                      const sparkleValue = partyType === 'combined_bach' ? 150 : 100;
                      const missingPerkValue = (discoAddOns.mimosaCooler ? 0 : 100) + (discoAddOns.sparklePackage ? 0 : sparkleValue);
                      return base + missingPerkValue;
                    }

                    return base;
                  };

                  const ultimatePackageValue = computeUltimatePackageValue();

                  return (
                    <EOYSaleDealsSelector
                      selectedDeal={selectedEOYDeal}
                      onDealChange={setSelectedEOYDeal}
                      isPrivateCruise={!!selectedPrivateOption}
                      basePrice={computeBasePrice()}
                      fullDealBasePrice={computeFullDealBasePrice()}
                      partyType={partyType}
                      ultimatePackageValue={ultimatePackageValue}
                    />
                  );
                })()}
              </div>
              
              {(selectedDiscoSlot || selectedDiscoOption) && (() => {
                // Get price based on time slot
                const slotDate = selectedDiscoSlot 
                  ? new Date(selectedDiscoSlot.start_at) 
                  : selectedDiscoOption!.date;
                const slotTime = formatTimeCSTFull(selectedDiscoSlot ? selectedDiscoSlot.start_at : selectedDiscoOption!.date.toISOString());
                const slotDay = format(slotDate, 'EEEE');
                
                let pricePerPerson = 95;
                if (slotDay === 'Friday' && slotTime.includes('12:00')) pricePerPerson = 95;
                else if (slotDay === 'Saturday' && slotTime.includes('11:00')) pricePerPerson = 105;
                else if (slotDay === 'Saturday' && slotTime.includes('3:30')) pricePerPerson = 85;
                else if (slotDay === 'Sunday' && slotTime.includes('11:00')) pricePerPerson = 105;
                
                const ticketSubtotal = pricePerPerson * discoTicketCount;
                
                // Track original values for free perk display
                const mimosaCoolerOriginalValue = 100;
                const sparklePackageOriginalValue = partyType === 'combined_bach' ? 150 : 100;
                
                // For Pay in Full deal: show perks as line items and then discount them
                // For 25% Deposit: only show the $150 discount
                const showPerksAsLineItems = dealHasAllPerks;

                // Calculate costs - if Pay in Full, show the perks even if user hasn't selected them
                let mimosaCoolerCost = 0;
                let sparklePackageCost = 0;
                let mimosaFreeValue = 0;
                let sparkleFreeValue = 0;

                if (showPerksAsLineItems) {
                  // Pay in Full: show perks as line items and then discount them
                  mimosaCoolerCost = mimosaCoolerOriginalValue;
                  sparklePackageCost = sparklePackageOriginalValue;
                  mimosaFreeValue = mimosaCoolerOriginalValue;
                  sparkleFreeValue = sparklePackageOriginalValue;
                } else {
                  // 25% Deposit: only show perks if user selected them, no free values
                  mimosaCoolerCost = discoAddOns.mimosaCooler ? mimosaCoolerOriginalValue : 0;
                  if (discoAddOns.sparklePackage) {
                    sparklePackageCost = partyType === 'combined_bach' ? 150 : 100;
                  }
                }

                const originalSubtotal = ticketSubtotal + mimosaCoolerCost + sparklePackageCost;

                // Apply Early Bird discount - flat $150 when no promo code AND user selected "Book within 10 days"
                const eoyDiscountAmount = (!promoCode && hasEarlyBirdDiscount) ? Math.min(150, originalSubtotal) : 0;

                // If a promo code is applied, use that instead (avoid stacking / double-discounts)
                const promoDiscountAmount = promoCode
                  ? Math.min(
                      typeof promoDiscount === 'number' && promoDiscount < 1
                        ? Math.round(originalSubtotal * promoDiscount * 100) / 100
                        : Math.round(promoDiscount * 100) / 100,
                      originalSubtotal
                    )
                  : 0;

                const discountAmount = promoCode ? promoDiscountAmount : eoyDiscountAmount;

                const subtotal = Math.round((originalSubtotal - discountAmount - mimosaFreeValue - sparkleFreeValue) * 100) / 100;
                const gratuity = Math.round(subtotal * 0.20 * 100) / 100; // 20% of discounted subtotal
                // Xola fee is calculated on subtotal + gratuity
                const xolaFee = Math.round((subtotal + gratuity) * 0.03 * 100) / 100;
                const salesTax = Math.round(subtotal * 0.0825 * 100) / 100;
                const total = Math.round((subtotal + xolaFee + gratuity + salesTax) * 100) / 100;
                
                const dayName = format(slotDate, "EEEE");
                const dateWithOrdinal = format(slotDate, "MMMM do, yyyy");
                const cruiseTitle = `ATX Disco Cruise Tickets - ${dayName} ${dateWithOrdinal}`;
                const timeRange = selectedDiscoSlot 
                  ? `${formatTimeCSTFull(selectedDiscoSlot.start_at)} - ${formatTimeCSTFull(selectedDiscoSlot.end_at)}`
                  : selectedDiscoOption!.timeRange;
                
                return (
                  <>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">{cruiseTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {timeRange}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {discoTicketCount} {discoTicketCount === 1 ? 'ticket' : 'tickets'} × ${pricePerPerson}
                        </p>
                      </div>
                      <p className="font-bold">${ticketSubtotal.toLocaleString()}</p>
                    </div>
                    
                    {/* Show Mimosa Cooler line item when it has a cost */}
                    {mimosaCoolerCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">Mimosa Party Cooler</p>
                        <p className="font-bold">${mimosaCoolerCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {/* Show Sparkle Package line item when it has a cost */}
                    {sparklePackageCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">
                          {partyType === 'bachelorette_party' ? 'Bride Sparkle Package' : 
                           partyType === 'bachelor_party' ? 'Groom Manly Sparkle Package' : 
                           'Sparkle Together Package'}
                        </p>
                        <p className="font-bold">${sparklePackageCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center py-2 text-green-600">
                        <p className="font-medium">{promoCode ? `${promoCode} Discount` : discountLabel}</p>
                        <p className="font-bold">-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    
                    {mimosaFreeValue > 0 && (
                      <div className="flex justify-between items-center py-2 text-green-600">
                        <p className="font-medium">Mimosa Cooler (FREE when booked within 10 days)</p>
                        <p className="font-bold">-${mimosaFreeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    
                    {sparkleFreeValue > 0 && (
                      <div className="flex justify-between items-center py-2 text-green-600">
                        <p className="font-medium">Sparkle Package (FREE when booked within 10 days)</p>
                        <p className="font-bold">-${sparkleFreeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center py-2">
                      <p className="text-sm">3% Booking Fee & 8.25% Sales Tax</p>
                      <p className="font-semibold">${(xolaFee + salesTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <p className="text-sm">20% Gratuity</p>
                      <p className="font-semibold">${gratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <p className="font-bold text-lg">Total</p>
                      <p className="font-bold text-lg">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </>
                );
              })()}
              
              {selectedPrivateOption && (() => {
                // Calculate add-ons cost with correct crew fees based on guest range
                const crewFeePerHour = guestRange === '26-30' ? 50 : guestRange === '51-75' ? 100 : 0;
                const additionalCrewFee = crewFeePerHour * selectedPrivateOption.duration;
                
                // Package costs vary by boat size/guest count using guest range
                const effectiveCount = guestRange === '15-25' || guestRange === '26-30' ? 25 : 
                                       guestRange === '31-50' || guestRange === '51-75' ? 50 : 
                                       guestCount;
                
                let packageCost = 0;
                if (selectedPrivatePackage === 'essentials') {
                  if (effectiveCount <= 14) packageCost = 100;
                  else if (effectiveCount <= 30) packageCost = 150;
                  else packageCost = 200;
                } else if (selectedPrivatePackage === 'ultimate') {
                  if (effectiveCount <= 14) packageCost = 250;
                  else if (effectiveCount <= 30) packageCost = 300;
                  else packageCost = 350;
                }
                const canHaveDJ = effectiveCount > 14;
                const djCost = canHaveDJ && addOns.dj ? 600 : 0;
                const photographerCost = addOns.photographer ? 600 : 0;
                const bartenderCost = addOns.bartender ? 600 : 0;
                const avPackageCost = addOns.avPackage ? 300 : 0;
                const lilyPadCost = addOns.lilyPadCount * 50;
                
                const subtotalBeforeAddOns = selectedPrivateOption.basePrice;
                
                // Calculate Ultimate package value for free perk display (when deal has all perks)
                let ultimatePackageValue = 0;
                if (effectiveCount <= 14) ultimatePackageValue = 250;
                else if (effectiveCount <= 30) ultimatePackageValue = 300;
                else ultimatePackageValue = 350;
                
                // When "Pay in Full" is selected (dealHasAllPerks), show the Ultimate Package as a line item
                // REGARDLESS of the user's current package selection - it's included FREE with the deal
                const showUltimateAsLineItem = dealHasAllPerks;
                // For display: if user already selected ultimate, we show it above, so the "free" discount cancels it
                // If user hasn't selected ultimate, we add it as a line item and then show it as FREE
                const ultimateLineItemCost = showUltimateAsLineItem && selectedPrivatePackage !== 'ultimate' ? ultimatePackageValue : 0;
                const ultimateFreeValue = showUltimateAsLineItem ? ultimatePackageValue : 0;
                
                const originalSubtotal = subtotalBeforeAddOns + additionalCrewFee + packageCost + ultimateLineItemCost + djCost + photographerCost + bartenderCost + avPackageCost + lilyPadCost;
                
                // Apply Early Bird discount - flat $150 when no promo code AND user selected "Book within 10 days"
                const eoyDiscountAmount = (!promoCode && hasEarlyBirdDiscount) ? Math.min(150, originalSubtotal) : 0;
                
                // Apply discount to subtotal (not gratuity)
                const discountAmount = promoCode 
                  ? (typeof promoDiscount === 'number' && promoDiscount < 1 
                    ? Math.round(originalSubtotal * promoDiscount * 100) / 100
                    : Math.round(promoDiscount * 100) / 100)
                  : eoyDiscountAmount;
                const subtotal = Math.round((originalSubtotal - discountAmount - ultimateFreeValue) * 100) / 100;
                
                const gratuity = Math.round(subtotal * 0.20 * 100) / 100; // 20% of discounted subtotal
                // Xola fee is calculated on subtotal + gratuity
                const xolaFee = Math.round((subtotal + gratuity) * 0.03 * 100) / 100;
                const salesTax = Math.round(subtotal * 0.0825 * 100) / 100; // Tax on discounted subtotal
                const total = Math.round((subtotal + xolaFee + gratuity + salesTax) * 100) / 100;
                
                return (
                  <>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">{Math.round(selectedPrivateOption.duration)}-Hour Private Cruise</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPrivateOption.dayName}, {format(selectedPrivateOption.date, "MMMM d")}, {selectedPrivateOption.timeRange}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          for {guestRange || guestCount} {guestRange ? 'people' : 'guests'}
                        </p>
                      </div>
                      <p className="font-bold">${subtotalBeforeAddOns.toLocaleString()}</p>
                    </div>
                    
                    {additionalCrewFee > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">Additional Crew ({guestRange} guests)</p>
                        <p className="font-bold">${additionalCrewFee.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {packageCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">
                          {selectedPrivatePackage === 'essentials' ? 'Essentials Package' : 'Ultimate Disco Party Package'}
                        </p>
                        <p className="font-bold">${packageCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {djCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">Professional DJ</p>
                        <p className="font-bold">${djCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {photographerCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">Professional Photographer</p>
                        <p className="font-bold">${photographerCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {bartenderCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">Bartender Service</p>
                        <p className="font-bold">${bartenderCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {avPackageCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">A/V Package</p>
                        <p className="font-bold">${avPackageCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {lilyPadCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">Lily Pad × {addOns.lilyPadCount}</p>
                        <p className="font-bold">${lilyPadCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {/* Show Ultimate Package as a line item when "Pay in Full" and user hasn't selected it */}
                    {ultimateLineItemCost > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <p className="font-medium">Ultimate Disco Party Package</p>
                        <p className="font-bold">${ultimateLineItemCost.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center py-2 text-green-600">
                        <p className="font-medium">{discountLabel}</p>
                        <p className="font-bold">-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    
                    {ultimateFreeValue > 0 && (
                      <div className="flex justify-between items-center py-2 text-green-600">
                        <p className="font-medium">Ultimate Package (FREE when booked within 10 days)</p>
                        <p className="font-bold">-${ultimateFreeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center py-2">
                      <p className="text-sm">3% Booking Fee & 8.25% Sales Tax</p>
                      <p className="font-semibold">${(xolaFee + salesTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <p className="text-sm">20% Gratuity</p>
                      <p className="font-semibold">${gratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <p className="font-bold text-lg">Total</p>
                      <p className="font-bold text-lg">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* Urgent Book Now CTA */}
        <div className="text-center pt-6 pb-4 no-print">
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg md:text-2xl font-bold text-foreground leading-tight">
              Ready to lock in your ${CURRENT_DEAL.discountAmount} discount?
            </p>
            <div className="flex items-center gap-2">
              <p className="text-lg md:text-2xl font-bold text-foreground leading-tight">
                (Enter Code: {CURRENT_DEAL.promoCode})
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(CURRENT_DEAL.promoCode);
                  toast({
                    title: "Promo code copied!",
                    description: `${CURRENT_DEAL.promoCode} has been copied to your clipboard.`,
                  });
                }}
                className="h-8 px-3"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
      </div> {/* End quote-printable-area */}
    </div>
  );
};
