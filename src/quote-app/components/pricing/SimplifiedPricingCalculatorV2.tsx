import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Label } from "@/quote-app/components/ui/label";
import { Slider } from "@/quote-app/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Button } from "@/quote-app/components/ui/button";
import { Lightbox } from "@/quote-app/components/ui/lightbox";
import { calculatePricing } from "@/quote-app/lib/pricing";
import { parse, addDays, format, isBefore, startOfDay } from "date-fns";
import { RefreshCw } from "lucide-react";

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

interface DeadlineOption {
  value: string;
  daysToAdd: number;
  discount: number;
  deadline: Date;
  label: string;
  isExpired: boolean;
}

interface SimplifiedPricingCalculatorV2Props {
  inquiryDate?: string | null;
  onResetTimeline?: () => void;
}

export const SimplifiedPricingCalculatorV2 = ({ 
  inquiryDate, 
  onResetTimeline 
}: SimplifiedPricingCalculatorV2Props) => {
  const [guestCount, setGuestCount] = useState(10);
  const [privatePackage, setPrivatePackage] = useState("standard");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [discoMimosa, setDiscoMimosa] = useState(false);
  const [discoSparkle, setDiscoSparkle] = useState(false);

  // Calculate deadline dates based on inquiry date
  const { deadlineOptions } = useMemo(() => {
    const baseDate = inquiryDate 
      ? parse(inquiryDate, "yyyy-MM-dd", new Date()) 
      : new Date();
    const today = startOfDay(new Date());
    
    const options: DeadlineOption[] = [
      { value: "72hours", daysToAdd: 3, discount: 250, deadline: new Date(), label: "", isExpired: false },
      { value: "7days", daysToAdd: 7, discount: 200, deadline: new Date(), label: "", isExpired: false },
      { value: "10days", daysToAdd: 10, discount: 150, deadline: new Date(), label: "", isExpired: false },
    ];

    options.forEach(opt => {
      opt.deadline = addDays(baseDate, opt.daysToAdd);
      opt.label = format(opt.deadline, "EEE M/d");
      opt.isExpired = isBefore(opt.deadline, today);
    });

    const allExpired = options.every(opt => opt.isExpired);
    
    return { deadlineOptions: options, allExpired };
  }, [inquiryDate]);

  // Find first non-expired option, or default to "none" if all expired
  const defaultOption = useMemo(() => {
    const firstValid = deadlineOptions.find(opt => !opt.isExpired);
    return firstValid?.value || "none";
  }, [deadlineOptions]);

  const [discountOption, setDiscountOption] = useState(defaultOption);

  const fixedDiscount = discountOption === "72hours" ? 250 : 
                        discountOption === "7days" ? 200 : 
                        discountOption === "10days" ? 150 : 0;

  const discoMimosaPrice = 100;
  const discoSparklePrice = 100;

  // Private: no automatic Ultimate package
  const ultimatePackagePrice = getUltimatePackagePrice(guestCount);
  const effectivePrivatePackage = privatePackage;

  const calculateDisco = (pricePerPerson: number) => {
    const base = pricePerPerson * guestCount;
    const addOnsCost = (discoMimosa ? discoMimosaPrice : 0) + (discoSparkle ? discoSparklePrice : 0);
    
    const subtotal = base + addOnsCost;
    const subtotalAfterDiscount = subtotal - fixedDiscount;
    const gratuity = subtotalAfterDiscount * 0.20;
    // Xola fee is calculated on subtotal + gratuity
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

    // Calculate package cost
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
    // Xola fee is calculated on subtotal + gratuity
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

  // Check if all deadline options have expired
  const allDeadlinesExpired = deadlineOptions.every(opt => opt.isExpired);
  const get72hrOption = deadlineOptions.find(opt => opt.value === "72hours");
  const get7dayOption = deadlineOptions.find(opt => opt.value === "7days");
  const get10dayOption = deadlineOptions.find(opt => opt.value === "10days");

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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 py-1.5 px-2.5">
        {/* EOY Sale Payment Options - Side by side on mobile */}
        <div className="bg-accent/30 rounded-lg p-2 border-2 border-yellow-500">
          <RadioGroup 
            value={discountOption} 
            onValueChange={(val) => {
              // Only allow selecting non-expired options
              const option = deadlineOptions.find(opt => opt.value === val);
              if (!option || !option.isExpired) {
                setDiscountOption(val);
              }
            }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0.5"
          >
            <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-green-200 sm:flex-col sm:p-0 sm:bg-transparent sm:border-0 sm:rounded-none">
              <RadioGroupItem 
                value="72hours" 
                id="72hours" 
                disabled={get72hrOption?.isExpired}
                className="shrink-0"
              />
              <Label 
                htmlFor="72hours" 
                className={`text-xs sm:text-sm cursor-pointer font-semibold leading-tight text-center ${get72hrOption?.isExpired ? 'line-through opacity-50' : ''}`}
              >
                <span className="block">Book by {get72hrOption?.label || "72h"}</span>
                <span className={`block text-sm sm:text-base font-bold ${get72hrOption?.isExpired ? 'text-red-400' : 'text-green-600'}`}>
                  {get72hrOption?.isExpired ? "(Expired)" : "($250 off)"}
                </span>
              </Label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-green-200 sm:flex-col sm:p-0 sm:bg-transparent sm:border-0 sm:rounded-none">
              <RadioGroupItem 
                value="7days" 
                id="7days"
                disabled={get7dayOption?.isExpired}
                className="shrink-0"
              />
              <Label 
                htmlFor="7days" 
                className={`text-xs sm:text-sm cursor-pointer font-semibold leading-tight text-center ${get7dayOption?.isExpired ? 'line-through opacity-50' : ''}`}
              >
                <span className="block">Book by {get7dayOption?.label || "7d"}</span>
                <span className={`block text-sm sm:text-base font-bold ${get7dayOption?.isExpired ? 'text-red-400' : 'text-green-600'}`}>
                  {get7dayOption?.isExpired ? "(Expired)" : "($200 off)"}
                </span>
              </Label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-green-200 sm:flex-col sm:p-0 sm:bg-transparent sm:border-0 sm:rounded-none">
              <RadioGroupItem 
                value="10days" 
                id="10days"
                disabled={get10dayOption?.isExpired}
                className="shrink-0"
              />
              <Label 
                htmlFor="10days" 
                className={`text-xs sm:text-sm cursor-pointer font-semibold leading-tight text-center ${get10dayOption?.isExpired ? 'line-through opacity-50' : ''}`}
              >
                <span className="block">Book by {get10dayOption?.label || "10d"}</span>
                <span className={`block text-sm sm:text-base font-bold ${get10dayOption?.isExpired ? 'text-red-400' : 'text-green-600'}`}>
                  {get10dayOption?.isExpired ? "(Expired)" : "($150 off)"}
                </span>
              </Label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-gray-200 sm:flex-col sm:p-0 sm:bg-transparent sm:border-0 sm:rounded-none">
              <RadioGroupItem value="none" id="no-discount" className="shrink-0" />
              <Label htmlFor="no-discount" className="text-xs sm:text-sm cursor-pointer font-semibold leading-tight">
                <span className="block">Full Price</span>
              </Label>
            </div>
          </RadioGroup>
          
          {/* Reset Timeline Button - only show when all deadlines expired and inquiryDate is set */}
          {allDeadlinesExpired && inquiryDate && onResetTimeline && (
            <div className="mt-2 text-center">
              <Button 
                onClick={onResetTimeline}
                variant="outline"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                One-Time Reset My Timeline!
              </Button>
            </div>
          )}
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
                  id="disco-mimosa-v2" 
                  checked={discoMimosa}
                  onChange={(e) => setDiscoMimosa(e.target.checked)}
                  className="h-4 w-4 rounded border-primary/20"
                />
                <Label htmlFor="disco-mimosa-v2" className="text-xs sm:text-sm cursor-pointer">
                  Mimosa Party Cooler (+$100)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="disco-sparkle-v2" 
                  checked={discoSparkle}
                  onChange={(e) => setDiscoSparkle(e.target.checked)}
                  className="h-4 w-4 rounded border-primary/20"
                />
                <Label htmlFor="disco-sparkle-v2" className="text-xs sm:text-sm cursor-pointer">
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
                  + Essentials (${guestCount <= 14 ? "100" : "150"})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ultimate" id="private-ultimate" />
                <Label htmlFor="private-ultimate" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                  + Ultimate Party Cruise (${ultimatePackagePrice})
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex flex-col md:grid md:grid-cols-3 gap-1 md:gap-0.5">
            {privateTimeSlots.map((slot) => {
              const pricing = calculatePrivate(slot.day);
              const perPerson = pricing.total / guestCount;
              return (
                <div key={slot.dayLabel} className="bg-slate-100 rounded-lg p-1.5 border-2 border-slate-300">
                  <h4 className="font-bold mb-0.5 text-center">
                    <span className="text-primary text-lg sm:text-xl block">{slot.dayLabel}</span>
                    <span className="text-primary text-lg sm:text-xl block">{slot.timeLabel}</span>
                  </h4>
                  <div className="space-y-0.5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-xs sm:text-sm">Base (4hr cruise)</span>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800">${pricing.subtotal.toFixed(0)}</span>
                    </div>
                    {pricing.packageCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-xs sm:text-sm">{pricing.packageName}</span>
                        <span className="font-semibold text-xs sm:text-sm text-slate-800">+${pricing.packageCost.toFixed(0)}</span>
                      </div>
                    )}
                    {fixedDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-700 font-semibold text-xs sm:text-sm">Sale Discount</span>
                        <span className="text-green-700 font-semibold text-xs sm:text-sm">-${fixedDiscount.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-xs sm:text-sm">Fees+Tax+Tip</span>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800">${(pricing.xolaFee + pricing.tax + pricing.gratuity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t border-slate-300">
                      <span className="font-bold text-xs text-slate-800">Group Total</span>
                      <span className="font-bold text-sm text-slate-900">${pricing.total.toFixed(0)}</span>
                    </div>
                    <div className="bg-white rounded px-1.5 py-0.5 mt-0.5 text-center border border-slate-200">
                      <div className="text-[10px] font-semibold text-slate-600">PER PERSON</div>
                      <div className="text-lg sm:text-xl font-bold text-slate-900">${perPerson.toFixed(2)}</div>
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
