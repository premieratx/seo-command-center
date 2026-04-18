import { SimplifiedPricingCalculatorV2 } from "@/quote-app/components/pricing/SimplifiedPricingCalculatorV2";
import { SEOHead } from "@/quote-app/components/SEOHead";

const DiscoVsPrivate = () => {
  return (
    <>
      <SEOHead 
        title="Disco Cruise vs Private Cruise - Compare Options | Premier Party Cruises"
        description="Compare disco party cruises and private boat charters on Lake Travis. Find the perfect option for your bachelor party, bachelorette, or group event."
        image="/og-images/disco-vs-private.png"
        url="/disco-vs-private"
      />
      <div className="min-h-screen p-4 bg-background">
        <SimplifiedPricingCalculatorV2 />
      </div>
    </>
  );
};

export default DiscoVsPrivate;
