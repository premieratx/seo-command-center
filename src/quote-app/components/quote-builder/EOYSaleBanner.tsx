import { useState, useEffect } from "react";
import { Sparkles, Check, Truck, Star, PartyPopper, ChevronDown } from "lucide-react";
import TrackedVideo from "./TrackedVideo";

// Dynamic 10-day deadline from now, anchored to 11:59 PM CST
export const getDeadlineFromNow = (daysFromNow: number = 10): Date => {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + daysFromNow);
  // Set to 11:59:59 PM CST (UTC-6) = 05:59:59 UTC next day
  deadline.setUTCHours(5, 59, 59, 0);
  deadline.setUTCDate(deadline.getUTCDate() + 1);
  return deadline;
};

// For banner display when no specific quote deadline exists
export const SALE_DEADLINE_CST = getDeadlineFromNow(10);

// Get 10-day deadline as ISO string (for new quotes)
export const getMidnightDeadline = (daysFromNow: number = 10): string => {
  return getDeadlineFromNow(daysFromNow).toISOString();
};

// Get the dynamic deadline for public banner
export const getDynamicPublicDeadline = (): Date => {
  return getDeadlineFromNow(10);
};

interface EOYSaleBannerProps {
  isPrivateCruise?: boolean;
  isBachParty?: boolean;
  /** Optional personalized expiration date for this specific quote */
  expiresAt?: string | null;
  /** Callback when personal deadline expires and needs reset */
  onDeadlineExpired?: () => void;
  /** Lead ID for engagement tracking */
  leadId?: string;
  /** Quote number for engagement tracking */
  quoteNumber?: string;
}

// Optimized countdown hook - updates every 30 seconds instead of every second
// Uses CSS animations for the seconds display to avoid constant re-renders
const useCountdown = (targetDate: Date, onExpired?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const difference = target - now;
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }
    
    const dayMs = 1000 * 60 * 60 * 24;
    const hourMs = 1000 * 60 * 60;
    const minuteMs = 1000 * 60;
    
    const days = Math.floor(difference / dayMs);
    const remainder = difference % dayMs;
    
    return {
      days,
      hours: Math.floor(remainder / hourMs),
      minutes: Math.floor((remainder % hourMs) / minuteMs),
      seconds: Math.floor((remainder % minuteMs) / 1000),
      expired: false
    };
  });
  const [hasTriggeredExpired, setHasTriggeredExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;
      const dayMs = 1000 * 60 * 60 * 24;
      const hourMs = 1000 * 60 * 60;
      const minuteMs = 1000 * 60;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      const days = Math.floor(difference / dayMs);
      const remainder = difference % dayMs;

      return {
        days,
        hours: Math.floor(remainder / hourMs),
        minutes: Math.floor((remainder % hourMs) / minuteMs),
        seconds: Math.floor((remainder % minuteMs) / 1000),
        expired: false
      };
    };

    const result = calculateTimeLeft();
    setTimeLeft(result);
    
    if (result.expired && !hasTriggeredExpired && onExpired) {
      setHasTriggeredExpired(true);
      onExpired();
    }
    
    // Update every 30 seconds instead of every second - much less re-rendering
    // The visual seconds are handled by CSS animation
    const timer = setInterval(() => {
      const newResult = calculateTimeLeft();
      setTimeLeft(newResult);
      if (newResult.expired && !hasTriggeredExpired && onExpired) {
        setHasTriggeredExpired(true);
        onExpired();
      }
    }, 30000); // 30 seconds instead of 1 second

    return () => clearInterval(timer);
  }, [targetDate, onExpired, hasTriggeredExpired]);

  return timeLeft;
};

export const EOYSaleBanner = ({ isBachParty, leadId, quoteNumber }: EOYSaleBannerProps) => {
  const saleDeadline = SALE_DEADLINE_CST;
  const daysUntilDeadline = Math.max(0, Math.ceil((SALE_DEADLINE_CST.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  const deadlineDateText = `the next ${daysUntilDeadline} days`;
  const { days, hours, minutes, seconds, expired } = useCountdown(saleDeadline);

  const allCruisePerks = [
    { 
      text: "Ultimate Disco Party Package for FREE!", 
      label: "(Private Cruises)", 
      value: "$250-$350",
      description: "Disco Ball Cups, Bubble Guns, Unicorn Floats, Juices, Champagne Flutes & More"
    },
    { 
      text: "Sparkle Package AND Mimosa Party Cooler for FREE!", 
      label: "(ATX Disco Cruise)", 
      value: "$200-$250",
      description: "Disco Ball Cups, Bubble Guns, Unicorn Floats, Juices, Champagne Flutes & More"
    },
  ];

  const commonPerks = [
    { icon: Truck, text: "$50 Party On Direct-to-Boat Delivery", subtext: "Party On Delivery provides drink delivery, stock-the-cooler service & free bottle of champagne!" },
    { icon: Star, text: "$100 Airbnb Concierge Package", subtext: "Welcome Drink Package - Tequila Shots or Beer Pong Setup." },
  ];

  return (
    <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white rounded-lg px-3 py-2 shadow-xl border-2 border-yellow-400/60">
      {/* Mobile/Tablet: Title on top, then Book by + Countdown row */}
      {/* Desktop (lg+): Book by (left) | Title (center) | Countdown (right) all in one row */}
      
      {/* Mobile/Tablet layout */}
      <div className="lg:hidden">
        {/* Title centered on top */}
        <div className="flex flex-col items-center mb-2">
          <div className="flex items-center gap-1.5">
            <PartyPopper className="h-4 w-4 text-yellow-400" />
            <h2 className="text-base sm:text-lg font-bold text-center">🎉 New Year Kickoff Super Sale 🎉</h2>
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-[10px] sm:text-xs text-white/90 font-semibold text-center">
            Request a Quote to Unlock a $150-$500+ Discount!
          </p>
        </div>
        
        {/* Book by date + Countdown row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs sm:text-sm font-bold text-yellow-300 underline decoration-2 decoration-yellow-400 whitespace-nowrap">
            Book by {deadlineDateText}!
          </p>
          <div className="bg-black/30 rounded-lg py-1 px-1.5 border border-yellow-400/30">
            {!expired ? (
              <div className="flex items-center gap-0.5 text-xs sm:text-sm font-mono font-bold">
                <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{days}d</span>
                <span className="text-yellow-400">:</span>
                <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{String(hours).padStart(2, '0')}h</span>
                <span className="text-yellow-400">:</span>
                <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{String(minutes).padStart(2, '0')}m</span>
                <span className="text-yellow-400">:</span>
                <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{String(seconds).padStart(2, '0')}s</span>
              </div>
            ) : (
              <span className="text-red-400 font-bold text-sm">EXPIRED</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Desktop layout - all in one row */}
      <div className="hidden lg:flex items-center justify-between gap-4 mb-2">
        <p className="text-base font-bold text-yellow-300 underline decoration-2 decoration-yellow-400 whitespace-nowrap">
          Book by {deadlineDateText}!
        </p>
        
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-1.5">
            <PartyPopper className="h-4 w-4 text-yellow-400" />
            <h2 className="text-xl font-bold text-center">🎉 New Year Kickoff Super Sale 🎉</h2>
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-xs text-white/90 font-semibold text-center">
            Request a Quote to Unlock a $150-$500+ Discount!
          </p>
        </div>
        
        <div className="bg-black/30 rounded-lg py-1 px-1.5 border border-yellow-400/30">
          {!expired ? (
            <div className="flex items-center gap-0.5 text-sm font-mono font-bold">
              <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{days}d</span>
              <span className="text-yellow-400">:</span>
              <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{String(hours).padStart(2, '0')}h</span>
              <span className="text-yellow-400">:</span>
              <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{String(minutes).padStart(2, '0')}m</span>
              <span className="text-yellow-400">:</span>
              <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">{String(seconds).padStart(2, '0')}s</span>
            </div>
          ) : (
            <span className="text-red-400 font-bold text-sm">EXPIRED</span>
          )}
        </div>
      </div>
      
      {/* Video Section */}
      {isBachParty ? (
        /* Bach Party: Two-column layout with Loom (left) and YouTube (right) */
        <>
          <p className="text-center text-xs sm:text-sm font-semibold text-yellow-200 mb-2 animate-pulse">
            <span className="inline-block animate-bounce">👇</span>
            {" "}Watch these Videos then Scroll Down to View Your Quote &amp; Book Online!{" "}
            <span className="inline-block animate-bounce">👇</span>
          </p>
          <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Column - Loom Video */}
            <div className="flex flex-col">
              <div className="min-h-[2.5rem] flex flex-col items-center justify-center mb-1">
                <h3 className="text-xs sm:text-sm font-bold text-yellow-300 text-center">
                  Watch a quick intro video from Brian, the owner.
                </h3>
                <p className="text-[10px] sm:text-xs text-yellow-200/90 text-center">
                  (The first minute or 2 is all u need.)
                </p>
              </div>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-yellow-400/30">
                <TrackedVideo
                  src="https://www.loom.com/embed/d9d73c47f97849d2b82935578fc20722"
                  videoType="loom"
                  title="Intro from Brian"
                  className="w-full h-full"
                  leadId={leadId}
                  quoteNumber={quoteNumber}
                />
              </div>
            </div>
            
            {/* Right Column - YouTube Video */}
            <div className="flex flex-col">
              <div className="min-h-[2.5rem] flex flex-col items-center justify-center mb-1">
                <h3 className="text-xs sm:text-sm font-bold text-yellow-300 text-center">
                  Bachelorette &amp; Bachelor Party Cruise Options 2026
                </h3>
              </div>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-yellow-400/30">
                <TrackedVideo
                  src="https://www.youtube.com/embed/iFlLA8uh9Yg"
                  videoType="youtube"
                  title="Bachelorette & Bachelor Party Cruise Options 2026"
                  className="w-full h-full"
                  leadId={leadId}
                  quoteNumber={quoteNumber}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Non-Bach Party: Single Loom video */
        <>
          <p className="text-center text-xs sm:text-sm font-semibold text-yellow-200 mb-2 animate-pulse">
            <span className="inline-block animate-bounce">👇</span>
            {" "}Watch this Video then Scroll Down to View Your Quote &amp; Book Online!{" "}
            <span className="inline-block animate-bounce">👇</span>
          </p>
          <div className="mb-3">
            <div className="flex flex-col items-center justify-center mb-1">
              <h3 className="text-sm sm:text-base font-bold text-yellow-300 text-center">
                Watch a quick intro video from Brian, the owner.
              </h3>
              <p className="text-xs sm:text-sm text-yellow-200/90 text-center">
                (The first minute or 2 is all u need.)
              </p>
            </div>
            <div className="aspect-video w-full max-w-3xl mx-auto rounded-lg overflow-hidden border border-yellow-400/30">
              <TrackedVideo
                src="https://www.loom.com/embed/d9d73c47f97849d2b82935578fc20722"
                videoType="loom"
                title="Intro from Brian"
                className="w-full h-full"
                leadId={leadId}
                quoteNumber={quoteNumber}
              />
            </div>
          </div>
        </>
      )}

      {/* Stacked options */}
      <div className="space-y-2">
        {/* 25% Deposit Option - TOP */}
        <div className="bg-blue-800/40 backdrop-blur rounded-lg p-3 border-2 border-yellow-400/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-base md:text-lg text-yellow-300 animate-[pulse-left_0.6s_ease-in-out_3]">25% Deposit Option</h3>
            <p className="text-white/80 text-sm md:text-base font-bold">Code: PREMIERNEWYEAR</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2.5">
              <Check className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="font-bold text-sm sm:text-base md:text-lg text-white">$150 Discount on Your Booking!</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2.5">
              <Check className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="font-bold text-sm sm:text-base md:text-lg text-white">25% Discount on R/T Transportation</span>
            </div>
          </div>
        </div>

        {/* Pay in Full Option - BOTTOM as BONUSES */}
        <div className="bg-yellow-400/20 backdrop-blur rounded-lg p-2 border-2 border-yellow-400 relative">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            BEST VALUE
          </div>
          
          {/* Mobile/Tablet: Stacked header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm md:text-base text-yellow-300 animate-[pulse-right_0.6s_ease-in-out_3]" style={{ animationDelay: '0.3s' }}>Pay in Full</h3>
                <ChevronDown className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-yellow-200 font-semibold">BONUS PERKS</span>
              </div>
              <p className="text-white/80 text-sm md:text-base font-bold">Code: PREMIERNEWYEAR</p>
            </div>
            
            {/* Includes indicator - centered */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Check className="h-5 w-5 text-yellow-400" />
              <span className="text-base sm:text-lg font-bold text-yellow-200">Includes all 25% Deposit perks above, PLUS:</span>
            </div>
          </div>
          
          {/* Desktop: All in one row */}
          <div className="hidden lg:flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-yellow-300 animate-[pulse-right_0.6s_ease-in-out_3]" style={{ animationDelay: '0.3s' }}>Pay in Full</h3>
              <ChevronDown className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-yellow-200 font-semibold">BONUS PERKS</span>
              <span className="mx-2 text-yellow-400">|</span>
              <Check className="h-5 w-5 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-200">Includes all 25% Deposit perks above, PLUS:</span>
            </div>
            <p className="text-white/80 text-base font-bold">Code: PREMIERNEWYEAR</p>
          </div>
          
          {/* Bonus perks grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {allCruisePerks.map((perk, idx) => (
              <div key={idx} className="bg-white/10 rounded-lg px-2 py-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Check className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <span className="font-bold text-xs sm:text-sm md:text-base text-white">{perk.text}</span>
                    <span className="text-yellow-300/70 text-[10px] flex-shrink-0">{perk.label}</span>
                  </div>
                  <span className="text-white text-xs sm:text-sm md:text-base font-bold underline decoration-yellow-400 flex-shrink-0">({perk.value})</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-yellow-200/80 ml-5 mt-0.5">{perk.description}</p>
              </div>
            ))}
            {commonPerks.map((perk, idx) => (
              <div key={`common-${idx}`} className="bg-white/10 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <span className="font-bold text-xs sm:text-sm md:text-base text-white">{perk.text}</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-yellow-200/80 ml-5 mt-0.5">{perk.subtext}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer note */}
      <div className="mt-1.5 text-center">
        <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-yellow-300 flex items-center justify-center gap-1">
          <PartyPopper className="h-3 w-3 text-yellow-400" />
          Pay In Full = All Bonus Perks Added Automatically!
          <PartyPopper className="h-3 w-3 text-yellow-400" />
        </p>
      </div>
    </div>
  );
};
