import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Label } from "@/quote-app/components/ui/label";
import { Slider } from "@/quote-app/components/ui/slider";
import { calculatePricing } from "@/quote-app/lib/pricing";
import { parse } from "date-fns";

const discoTimeSlots = [
  { label: "Friday 12-4pm ($95/person)", price: 95, day: 5 },
  { label: "Saturday 11-3pm ($105/person)", price: 105, day: 6 },
  { label: "Saturday 3:30-7:30pm ($85/person)", price: 85, day: 6 }
];

const privateTimeSlots = [
  { label: "Friday (12-4pm or 4:30-8:30pm)", day: 5 },
  { label: "Saturday (11am-3pm or 3:30-7:30pm)", day: 6 },
  { label: "Sunday (11am-3pm or 3:30-7:30pm)", day: 0 }
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

export const SimplifiedPricingCalculator = () => {
  const [guestCount, setGuestCount] = useState(10);

  const calculateDisco = (pricePerPerson: number) => {
    const base = pricePerPerson * guestCount;
    const gratuity = base * 0.20;
    // Xola fee is calculated on base + gratuity
    const xolaFee = (base + gratuity) * 0.03;
    const tax = base * 0.0825;
    const total = base + xolaFee + tax + gratuity;
    return { base, xolaFee, tax, gratuity, total, perPerson: total / guestCount };
  };

  const calculatePrivate = (dayOfWeek: number) => {
    const sampleDate = parse("2025-01-01", "yyyy-MM-dd", new Date());
    const dayDiff = dayOfWeek - sampleDate.getDay();
    sampleDate.setDate(sampleDate.getDate() + dayDiff);
    
    return calculatePricing({
      date: sampleDate,
      guestCount,
      duration: 4,
      boatCapacity: getBoatCapacity(guestCount),
      crewFeePerHour: 0
    });
  };

  const boatName = getBoatName(guestCount);

  return (
    <Card className="w-full max-w-[95vw] mx-auto">
      <CardHeader className="pb-1 pt-1.5">
        <CardTitle className="text-lg font-bold">Quick Pricing Calculator - Version 1</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 py-1">
        {/* Guest Count Slider */}
        <div className="bg-accent/30 rounded-lg p-2 border-2 border-border">
          <Label className="text-sm font-bold mb-1 block">Number of Guests: {guestCount}</Label>
          <Slider
            value={[guestCount]}
            onValueChange={(v) => setGuestCount(v[0])}
            min={1}
            max={30}
            step={1}
            className="w-full"
          />
        </div>

        {/* Disco Cruise Pricing Row */}
        <div>
          <h3 className="text-sm font-bold mb-1">ATX Disco Cruise Pricing</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {discoTimeSlots.map((slot) => {
              const pricing = calculateDisco(slot.price);
              return (
                <div key={slot.label} className="bg-primary/5 rounded-lg p-3 border-2 border-primary/20">
                  <h4 className="text-base font-bold text-primary mb-1">{slot.label}</h4>
                  <div className="space-y-1 text-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">${pricing.base.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fees+Tax+Tip</span>
                      <span className="font-semibold">${(pricing.xolaFee + pricing.tax + pricing.gratuity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-primary/20">
                      <span className="font-bold text-lg">Group Total</span>
                      <span className="font-bold text-xl">${pricing.total.toFixed(0)}</span>
                    </div>
                    <div className="bg-primary/10 rounded px-3 py-1.5 mt-1 text-center">
                      <div className="text-base font-semibold">PER PERSON</div>
                      <div className="text-4xl font-bold text-primary">${pricing.perPerson.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Private Cruise Pricing Row */}
        <div>
          <h3 className="text-sm font-bold mb-1">Private Cruise Pricing ({boatName})</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {privateTimeSlots.map((slot) => {
              const pricing = calculatePrivate(slot.day);
              const perPerson = pricing.total / guestCount;
              return (
                <div key={slot.label} className="bg-accent/50 rounded-lg p-3 border-2 border-border">
                  <h4 className="text-base font-bold mb-1">{slot.label}</h4>
                  <div className="space-y-1 text-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">${pricing.subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fees+Tax+Tip</span>
                      <span className="font-semibold">${(pricing.xolaFee + pricing.tax + pricing.gratuity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border">
                      <span className="font-bold text-lg">Group Total</span>
                      <span className="font-bold text-xl">${pricing.total.toFixed(0)}</span>
                    </div>
                    <div className="bg-accent/30 rounded px-3 py-1.5 mt-1 text-center">
                      <div className="text-base font-semibold">PER PERSON</div>
                      <div className="text-4xl font-bold">${perPerson.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
