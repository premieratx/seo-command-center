import { useState, useEffect } from "react";
import { Sparkles, Check, PartyPopper } from "lucide-react";

// Import photos for each perk
import cleverGirl1 from "@/quote-app/assets/boats/clever-girl-1.jpg";
import irony1 from "@/quote-app/assets/boats/irony-1.jpg";
import meeseeks1 from "@/quote-app/assets/boats/meeseeks-1.jpg";
import discoFunBest2 from "@/quote-app/assets/party/disco_fun_best2.jpg";
import discoWigs from "@/quote-app/assets/party/disco_wigs.jpg";
import groupPic from "@/quote-app/assets/party/Group_Pic_6_22.jpg";

// Dynamic 10-day deadline
import { SALE_DEADLINE_CST } from "./EOYSaleBanner";
const getDynamicDeadlineText = () => {
  return `the next 10 days`;
};

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
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 30000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

interface PerkCardProps {
  image: string;
  title: string;
  value: string;
  description: string;
  highlight?: boolean;
}

const PerkCard = ({ image, title, value, description, highlight = false }: PerkCardProps) => (
  <div className={`relative overflow-hidden rounded-xl ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
    <div className="absolute inset-0">
      <img 
        src={image} 
        alt={title} 
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
    </div>
    <div className="relative p-3 sm:p-4 min-h-[140px] sm:min-h-[160px] flex flex-col justify-end">
      <div className="flex items-center gap-1.5 mb-1">
        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 flex-shrink-0" />
        <span className="text-yellow-400 font-bold text-sm sm:text-base">{value}</span>
      </div>
      <h3 className="text-white font-bold text-sm sm:text-lg leading-tight mb-1">{title}</h3>
      <p className="text-white/80 text-[10px] sm:text-xs leading-tight">{description}</p>
    </div>
  </div>
);

export const EOYSaleBannerVisual = () => {
  const { days, hours, minutes, seconds, expired } = useCountdown(SALE_DEADLINE_CST);

  const depositPerks = [
    {
      image: cleverGirl1,
      title: "$150 Off Your Booking",
      value: "SAVE $150",
      description: "Instant discount when you book by the deadline"
    },
    {
      image: irony1,
      title: "25% Off Transportation",
      value: "SAVE 25%",
      description: "Round-trip shuttle service discount included"
    }
  ];

  const bonusPerks = [
    {
      image: discoFunBest2,
      title: "Ultimate Disco Party Package",
      value: "$250-$350 FREE",
      description: "Private Cruises: Disco Ball Cups, Bubble Guns, Unicorn Floats & More",
      highlight: true
    },
    {
      image: discoWigs,
      title: "Sparkle + Mimosa Cooler",
      value: "$200-$250 FREE",
      description: "ATX Disco Cruise: Juices, Champagne Flutes, Bubble Guns & More",
      highlight: true
    },
    {
      image: meeseeks1,
      title: "Party On Boat Delivery",
      value: "$50 FREE",
      description: "Drink delivery, stock-the-cooler service & free champagne"
    },
    {
      image: groupPic,
      title: "Airbnb Concierge Package",
      value: "$100 FREE",
      description: "Welcome drink package - Tequila Shots or Beer Pong Setup"
    }
  ];

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-xl overflow-hidden border-2 border-yellow-400/60">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-400/30 to-yellow-500/20 px-4 py-3 border-b border-yellow-400/40">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-yellow-400" />
            <h1 className="text-lg sm:text-2xl font-bold text-white">
              🎉 New Year Kickoff Super Sale 🎉
            </h1>
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </div>
          
          <div className="flex items-center gap-3">
            <p className="text-yellow-300 font-bold text-sm sm:text-base underline decoration-2">
              Book by {getDynamicDeadlineText()}!
            </p>
            <div className="bg-black/40 rounded-lg py-1 px-2 border border-yellow-400/30">
              {!expired ? (
                <div className="flex items-center gap-0.5 text-xs sm:text-sm font-mono font-bold">
                  <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{days}d</span>
                  <span className="text-yellow-400">:</span>
                  <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{String(hours).padStart(2, '0')}h</span>
                  <span className="text-yellow-400">:</span>
                  <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{String(minutes).padStart(2, '0')}m</span>
                  <span className="text-yellow-400">:</span>
                  <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{String(seconds).padStart(2, '0')}s</span>
                </div>
              ) : (
                <span className="text-red-400 font-bold text-sm">EXPIRED</span>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-white/90 text-xs sm:text-sm mt-1">
          Request a Quote to Unlock a <span className="text-yellow-300 font-bold">$150-$500+ Discount!</span>
        </p>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        {/* 25% Deposit Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-yellow-300 font-bold text-base sm:text-lg">25% Deposit Option</h2>
            <span className="bg-blue-800/60 text-white text-xs sm:text-sm font-bold px-2 py-1 rounded">
              Code: PREMIERNEWYEAR
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {depositPerks.map((perk, idx) => (
              <PerkCard key={idx} {...perk} />
            ))}
          </div>
        </div>

        {/* Pay in Full Section */}
        <div className="relative">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <span className="bg-yellow-400 text-black text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
              BEST VALUE
            </span>
          </div>
          
          <div className="bg-yellow-400/10 rounded-xl p-3 sm:p-4 border-2 border-yellow-400/50 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-yellow-300 font-bold text-base sm:text-lg">Pay in Full</h2>
                <span className="text-yellow-200/80 text-xs">BONUS PERKS</span>
              </div>
              <span className="bg-yellow-500/30 text-white text-xs sm:text-sm font-bold px-2 py-1 rounded border border-yellow-400/50">
                Code: PREMIERNEWYEAR
              </span>
            </div>
            
            <p className="text-center text-yellow-200 font-semibold text-sm sm:text-base mb-3">
              <Check className="inline h-4 w-4 text-yellow-400 mr-1" />
              Includes all 25% Deposit perks above, PLUS:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {bonusPerks.map((perk, idx) => (
                <PerkCard key={idx} {...perk} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center py-2">
          <p className="text-yellow-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5">
            <PartyPopper className="h-4 w-4 text-yellow-400" />
            Pay In Full = All Bonus Perks Added Automatically!
            <PartyPopper className="h-4 w-4 text-yellow-400" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default EOYSaleBannerVisual;
