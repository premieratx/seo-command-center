import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { calculatePricing } from "@/quote-app/lib/pricing";
import { parse } from "date-fns";
import { Users, Heart, Sparkles } from "lucide-react";

type PartyType = "bachelor" | "bachelorette" | "combined";
type TimeSlot = "friday-12-4" | "saturday-11-3" | "saturday-330-730";

const timeSlotData: Record<TimeSlot, { label: string; price: number; day: number; dayName: string }> = {
  "friday-12-4": { label: "Friday 12-4pm", price: 95, day: 5, dayName: "Friday" },
  "saturday-11-3": { label: "Saturday 11am-3pm", price: 105, day: 6, dayName: "Saturday" },
  "saturday-330-730": { label: "Saturday 3:30-7:30pm", price: 85, day: 6, dayName: "Saturday" }
};

const partyTypeData: Record<PartyType, { label: string; sparklePackage: string; sparklePrice: number; icon: typeof Users }> = {
  bachelor: { label: "Bachelor", sparklePackage: "Manly Sparkle Package", sparklePrice: 100, icon: Users },
  bachelorette: { label: "Bachelorette", sparklePackage: "Sparkle Bride Package", sparklePrice: 100, icon: Heart },
  combined: { label: "Combined Bach", sparklePackage: "Sparkle Together Package", sparklePrice: 150, icon: Sparkles }
};

const getBoatInfo = (guestCount: number): { name: string; maxCapacity: number } => {
  if (guestCount <= 14) return { name: "Day Tripper", maxCapacity: 14 };
  if (guestCount <= 30) return { name: "Meeseeks/The Irony", maxCapacity: 30 };
  return { name: "Clever Girl", maxCapacity: 75 };
};

export const DiscoCalculator = () => {
  const [partyType, setPartyType] = useState<PartyType>("bachelor");
  const [guestCount, setGuestCount] = useState(10);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("friday-12-4");
  const [includePackages, setIncludePackages] = useState<"none" | "mimosa" | "sparkle" | "both">("none");
  const [privatePackage, setPrivatePackage] = useState<"standard" | "essentials" | "ultimate">("standard");

  const slotData = timeSlotData[timeSlot];
  const partyData = partyTypeData[partyType];
  const boatInfo = getBoatInfo(guestCount);
  const basePerPerson = slotData.price;
  const groupBase = basePerPerson * guestCount;
  
  const mimosaCooler = includePackages === "mimosa" || includePackages === "both" ? 100 : 0;
  const sparklePackage = includePackages === "sparkle" || includePackages === "both" ? partyData.sparklePrice : 0;
  
  const discoGroupTotal = groupBase + mimosaCooler + sparklePackage;
  const discoGratuity = discoGroupTotal * 0.20;
  // Xola fee is calculated on groupTotal + gratuity
  const discoXolaFee = (discoGroupTotal + discoGratuity) * 0.03;
  const discoTax = discoGroupTotal * 0.0825;
  const discoTotal = discoGroupTotal + discoXolaFee + discoTax + discoGratuity;
  const discoPerPerson = discoTotal / guestCount;

  const sampleDate = parse("2025-01-01", "yyyy-MM-dd", new Date());
  sampleDate.setDate(sampleDate.getDate() + slotData.day - sampleDate.getDay());
  
  const privateDuration = 4;
  const privateStandard = calculatePricing({ 
    date: sampleDate, 
    guestCount, 
    duration: privateDuration,
    boatCapacity: guestCount <= 14 ? 14 : guestCount <= 30 ? 30 : 75,
    crewFeePerHour: 0
  });

  const essentialsPackage = guestCount <= 14 ? 100 : guestCount <= 30 ? 150 : 200;
  const ultimatePackage = guestCount <= 14 ? 250 : guestCount <= 30 ? 300 : 350;

  const privateEssentials = {
    ...privateStandard,
    total: privateStandard.total + essentialsPackage
  };

  const privateUltimate = {
    ...privateStandard,
    total: privateStandard.total + ultimatePackage
  };

  return (
    <Card className="w-full max-w-[95vw] mx-auto">
      <CardHeader className="pb-2 pt-2">
        <CardTitle className="text-xl font-bold">Disco vs Private Cruise Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 py-2">
        {/* Steps 1-3 Across Top */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-accent/30 rounded-lg p-2 border-2 border-border relative">
            <div className="absolute top-1 left-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs">1</div>
            <div className="mt-4 space-y-1">
              <Label className="text-xs font-bold">Party Type</Label>
              <RadioGroup value={partyType} onValueChange={(v) => setPartyType(v as PartyType)} className="space-y-0.5">
                {(Object.entries(partyTypeData) as [PartyType, typeof partyTypeData[PartyType]][]).map(([key, data]) => {
                  const IconComponent = data.icon;
                  return (
                    <div key={key} className="flex items-center space-x-1">
                      <RadioGroupItem value={key} id={`party-${key}`} className="h-3.5 w-3.5" />
                      <Label htmlFor={`party-${key}`} className="cursor-pointer flex items-center gap-1 text-xs font-medium leading-none">
                        <IconComponent className="w-3.5 h-3.5" />
                        {data.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          </div>

          <div className="bg-accent/30 rounded-lg p-2 border-2 border-border relative">
            <div className="absolute top-1 left-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs">2</div>
            <div className="mt-4 space-y-1">
              <Label className="text-xs font-bold">Number of Guests</Label>
              <Tabs value={guestCount.toString()} onValueChange={(v) => setGuestCount(parseInt(v))} className="w-full">
                <TabsList className="grid grid-cols-9 h-auto gap-0.5 w-full p-0.5">
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => (
                    <TabsTrigger key={num} value={num.toString()} className="px-1 py-0.5 text-[10px] h-5 min-w-0 font-medium">
                      {num}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="bg-accent/30 rounded-lg p-2 border-2 border-border relative">
            <div className="absolute top-1 left-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs">3</div>
            <div className="mt-4 space-y-1">
              <Label className="text-xs font-bold">Time Slot</Label>
              <RadioGroup value={timeSlot} onValueChange={(v) => setTimeSlot(v as TimeSlot)} className="space-y-0.5">
                {Object.entries(timeSlotData).map(([key, data]) => (
                  <div key={key} className="flex items-center space-x-1">
                    <RadioGroupItem value={key} id={`slot-${key}`} className="h-3.5 w-3.5" />
                    <Label htmlFor={`slot-${key}`} className="cursor-pointer text-xs font-medium leading-none">
                      {data.label} ${data.price}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Main Results - Two Columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left: Disco Cruise */}
          <div className="space-y-1.5">
            <div className="bg-primary/5 rounded-lg p-2 border-2 border-primary/20">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-base font-bold text-primary">🎉 Disco Cruise</h3>
                <span className="text-xs text-muted-foreground font-semibold">{guestCount} guests</span>
              </div>

              {/* Packages Inside Disco Box */}
              <div className="mb-1.5 pb-1.5 border-b border-primary/20">
                <Label className="text-xs font-bold mb-1 block">Add-On Packages</Label>
                <RadioGroup value={includePackages} onValueChange={(v) => setIncludePackages(v as any)} className="grid grid-cols-4 gap-1">
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="disco-none" className="h-3.5 w-3.5" />
                    <Label htmlFor="disco-none" className="cursor-pointer text-[10px] font-medium whitespace-nowrap">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="mimosa" id="disco-mimosa" className="h-3.5 w-3.5" />
                    <Label htmlFor="disco-mimosa" className="cursor-pointer text-[10px] font-medium whitespace-nowrap">Mimosa +$100</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="sparkle" id="disco-sparkle" className="h-3.5 w-3.5" />
                    <Label htmlFor="disco-sparkle" className="cursor-pointer text-[10px] font-medium whitespace-nowrap">Sparkle +${partyData.sparklePrice}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="both" id="disco-both" className="h-3.5 w-3.5" />
                    <Label htmlFor="disco-both" className="cursor-pointer text-[10px] font-medium whitespace-nowrap">Both +${100 + partyData.sparklePrice}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Base ({guestCount} × ${basePerPerson})</span>
                  <span className="font-semibold">${groupBase.toFixed(0)}</span>
                </div>
                {mimosaCooler > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Mimosa Cooler</span>
                    <span className="font-semibold">${mimosaCooler}</span>
                  </div>
                )}
                {sparklePackage > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Sparkle Package</span>
                    <span className="font-semibold">${sparklePackage}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Fees + Tax + Tip</span>
                  <span className="font-semibold">${(discoXolaFee + discoTax + discoGratuity).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-primary/30 mt-1">
                  <span className="font-bold text-xs">Group Total</span>
                  <span className="font-bold text-sm">${discoTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-primary/10 rounded-lg px-2 py-1.5 mt-1">
                  <span className="font-bold text-xs">PER PERSON</span>
                  <span className="font-bold text-2xl text-primary">${discoPerPerson.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Private Cruise */}
          <div className="space-y-1.5">
            <div className="bg-accent/50 rounded-lg p-2 border-2 border-accent">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-base font-bold">🚤 Private - {slotData.dayName}</h3>
                <span className="text-xs text-muted-foreground font-semibold">{guestCount} guests ({boatInfo.name})</span>
              </div>

              {/* Package Selection Inside Private Box */}
              <div className="mb-1.5 pb-1.5 border-b border-border">
                <Label className="text-xs font-bold mb-1 block">Package Level</Label>
                <RadioGroup value={privatePackage} onValueChange={(v) => setPrivatePackage(v as any)} className="grid grid-cols-3 gap-1">
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="standard" id="private-standard" className="h-3.5 w-3.5" />
                    <Label htmlFor="private-standard" className="cursor-pointer text-[10px] font-medium whitespace-nowrap">Standard</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="essentials" id="private-essentials" className="h-3.5 w-3.5" />
                    <Label htmlFor="private-essentials" className="cursor-pointer text-[10px] font-medium whitespace-nowrap">Essentials +${essentialsPackage}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="ultimate" id="private-ultimate" className="h-3.5 w-3.5" />
                    <Label htmlFor="private-ultimate" className="cursor-pointer text-[10px] font-medium whitespace-nowrap">Ultimate +${ultimatePackage}</Label>
                  </div>
                </RadioGroup>
              </div>

              {(() => {
                const selectedPrivate = privatePackage === "standard" ? privateStandard : 
                                        privatePackage === "essentials" ? privateEssentials : 
                                        privateUltimate;
                const packageAmount = privatePackage === "standard" ? 0 :
                                      privatePackage === "essentials" ? essentialsPackage :
                                      ultimatePackage;
                
                return (
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Subtotal</span>
                      <span className="font-semibold">${privateStandard.subtotal.toFixed(0)}</span>
                    </div>
                    {packageAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">{privatePackage === "essentials" ? "Essentials" : "Ultimate"} Package</span>
                        <span className="font-semibold">${packageAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Fees + Tax + Tip</span>
                      <span className="font-semibold">${(privateStandard.xolaFee + privateStandard.tax + privateStandard.gratuity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border mt-1">
                      <span className="font-bold text-xs">Group Total</span>
                      <span className="font-bold text-sm">${selectedPrivate.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-accent/30 rounded-lg px-2 py-1.5 mt-1">
                      <span className="font-bold text-xs">PER PERSON</span>
                      <span className="font-bold text-2xl">${(selectedPrivate.total / guestCount).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* What You Get - Bottom - 3 columns */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-primary/5 rounded-lg p-2 border-2 border-primary/20">
            <h5 className="font-bold mb-1 text-primary text-xs">✨ What You Get - Disco</h5>
            <ul className="space-y-0.5 leading-tight text-[10px] text-muted-foreground font-medium">
              <li>• 4hr DJ cruise, 25 max capacity</li>
              <li>• BYOB allowed</li>
              {mimosaCooler > 0 && <li className="text-primary font-semibold">✓ Mimosa Cooler Package</li>}
              {sparklePackage > 0 && <li className="text-primary font-semibold">✓ Sparkle Package</li>}
            </ul>
          </div>
          
          {/* Savings Breakdown in Middle */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-2 border-2 border-green-300">
            <h4 className="text-xs font-bold mb-1 text-center">💰 Savings Breakdown</h4>
            <div className="space-y-1">
              {(() => {
                const selectedPrivate = privatePackage === "standard" ? privateStandard : 
                                        privatePackage === "essentials" ? privateEssentials : 
                                        privateUltimate;
                const comparison = selectedPrivate.total - discoTotal;
                const isSavings = comparison > 0;
                const perPersonDiff = comparison / guestCount;
                
                return (
                  <div className="bg-white/90 rounded-lg px-2 py-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-semibold whitespace-nowrap">
                        Disco vs {privatePackage === "standard" ? "Standard" : privatePackage === "essentials" ? "Essentials" : "Ultimate"}
                      </span>
                      <div className="text-right">
                        <div className={`font-bold text-sm ${isSavings ? 'text-green-700' : 'text-red-700'}`}>
                          {isSavings ? '✓ Save' : '⚠ Extra'} ${Math.abs(comparison).toFixed(0)}
                        </div>
                        <div className={`text-[9px] font-medium ${isSavings ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(perPersonDiff).toFixed(2)}/person
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="bg-accent/30 rounded-lg p-2 border-2 border-border">
            <h5 className="font-bold mb-1 text-xs">🛥️ What You Get - Private</h5>
            <ul className="space-y-0.5 leading-tight text-[10px] text-muted-foreground font-medium">
              <li>• Private boat rental</li>
              <li>• Custom itinerary</li>
              <li>• Captain + crew included</li>
              <li>• BYOB with coolers provided</li>
              {privatePackage === "essentials" && <li className="text-foreground font-semibold">✓ Essentials Package</li>}
              {privatePackage === "ultimate" && <li className="text-foreground font-semibold">✓ Ultimate Package</li>}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
