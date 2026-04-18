import { Card, CardContent } from "@/quote-app/components/ui/card";
import { AlertCircle } from "lucide-react";

interface PricingComparisonProps {
  discoPerPerson: number;
  privatePerPerson: number;
  guestCount: number;
}

export const PricingComparison = ({ discoPerPerson, privatePerPerson, guestCount }: PricingComparisonProps) => {
  // Use the basic bach package price ($85) + tax (8.25%) + gratuity (20%) for disco
  const basicBachWithTaxTip = 85 * 1.0825 * 1.20; // $110.31
  const discoBasicPrice = Math.round(basicBachWithTaxTip * 100) / 100;
  
  const discoCheaper = discoBasicPrice < privatePerPerson;
  const privateCheaper = privatePerPerson < discoBasicPrice;
  const savings = Math.abs(discoBasicPrice - privatePerPerson);
  const totalSavings = savings * guestCount;

  return (
    <Card className="border-2 border-primary/30 bg-background bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-center">Per-Person Price Comparison</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border-2 ${discoCheaper ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Disco Cruise</p>
              <p className="text-2xl font-bold text-primary">${discoBasicPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">per person (Basic Bach)</p>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${privateCheaper ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Private Cruise</p>
              <p className="text-2xl font-bold text-primary">${privatePerPerson.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">per person (Standard)</p>
            </div>
          </div>
        </div>

        {privateCheaper && (
          <div className="bg-primary/10 border-l-4 border-primary p-4 rounded space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-bold">
                  Private is ${savings.toFixed(2)}/person cheaper (${totalSavings.toFixed(2)} total savings)
                </p>
                <p className="text-xs">
                  <span className="font-semibold">But wait!</span> The Disco Cruise gives you WAY more value:
                </p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• <strong>Professional DJ</strong> spinning all day long</li>
                  <li>• <strong>Professional Photographer</strong> with FREE photos sent after!</li>
                  <li>• <strong>Giant 25-ft Unicorn Float</strong> - Biggest in the Country!</li>
                  <li>• <strong>3 Giant Lily Pad Floats</strong> to lounge in style</li>
                  <li>• <strong>Meet other Bach parties</strong> celebrating with you!</li>
                  <li>• <strong>All-inclusive experience</strong> with setup, music, photos & more</li>
                </ul>
                <p className="text-xs font-bold text-primary mt-2">
                  💎 The Disco Cruise is an unforgettable EXPERIENCE, not just a boat ride!
                </p>
              </div>
            </div>
          </div>
        )}

        {discoCheaper && (
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-bold text-primary">
              🎉 Disco Cruise saves you ${savings.toFixed(2)}/person (${totalSavings.toFixed(2)} total)
            </p>
            <p className="text-xs mt-1">Plus you get DJ, photographer, floats & more included!</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <p className="font-semibold text-sm text-center">Disco Cruise Includes:</p>
            <ul className="text-xs space-y-1">
              <li>✓ Professional DJ</li>
              <li>✓ Pro Photographer & FREE Photos</li>
              <li>✓ Giant Unicorn & Lily Pad Floats</li>
              <li>✓ Party with Other Bach Groups</li>
              <li>✓ Cups, Koozies, Bubbles, Name Tags</li>
              <li>✓ All-Inclusive Experience</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-sm text-center">Private Cruise Includes:</p>
            <ul className="text-xs space-y-1">
              <li>✓ Your Private Boat & Captain</li>
              <li>✓ Empty Coolers</li>
              <li>✓ Premium Bluetooth Speaker</li>
              <li>✓ Restroom on Board</li>
              <li>✓ Plenty of Sun & Shade</li>
              <li className="text-muted-foreground italic">+ Optional Add-on Packages</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
