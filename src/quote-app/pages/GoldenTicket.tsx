import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Input } from "@/quote-app/components/ui/input";
import { useToast } from "@/quote-app/hooks/use-toast";
import { calculatePricing } from "@/quote-app/lib/pricing";
import { Ship, Sparkles, Gift, Calendar, Star, CheckCircle, Clock, Package, Ticket, Tag, Truck } from "lucide-react";
import { SEOHead } from "@/quote-app/components/SEOHead";
import ppcLogo from "@/quote-app/assets/ppc-logo-round.png";

// Declare Xola checkout script
declare global {
  interface Window {
    XolaCheckout?: any;
  }
}

type BoatCapacity = "1-14" | "15-30" | "31-75";
type DayOfWeek = "mon-thu" | "fri" | "sat" | "sun";
type DiscoPackage = "basic" | "disco-queen" | "super-sparkle";
type GuestRange = "15-25" | "26-30" | "31-50" | "51-75";

const GoldenTicket = () => {
  const [cruiseType, setCruiseType] = useState<"private" | "disco">("private");
  const [selectedCapacity, setSelectedCapacity] = useState<BoatCapacity>("1-14");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [discoPackage, setDiscoPackage] = useState<DiscoPackage | null>(null);
  const [discoTickets, setDiscoTickets] = useState(1);
  const [guestRange, setGuestRange] = useState<GuestRange | null>(null);
  const [discountType, setDiscountType] = useState<"200" | "300" | "code" | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const { toast } = useToast();
  const isEmbeddedPage = typeof window !== 'undefined' && window.parent !== window;
  
  // Load Xola checkout script and pre-bind hidden triggers
  useEffect(() => {
    const seller = '64c43a70daa3e618b7229ddf';
    const experienceIds = [
      '64c7d0012c2afc7d8d70e285',
      '64c7d2b74e1de53cee29395e',
      '64c7d4f01be574411500cf62',
      '676fe4a7ff119f53c4063c1b',
      '676f0bc68ff6dfb29009b5ad',
      '676f0ceaa3744b05ae09e9de',
    ];

    const ensureTriggers = () => {
      experienceIds.forEach((id) => {
        if (!document.querySelector(`.xola-checkout[data-experience="${id}"]`)) {
          const el = document.createElement('div');
          el.style.display = 'none';
          el.className = 'xola-checkout';
          el.setAttribute('data-seller', seller);
          el.setAttribute('data-version', '2');
          el.setAttribute('data-experience', id);
          document.body.appendChild(el);
        }
      });
    };

    let script = document.querySelector('script[data-xola="true"]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://xola.com/checkout.js';
      script.setAttribute('data-xola', 'true');
      script.onload = () => {
        ensureTriggers();
        try {
          window.XolaCheckout?.init?.();
        } catch {}
      };
      document.body.appendChild(script);
    } else {
      ensureTriggers();
      try {
        window.XolaCheckout?.init?.();
      } catch {}
    }

    return () => {
      // Clean up only our hidden triggers
      experienceIds.forEach((id) => {
        const el = document.querySelector(`.xola-checkout[data-experience="${id}"]`);
        el?.parentElement?.removeChild(el as Element);
      });
    };
  }, []);

  // Send height updates to parent window for iframe embedding
  useEffect(() => {
    let lastHeight = 0;
    let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

    const isEmbedded = window.parent !== window;

    const measureHeight = () => {
      const root = document.getElementById('golden-ticket-root');
      if (root) {
        return Math.max(root.scrollHeight, root.clientHeight, root.offsetHeight);
      }
      return Math.max(
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
        document.body.scrollHeight,
        document.body.offsetHeight
      );
    };

    const sendHeight = (force = false) => {
      if (!isEmbedded) return;
      const height = measureHeight();
      // Only send when meaningfully different to avoid "creeping" adjustments
      if (force || Math.abs(height - lastHeight) > 16) { // ~1rem threshold
        lastHeight = height;
        window.parent.postMessage({ type: 'golden-ticket-resize', height }, '*');
      }
    };

    const debouncedSendHeight = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => sendHeight(false), 120);
    };

    // Observe size and DOM changes
    const rootEl = document.getElementById('golden-ticket-root') || document.body;
    const resizeObserver = new ResizeObserver(debouncedSendHeight);
    resizeObserver.observe(rootEl);

    const mutationObserver = new MutationObserver(debouncedSendHeight);
    mutationObserver.observe(rootEl, { childList: true, subtree: true, attributes: true, characterData: true });

    // Listen to window-level changes
    window.addEventListener('resize', debouncedSendHeight);
    window.addEventListener('orientationchange', debouncedSendHeight);

    // Initial height (next frame + delayed + on load to catch fonts/images)
    const rafId = requestAnimationFrame(() => sendHeight(true));
    const initialTimeout = setTimeout(() => sendHeight(true), 350);
    const onLoad = () => sendHeight(true);
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('resize', debouncedSendHeight);
      window.removeEventListener('orientationchange', debouncedSendHeight);
      window.removeEventListener('load', onLoad);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      clearTimeout(initialTimeout);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [cruiseType, selectedCapacity, selectedDay, selectedPackage, discoPackage, discoTickets, guestRange, discountType]);

  const getGuestCountFromCapacity = (capacity: BoatCapacity): number => {
    switch (capacity) {
      case "1-14": return 10;
      case "15-30": return 20;
      case "31-75": return 50;
    }
  };

  const getDayOfWeekNumber = (day: DayOfWeek): number => {
    switch (day) {
      case "mon-thu": return 1; // Monday
      case "fri": return 5;
      case "sat": return 6;
      case "sun": return 0;
    }
  };

  const getExtraCrewCharge = (): number => {
    if (selectedCapacity === "15-30" && guestRange === "26-30") {
      return 50 * 4; // $50/hr for 4 hours
    }
    if (selectedCapacity === "31-75" && guestRange === "51-75") {
      return 100 * 4; // $100/hr for 4 hours
    }
    return 0;
  };

  const calculatePrivatePricing = (capacity: BoatCapacity, day: DayOfWeek) => {
    const guestCount = getGuestCountFromCapacity(capacity);
    const dayOfWeek = getDayOfWeekNumber(day);
    const date = new Date();
    date.setDate(date.getDate() + ((dayOfWeek - date.getDay() + 7) % 7));
    
    const pricing = calculatePricing({
      date,
      guestCount,
      duration: 4,
      boatCapacity: guestCount
    });

    return pricing;
  };

  const getBoatName = (capacity: BoatCapacity): string => {
    switch (capacity) {
      case "1-14": return "Day Tripper";
      case "15-30": return "Meeseeks / The Irony";
      case "31-75": return "Clever Girl";
    }
  };

  const getPackagePrice = (capacity: BoatCapacity, packageType: string): number => {
    const guestCount = getGuestCountFromCapacity(capacity);
    if (guestCount <= 14) {
      return packageType === "essentials" ? 100 : 250;
    } else if (guestCount <= 30) {
      return packageType === "essentials" ? 150 : 300;
    } else {
      return packageType === "essentials" ? 200 : 350;
    }
  };

  const getDiscoPackagePrice = (pkg: DiscoPackage): number => {
    switch (pkg) {
      case "basic": return 85;
      case "disco-queen": return 95;
      case "super-sparkle": return 105;
    }
  };

  const renderPricingRow = (day: DayOfWeek, label: string) => {
    const pricing = calculatePrivatePricing(selectedCapacity, day);
    const isSelected = selectedDay === day;
    
    return (
      <div 
        key={day}
        className={`p-3 md:p-4 rounded-lg cursor-pointer transition-all border-2 ${
          isSelected 
            ? "bg-[#3b82f6] text-white border-[#1e3a8a] shadow-lg" 
            : "bg-white border-[#F4C430] hover:bg-[#FEF3C7]"
        }`}
        onClick={() => {
          setSelectedDay(day);
          setSelectedPackage(null);
        }}
      >
        <div className="font-semibold mb-2 text-center text-sm md:text-base">{label}</div>
        <div className="space-y-1 text-xs md:text-sm">
          <div className="flex justify-between">
            <span>Hourly Rate:</span>
            <span className="font-medium">${pricing.hourlyRate}/hr</span>
          </div>
          <div className="flex justify-between">
            <span>4-Hour Subtotal:</span>
            <span className="font-medium">${pricing.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span>Total (w/ tax & tip):</span>
            <span className="font-bold">${pricing.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    );
  };

  const getDiscountAmount = (subtotalBeforeDiscount: number): number => {
    // Minimum $700 subtotal required for discount
    if (subtotalBeforeDiscount < 700) return 0;
    
    if (discountType === "300") return 300;
    if (discountType === "200") return 200;
    if (discountType === "code" && discountCode) {
      // Placeholder for discount code validation logic
      return 0;
    }
    return 0;
  };

  const getSubtotal = (): number => {
    if (cruiseType === "disco") {
      if (!discoPackage) return 0;
      return getDiscoPackagePrice(discoPackage) * discoTickets;
    } else {
      if (!selectedDay) return 0;
      const pricing = calculatePrivatePricing(selectedCapacity, selectedDay);
      const extraCrewCharge = getExtraCrewCharge();
      let subtotal = pricing.subtotal + extraCrewCharge;
      if (selectedPackage) {
        subtotal += getPackagePrice(selectedCapacity, selectedPackage);
      }
      return subtotal;
    }
  };

  const calculateBookingSummary = () => {
    if (cruiseType === "disco") {
      if (!discoPackage) return null;
      
      const basePrice = getDiscoPackagePrice(discoPackage) * discoTickets;
      const discount = getDiscountAmount(basePrice);
      const discountedSubtotal = Math.max(0, basePrice - discount);
      const gratuity = discountedSubtotal * 0.20;
      // Xola fee is calculated on subtotal + gratuity
      const xolaFee = (discountedSubtotal + gratuity) * 0.03;
      const tax = discountedSubtotal * 0.0825;
      const total = discountedSubtotal + xolaFee + gratuity + tax;
      
      return {
        subtotal: basePrice,
        xolaFee,
        gratuity,
        tax,
        discount,
        total
      };
    } else {
      if (!selectedDay) return null;
      
      const pricing = calculatePrivatePricing(selectedCapacity, selectedDay);
      const extraCrewCharge = getExtraCrewCharge();
      let subtotal = pricing.subtotal + extraCrewCharge;
      
      if (selectedPackage) {
        const packagePrice = getPackagePrice(selectedCapacity, selectedPackage);
        subtotal += packagePrice;
      }
      
      const discount = getDiscountAmount(subtotal);
      const discountedSubtotal = Math.max(0, subtotal - discount);
      const gratuity = discountedSubtotal * 0.20;
      // Xola fee is calculated on subtotal + gratuity
      const xolaFee = (discountedSubtotal + gratuity) * 0.03;
      const tax = discountedSubtotal * 0.0825;
      const total = discountedSubtotal + xolaFee + tax + gratuity;
      
      return {
        subtotal: pricing.subtotal,
        additionalCrew: pricing.additionalCrewFee,
        extraCrew: extraCrewCharge,
        xolaFee,
        tax,
        gratuity,
        packagePrice: selectedPackage ? getPackagePrice(selectedCapacity, selectedPackage) : 0,
        discount,
        total
      };
    }
  };

  const summary = calculateBookingSummary();

  const canBook = () => {
    if (cruiseType === 'private') {
      return selectedCapacity !== null;
    } else {
      return discoPackage !== null;
    }
  };

  const openXolaBooking = () => {
    const seller = '64c43a70daa3e618b7229ddf';
    let experienceId = '';

    if (cruiseType === 'private') {
      if (selectedCapacity === '1-14') {
        experienceId = '64c7d0012c2afc7d8d70e285'; // 14-person private cruise
      } else if (selectedCapacity === '15-30') {
        experienceId = '64c7d2b74e1de53cee29395e'; // 25-person private cruise
      } else if (selectedCapacity === '31-75') {
        experienceId = '64c7d4f01be574411500cf62'; // 50-person private cruise
      }
    } else {
      if (discoPackage === 'basic') {
        experienceId = '676fe4a7ff119f53c4063c1b'; // Basic Bach Disco Cruise
      } else if (discoPackage === 'disco-queen') {
        experienceId = '676f0bc68ff6dfb29009b5ad'; // Disco Queen Disco Cruise
      } else if (discoPackage === 'super-sparkle') {
        experienceId = '676f0ceaa3744b05ae09e9de'; // Super Sparkle Platinum Disco Cruise
      }
    }

    if (!experienceId) {
      console.error('No experience ID found');
      return;
    }

    const openExternalUrl = () => {
      const url = `https://checkout.xola.app/#seller/${seller}/experiences/${experienceId}?openExternal=true`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    // If this page is embedded in an iframe, prefer opening a new tab for reliability
    if (window.parent !== window) {
      openExternalUrl();
      return;
    }

    // Use pre-bound hidden triggers for standalone page
    const trigger = document.querySelector(`.xola-checkout[data-experience="${experienceId}"]`) as HTMLElement | null;

    const clickTrigger = () => {
      if (trigger) {
        trigger.click();
      } else {
        // Fallback: create, init, and click
        const el = document.createElement('div');
        el.style.display = 'none';
        el.className = 'xola-checkout';
        el.setAttribute('data-seller', seller);
        el.setAttribute('data-version', '2');
        el.setAttribute('data-experience', experienceId);
        document.body.appendChild(el);
        try { window.XolaCheckout?.init?.(); } catch {}
        el.click();
      }
    };

    if (window.XolaCheckout && typeof window.XolaCheckout.init === 'function') {
      try { window.XolaCheckout.init(); } catch {}
      clickTrigger();
      return;
    }

    // Not ready yet – retry briefly, then notify
    let attempts = 0;
    const maxAttempts = 40; // ~2s
    const interval = setInterval(() => {
      if (window.XolaCheckout && typeof window.XolaCheckout.init === 'function') {
        clearInterval(interval);
        try { window.XolaCheckout.init(); } catch {}
        clickTrigger();
      } else if (++attempts >= maxAttempts) {
        clearInterval(interval);
        toast?.({
          title: 'Booking widget is still loading',
          description: 'Please try again in a moment.',
        });
      }
    }, 50);
  };

  return (
    <>
      <SEOHead 
        title="Golden Ticket Offer - $800+ in Savings | Premier Party Cruises"
        description="Exclusive Golden Ticket offer with over $800 in discounts plus $100 per referral. Book your Lake Travis cruise at the best price ever."
        image="/og-images/golden-ticket.png"
        url="/golden-ticket"
      />
    <div id="golden-ticket-root" className={`${isEmbeddedPage ? '' : 'min-h-screen'} bg-background`}>
      {/* Golden Ticket Header */}
      <div className="bg-[#F4C430] py-8 md:py-12 px-0 md:px-4 shadow-lg">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-4 md:mb-6 flex flex-col items-center">
            <img src={ppcLogo.src} alt="Premier Party Cruises" className="h-[100px] mb-4" />
            <h1 className="text-xl md:text-4xl lg:text-5xl font-bold text-[#6B3410] mb-2 md:mb-4 text-center w-[90%] md:w-full animate-fade-in">
              Golden Ticket FINAL Offer - Over $800 in Discounts & $100 per Referral!
            </h1>
            <p className="text-sm md:text-2xl font-semibold text-[#6B3410] mb-6 md:mb-8 text-center">
              Scroll Down to Calculate Price w/Discount!
            </p>
            
            {/* Two-tier booking deadline advantages */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Book by 10/24 */}
              <div className="bg-white border-2 border-[#22c55e] rounded-none md:rounded-lg p-4 md:p-6 shadow-md w-full mx-0 md:mx-auto flex flex-col animate-fade-in [animation-delay:200ms]">
                  <div className="text-center mb-4">
                  <div className="bg-[#22c55e] text-white py-2 px-4 rounded-lg inline-flex items-center gap-2 font-bold text-lg md:text-xl mb-2 animate-fade-in [animation-delay:400ms]">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                    Book by Friday 10/24
                  </div>
                  <div className="text-lg font-mono bg-gray-100 px-3 py-2 rounded mt-2 animate-fade-in [animation-delay:500ms]">
                    Enter code: <span className="font-bold text-[#22c55e]">GOLDENTICKET300</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs md:text-sm text-gray-900">
                  <div className="flex justify-between items-center py-2 border-b border-gray-300 animate-fade-in [animation-delay:600ms]">
                    <span className="font-bold text-base md:text-lg">Premier Cruise Voucher</span>
                    <span className="font-bold text-[#22c55e] text-base md:text-lg">$300</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">25% Fetii Discount</span>
                    <span className="font-bold text-[#22c55e]">$100+</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Winery/Brewery Tour Voucher</span>
                    <span className="font-bold text-[#22c55e]">$100</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Private Transportation Voucher</span>
                    <span className="font-bold text-[#22c55e]">$100</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Welcome to ATX Mimosa Delivery</span>
                    <span className="font-bold text-[#22c55e]">$100</span>
                  </div>
                  <div className="py-1 border-b">
                    <span className="font-medium text-xs">3 bottles of champagne, OJ, champagne flutes, disco ball necklace delivered to Airbnb upon arrival</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Personalized Bach Wknd Itinerary</span>
                    <span className="font-bold text-[#22c55e]">$100</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b-2 border-[#22c55e] bg-green-50 animate-fade-in [animation-delay:700ms]">
                    <span className="font-bold text-sm md:text-base">TOTAL VALUE:</span>
                    <span className="font-bold text-[#22c55e] text-sm md:text-base">$800+</span>
                  </div>
                  <div className="py-1 flex items-center justify-center gap-2 font-bold text-[#22c55e]">
                    <Sparkles className="w-4 h-4" />
                    <span>Plus Disco Ball Cups for Whole Group!</span>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="py-1 flex items-center justify-center gap-2 font-bold text-[#22c55e]">
                    <Sparkles className="w-4 h-4" />
                    <span>Choose Priority Reserved Seating on the ATX Disco Cruise</span>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="mt-auto pt-3 border-t text-center">
                    <p className="text-[0.5rem] md:text-xs text-black">* Minimum $700 subtotal, vouchers redeemable starting 11/15 *</p>
                  </div>
                </div>
              </div>

              {/* Book by 10/31 */}
              <div className="bg-white border-2 border-[#3b82f6] rounded-none md:rounded-lg p-4 md:p-6 shadow-md w-full mx-0 md:mx-auto flex flex-col animate-fade-in [animation-delay:200ms]">
                  <div className="text-center mb-4">
                  <div className="bg-[#3b82f6] text-white py-2 px-4 rounded-lg inline-flex items-center gap-2 font-bold text-lg md:text-xl mb-2 animate-fade-in [animation-delay:400ms]">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                    Book by Friday 10/31
                  </div>
                  <div className="text-lg font-mono bg-gray-100 px-3 py-2 rounded mt-2 animate-fade-in [animation-delay:500ms]">
                    Enter code: <span className="font-bold text-[#3b82f6]">GOLDENTICKET200</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs md:text-sm text-gray-900">
                  <div className="flex justify-between items-center py-2 border-b border-gray-300 animate-fade-in [animation-delay:600ms]">
                    <span className="font-bold text-base md:text-lg">Premier Cruise Voucher</span>
                    <span className="font-bold text-[#3b82f6] text-base md:text-lg">$200</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">25% Fetii Discount</span>
                    <span className="font-bold text-[#3b82f6]">$100+</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Winery/Brewery Tour Voucher</span>
                    <span className="font-bold text-[#3b82f6]">$100</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Private Transportation Voucher</span>
                    <span className="font-bold text-[#3b82f6]">$100</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Welcome to ATX Mimosa Delivery</span>
                    <span className="font-bold text-[#3b82f6]">$100</span>
                  </div>
                  <div className="py-1 border-b">
                    <span className="font-medium text-xs">3 bottles of champagne, OJ, champagne flutes, disco ball necklace delivered to Airbnb upon arrival</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="font-medium">Personalized Bach Wknd Itinerary</span>
                    <span className="font-bold text-[#3b82f6]">$100</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b-2 border-[#3b82f6] bg-blue-50 animate-fade-in [animation-delay:700ms]">
                    <span className="font-bold text-sm md:text-base">TOTAL VALUE:</span>
                    <span className="font-bold text-[#3b82f6] text-sm md:text-base">$700+</span>
                  </div>
                  <div className="mt-auto pt-3 border-t text-center">
                    <p className="text-[0.5rem] md:text-xs text-black">* Minimum $700 subtotal, vouchers redeemable starting 11/15 *</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Pricing Chart */}
      <div className="py-4 md:py-8">
        <div className="container mx-auto max-w-6xl px-0 md:px-4">
          <Card className="shadow-lg border-4 md:border-4 border-[#F4C430] bg-white rounded-none md:rounded-lg">
            <CardContent className="p-4 md:p-6">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-black">Choose Your Booking to See Price w/$300 & $200 Discount!</h2>
                <p className="text-sm md:text-base text-[#6B3410]">Select your cruise type, boat capacity, and day to see pricing</p>
              </div>
              <Tabs value={cruiseType} onValueChange={(v) => setCruiseType(v as "private" | "disco")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-8 bg-[#60a5fa] p-0 h-12 md:h-14">
              <TabsTrigger 
                value="private" 
                className="flex items-center justify-center gap-1 text-sm sm:text-lg px-2 sm:px-4 h-full rounded-md data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white data-[state=inactive]:hover:bg-[#3b82f6]"
              >
                <Ship className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Private Cruise</span>
                <span className="sm:hidden">Private</span>
              </TabsTrigger>
              <TabsTrigger 
                value="disco" 
                className="flex items-center justify-center gap-1 text-sm sm:text-lg px-2 sm:px-4 h-full rounded-md data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white data-[state=inactive]:hover:bg-[#3b82f6]"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Disco Cruise</span>
                <span className="sm:hidden">Disco</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="private" className="space-y-6">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">Select Boat Capacity</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <Tabs value={selectedCapacity} onValueChange={(v) => {
                    setSelectedCapacity(v as BoatCapacity);
                    setSelectedDay(null);
                    setSelectedPackage(null);
                    setGuestRange(null);
                  }}>
                    <TabsList className="grid w-full grid-cols-3 bg-[#60a5fa] p-0 h-10 md:h-12">
                      <TabsTrigger value="1-14" className="text-xs sm:text-sm h-full rounded-md data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white">1-14</TabsTrigger>
                      <TabsTrigger value="15-30" className="text-xs sm:text-sm h-full rounded-md data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white">15-30</TabsTrigger>
                      <TabsTrigger value="31-75" className="text-xs sm:text-sm h-full rounded-md data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white">31-75</TabsTrigger>
                    </TabsList>

                    <TabsContent value={selectedCapacity} className="mt-4 md:mt-6">
                      <div className="mb-4 p-3 md:p-4 bg-[#FEF3C7] border-2 border-[#F4C430] rounded-lg">
                        <p className="font-semibold text-sm md:text-base text-[#1e3a8a]">Selected Boat: {getBoatName(selectedCapacity)}</p>
                        <p className="text-xs md:text-sm text-[#6B3410] mt-1">Click on a day below to select</p>
                      </div>

                      {(selectedCapacity === "15-30" || selectedCapacity === "31-75") && (
                        <div className="mb-4 p-3 bg-[#60a5fa]/20 rounded-lg">
                          <p className="text-sm font-medium mb-2">Select guest count:</p>
                          <RadioGroup 
                            value={guestRange || ""} 
                            onValueChange={(v) => setGuestRange(v as GuestRange)}
                            className="flex gap-4"
                          >
                            {selectedCapacity === "15-30" ? (
                              <>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="15-25" id="15-25" />
                                  <Label htmlFor="15-25" className="text-sm cursor-pointer">15-25</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="26-30" id="26-30" />
                                  <Label htmlFor="26-30" className="text-sm cursor-pointer">26-30 (+$50/hr crew)</Label>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="31-50" id="31-50" />
                                  <Label htmlFor="31-50" className="text-sm cursor-pointer">31-50</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="51-75" id="51-75" />
                                  <Label htmlFor="51-75" className="text-sm cursor-pointer">51-75 (+$100/hr crew)</Label>
                                </div>
                              </>
                            )}
                          </RadioGroup>
                        </div>
                      )}

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                        {renderPricingRow("mon-thu", "Monday - Thursday")}
                        {renderPricingRow("fri", "Friday")}
                        {renderPricingRow("sat", "Saturday")}
                        {renderPricingRow("sun", "Sunday")}
                      </div>

                      {selectedDay && (
                        <div className="mt-4 md:mt-6">
                          <Tabs value={selectedPackage || "standard"} onValueChange={(v) => setSelectedPackage(v === "standard" ? null : v)}>
                            <TabsList className="grid w-full grid-cols-3 bg-[#60a5fa] p-0 h-auto md:h-12">
                              <TabsTrigger value="standard" className="text-[10px] sm:text-xs md:text-sm h-full rounded-md py-2 data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white whitespace-normal">Standard 4-Hour</TabsTrigger>
                              <TabsTrigger value="essentials" className="text-[10px] sm:text-xs md:text-sm h-full rounded-md py-2 data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white whitespace-normal">Essentials +${getPackagePrice(selectedCapacity, "essentials")}</TabsTrigger>
                              <TabsTrigger value="ultimate" className="text-[10px] sm:text-xs md:text-sm h-full rounded-md py-2 data-[state=active]:bg-[#F4C430] data-[state=active]:text-black data-[state=inactive]:text-white whitespace-normal">Ultimate +${getPackagePrice(selectedCapacity, "ultimate")}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="standard" className="mt-3 md:mt-4">
                              <Card className="border-2 border-[#F4C430] bg-white">
                                <CardContent className="p-3 md:p-4">
                                  <h4 className="font-bold text-base md:text-lg mb-2 md:mb-3 text-center text-[#1e3a8a]">Standard 4-Hour Cruise</h4>
                                  <ul className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
                                    <li>• Amazing, experienced captain</li>
                                    <li>• {selectedCapacity === "1-14" ? "2 large empty coolers" : selectedCapacity === "15-30" ? "2 large empty coolers" : "4 giant empty coolers"}</li>
                                    <li>• Premium bluetooth speaker system</li>
                                    <li>• {selectedCapacity === "31-75" ? "2 clean restrooms" : "Clean restroom"}</li>
                                    <li>• Seating for {selectedCapacity === "1-14" ? "14" : selectedCapacity === "15-30" ? "20" : "30"}</li>
                                    <li>• Plenty of sun & shade</li>
                                  </ul>
                                </CardContent>
                              </Card>
                            </TabsContent>

                            <TabsContent value="essentials" className="mt-3 md:mt-4">
                              <Card className="border-2 border-[#F4C430] bg-white">
                                <CardContent className="p-3 md:p-4">
                                  <h4 className="font-bold text-base md:text-lg mb-2 md:mb-3 text-center text-[#1e3a8a]">4-Hour Cruise w/Essentials Package</h4>
                                  <p className="text-xs md:text-sm font-semibold mb-2">Everything with standard cruise:</p>
                                  <ul className="space-y-1 md:space-y-1.5 text-xs md:text-sm mb-3">
                                    <li>• Insulated 5-gallon dispenser w/ice water</li>
                                    <li>• {selectedCapacity === "1-14" ? "15 gallons of water & 30 solo cups" : selectedCapacity === "15-30" ? "20 gallons of water & 50 solo cups" : "25 gallons of water & 100 solo cups"}</li>
                                    <li>• Coolers stocked with {selectedCapacity === "1-14" ? "40lbs" : selectedCapacity === "15-30" ? "60lbs" : "80lbs"} of ice</li>
                                    <li>• {selectedCapacity === "31-75" ? "(2) 6-ft folding tables" : "6-ft folding table"}</li>
                                  </ul>
                                </CardContent>
                              </Card>
                            </TabsContent>

                            <TabsContent value="ultimate" className="mt-3 md:mt-4">
                              <Card className="border-2 border-[#F4C430] bg-white">
                                <CardContent className="p-3 md:p-4">
                                  <h4 className="font-bold text-base md:text-lg mb-2 md:mb-3 text-center text-[#1e3a8a]">Ultimate Disco Party Cruise Package</h4>
                                  <p className="text-xs md:text-sm font-semibold mb-2">Everything with essentials package:</p>
                                  <ul className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
                                    <li>• {selectedCapacity === "1-14" ? "6x20' giant lily pad float" : selectedCapacity === "15-30" ? "(2) 6x20' giant lily pad floats" : "(3) 6x20' giant lily pad floats"}</li>
                                    <li>• {selectedCapacity === "1-14" ? "Unicorn or ring float for the bride" : selectedCapacity === "15-30" ? "(2) unicorn or ring floats for the bride" : "(3) unicorn or ring floats for the bride"}</li>
                                    <li>• {selectedCapacity === "1-14" ? "5 disco ball cups, 30 solo cups" : selectedCapacity === "15-30" ? "10 disco ball cups" : "15 disco ball cups"}</li>
                                    <li>• {selectedCapacity === "1-14" ? "Bubble gun & 3 bubble wands" : selectedCapacity === "15-30" ? "(2) bubble guns & 3 bubble wands" : "(3) bubble guns & 5 bubble wands"}</li>
                                    <li>• {selectedCapacity === "1-14" ? "20 champagne flutes & 3 fruit juices" : selectedCapacity === "15-30" ? "30 champagne flutes & 3 fruit juices" : "50 champagne flutes & 3 fruit juices"}</li>
                                    <li>• {selectedCapacity === "1-14" ? "2 bottles" : selectedCapacity === "15-30" ? "4 bottles" : "6 bottles"} of SPF-50 spray sunscreen</li>
                                    <li>• {selectedCapacity === "1-14" ? "20 plates" : selectedCapacity === "15-30" ? "30 plates" : "50 plates"}, plasticware, & paper towels</li>
                                    <li>• {selectedCapacity === "1-14" ? "3 disco balls" : "3 disco balls"} installed</li>
                                  </ul>
                                </CardContent>
                              </Card>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disco" className="space-y-4 md:space-y-6">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">Disco Cruise Packages</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">Available Friday & Saturday, March - October on Clever Girl</p>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 mb-4 md:mb-6">
                    <Card 
                      className={`cursor-pointer transition-all border-2 ${
                        discoPackage === "basic" 
                          ? "border-[#3b82f6] bg-[#FEF3C7] shadow-lg" 
                          : "border-[#F4C430] hover:bg-[#FEF3C7]"
                      }`}
                      onClick={() => setDiscoPackage("basic")}
                    >
                      <CardContent className="p-3 md:p-4">
                        <h4 className="font-semibold text-sm md:text-base mb-2">Basic Bach Package</h4>
                        <p className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">$85</p>
                        <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">per person</p>
                        <ul className="text-[10px] md:text-xs text-muted-foreground space-y-0.5 md:space-y-1">
                          <li>• GIANT 25-ft Inflatable Unicorn Float</li>
                          <li>• Incredible DJ Spinnin' All Day</li>
                          <li>• Pro Photographer & Free Photos!</li>
                          <li>• 3 Giant Lily Pad Floats</li>
                          <li>• Cups, Koozies, Bubbles, Name Tags</li>
                          <li>• Shared Community Coolers w/Ice</li>
                          <li>• BYOB & Carry Drinks to Boat</li>
                          <li>• ALWAYS Cheaper than Private Cruise</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all border-2 ${
                        discoPackage === "disco-queen" 
                          ? "border-[#3b82f6] bg-[#FEF3C7] shadow-lg" 
                          : "border-[#F4C430] hover:bg-[#FEF3C7]"
                      }`}
                      onClick={() => setDiscoPackage("disco-queen")}
                    >
                      <CardContent className="p-3 md:p-4">
                        <h4 className="font-semibold text-sm md:text-base mb-2">Disco Queen Package</h4>
                        <p className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">$95</p>
                        <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">per person</p>
                        <p className="text-[10px] md:text-xs font-semibold mb-2">Everything in Basic Bach + Premium Upgrades:</p>
                        <ul className="text-[10px] md:text-xs text-muted-foreground space-y-0.5 md:space-y-1">
                          <li>• Private Cooler w/Ice & Storage Bin</li>
                          <li>• Reserved Spot for Your Group</li>
                          <li>• Disco Ball Cup & Bubble Gun for Bride</li>
                          <li>• Disco Visor & Necklace for Groom</li>
                          <li>• Direct-to-Boat Alcohol Delivery Available</li>
                          <li>• 25% Discount on Round-Trip Transportation</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all border-2 ${
                        discoPackage === "super-sparkle" 
                          ? "border-[#3b82f6] bg-[#FEF3C7] shadow-lg" 
                          : "border-[#F4C430] hover:bg-[#FEF3C7]"
                      }`}
                      onClick={() => setDiscoPackage("super-sparkle")}
                    >
                      <CardContent className="p-3 md:p-4">
                        <h4 className="font-semibold text-sm md:text-base mb-2">Super Sparkle Platinum</h4>
                        <p className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">$105</p>
                        <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">per person</p>
                        <p className="text-[10px] md:text-xs font-semibold mb-2">Everything in Disco Queen + Ultimate VIP:</p>
                        <ul className="text-[10px] md:text-xs text-muted-foreground space-y-0.5 md:space-y-1">
                          <li>• Personal Unicorn Float for Bride/Groom</li>
                          <li>• Mimosa Setup w/Champagne Flutes & Juices</li>
                          <li>• Chambong Included!</li>
                          <li>• Direct-to-Boat Alcohol Delivery Available</li>
                          <li>• Towel Service & SPF-50 Sunscreen</li>
                          <li>• Nothing to Carry, Cooler Pre-Stocked!</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {discoPackage && (
                    <div className="mt-4 md:mt-6 flex flex-col items-center">
                      <label className="block text-xs md:text-sm font-medium mb-2">Number of Tickets</label>
                      <div className="flex items-center gap-3 md:gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 md:h-12 md:w-12"
                          onClick={() => setDiscoTickets(Math.max(1, discoTickets - 1))}
                        >
                          -
                        </Button>
                        <span className="text-xl md:text-2xl font-bold w-12 md:w-16 text-center">{discoTickets}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 md:h-12 md:w-12"
                          onClick={() => setDiscoTickets(discoTickets + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
              </Tabs>

              {/* Discount Section */}
              {((cruiseType === "private" && selectedDay) || (cruiseType === "disco" && discoPackage)) && (
                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t">
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Choose Discount</h3>
                  <RadioGroup 
                    value={discountType || ""} 
                    onValueChange={(v) => setDiscountType(v as "200" | "300" | "code")}
                    className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="300" id="disc-300" />
                      <Label htmlFor="disc-300" className="cursor-pointer text-xs md:text-sm">
                        $300 Discount (Book by Friday 10/24)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="200" id="disc-200" />
                      <Label htmlFor="disc-200" className="cursor-pointer text-xs md:text-sm">
                        $200 Discount (Book by Friday 10/31)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="code" id="disc-code" />
                      <Label htmlFor="disc-code" className="cursor-pointer text-xs md:text-sm">Enter Discount Code</Label>
                    </div>
                  </RadioGroup>
                  
                  {/* Warning when subtotal is below minimum */}
                  {discountType && (discountType === "200" || discountType === "300") && getSubtotal() < 700 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs md:text-sm text-yellow-800">
                        ⚠️ Discount requires a minimum $700 subtotal. Your current subtotal: ${getSubtotal().toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  {discountType === "code" && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Input 
                        placeholder="Enter discount code" 
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        className="max-w-full sm:max-w-xs"
                      />
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">Apply</Button>
                    </div>
                  )}
                </div>
              )}

              {/* Per Person Price for Disco (after discount) */}
              {cruiseType === "disco" && discoPackage && summary && (
                <div className="mt-4 md:mt-6 text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Price per person after discount</p>
                  <p className="text-2xl md:text-3xl font-bold text-primary">
                    ${(summary.total / discoTickets).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">per person</p>
                </div>
              )}

              {/* Booking Summary */}
              {summary && (
                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t">
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center">Booking Summary</h2>
                <div className="space-y-2 md:space-y-3">
                  {cruiseType === "private" ? (
                    <>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Boat:</span>
                        <span className="font-medium">{getBoatName(selectedCapacity)}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>4-Hour Subtotal:</span>
                        <span className="font-medium">${summary.subtotal.toLocaleString()}</span>
                      </div>
                      {summary.additionalCrew > 0 && (
                        <div className="flex justify-between text-sm md:text-base">
                          <span>Additional Crew:</span>
                          <span className="font-medium">${summary.additionalCrew.toLocaleString()}</span>
                        </div>
                      )}
                      {summary.extraCrew > 0 && (
                        <div className="flex justify-between text-sm md:text-base">
                          <span>Extra Crew Charge:</span>
                          <span className="font-medium">${summary.extraCrew.toLocaleString()}</span>
                        </div>
                      )}
                      {summary.packagePrice > 0 && (
                        <div className="flex justify-between text-sm md:text-base">
                          <span>Package Add-on:</span>
                          <span className="font-medium">${summary.packagePrice.toLocaleString()}</span>
                        </div>
                      )}
                      {summary.discount > 0 && (
                        <div className="flex justify-between text-green-600 text-sm md:text-base">
                          <span>Discount:</span>
                          <span className="font-medium">-${summary.discount.toLocaleString()}</span>
                        </div>
                      )}
                      {'xolaFee' in summary && (
                        <div className="flex justify-between text-sm md:text-base">
                          <span>Xola Fee (3%):</span>
                          <span className="font-medium">${summary.xolaFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Sales Tax (8.25%):</span>
                        <span className="font-medium">${summary.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Gratuity (20%):</span>
                        <span className="font-medium">${summary.gratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Package:</span>
                        <span className="font-medium capitalize">{discoPackage?.replace("-", " ")}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Tickets:</span>
                        <span className="font-medium">{discoTickets} x ${getDiscoPackagePrice(discoPackage!)}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Subtotal:</span>
                        <span className="font-medium">${summary.subtotal.toLocaleString()}</span>
                      </div>
                      {summary.discount > 0 && (
                        <div className="flex justify-between text-green-600 text-sm md:text-base">
                          <span>Discount:</span>
                          <span className="font-medium">-${summary.discount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Xola Fee (3%):</span>
                        <span className="font-medium">${summary.xolaFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Sales Tax (8.25%):</span>
                        <span className="font-medium">${summary.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Gratuity (20%):</span>
                        <span className="font-medium">${summary.gratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-2 md:pt-3 flex justify-between text-lg md:text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-[#3b82f6]">${summary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                    <Button 
                      className="w-full mt-3 md:mt-4 bg-[#F4C430] text-black hover:bg-[#eab308] font-bold text-base md:text-lg" 
                      size="lg" 
                      onClick={openXolaBooking}
                      disabled={!canBook()}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
};

export default GoldenTicket;
