import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Input } from "@/quote-app/components/ui/input";
import { useToast } from "@/quote-app/hooks/use-toast";
import { calculatePricing } from "@/quote-app/lib/pricing";
import { Ship, Sparkles } from "lucide-react";

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

const PricingChart = () => {
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
    const sendHeight = () => {
      if (window.parent !== window) {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage(
          { type: 'pricing-chart-resize', height },
          '*'
        );
      }
    };

    // Send initial height
    sendHeight();

    // Send height on content changes
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);

    return () => observer.disconnect();
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
        className={`p-4 rounded-lg cursor-pointer transition-all ${
          isSelected 
            ? "bg-primary text-primary-foreground shadow-md" 
            : "bg-card hover:bg-accent"
        }`}
        onClick={() => {
          setSelectedDay(day);
          setSelectedPackage(null);
        }}
      >
        <div className="font-semibold mb-2 text-center">{label}</div>
        <div className="space-y-1 text-sm">
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

  const getDiscountAmount = (): number => {
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
      const discount = getDiscountAmount();
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
      
      const discount = getDiscountAmount();
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
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Pricing Chart</h1>
              <p className="text-muted-foreground">Select your cruise type, boat capacity, and day to see pricing</p>
            </div>
            <Tabs value={cruiseType} onValueChange={(v) => setCruiseType(v as "private" | "disco")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="private" className="flex items-center justify-center gap-1 text-sm sm:text-lg px-2 sm:px-4">
              <Ship className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Private Cruise</span>
              <span className="sm:hidden">Private</span>
            </TabsTrigger>
            <TabsTrigger value="disco" className="flex items-center justify-center gap-1 text-sm sm:text-lg px-2 sm:px-4">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Disco Cruise</span>
              <span className="sm:hidden">Disco</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="private" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Boat Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedCapacity} onValueChange={(v) => {
                  setSelectedCapacity(v as BoatCapacity);
                  setSelectedDay(null);
                  setSelectedPackage(null);
                  setGuestRange(null);
                }}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="1-14" className="text-xs sm:text-sm">1-14</TabsTrigger>
                    <TabsTrigger value="15-30" className="text-xs sm:text-sm">15-30</TabsTrigger>
                    <TabsTrigger value="31-75" className="text-xs sm:text-sm">31-75</TabsTrigger>
                  </TabsList>

                  <TabsContent value={selectedCapacity} className="mt-6">
                    <div className="mb-4 p-4 bg-accent rounded-lg">
                      <p className="font-semibold">Selected Boat: {getBoatName(selectedCapacity)}</p>
                      <p className="text-sm text-muted-foreground mt-1">Click on a day below to select</p>
                    </div>

                    {(selectedCapacity === "15-30" || selectedCapacity === "31-75") && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {renderPricingRow("mon-thu", "Monday - Thursday")}
                      {renderPricingRow("fri", "Friday")}
                      {renderPricingRow("sat", "Saturday")}
                      {renderPricingRow("sun", "Sunday")}
                    </div>

                    {selectedDay && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">Add Package (Optional)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card 
                            className={`cursor-pointer transition-all ${
                              selectedPackage === "essentials" 
                                ? "border-primary shadow-md" 
                                : "hover:border-accent"
                            }`}
                            onClick={() => setSelectedPackage(selectedPackage === "essentials" ? null : "essentials")}
                          >
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-2">Essentials Package</h4>
                              <p className="text-2xl font-bold text-primary mb-2">
                                +${getPackagePrice(selectedCapacity, "essentials")}
                              </p>
                              <p className="text-sm text-muted-foreground">Bluetooth speaker, cooler with ice, cups & plates</p>
                            </CardContent>
                          </Card>

                          <Card 
                            className={`cursor-pointer transition-all ${
                              selectedPackage === "ultimate" 
                                ? "border-primary shadow-md" 
                                : "hover:border-accent"
                            }`}
                            onClick={() => setSelectedPackage(selectedPackage === "ultimate" ? null : "ultimate")}
                          >
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-2">Ultimate Disco Party Package</h4>
                              <p className="text-2xl font-bold text-primary mb-2">
                                +${getPackagePrice(selectedCapacity, "ultimate")}
                              </p>
                              <p className="text-sm text-muted-foreground">Premium sound system, disco lights, decorations, cooler with ice, full party setup</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disco" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Disco Cruise Packages</CardTitle>
                <p className="text-sm text-muted-foreground">Available Friday & Saturday, March - October on Clever Girl</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card 
                    className={`cursor-pointer transition-all ${
                      discoPackage === "basic" 
                        ? "border-primary shadow-md" 
                        : "hover:border-accent"
                    }`}
                    onClick={() => setDiscoPackage("basic")}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Basic Bach Package</h4>
                      <p className="text-3xl font-bold text-primary mb-2">$85</p>
                      <p className="text-sm text-muted-foreground mb-3">per person</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
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
                    className={`cursor-pointer transition-all ${
                      discoPackage === "disco-queen" 
                        ? "border-primary shadow-md" 
                        : "hover:border-accent"
                    }`}
                    onClick={() => setDiscoPackage("disco-queen")}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Disco Queen Package</h4>
                      <p className="text-3xl font-bold text-primary mb-2">$95</p>
                      <p className="text-sm text-muted-foreground mb-3">per person</p>
                      <p className="text-xs font-semibold mb-2">Everything in Basic Bach + Premium Upgrades:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
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
                    className={`cursor-pointer transition-all ${
                      discoPackage === "super-sparkle" 
                        ? "border-primary shadow-md" 
                        : "hover:border-accent"
                    }`}
                    onClick={() => setDiscoPackage("super-sparkle")}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Super Sparkle Platinum</h4>
                      <p className="text-3xl font-bold text-primary mb-2">$105</p>
                      <p className="text-sm text-muted-foreground mb-3">per person</p>
                      <p className="text-xs font-semibold mb-2">Everything in Disco Queen + Ultimate VIP:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
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
                  <div className="mt-6">
                    <label className="block text-sm font-medium mb-2">Number of Tickets</label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDiscoTickets(Math.max(1, discoTickets - 1))}
                      >
                        -
                      </Button>
                      <span className="text-2xl font-bold w-16 text-center">{discoTickets}</span>
                      <Button
                        variant="outline"
                        size="icon"
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
              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4">Choose Discount</h3>
                <RadioGroup 
                  value={discountType || ""} 
                  onValueChange={(v) => setDiscountType(v as "200" | "300" | "code")}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="300" id="disc-300" />
                    <Label htmlFor="disc-300" className="cursor-pointer">
                      $300 Discount (Book by Friday 10/24)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="200" id="disc-200" />
                    <Label htmlFor="disc-200" className="cursor-pointer">
                      $200 Discount (Book by Friday 10/31)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="code" id="disc-code" />
                    <Label htmlFor="disc-code" className="cursor-pointer">Enter Discount Code</Label>
                  </div>
                </RadioGroup>
                
                {discountType === "code" && (
                  <div className="mt-3 flex gap-2">
                    <Input 
                      placeholder="Enter discount code" 
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button variant="outline" size="sm">Apply</Button>
                  </div>
                )}
              </div>
            )}

            {/* Per Person Price for Disco (after discount) */}
            {cruiseType === "disco" && discoPackage && summary && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Price per person after discount</p>
                <p className="text-3xl font-bold text-primary">
                  ${(summary.total / discoTickets).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per person</p>
              </div>
            )}

            {/* Booking Summary */}
            {summary && (
              <div className="mt-8 pt-8 border-t">
                <h2 className="text-2xl font-bold mb-6 text-center">Booking Summary</h2>
              <div className="space-y-3">
                {cruiseType === "private" ? (
                  <>
                    <div className="flex justify-between">
                      <span>Boat:</span>
                      <span className="font-medium">{getBoatName(selectedCapacity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4-Hour Subtotal:</span>
                      <span className="font-medium">${summary.subtotal.toLocaleString()}</span>
                    </div>
                    {summary.additionalCrew > 0 && (
                      <div className="flex justify-between">
                        <span>Additional Crew:</span>
                        <span className="font-medium">${summary.additionalCrew.toLocaleString()}</span>
                      </div>
                    )}
                    {summary.extraCrew > 0 && (
                      <div className="flex justify-between">
                        <span>Extra Crew Charge:</span>
                        <span className="font-medium">${summary.extraCrew.toLocaleString()}</span>
                      </div>
                    )}
                    {summary.packagePrice > 0 && (
                      <div className="flex justify-between">
                        <span>Package Add-on:</span>
                        <span className="font-medium">${summary.packagePrice.toLocaleString()}</span>
                      </div>
                    )}
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">-${summary.discount.toLocaleString()}</span>
                      </div>
                    )}
                    {'xolaFee' in summary && (
                      <div className="flex justify-between">
                        <span>Xola Fee (3%):</span>
                        <span className="font-medium">${summary.xolaFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Sales Tax (8.25%):</span>
                      <span className="font-medium">${summary.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gratuity (20%):</span>
                      <span className="font-medium">${summary.gratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Package:</span>
                      <span className="font-medium capitalize">{discoPackage?.replace("-", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tickets:</span>
                      <span className="font-medium">{discoTickets} x ${getDiscoPackagePrice(discoPackage!)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">${summary.subtotal.toLocaleString()}</span>
                    </div>
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">-${summary.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Xola Fee (3%):</span>
                      <span className="font-medium">${summary.xolaFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales Tax (8.25%):</span>
                      <span className="font-medium">${summary.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gratuity (20%):</span>
                      <span className="font-medium">${summary.gratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                
                <div className="border-t pt-3 flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-primary">${summary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                  <Button 
                    className="w-full mt-4" 
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
  );
};

export default PricingChart;
