import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { DollarSign } from "lucide-react";
import { isDiscoEligiblePartyType } from "@/quote-app/lib/discoRules";

// Pricing detail slides
import privateCruise14 from "@/quote-app/assets/slides/private-cruise-14-details.png";
import privateCruise25 from "@/quote-app/assets/slides/private-cruise-25-details.png";
import privateCruise50 from "@/quote-app/assets/slides/private-cruise-50-details.png";
import discoCruisePricing from "@/quote-app/assets/slides/disco-cruise-pricing.png";
import discoCruiseFeatures from "@/quote-app/assets/slides/disco-cruise-features.png";
import bachelorComparison from "@/quote-app/assets/slides/bachelor-comparison.png";
import bacheloretteComparison from "@/quote-app/assets/slides/bachelorette-comparison.png";
import combinedBachComparison from "@/quote-app/assets/slides/combined-bach-comparison.png";

interface PricingDetailsTabProps {
  partyType: string;
  guestCount: number;
}

function getPrivateCruiseSlide(guestCount: number) {
  if (guestCount <= 14) return privateCruise14;
  if (guestCount <= 25) return privateCruise25;
  return privateCruise50;
}

function getPrivateCruiseLabel(guestCount: number) {
  if (guestCount <= 14) return "14-Person Private Cruise (Day Tripper)";
  if (guestCount <= 25) return "25-Person Private Cruise (Meeseeks / The Irony)";
  return "50-Person Private Cruise (Clever Girl)";
}

function getComparisonSlide(partyType: string) {
  const normalized = partyType.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized.includes("combined") || (normalized.includes("bachelor") && normalized.includes("bachelorette"))) {
    return combinedBachComparison;
  }
  if (normalized.includes("bachelorette")) return bacheloretteComparison;
  if (normalized.includes("bachelor")) return bachelorComparison;
  return bacheloretteComparison; // fallback for generic bach
}

export const PricingDetailsTab = ({ partyType, guestCount }: PricingDetailsTabProps) => {
  const isBach = isDiscoEligiblePartyType(partyType);
  const [subTab, setSubTab] = useState(isBach ? "overview" : "private");

  if (!isBach) {
    // Non-bach: just show the private cruise pricing for their group size
    return (
      <Card className="bg-slate-800/70 border-sky-500/20 text-white">
        <CardHeader>
          <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing & Details
          </CardTitle>
          <CardDescription className="text-slate-400">
            {getPrivateCruiseLabel(guestCount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <img
            src={getPrivateCruiseSlide(guestCount)}
            alt={getPrivateCruiseLabel(guestCount)}
            className="w-full rounded-lg"
            loading="lazy"
          />
        </CardContent>
      </Card>
    );
  }

  // Bach parties: show sub-tabs for Overview, Disco Cruise, and Private Cruise
  return (
    <Card className="bg-slate-800/70 border-sky-500/20 text-white">
      <CardHeader>
        <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing & Details
        </CardTitle>
        <CardDescription className="text-slate-400">
          Compare your cruise options — disco vs private
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
          <TabsList className="bg-slate-700/60 border border-sky-500/20 w-full h-auto p-1 gap-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm flex-1"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="disco"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-orange-500 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm flex-1"
            >
              🪩 ATX Disco Cruise
            </TabsTrigger>
            <TabsTrigger
              value="private"
              className="data-[state=active]:bg-sky-600 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm flex-1"
            >
              ⛵ Private Cruise
            </TabsTrigger>
          </TabsList>

          {/* Overview: side-by-side comparison for this bach type */}
          <TabsContent value="overview">
            <img
              src={getComparisonSlide(partyType)}
              alt="Disco vs Private Cruise Comparison"
              className="w-full rounded-lg"
              loading="lazy"
            />
          </TabsContent>

          {/* Disco Cruise details */}
          <TabsContent value="disco" className="space-y-6">
            <img
              src={discoCruiseFeatures.src}
              alt="ATX Disco Cruise Features"
              className="w-full rounded-lg"
              loading="lazy"
            />
            <img
              src={discoCruisePricing.src}
              alt="ATX Disco Cruise Pricing & Packages"
              className="w-full rounded-lg"
              loading="lazy"
            />
          </TabsContent>

          {/* Private Cruise details based on guest count */}
          <TabsContent value="private">
            <img
              src={getPrivateCruiseSlide(guestCount)}
              alt={getPrivateCruiseLabel(guestCount)}
              className="w-full rounded-lg"
              loading="lazy"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
