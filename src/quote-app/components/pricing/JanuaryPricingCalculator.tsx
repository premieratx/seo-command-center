import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Label } from "@/quote-app/components/ui/label";
import { Slider } from "@/quote-app/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Button } from "@/quote-app/components/ui/button";
import { Lightbox } from "@/quote-app/components/ui/lightbox";
import { calculatePricing } from "@/quote-app/lib/pricing";
import { parse, isBefore, startOfDay } from "date-fns";
import { PayInFullPerksBanner } from "@/quote-app/components/pricing/PayInFullPerksBanner";

// Dynamic 10-day deadline
import { SALE_DEADLINE_CST } from "@/quote-app/components/quote-builder/EOYSaleBanner";

// Optimized countdown hook - updates every 60 seconds to reduce re-renders
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
    // Update every 60 seconds instead of every second - reduces re-renders significantly
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

// Day Tripper photos (1-14 guests)
import dayTripper1 from "@/quote-app/assets/boats/day-tripper-1.jpg";
import dayTripper2 from "@/quote-app/assets/boats/day-tripper-2.jpg";
import dayTripper3 from "@/quote-app/assets/boats/day-tripper-3.jpg";
import dayTripper4 from "@/quote-app/assets/boats/day-tripper-4.jpg";

// Meeseeks/Irony photos (15-30 guests)
import ironyNew1 from "@/quote-app/assets/boats/irony-new-1.jpg";
import ironyNew2 from "@/quote-app/assets/boats/irony-new-2.jpg";
import meeseeks1 from "@/quote-app/assets/boats/meeseeks-1.jpg";
import meeseeks3 from "@/quote-app/assets/boats/meeseeks-3.jpg";
import meeseeks4 from "@/quote-app/assets/boats/meeseeks-4.jpg";
import irony1 from "@/quote-app/assets/boats/irony-1.jpg";

// Clever Girl photos (31+ guests)
import cleverGirl1 from "@/quote-app/assets/boats/clever-girl-1.jpg";
import cleverGirl3 from "@/quote-app/assets/boats/clever-girl-3.jpg";
import cleverGirl4 from "@/quote-app/assets/boats/clever-girl-4.jpg";
import cleverGirl6 from "@/quote-app/assets/boats/clever-girl-6.jpg";

const dayTripperPhotos = [dayTripper1, dayTripper2, dayTripper3, dayTripper4];
const meeseeksIronyPhotos = [ironyNew1, ironyNew2, meeseeks1, meeseeks3, meeseeks4, irony1];
const cleverGirlPhotos = [cleverGirl1, cleverGirl3, cleverGirl4, cleverGirl6];

const getBoatPhotos = (guestCount: number): string[] => {
  if (guestCount <= 14) return dayTripperPhotos;
  if (guestCount <= 30) return meeseeksIronyPhotos;
  return cleverGirlPhotos;
};

const discoTimeSlots = [
  { dayLabel: "Friday ($95/pp)", timeLabel: "12-4pm", price: 95, day: 5 },
  { dayLabel: "Saturday ($105/pp)", timeLabel: "11am-3pm", price: 105, day: 6 },
  { dayLabel: "Saturday ($85/pp)", timeLabel: "3:30-7:30pm", price: 85, day: 6 }
];

const privateTimeSlots = [
  { dayLabel: "Friday", timeLabel: "12-4pm or 4:30-8:30pm", day: 5 },
  { dayLabel: "Saturday", timeLabel: "11am-3pm or 3:30-7:30pm", day: 6 },
  { dayLabel: "Sunday", timeLabel: "11am-3pm or 3:30-7:30pm", day: 0 }
];

const getBoatName = (guestCount: number): string => {
  if (guestCount <= 14) return "Day Tripper";
  if (guestCount <= 30) return "Meeseeks/The Irony";
  return "Clever Girl";
};

const getBoatCapacity = (guestCount: number): number => {
  if (guestCount <= 14) return 14;
  if (guestCount <= 30) return 30;
  return 75;
};

const getUltimatePackagePrice = (guestCount: number): number => {
  if (guestCount <= 14) return 250;
  if (guestCount <= 30) return 300;
  return 350;
};

// February deadline options
const DEADLINE_OPTIONS = [
  { value: "feb1", discount: 250, label: "Sun Feb 1st", deadline: new Date(2026, 1, 1) },
  { value: "feb3", discount: 200, label: "Tues Feb 3rd", deadline: new Date(2026, 1, 3) },
  { value: "feb5", discount: 150, label: "Thurs Feb 5th", deadline: new Date(2026, 1, 5) },
];

export const JanuaryPricingCalculator = () => {
  const [guestCount, setGuestCount] = useState(10);
  const [privatePackage, setPrivatePackage] = useState("standard");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [discountOption, setDiscountOption] = useState("feb1");
  const [discoMimosa, setDiscoMimosa] = useState(false);
  const [discoSparkle, setDiscoSparkle] = useState(false);
  
  // Countdown timer
  const { days, hours, minutes, seconds, expired } = useCountdown(SALE_DEADLINE_CST);

  // Check which deadlines have expired
  const today = startOfDay(new Date());
  const getOptionStatus = (deadline: Date) => isBefore(deadline, today);
  
  const fixedDiscount = discountOption === "feb1" ? 250 : 
                        discountOption === "feb3" ? 200 : 
                        discountOption === "feb5" ? 150 : 0;

  const ultimatePackagePrice = getUltimatePackagePrice(guestCount);
  const effectivePrivatePackage = privatePackage;

  const discoMimosaPrice = 100;
  const discoSparklePrice = 100;

  const calculateDisco = (pricePerPerson: number) => {
    const base = pricePerPerson * guestCount;
    const addOnsCost = (discoMimosa ? discoMimosaPrice : 0) + (discoSparkle ? discoSparklePrice : 0);
    const subtotal = base + addOnsCost;
    const subtotalAfterDiscount = subtotal - fixedDiscount;
    const gratuity = subtotalAfterDiscount * 0.20;
    const xolaFee = (subtotalAfterDiscount + gratuity) * 0.03;
    const tax = subtotalAfterDiscount * 0.0825;
    const total = subtotalAfterDiscount + xolaFee + tax + gratuity;
    
    return { 
      base, 
      addOnsCost,
      discount: fixedDiscount, 
      subtotalAfterDiscount, 
      xolaFee, 
      tax, 
      gratuity, 
      total, 
      perPerson: total / guestCount
    };
  };

  const calculatePrivate = (dayOfWeek: number) => {
    const sampleDate = parse("2025-01-01", "yyyy-MM-dd", new Date());
    const dayDiff = dayOfWeek - sampleDate.getDay();
    sampleDate.setDate(sampleDate.getDate() + dayDiff);
    
    const basePricing = calculatePricing({
      date: sampleDate,
      guestCount,
      duration: 4,
      boatCapacity: getBoatCapacity(guestCount),
      crewFeePerHour: 0
    });

    let packageCost = 0;
    let packageName = "Standard";
    
    if (effectivePrivatePackage === "essentials") {
      packageCost = guestCount <= 14 ? 100 : 150;
      packageName = "Essentials";
    } else if (effectivePrivatePackage === "ultimate") {
      packageCost = ultimatePackagePrice;
      packageName = "Ultimate";
    }

    const subtotalWithPackage = basePricing.subtotal + packageCost;
    const discountedSubtotal = subtotalWithPackage - fixedDiscount;
    const gratuity = discountedSubtotal * 0.20;
    const xolaFee = (discountedSubtotal + gratuity) * 0.03;
    const tax = discountedSubtotal * 0.0825;
    const total = discountedSubtotal + xolaFee + tax + gratuity;

    return {
      subtotal: basePricing.subtotal,
      packageCost,
      packageName,
      discountedSubtotal,
      xolaFee,
      tax,
      gratuity,
      total
    };
  };

  const boatName = getBoatName(guestCount);

  return (
    <Card className="w-full max-w-full sm:max-w-[95vw] mx-auto">
      <CardHeader className="pb-1 pt-2 px-2.5">
        <CardTitle className="text-center">
          <div className="text-base sm:text-xl md:text-2xl font-bold leading-tight underline">ATX Disco Cruise vs. Private Cruise Pricing Calculator</div>
          <div className="text-sm sm:text-lg md:text-xl font-bold mt-0.5 leading-tight text-orange-500">
            Spring Super Sale - Book by March 24th!
          </div>
          <div className="text-sm sm:text-lg md:text-xl font-bold leading-tight text-orange-500">
            Up to $250 off your booking!
          </div>
          
          {/* Countdown Timer */}
          <div className="bg-gray-900 rounded-lg py-1.5 px-3 mt-2 inline-block border border-yellow-400/50">
            {!expired ? (
              <div className="flex items-center gap-1 text-sm sm:text-base md:text-lg font-mono font-bold">
                <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{days}d</span>
                <span className="text-yellow-400">:</span>
                <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{String(hours).padStart(2, '0')}h</span>
                <span className="text-yellow-400">:</span>
                <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{String(minutes).padStart(2, '0')}m</span>
                <span className="text-yellow-400">:</span>
                <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded">{String(seconds).padStart(2, '0')}s</span>
              </div>
            ) : (
              <span className="text-red-400 font-bold text-sm">SALE EXPIRED</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 py-1.5 px-2.5">
        {/* Pay in Full Perks Banner */}
        <PayInFullPerksBanner variant="bach" />
        
        {/* Discount Tier Radio Buttons */}
        <div className="bg-accent/30 rounded-lg p-2 border-2 border-yellow-500">
          <RadioGroup 
            value={discountOption} 
            onValueChange={(val) => {
              const option = DEADLINE_OPTIONS.find(opt => opt.value === val);
              if (!option || !getOptionStatus(option.deadline)) {
                setDiscountOption(val);
              }
            }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0.5"
          >
            {DEADLINE_OPTIONS.map((opt) => {
              const isExpired = getOptionStatus(opt.deadline);
              return (
                <div key={opt.value} className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-green-200 sm:flex-col sm:p-0 sm:bg-transparent sm:border-0 sm:rounded-none">
                  <RadioGroupItem 
                    value={opt.value} 
                    id={`disco-${opt.value}`}
                    disabled={isExpired}
                    className="shrink-0"
                  />
                  <Label 
                    htmlFor={`disco-${opt.value}`} 
                    className={`text-xs sm:text-sm cursor-pointer font-semibold leading-tight text-center ${isExpired ? 'line-through opacity-50' : ''}`}
                  >
                    <span className="block">Book by {opt.label}</span>
                    <span className={`block text-sm sm:text-base font-bold ${isExpired ? 'text-red-400' : 'text-green-600'}`}>
                      {isExpired ? "(Expired)" : `($${opt.discount} off)`}
                    </span>
                  </Label>
                </div>
              );
            })}
            <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-gray-200 sm:flex-col sm:p-0 sm:bg-transparent sm:border-0 sm:rounded-none">
              <RadioGroupItem value="none" id="no-discount-disco" className="shrink-0" />
              <Label htmlFor="no-discount-disco" className="text-xs sm:text-sm cursor-pointer font-semibold leading-tight">
                <span className="block">Full Price</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Guest Count Slider */}
        <div className="bg-accent/30 rounded-lg p-2 border-2 border-border">
          <Label className="text-base sm:text-lg font-bold mb-1 block">
            Number of Guests: <span className="text-2xl sm:text-3xl">{guestCount}</span>
          </Label>
          <Slider
            value={[guestCount]}
            onValueChange={(v) => setGuestCount(v[0])}
            min={1}
            max={75}
            step={1}
            className="w-full"
          />
        </div>

        {/* Disco Cruise Pricing Row */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mb-1">
            <h3 className="text-sm sm:text-base font-bold">ATX Disco Cruise Pricing</h3>
            <Button 
              asChild
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-2.5 sm:px-4 py-1 text-xs w-full sm:w-auto"
            >
              <a href="https://x2-checkout.xola.app/flows/mvp?button=691574bd162501edc00f151a&view=grid" target="_blank" rel="noopener noreferrer">
                Book the ATX Disco Cruise Now
              </a>
            </Button>
          </div>
          
          {/* Disco Add-Ons */}
          <div className="bg-primary/5 rounded-lg p-1.5 border border-primary/20 mb-1">
            <Label className="text-xs font-semibold mb-1 block">Optional Add-Ons (+$100 each):</Label>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="disco-mimosa" 
                  checked={discoMimosa}
                  onChange={(e) => setDiscoMimosa(e.target.checked)}
                  className="h-4 w-4 rounded border-primary/20"
                />
                <Label htmlFor="disco-mimosa" className="text-xs sm:text-sm cursor-pointer">
                  Mimosa Party Cooler (+$100)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="disco-sparkle" 
                  checked={discoSparkle}
                  onChange={(e) => setDiscoSparkle(e.target.checked)}
                  className="h-4 w-4 rounded border-primary/20"
                />
                <Label htmlFor="disco-sparkle" className="text-xs sm:text-sm cursor-pointer">
                  Bride/Groom Sparkle Package (+$100)
                </Label>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:grid md:grid-cols-3 gap-1 md:gap-0.5">
            {discoTimeSlots.map((slot) => {
              const pricing = calculateDisco(slot.price);
              return (
                <div key={slot.dayLabel} className="bg-primary/5 rounded-lg p-1.5 border-2 border-primary/20">
                  <h4 className="font-bold mb-0.5 text-center">
                    <span className="text-primary text-lg sm:text-xl block">{slot.dayLabel}</span>
                    <span className="text-primary text-lg sm:text-xl block">{slot.timeLabel}</span>
                  </h4>
                  <div className="space-y-0.5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs sm:text-sm">Base ({guestCount} guests)</span>
                      <span className="font-semibold text-xs sm:text-sm">${pricing.base.toFixed(0)}</span>
                    </div>
                    {pricing.addOnsCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">Add-Ons</span>
                        <span className="font-semibold text-xs sm:text-sm">+${pricing.addOnsCost.toFixed(0)}</span>
                      </div>
                    )}
                    {pricing.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-600 font-semibold text-xs sm:text-sm">Sale Discount</span>
                        <span className="text-green-600 font-semibold text-xs sm:text-sm">-${pricing.discount.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs sm:text-sm">Fees+Tax+Tip</span>
                      <span className="font-semibold text-xs sm:text-sm">${(pricing.xolaFee + pricing.tax + pricing.gratuity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t border-primary/20">
                      <span className="font-bold text-xs">Group Total</span>
                      <span className="font-bold text-sm">${pricing.total.toFixed(0)}</span>
                    </div>
                    <div className="bg-primary/10 rounded px-1.5 py-0.5 mt-0.5 text-center">
                      <div className="text-[10px] font-semibold">PER PERSON</div>
                      <div className="text-lg sm:text-xl font-bold text-primary">${pricing.perPerson.toFixed(2)}</div>
                      {fixedDiscount > 0 && (
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          ${(fixedDiscount / guestCount).toFixed(0)} saved / pp
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Private Cruise Pricing Row */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mb-1">
            <h3 className="text-sm sm:text-base font-bold">Private Cruise Pricing ({boatName})</h3>
            <Button 
              asChild
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-2.5 sm:px-4 py-1 text-xs w-full sm:w-auto"
            >
              <a href="https://x2-checkout.xola.app/flows/mvp?button=691574bd162501edc00f151a&view=grid" target="_blank" rel="noopener noreferrer">
                Book your Private Cruise Now
              </a>
            </Button>
          </div>
          
          {/* Package Options */}
          <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200 mb-1">
            <Label className="text-xs font-semibold mb-1 block">Package Options:</Label>
            <RadioGroup 
              value={privatePackage} 
              onValueChange={setPrivatePackage}
              className="flex flex-col sm:flex-row gap-1.5 sm:gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="private-standard" />
                <Label htmlFor="private-standard" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                  Standard Private Cruise (+$0)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="essentials" id="private-essentials" />
                <Label htmlFor="private-essentials" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                  Essentials (+${guestCount <= 14 ? 100 : 150})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ultimate" id="private-ultimate" />
                <Label htmlFor="private-ultimate" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                  Ultimate (+${ultimatePackagePrice})
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-3 gap-1 md:gap-0.5">
            {privateTimeSlots.map((slot) => {
              const pricing = calculatePrivate(slot.day);
              return (
                <div key={slot.dayLabel} className="bg-blue-50 rounded-lg p-1.5 border-2 border-blue-200">
                  <h4 className="font-bold mb-0.5 text-center">
                    <span className="text-blue-700 text-lg sm:text-xl block">{slot.dayLabel}</span>
                    <span className="text-blue-700 text-base sm:text-lg block">{slot.timeLabel}</span>
                  </h4>
                  <div className="space-y-0.5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Cruise</span>
                      <span className="font-semibold">${pricing.subtotal.toFixed(0)}</span>
                    </div>
                    {pricing.packageCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{pricing.packageName} Package</span>
                        <span className="font-semibold">+${pricing.packageCost}</span>
                      </div>
                    )}
                    {fixedDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-600 font-semibold">Sale Discount</span>
                        <span className="text-green-600 font-semibold">-${fixedDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fees+Tax+Tip</span>
                      <span className="font-semibold">${(pricing.xolaFee + pricing.tax + pricing.gratuity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t border-blue-200">
                      <span className="font-bold">Group Total</span>
                      <span className="font-bold text-sm">${pricing.total.toFixed(0)}</span>
                    </div>
                    <div className="bg-blue-100 rounded px-1.5 py-0.5 mt-0.5 text-center">
                      <div className="text-[10px] font-semibold">PER PERSON</div>
                      <div className="text-lg sm:text-xl font-bold text-blue-700">${(pricing.total / guestCount).toFixed(2)}</div>
                      {fixedDiscount > 0 && (
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          ${(fixedDiscount / guestCount).toFixed(0)} saved / pp
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boat Photo Gallery - Below price charts */}
          <div className="flex justify-center gap-1 mt-2 overflow-hidden">
            {getBoatPhotos(guestCount).map((photo, index) => (
              <img 
                key={index}
                src={photo} 
                alt={`${boatName} photo ${index + 1}`}
                className="h-[100px] w-auto object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
              />
            ))}
          </div>

          {/* Lightbox */}
          <Lightbox
            images={getBoatPhotos(guestCount)}
            initialIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
