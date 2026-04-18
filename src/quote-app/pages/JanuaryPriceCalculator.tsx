import { JanuaryPricingCalculator } from "@/quote-app/components/pricing/JanuaryPricingCalculator";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";
import { StickyPricingNav } from "@/quote-app/components/pricing/StickyPricingNav";
import { ResponsivePresentationEmbed } from "@/quote-app/components/pricing/ResponsivePresentationEmbed";
import { SEOHead } from "@/quote-app/components/SEOHead";

const JanuaryPriceCalculator = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="January Sale - ATX Disco & Private Cruise Pricing | Premier Party Cruises"
        description="Book by Feb 5th and save up to $250! ATX Disco Cruises from $79/person. Private Lake Travis boat cruises for bachelorette parties, birthdays & groups."
        image="https://booking.premierpartycruises.com/og-images/january-calculator.png"
        url="/january-price-calculator"
      />
      <StickyPricingNav showPresentation={true} />
      
      <div id="calculator-section" className="p-4">
        <JanuaryPricingCalculator />
      </div>
      
      <div id="presentation-section">
        <ResponsivePresentationEmbed 
          embedUrl="https://atx-bachelorette-options-z7c5ysu.gamma.site/"
          linkUrl="https://atx-bachelorette-options-z7c5ysu.gamma.site/"
          title="ATX Bachelorette Cruise Options Presentation"
        />
      </div>
      
      <div id="booking-section" className="p-4 max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <p className="text-base sm:text-lg md:text-xl font-bold text-primary">
            Enter Code "<span className="text-orange-600">PREMIERNEWYEAR</span>" at Checkout Below for your $150-$250 Discount!
          </p>
        </div>
        <XolaBookingWidget />
      </div>
    </div>
  );
};

export default JanuaryPriceCalculator;