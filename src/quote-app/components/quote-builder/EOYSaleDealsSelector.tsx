import { Card, CardContent } from "@/quote-app/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Badge } from "@/quote-app/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/quote-app/lib/utils";

export type EOYDealType = 'nye-deposit' | 'nye-full';

interface EOYSaleDealsSelectorProps {
  selectedDeal: EOYDealType;
  onDealChange: (deal: EOYDealType) => void;
  isPrivateCruise: boolean;
  /**
   * Base subtotal BEFORE EOY deal discounts (no tax/gratuity), representing the "normal" booking subtotal.
   */
  basePrice: number;
  /**
   * Optional: subtotal to use when calculating the Pay-in-Full deal.
   * This lets us include perk line-items in the "original" subtotal so the discount cancels them out
   * without changing the displayed totals when toggling the radio.
   */
  fullDealBasePrice?: number;
  partyType?: string | null;
  ultimatePackageValue?: number; // Value of ultimate package (varies by boat size)
}

export const EOYSaleDealsSelector = ({
  selectedDeal,
  onDealChange,
  isPrivateCruise,
  basePrice,
  fullDealBasePrice,
  partyType,
  ultimatePackageValue = 300, // Default $300 for 25P boats
}: EOYSaleDealsSelectorProps) => {
  const discountAmount = 150; // $150 discount for booking within 10 days

  // Discounted option: $150 discount applies
  const discountedSubtotal = Math.max(0, basePrice - discountAmount);
  const discountedGratuity = Math.round(discountedSubtotal * 0.20 * 100) / 100;
  const discountedXolaFee = Math.round((discountedSubtotal + discountedGratuity) * 0.03 * 100) / 100;
  const discountedSalesTax = Math.round(discountedSubtotal * 0.0825 * 100) / 100;
  const discountedTotal = Math.round((discountedSubtotal + discountedXolaFee + discountedGratuity + discountedSalesTax) * 100) / 100;
  const discountedDepositAmount = Math.round(discountedTotal * 0.25);

  // Full price option: no discount
  const fullPriceSubtotal = basePrice;
  const fullPriceGratuity = Math.round(fullPriceSubtotal * 0.20 * 100) / 100;
  const fullPriceXolaFee = Math.round((fullPriceSubtotal + fullPriceGratuity) * 0.03 * 100) / 100;
  const fullPriceSalesTax = Math.round(fullPriceSubtotal * 0.0825 * 100) / 100;
  const fullPriceTotal = Math.round((fullPriceSubtotal + fullPriceXolaFee + fullPriceGratuity + fullPriceSalesTax) * 100) / 100;
  const fullPriceDepositAmount = Math.round(fullPriceTotal * 0.25);

  const deals = [
    {
      id: 'nye-deposit' as EOYDealType,
      title: `Book Within 10 Days`,
      totalPrice: discountedTotal,
      depositDue: discountedDepositAmount,
      hasDiscount: true,
      savings: "$150 Off",
      badge: "BEST VALUE",
      badgeColor: "bg-green-600",
      bgColor: "from-green-50 to-white dark:from-green-900/20 dark:to-card",
      borderColor: "border-green-500",
      ringColor: "ring-green-500/20",
      textColor: "text-green-600",
    },
    {
      id: 'nye-full' as EOYDealType,
      title: "Full Price",
      totalPrice: fullPriceTotal,
      depositDue: fullPriceDepositAmount,
      hasDiscount: false,
      savings: "After $150 Discount Expires",
      badge: `AFTER 10 DAYS`,
      badgeColor: "bg-gray-500",
      bgColor: "from-gray-50 to-white dark:from-gray-800/20 dark:to-card",
      borderColor: "border-gray-400",
      ringColor: "ring-gray-400/20",
      textColor: "text-gray-600",
    },
  ];

  return (
    <div className="space-y-3">
      {/* 2-Column Deal Comparison */}
      <RadioGroup
        value={selectedDeal}
        onValueChange={(value) => onDealChange(value as EOYDealType)}
        className="grid grid-cols-2 gap-3"
      >
        {deals.map((deal) => (
          <Card
            key={deal.id}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-md border-2 flex flex-col",
              `bg-gradient-to-b ${deal.bgColor}`,
              selectedDeal === deal.id
                ? `${deal.borderColor} ring-2 ${deal.ringColor} shadow-md`
                : "border-border hover:border-primary/50"
            )}
            onClick={() => onDealChange(deal.id)}
          >
            {/* Badge - 50% in/out of container, one line, less rounded */}
            <Badge className={cn(
              "absolute -top-3 left-1/2 transform -translate-x-1/2 text-white text-[10px] px-3 py-1 whitespace-nowrap rounded-sm shadow-md",
              deal.badgeColor
            )}>
              {deal.badge}
            </Badge>

            <CardContent className="pt-5 pb-3 px-3 flex flex-col flex-1">
              {/* Radio + Title - Fixed min height for alignment */}
              <div className="flex items-start gap-2 mb-2 min-h-[40px] sm:min-h-[44px]">
                <RadioGroupItem value={deal.id} id={deal.id} className="h-4 w-4 mt-0.5" />
                <Label htmlFor={deal.id} className="text-sm sm:text-base font-bold cursor-pointer">
                  {deal.title}
                </Label>
              </div>

              {/* Price Display - Fixed height deposit section */}
              <div className="text-center">
                <p className={cn("text-2xl sm:text-4xl font-bold", deal.textColor)}>
                  ${deal.depositDue.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  25% Deposit
                </p>
                {/* Savings text - fixed height for alignment */}
                <div className="min-h-[28px] sm:min-h-[32px] flex items-center justify-center">
                  <p className={cn(
                    "font-bold underline",
                    deal.hasDiscount ? "text-lg sm:text-xl text-green-600" : "text-xs text-gray-500"
                  )}>
                    {deal.savings}
                  </p>
                </div>
              </div>
              
              {/* Perks section - flex-1 to push total to bottom */}
              <div className="flex-1">
                {deal.hasDiscount ? (
                  <div className="mt-2 pt-2 border-t border-green-200 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-left">
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span>$150 Discount</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-left">
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span>25% Off Transportation</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-left">
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span>$50 Party On Delivery Voucher</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-left">
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span>$100 Airbnb Concierge Voucher</span>
                    </div>
                  </div>
                ) : (
                  /* Empty spacer for full price card to align with perks height */
                  <div className="mt-2 pt-2 border-t border-gray-200" />
                )}
              </div>
              
              {/* Total Price at bottom - always aligned */}
              <div className={cn(
                "mt-auto pt-2 border-t text-center",
                deal.hasDiscount ? "border-green-200" : "border-gray-200"
              )}>
                <p className="text-[10px] sm:text-xs font-semibold underline text-muted-foreground">Total Price</p>
                <p className={cn("text-base sm:text-lg font-bold", deal.textColor)}>
                  ${deal.totalPrice.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>
    </div>
  );
};
