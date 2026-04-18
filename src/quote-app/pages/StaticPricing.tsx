import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Download } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/quote-app/hooks/use-toast";
import html2canvas from "html2canvas";
import { DiscoCalculator } from "@/quote-app/components/pricing/DiscoCalculator";
import { SimplifiedPricingCalculator } from "@/quote-app/components/pricing/SimplifiedPricingCalculator";
import { SimplifiedPricingCalculatorV2 } from "@/quote-app/components/pricing/SimplifiedPricingCalculatorV2";
import { SimplifiedPricingCalculatorV3 } from "@/quote-app/components/pricing/SimplifiedPricingCalculatorV3";
import { EmbedCodeDisplay } from "@/quote-app/components/pricing/EmbedCodeDisplay";

// Helper function to calculate pricing with package and crew fee
const calculateWithPackage = (hourlyRate: number, packageCost: number = 0, crewFeePerHour: number = 0) => {
  const hours = 4;
  const crewFeeTotal = crewFeePerHour * hours;
  const subtotal = (hourlyRate * hours) + packageCost + crewFeeTotal;
  const gratuity = subtotal * 0.20;
  // Xola fee is calculated on subtotal + gratuity (3%), tax is on subtotal (8.25%)
  const xolaFee = (subtotal + gratuity) * 0.03;
  const tax = subtotal * 0.0825;
  const taxAndFees = tax + xolaFee;
  const total = subtotal + taxAndFees + gratuity;
  
  return {
    hourlyRate,
    subtotal,
    taxAndFees,
    gratuity,
    total,
    packageCost,
    crewFeeTotal,
    crewFeePerHour
  };
};

// Helper function to calculate disco cruise per-person pricing
// Packages are per-group, not per-person
const calculateDiscoPerPerson = (
  perPersonPrice: number, 
  mimosaCooler: number = 0,
  sparklePackage: number = 0,
  guestCount: number = 20
) => {
  const groupBase = perPersonPrice * guestCount;
  const groupTotal = groupBase + mimosaCooler + sparklePackage;
  const gratuity = groupTotal * 0.20;
  // Xola fee is calculated on groupTotal + gratuity
  const xolaFee = (groupTotal + gratuity) * 0.03;
  const tax = groupTotal * 0.0825;
  const total = groupTotal + xolaFee + tax + gratuity;
  
  return {
    groupBase,
    mimosaCooler,
    sparklePackage,
    groupTotal,
    xolaFee,
    tax,
    gratuity,
    total,
    perPerson: total / guestCount
  };
};

// Helper component for a pricing column
const PricingColumn = ({ 
  day, 
  hourlyRate, 
  packageCost = 0,
  packageName = "",
  crewFeePerHour = 0
}: { 
  day: string; 
  hourlyRate: number; 
  packageCost?: number;
  packageName?: string;
  crewFeePerHour?: number;
}) => {
  const pricing = calculateWithPackage(hourlyRate, packageCost, crewFeePerHour);
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-4 shadow-md">
      <h3 className="font-bold mb-3 text-center text-[#3b82f6] text-lg">{day}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">Hourly Rate:</span>
          <span className="font-semibold">${hourlyRate}/hr</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-gray-700">4-Hour Subtotal:</span>
          <span className="font-semibold">${(hourlyRate * 4).toFixed(0)}</span>
        </div>
        {crewFeePerHour > 0 && (
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-700">Additional Crew Fee:</span>
            <span className="font-semibold">${pricing.crewFeeTotal.toFixed(0)}</span>
          </div>
        )}
        {packageCost > 0 && (
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-700">{packageName} Package:</span>
            <span className="font-semibold">${packageCost.toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-700">Taxes & Fees (11.25%):</span>
          <span className="font-medium">${pricing.taxAndFees.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Gratuity (20%):</span>
          <span className="font-medium">${pricing.gratuity.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t-2 border-blue-300 pt-2 mt-2">
          <span className="font-bold text-[#3b82f6]">Total:</span>
          <span className="font-bold text-xl text-[#3b82f6]">${pricing.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// Disco Cruise Pricing Column
const DiscoCruisePricingColumn = ({ 
  timeSlot, 
  perPersonPrice,
  mimosaCooler = 0,
  sparklePackage = 0,
  packageName = "",
  guestCount = 20
}: { 
  timeSlot: string; 
  perPersonPrice: number; 
  mimosaCooler?: number;
  sparklePackage?: number;
  packageName?: string;
  guestCount?: number;
}) => {
  const pricing = calculateDiscoPerPerson(perPersonPrice, mimosaCooler, sparklePackage, guestCount);
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-4 shadow-md">
      <h3 className="font-bold mb-3 text-center text-purple-700 text-lg">{timeSlot}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">Base (${perPersonPrice}/person × {guestCount}):</span>
          <span className="font-semibold">${pricing.groupBase.toFixed(0)}</span>
        </div>
        {mimosaCooler > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-700">Mimosa Cooler (per group):</span>
            <span className="font-semibold">${mimosaCooler.toFixed(0)}</span>
          </div>
        )}
        {sparklePackage > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-700">{packageName} (per group):</span>
            <span className="font-semibold">${sparklePackage.toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2">
          <span className="text-gray-700">Xola Fee (3%):</span>
          <span className="font-medium">${pricing.xolaFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Tax (8.25%):</span>
          <span className="font-medium">${pricing.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Gratuity (20%):</span>
          <span className="font-medium">${pricing.gratuity.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t-2 border-purple-300 pt-2 mt-2">
          <span className="font-bold text-purple-700">Group Total:</span>
          <span className="font-bold text-xl text-purple-700">${pricing.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs pt-1">
          <span className="text-gray-600">Per Person:</span>
          <span className="font-semibold text-purple-600">${pricing.perPerson.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// Disco Cruise Chart Component
const DiscoCruiseChart = ({
  partyType,
  chartRef,
  sparklePackageName,
  sparklePackageCost,
  onDownload,
  isDownloading
}: {
  partyType: string;
  chartRef: React.RefObject<HTMLDivElement>;
  sparklePackageName: string;
  sparklePackageCost: number;
  onDownload: () => void;
  isDownloading: boolean;
}) => {
  const timeSlots = [
    { label: "Friday 12-4pm", price: 95 },
    { label: "Saturday 11am-3pm", price: 105 },
    { label: "Saturday 3:30-7:30pm", price: 85 }
  ];

  return (
    <div className="space-y-4">
      <div ref={chartRef}>
        <Card className="scroll-mt-8 rounded-xl overflow-hidden shadow-xl border-4 border-purple-300">
          <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-500 text-white text-center py-6">
            <CardTitle className="text-3xl font-bold mb-2">{partyType} Disco Cruise</CardTitle>
            <p className="text-lg text-purple-100">Per-Person Pricing</p>
          </CardHeader>
          <CardContent className="p-6 bg-white space-y-8">
            {/* Base Pricing */}
            <div>
              <h3 className="text-xl font-bold text-purple-700 mb-4 text-center border-b-2 border-purple-300 pb-2">
                Base Pricing (No Add-ons)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timeSlots.map((slot) => (
                  <DiscoCruisePricingColumn
                    key={slot.label}
                    timeSlot={slot.label}
                    perPersonPrice={slot.price}
                  />
                ))}
              </div>
            </div>

            {/* With Mimosa Party Cooler */}
            <div>
              <h3 className="text-xl font-bold text-purple-700 mb-4 text-center border-b-2 border-purple-300 pb-2">
                With Mimosa Party Cooler (+$100)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timeSlots.map((slot) => (
                  <DiscoCruisePricingColumn
                    key={slot.label}
                    timeSlot={slot.label}
                    perPersonPrice={slot.price}
                    mimosaCooler={100}
                    packageName="Mimosa Cooler"
                  />
                ))}
              </div>
            </div>

            {/* With Sparkle Package */}
            <div>
              <h3 className="text-xl font-bold text-purple-700 mb-4 text-center border-b-2 border-purple-300 pb-2">
                With {sparklePackageName} (+${sparklePackageCost})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timeSlots.map((slot) => (
                  <DiscoCruisePricingColumn
                    key={slot.label}
                    timeSlot={slot.label}
                    perPersonPrice={slot.price}
                    sparklePackage={sparklePackageCost}
                    packageName={sparklePackageName}
                  />
                ))}
              </div>
            </div>

            {/* With Both Packages */}
            <div>
              <h3 className="text-xl font-bold text-purple-700 mb-4 text-center border-b-2 border-purple-300 pb-2">
                With Both Packages (+${100 + sparklePackageCost})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timeSlots.map((slot) => (
                  <DiscoCruisePricingColumn
                    key={slot.label}
                    timeSlot={slot.label}
                    perPersonPrice={slot.price}
                    mimosaCooler={100}
                    sparklePackage={sparklePackageCost}
                    packageName="Both Packages"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <Button 
          onClick={onDownload} 
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          disabled={isDownloading}
        >
          <Download className="w-5 h-5 mr-2" />
          {isDownloading ? 'Downloading...' : `Download ${partyType} Disco Pricing`}
        </Button>
      </div>
    </div>
  );
};

// Summary column for simplified pricing display
const SimpleSummaryColumn = ({
  day,
  hourlyRate,
  baseTotal,
  essentialsTotal,
  ultimateTotal,
  crewFeePerHour = 0
}: {
  day: string;
  hourlyRate: number;
  baseTotal: number;
  essentialsTotal: number;
  ultimateTotal: number;
  crewFeePerHour?: number;
}) => {
  return (
    <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-xl p-4 shadow-md">
      <h3 className="font-bold mb-3 text-center text-green-700 text-lg">{day}</h3>
      <div className="space-y-3 text-sm">
        <div className="text-center pb-2 border-b border-green-200">
          <span className="text-gray-600 text-xs">Hourly Rate</span>
          <div className="font-bold text-lg text-green-700">${hourlyRate}/hr</div>
          {crewFeePerHour > 0 && (
            <div className="text-xs text-gray-600 mt-1">+ ${crewFeePerHour}/hr crew fee</div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-700">Base Price:</span>
            <span className="font-semibold text-gray-900">${baseTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">+ Essentials:</span>
            <span className="font-semibold text-gray-900">${essentialsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">+ Ultimate:</span>
            <span className="font-semibold text-gray-900">${ultimateTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Summary pricing chart component
const SummaryPricingChart = ({
  boatName,
  capacityRange,
  chartRef,
  baseRates,
  essentialsPackageCost,
  ultimatePackageCost,
  crewFeePerHour = 0,
  onDownload,
  isDownloading
}: {
  boatName: string;
  capacityRange: string;
  chartRef: React.RefObject<HTMLDivElement>;
  baseRates: { monday: number; friday: number; saturday: number; sunday: number };
  essentialsPackageCost: number;
  ultimatePackageCost: number;
  crewFeePerHour?: number;
  onDownload: () => void;
  isDownloading: boolean;
}) => {
  return (
    <div className="space-y-4">
      <div ref={chartRef}>
        <Card className="scroll-mt-8 rounded-xl overflow-hidden shadow-xl border-4 border-green-300">
          <CardHeader className="bg-gradient-to-r from-green-700 to-green-500 text-white text-center py-6">
            <CardTitle className="text-3xl font-bold mb-2">{boatName} - Quick Summary</CardTitle>
            <p className="text-lg text-green-100">{capacityRange}</p>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <p className="text-center text-gray-600 mb-6 text-sm italic">
              All prices include taxes, fees & gratuity • 4-hour cruise
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SimpleSummaryColumn
                day="Monday - Thursday"
                hourlyRate={baseRates.monday}
                crewFeePerHour={crewFeePerHour}
                baseTotal={calculateWithPackage(baseRates.monday, 0, crewFeePerHour).total}
                essentialsTotal={calculateWithPackage(baseRates.monday, essentialsPackageCost, crewFeePerHour).total}
                ultimateTotal={calculateWithPackage(baseRates.monday, ultimatePackageCost, crewFeePerHour).total}
              />
              <SimpleSummaryColumn
                day="Friday"
                hourlyRate={baseRates.friday}
                crewFeePerHour={crewFeePerHour}
                baseTotal={calculateWithPackage(baseRates.friday, 0, crewFeePerHour).total}
                essentialsTotal={calculateWithPackage(baseRates.friday, essentialsPackageCost, crewFeePerHour).total}
                ultimateTotal={calculateWithPackage(baseRates.friday, ultimatePackageCost, crewFeePerHour).total}
              />
              <SimpleSummaryColumn
                day="Saturday"
                hourlyRate={baseRates.saturday}
                crewFeePerHour={crewFeePerHour}
                baseTotal={calculateWithPackage(baseRates.saturday, 0, crewFeePerHour).total}
                essentialsTotal={calculateWithPackage(baseRates.saturday, essentialsPackageCost, crewFeePerHour).total}
                ultimateTotal={calculateWithPackage(baseRates.saturday, ultimatePackageCost, crewFeePerHour).total}
              />
              <SimpleSummaryColumn
                day="Sunday"
                hourlyRate={baseRates.sunday}
                crewFeePerHour={crewFeePerHour}
                baseTotal={calculateWithPackage(baseRates.sunday, 0, crewFeePerHour).total}
                essentialsTotal={calculateWithPackage(baseRates.sunday, essentialsPackageCost, crewFeePerHour).total}
                ultimateTotal={calculateWithPackage(baseRates.sunday, ultimatePackageCost, crewFeePerHour).total}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <Button 
          onClick={onDownload} 
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          disabled={isDownloading}
        >
          <Download className="w-5 h-5 mr-2" />
          {isDownloading ? 'Downloading...' : `Download ${capacityRange} Summary`}
        </Button>
      </div>
    </div>
  );
};

// Combined pricing chart component
const CombinedPricingChart = ({
  boatName,
  capacityRange,
  chartRef,
  baseRates,
  essentialsPackageCost,
  ultimatePackageCost,
  crewFeePerHour = 0,
  onDownload,
  isDownloading
}: {
  boatName: string;
  capacityRange: string;
  chartRef: React.RefObject<HTMLDivElement>;
  baseRates: { monday: number; friday: number; saturday: number; sunday: number };
  essentialsPackageCost: number;
  ultimatePackageCost: number;
  crewFeePerHour?: number;
  onDownload: () => void;
  isDownloading: boolean;
}) => {
  return (
    <div className="space-y-4">
      <div ref={chartRef}>
        <Card className="scroll-mt-8 rounded-xl overflow-hidden shadow-xl border-4 border-[#F4C430]">
          <CardHeader className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white text-center py-6">
            <CardTitle className="text-3xl font-bold mb-2">{boatName}</CardTitle>
            <p className="text-lg text-blue-100">{capacityRange}</p>
          </CardHeader>
          <CardContent className="p-6 bg-white space-y-8">
            {/* Base Pricing */}
            <div>
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-4 text-center border-b-2 border-[#F4C430] pb-2">
                Base Pricing (No Add-ons)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PricingColumn day="Monday - Thursday" hourlyRate={baseRates.monday} crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Friday" hourlyRate={baseRates.friday} crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Saturday" hourlyRate={baseRates.saturday} crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Sunday" hourlyRate={baseRates.sunday} crewFeePerHour={crewFeePerHour} />
              </div>
            </div>

            {/* With Essentials Package */}
            <div>
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-4 text-center border-b-2 border-[#F4C430] pb-2">
                With Essentials Package (+${essentialsPackageCost})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PricingColumn day="Monday - Thursday" hourlyRate={baseRates.monday} packageCost={essentialsPackageCost} packageName="Essentials" crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Friday" hourlyRate={baseRates.friday} packageCost={essentialsPackageCost} packageName="Essentials" crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Saturday" hourlyRate={baseRates.saturday} packageCost={essentialsPackageCost} packageName="Essentials" crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Sunday" hourlyRate={baseRates.sunday} packageCost={essentialsPackageCost} packageName="Essentials" crewFeePerHour={crewFeePerHour} />
              </div>
            </div>

            {/* With Ultimate Package */}
            <div>
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-4 text-center border-b-2 border-[#F4C430] pb-2">
                With Ultimate Package (+${ultimatePackageCost})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PricingColumn day="Monday - Thursday" hourlyRate={baseRates.monday} packageCost={ultimatePackageCost} packageName="Ultimate" crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Friday" hourlyRate={baseRates.friday} packageCost={ultimatePackageCost} packageName="Ultimate" crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Saturday" hourlyRate={baseRates.saturday} packageCost={ultimatePackageCost} packageName="Ultimate" crewFeePerHour={crewFeePerHour} />
                <PricingColumn day="Sunday" hourlyRate={baseRates.sunday} packageCost={ultimatePackageCost} packageName="Ultimate" crewFeePerHour={crewFeePerHour} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <Button 
          onClick={onDownload} 
          size="lg"
          className="bg-[#3b82f6] hover:bg-[#1e3a8a] text-white shadow-lg"
          disabled={isDownloading}
        >
          <Download className="w-5 h-5 mr-2" />
          {isDownloading ? 'Downloading...' : `Download ${capacityRange} Pricing Chart`}
        </Button>
      </div>
    </div>
  );
};

const StaticPricing = () => {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Refs for each combined chart
  const dayTripperRef = useRef<HTMLDivElement>(null);
  const meeseeks1525Ref = useRef<HTMLDivElement>(null);
  const meeseeks2630Ref = useRef<HTMLDivElement>(null);
  const cleverGirl3150Ref = useRef<HTMLDivElement>(null);
  const cleverGirl5175Ref = useRef<HTMLDivElement>(null);

  // Refs for summary charts
  const dayTripperSummaryRef = useRef<HTMLDivElement>(null);
  const meeseeks1525SummaryRef = useRef<HTMLDivElement>(null);
  const meeseeks2630SummaryRef = useRef<HTMLDivElement>(null);
  const cleverGirl3150SummaryRef = useRef<HTMLDivElement>(null);
  const cleverGirl5175SummaryRef = useRef<HTMLDivElement>(null);

  // Refs for disco cruise charts
  const bachelorDiscoRef = useRef<HTMLDivElement>(null);
  const bacheloretteDiscoRef = useRef<HTMLDivElement>(null);
  const combinedBachDiscoRef = useRef<HTMLDivElement>(null);

  const downloadAsPNG = async (chartRef: React.RefObject<HTMLDivElement>, chartName: string) => {
    if (!chartRef.current) return;
    
    setDownloadingId(chartName);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `${chartName}-pricing-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: "Download complete!",
        description: `${chartName} pricing chart has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading the chart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "linear-gradient(to bottom, #F4C430, #fef3c7)" }}>
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-[#1e3a8a]">
            Private Cruise Pricing Charts
          </h1>
          <p className="text-lg text-gray-800">
            Complete pricing breakdowns for each boat capacity • 4-hour cruises
          </p>
        </div>

        <div className="space-y-16">
          {/* Day Tripper - Up to 14 Guests */}
          <CombinedPricingChart
            boatName="Day Tripper"
            capacityRange="Up to 14 Guests"
            chartRef={dayTripperRef}
            baseRates={{ monday: 200, friday: 225, saturday: 350, sunday: 250 }}
            essentialsPackageCost={100}
            ultimatePackageCost={250}
            onDownload={() => downloadAsPNG(dayTripperRef, 'day-tripper-1-14')}
            isDownloading={downloadingId === 'day-tripper-1-14'}
          />

          {/* Meeseeks/The Irony - 15-25 Guests */}
          <CombinedPricingChart
            boatName="Meeseeks / The Irony"
            capacityRange="15-25 Guests"
            chartRef={meeseeks1525Ref}
            baseRates={{ monday: 225, friday: 250, saturday: 375, sunday: 275 }}
            essentialsPackageCost={150}
            ultimatePackageCost={300}
            onDownload={() => downloadAsPNG(meeseeks1525Ref, 'meeseeks-irony-15-25')}
            isDownloading={downloadingId === 'meeseeks-irony-15-25'}
          />

          {/* Meeseeks/The Irony - 26-30 Guests */}
          <CombinedPricingChart
            boatName="Meeseeks / The Irony"
            capacityRange="26-30 Guests"
            chartRef={meeseeks2630Ref}
            baseRates={{ monday: 225, friday: 250, saturday: 375, sunday: 275 }}
            essentialsPackageCost={150}
            ultimatePackageCost={300}
            crewFeePerHour={50}
            onDownload={() => downloadAsPNG(meeseeks2630Ref, 'meeseeks-irony-26-30')}
            isDownloading={downloadingId === 'meeseeks-irony-26-30'}
          />

          {/* Clever Girl - 31-50 Guests */}
          <CombinedPricingChart
            boatName="Clever Girl"
            capacityRange="31-50 Guests"
            chartRef={cleverGirl3150Ref}
            baseRates={{ monday: 250, friday: 275, saturday: 400, sunday: 300 }}
            essentialsPackageCost={200}
            ultimatePackageCost={350}
            onDownload={() => downloadAsPNG(cleverGirl3150Ref, 'clever-girl-31-50')}
            isDownloading={downloadingId === 'clever-girl-31-50'}
          />

          {/* Clever Girl - 51-75 Guests */}
          <CombinedPricingChart
            boatName="Clever Girl"
            capacityRange="51-75 Guests"
            chartRef={cleverGirl5175Ref}
            baseRates={{ monday: 250, friday: 275, saturday: 400, sunday: 300 }}
            essentialsPackageCost={200}
            ultimatePackageCost={350}
            crewFeePerHour={100}
            onDownload={() => downloadAsPNG(cleverGirl5175Ref, 'clever-girl-51-75')}
            isDownloading={downloadingId === 'clever-girl-51-75'}
          />
        </div>

        {/* Summary Charts Section */}
        <div className="mt-24 pt-12 border-t-4 border-green-300">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-2 text-green-700">
              Quick Pricing Summaries
            </h2>
            <p className="text-lg text-gray-800">
              Simplified view showing hourly rates and total pricing for all package options
            </p>
          </div>

          <div className="space-y-16">
            {/* Day Tripper Summary */}
            <SummaryPricingChart
              boatName="Day Tripper"
              capacityRange="Up to 14 Guests"
              chartRef={dayTripperSummaryRef}
              baseRates={{ monday: 200, friday: 225, saturday: 350, sunday: 250 }}
              essentialsPackageCost={100}
              ultimatePackageCost={250}
              onDownload={() => downloadAsPNG(dayTripperSummaryRef, 'day-tripper-1-14-summary')}
              isDownloading={downloadingId === 'day-tripper-1-14-summary'}
            />

            {/* Meeseeks/The Irony 15-25 Summary */}
            <SummaryPricingChart
              boatName="Meeseeks / The Irony"
              capacityRange="15-25 Guests"
              chartRef={meeseeks1525SummaryRef}
              baseRates={{ monday: 225, friday: 250, saturday: 375, sunday: 275 }}
              essentialsPackageCost={150}
              ultimatePackageCost={300}
              onDownload={() => downloadAsPNG(meeseeks1525SummaryRef, 'meeseeks-irony-15-25-summary')}
              isDownloading={downloadingId === 'meeseeks-irony-15-25-summary'}
            />

            {/* Meeseeks/The Irony 26-30 Summary */}
            <SummaryPricingChart
              boatName="Meeseeks / The Irony"
              capacityRange="26-30 Guests"
              chartRef={meeseeks2630SummaryRef}
              baseRates={{ monday: 225, friday: 250, saturday: 375, sunday: 275 }}
              essentialsPackageCost={150}
              ultimatePackageCost={300}
              crewFeePerHour={50}
              onDownload={() => downloadAsPNG(meeseeks2630SummaryRef, 'meeseeks-irony-26-30-summary')}
              isDownloading={downloadingId === 'meeseeks-irony-26-30-summary'}
            />

            {/* Clever Girl 31-50 Summary */}
            <SummaryPricingChart
              boatName="Clever Girl"
              capacityRange="31-50 Guests"
              chartRef={cleverGirl3150SummaryRef}
              baseRates={{ monday: 250, friday: 275, saturday: 400, sunday: 300 }}
              essentialsPackageCost={200}
              ultimatePackageCost={350}
              onDownload={() => downloadAsPNG(cleverGirl3150SummaryRef, 'clever-girl-31-50-summary')}
              isDownloading={downloadingId === 'clever-girl-31-50-summary'}
            />

            {/* Clever Girl 51-75 Summary */}
            <SummaryPricingChart
              boatName="Clever Girl"
              capacityRange="51-75 Guests"
              chartRef={cleverGirl5175SummaryRef}
              baseRates={{ monday: 250, friday: 275, saturday: 400, sunday: 300 }}
              essentialsPackageCost={200}
              ultimatePackageCost={350}
              crewFeePerHour={100}
              onDownload={() => downloadAsPNG(cleverGirl5175SummaryRef, 'clever-girl-51-75-summary')}
              isDownloading={downloadingId === 'clever-girl-51-75-summary'}
            />
          </div>
        </div>

        {/* Disco Cruise Pricing Section */}
        <div className="mt-24 pt-12 border-t-4 border-purple-300">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-2 text-purple-700">
              ATX Disco Cruise Pricing
            </h2>
            <p className="text-lg text-gray-800">
              Per-person pricing for our signature disco cruise experiences
            </p>
          </div>

          <div className="space-y-16">
            {/* Bachelor Party Disco Cruises */}
            <DiscoCruiseChart
              partyType="Bachelor Party"
              chartRef={bachelorDiscoRef}
              sparklePackageName="Manly Sparkle Package"
              sparklePackageCost={100}
              onDownload={() => downloadAsPNG(bachelorDiscoRef, 'bachelor-disco-cruise')}
              isDownloading={downloadingId === 'bachelor-disco-cruise'}
            />

            {/* Bachelorette Party Disco Cruises */}
            <DiscoCruiseChart
              partyType="Bachelorette Party"
              chartRef={bacheloretteDiscoRef}
              sparklePackageName="Sparkle Bride Package"
              sparklePackageCost={100}
              onDownload={() => downloadAsPNG(bacheloretteDiscoRef, 'bachelorette-disco-cruise')}
              isDownloading={downloadingId === 'bachelorette-disco-cruise'}
            />

            {/* Combined Bach Disco Cruises */}
            <DiscoCruiseChart
              partyType="Combined Bach Party"
              chartRef={combinedBachDiscoRef}
              sparklePackageName="Sparkle Together Package"
              sparklePackageCost={150}
              onDownload={() => downloadAsPNG(combinedBachDiscoRef, 'combined-bach-disco-cruise')}
              isDownloading={downloadingId === 'combined-bach-disco-cruise'}
            />
          </div>
        </div>
      </div>

      {/* Interactive Disco Calculator */}
      <div className="mt-12">
        <DiscoCalculator />
      </div>

      {/* Simplified Mobile Calculator */}
      <div className="mt-8">
        <SimplifiedPricingCalculator />
      </div>

      {/* Simplified Mobile Calculator V2 */}
      <div className="mt-8">
        <SimplifiedPricingCalculatorV2 />
        <EmbedCodeDisplay />
      </div>

      {/* Simplified Mobile Calculator V3 */}
      <div className="mt-8">
        <SimplifiedPricingCalculatorV3 />
      </div>
    </div>
  );
};

export default StaticPricing;
