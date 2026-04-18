import { useSearchParams } from "react-router-dom";
import { SimplifiedPricingCalculatorV2 } from "@/quote-app/components/pricing/SimplifiedPricingCalculatorV2";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";
import { StickyPricingNav } from "@/quote-app/components/pricing/StickyPricingNav";
import { ResponsivePresentationEmbed } from "@/quote-app/components/pricing/ResponsivePresentationEmbed";

const EmbedPricingCalculatorV2 = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const inquiryDate = searchParams.get("inquiryDate");

  const handleResetTimeline = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearchParams({ inquiryDate: today });
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyPricingNav showPresentation={true} />
      
      <div id="calculator-section" className="p-4">
        <SimplifiedPricingCalculatorV2 
          inquiryDate={inquiryDate} 
          onResetTimeline={handleResetTimeline}
        />
      </div>
      
      <div id="presentation-section">
        <ResponsivePresentationEmbed 
          embedUrl="https://atx-bachelorette-options-z7c5ysu.gamma.site/"
          linkUrl="https://atx-bachelorette-options-z7c5ysu.gamma.site/"
          title="ATX Bachelorette Cruise Options Presentation"
        />
      </div>
      
      <div id="booking-section" className="p-4 max-w-4xl mx-auto">
        <XolaBookingWidget />
      </div>
    </div>
  );
};

export default EmbedPricingCalculatorV2;