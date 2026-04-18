import { useState, useEffect } from "react";
import { Sparkles, Check, Truck, Star, PartyPopper, ChevronDown } from "lucide-react";

// Dynamic 10-day deadline - import from main banner
import { SALE_DEADLINE_CST } from "./EOYSaleBanner";

// Dynamic deadline text
const getDynamicDeadlineText = () => {
  return `the next 10 days`;
};

// Optimized countdown hook - updates every 30 seconds to reduce re-renders
const useCountdown = (targetDate: Date) => {
  const [timeLeft, setTimeLeft] = useState(() => {
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
  });

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

    setTimeLeft(calculateTimeLeft());
    // Update every 30 seconds instead of every second - reduces re-renders significantly
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 30000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

export const EOYSaleBannerStacked = () => {
  const saleDeadline = SALE_DEADLINE_CST;
  const deadlineDateText = getDynamicDeadlineText();
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
    <div className="w-full">
      <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white px-3 py-2 border-y-2 border-yellow-400/60 rounded-lg">
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
              Request a Quote to Unlock a $150+ Discount!
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
              Request a Quote to Unlock a $150+ Discount!
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
    </div>
  );
};

export default EOYSaleBannerStacked;
