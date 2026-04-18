import { useState } from "react";
import { Card } from "@/quote-app/components/ui/card";
import { Input } from "@/quote-app/components/ui/input";
import { Button } from "@/quote-app/components/ui/button";

interface PricingRow {
  day: string;
  hourlyRate: number;
  totalHours: number;
  totalBasePrice: number;
  addOn: number;
  discountPercent: number;
  discountAmount: number;
  salesTax: number;
  gratuity: number;
  xolaFee: number;
  totalPrice: number;
}

const SummarySheet = () => {
  const [pricing14, setPricing14] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 200, totalHours: 4, totalBasePrice: 800, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 66, gratuity: 160, xolaFee: 24, totalPrice: 1050 },
    { day: "Friday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 82.50, gratuity: 200, xolaFee: 30, totalPrice: 1312.50 },
    { day: "Saturday", hourlyRate: 350, totalHours: 4, totalBasePrice: 1400, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 115.50, gratuity: 280, xolaFee: 42, totalPrice: 1837.50 },
    { day: "Sunday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 82.50, gratuity: 200, xolaFee: 30, totalPrice: 1312.50 },
  ]);

  const [pricing14Essentials, setPricing14Essentials] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 200, totalHours: 4, totalBasePrice: 800, addOn: 100, discountPercent: 0, discountAmount: 0, salesTax: 74.25, gratuity: 180, xolaFee: 27, totalPrice: 1181.25 },
    { day: "Friday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 100, discountPercent: 0, discountAmount: 0, salesTax: 90.75, gratuity: 220, xolaFee: 33, totalPrice: 1443.75 },
    { day: "Saturday", hourlyRate: 350, totalHours: 4, totalBasePrice: 1400, addOn: 100, discountPercent: 0, discountAmount: 0, salesTax: 123.75, gratuity: 300, xolaFee: 45, totalPrice: 1968.75 },
    { day: "Sunday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 100, discountPercent: 0, discountAmount: 0, salesTax: 90.75, gratuity: 220, xolaFee: 33, totalPrice: 1443.75 },
  ]);

  const [pricing14Ultimate, setPricing14Ultimate] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 200, totalHours: 4, totalBasePrice: 800, addOn: 250, discountPercent: 0, discountAmount: 0, salesTax: 86.625, gratuity: 210, xolaFee: 31.50, totalPrice: 1378.125 },
    { day: "Friday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 250, discountPercent: 0, discountAmount: 0, salesTax: 103.125, gratuity: 250, xolaFee: 37.50, totalPrice: 1640.625 },
    { day: "Saturday", hourlyRate: 350, totalHours: 4, totalBasePrice: 1400, addOn: 250, discountPercent: 0, discountAmount: 0, salesTax: 136.125, gratuity: 330, xolaFee: 49.50, totalPrice: 2165.625 },
    { day: "Sunday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 250, discountPercent: 0, discountAmount: 0, salesTax: 103.125, gratuity: 250, xolaFee: 37.50, totalPrice: 1640.625 },
  ]);

  const [pricing25, setPricing25] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 225, totalHours: 4, totalBasePrice: 900, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 74.25, gratuity: 180, xolaFee: 27, totalPrice: 1181.25 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 99, gratuity: 240, xolaFee: 36, totalPrice: 1575 },
    { day: "Saturday", hourlyRate: 375, totalHours: 4, totalBasePrice: 1500, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 123.75, gratuity: 300, xolaFee: 45, totalPrice: 1968.75 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 90.75, gratuity: 220, xolaFee: 33, totalPrice: 1443.75 },
  ]);

  const [pricing25Essentials, setPricing25Essentials] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 225, totalHours: 4, totalBasePrice: 900, addOn: 150, discountPercent: 0, discountAmount: 0, salesTax: 86.625, gratuity: 210, xolaFee: 31.50, totalPrice: 1378.125 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 150, discountPercent: 0, discountAmount: 0, salesTax: 111.375, gratuity: 270, xolaFee: 40.50, totalPrice: 1771.875 },
    { day: "Saturday", hourlyRate: 375, totalHours: 4, totalBasePrice: 1500, addOn: 150, discountPercent: 0, discountAmount: 0, salesTax: 136.125, gratuity: 330, xolaFee: 49.50, totalPrice: 2165.625 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 150, discountPercent: 0, discountAmount: 0, salesTax: 103.125, gratuity: 250, xolaFee: 37.50, totalPrice: 1640.625 },
  ]);

  const [pricing25Ultimate, setPricing25Ultimate] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 225, totalHours: 4, totalBasePrice: 900, addOn: 300, discountPercent: 0, discountAmount: 0, salesTax: 99, gratuity: 240, xolaFee: 36, totalPrice: 1575 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 300, discountPercent: 0, discountAmount: 0, salesTax: 123.75, gratuity: 300, xolaFee: 45, totalPrice: 1968.75 },
    { day: "Saturday", hourlyRate: 375, totalHours: 4, totalBasePrice: 1500, addOn: 300, discountPercent: 0, discountAmount: 0, salesTax: 148.50, gratuity: 360, xolaFee: 54, totalPrice: 2362.50 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 300, discountPercent: 0, discountAmount: 0, salesTax: 115.50, gratuity: 280, xolaFee: 42, totalPrice: 1837.50 },
  ]);

  const [pricing50, setPricing50] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 82.50, gratuity: 200, xolaFee: 30, totalPrice: 1312.50 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 99, gratuity: 240, xolaFee: 36, totalPrice: 1575 },
    { day: "Saturday", hourlyRate: 400, totalHours: 4, totalBasePrice: 1600, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 132, gratuity: 320, xolaFee: 48, totalPrice: 2100 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 0, discountPercent: 0, discountAmount: 0, salesTax: 90.75, gratuity: 220, xolaFee: 33, totalPrice: 1443.75 },
  ]);

  const [pricing50Essentials, setPricing50Essentials] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 99, gratuity: 240, xolaFee: 36, totalPrice: 1575 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 115.50, gratuity: 280, xolaFee: 42, totalPrice: 1837.50 },
    { day: "Saturday", hourlyRate: 400, totalHours: 4, totalBasePrice: 1600, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 148.50, gratuity: 360, xolaFee: 54, totalPrice: 2362.50 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 107.25, gratuity: 260, xolaFee: 39, totalPrice: 1706.25 },
  ]);

  const [pricing50Ultimate, setPricing50Ultimate] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 111.375, gratuity: 270, xolaFee: 40.50, totalPrice: 1771.875 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 127.875, gratuity: 310, xolaFee: 46.50, totalPrice: 2034.375 },
    { day: "Saturday", hourlyRate: 400, totalHours: 4, totalBasePrice: 1600, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 160.875, gratuity: 390, xolaFee: 58.50, totalPrice: 2559.375 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 119.625, gratuity: 290, xolaFee: 43.50, totalPrice: 1903.125 },
  ]);

  // 26-30 guests pricing (includes $50/hr crew fee = $200 for 4 hours)
  const [pricing26_30, setPricing26_30] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 225, totalHours: 4, totalBasePrice: 900, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 90.75, gratuity: 220, xolaFee: 33, totalPrice: 1443.75 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 115.50, gratuity: 280, xolaFee: 42, totalPrice: 1837.50 },
    { day: "Saturday", hourlyRate: 375, totalHours: 4, totalBasePrice: 1500, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 140.25, gratuity: 340, xolaFee: 51, totalPrice: 2231.25 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 200, discountPercent: 0, discountAmount: 0, salesTax: 107.25, gratuity: 260, xolaFee: 39, totalPrice: 1706.25 },
  ]);

  const [pricing26_30Essentials, setPricing26_30Essentials] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 225, totalHours: 4, totalBasePrice: 900, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 103.125, gratuity: 250, xolaFee: 37.50, totalPrice: 1640.625 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 127.875, gratuity: 310, xolaFee: 46.50, totalPrice: 2034.375 },
    { day: "Saturday", hourlyRate: 375, totalHours: 4, totalBasePrice: 1500, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 152.625, gratuity: 370, xolaFee: 55.50, totalPrice: 2428.125 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 350, discountPercent: 0, discountAmount: 0, salesTax: 119.625, gratuity: 290, xolaFee: 43.50, totalPrice: 1903.125 },
  ]);

  const [pricing26_30Ultimate, setPricing26_30Ultimate] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 225, totalHours: 4, totalBasePrice: 900, addOn: 500, discountPercent: 0, discountAmount: 0, salesTax: 115.50, gratuity: 280, xolaFee: 42, totalPrice: 1837.50 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 500, discountPercent: 0, discountAmount: 0, salesTax: 140.25, gratuity: 340, xolaFee: 51, totalPrice: 2231.25 },
    { day: "Saturday", hourlyRate: 375, totalHours: 4, totalBasePrice: 1500, addOn: 500, discountPercent: 0, discountAmount: 0, salesTax: 165, gratuity: 400, xolaFee: 60, totalPrice: 2625 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 500, discountPercent: 0, discountAmount: 0, salesTax: 132, gratuity: 320, xolaFee: 48, totalPrice: 2100 },
  ]);

  // 51-75 guests pricing (includes $100/hr crew fee = $400 for 4 hours)
  const [pricing51_75, setPricing51_75] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 400, discountPercent: 0, discountAmount: 0, salesTax: 115.50, gratuity: 280, xolaFee: 42, totalPrice: 1837.50 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 400, discountPercent: 0, discountAmount: 0, salesTax: 132, gratuity: 320, xolaFee: 48, totalPrice: 2100 },
    { day: "Saturday", hourlyRate: 400, totalHours: 4, totalBasePrice: 1600, addOn: 400, discountPercent: 0, discountAmount: 0, salesTax: 165, gratuity: 400, xolaFee: 60, totalPrice: 2625 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 400, discountPercent: 0, discountAmount: 0, salesTax: 123.75, gratuity: 300, xolaFee: 45, totalPrice: 1968.75 },
  ]);

  const [pricing51_75Essentials, setPricing51_75Essentials] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 600, discountPercent: 0, discountAmount: 0, salesTax: 132, gratuity: 320, xolaFee: 48, totalPrice: 2100 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 600, discountPercent: 0, discountAmount: 0, salesTax: 148.50, gratuity: 360, xolaFee: 54, totalPrice: 2362.50 },
    { day: "Saturday", hourlyRate: 400, totalHours: 4, totalBasePrice: 1600, addOn: 600, discountPercent: 0, discountAmount: 0, salesTax: 181.50, gratuity: 440, xolaFee: 66, totalPrice: 2887.50 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 600, discountPercent: 0, discountAmount: 0, salesTax: 140.25, gratuity: 340, xolaFee: 51, totalPrice: 2231.25 },
  ]);

  const [pricing51_75Ultimate, setPricing51_75Ultimate] = useState<PricingRow[]>([
    { day: "Monday-Thursday", hourlyRate: 250, totalHours: 4, totalBasePrice: 1000, addOn: 750, discountPercent: 0, discountAmount: 0, salesTax: 144.375, gratuity: 350, xolaFee: 52.50, totalPrice: 2296.875 },
    { day: "Friday", hourlyRate: 300, totalHours: 4, totalBasePrice: 1200, addOn: 750, discountPercent: 0, discountAmount: 0, salesTax: 160.875, gratuity: 390, xolaFee: 58.50, totalPrice: 2559.375 },
    { day: "Saturday", hourlyRate: 400, totalHours: 4, totalBasePrice: 1600, addOn: 750, discountPercent: 0, discountAmount: 0, salesTax: 193.875, gratuity: 470, xolaFee: 70.50, totalPrice: 3084.375 },
    { day: "Sunday", hourlyRate: 275, totalHours: 4, totalBasePrice: 1100, addOn: 750, discountPercent: 0, discountAmount: 0, salesTax: 152.625, gratuity: 370, xolaFee: 55.50, totalPrice: 2428.125 },
  ]);

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<PricingRow[]>>,
    index: number,
    field: keyof PricingRow,
    value: number
  ) => {
    setter((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalculate totals
      const row = updated[index];
      const subtotal = row.totalBasePrice + row.addOn - row.discountAmount;
      row.salesTax = Number((subtotal * 0.0825).toFixed(2));
      row.gratuity = Number((subtotal * 0.20).toFixed(2));
      // Xola fee is calculated on subtotal + gratuity
      row.xolaFee = Number(((subtotal + row.gratuity) * 0.03).toFixed(2));
      row.totalPrice = Number((subtotal + row.salesTax + row.gratuity + row.xolaFee).toFixed(2));
      
      return updated;
    });
  };

  const renderTable = (
    title: string,
    data: PricingRow[],
    setter: React.Dispatch<React.SetStateAction<PricingRow[]>>,
    gratuityRate: string
  ) => (
    <Card className="p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left font-semibold">Day</th>
              <th className="border border-border p-2 text-center font-semibold">Hourly Rate</th>
              <th className="border border-border p-2 text-center font-semibold">Total Hours</th>
              <th className="border border-border p-2 text-center font-semibold">Total Base Price</th>
              <th className="border border-border p-2 text-center font-semibold">Add-On</th>
              <th className="border border-border p-2 text-center font-semibold">Discount (%)</th>
              <th className="border border-border p-2 text-center font-semibold">Discount ($)</th>
              <th className="border border-border p-2 text-center font-semibold">Sales Tax</th>
              <th className="border border-border p-2 text-center font-semibold">{gratuityRate} Gratuity</th>
              <th className="border border-border p-2 text-center font-semibold">Xola Fee</th>
              <th className="border border-border p-2 text-center font-semibold">Total Price</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                <td className="border border-border p-2 font-medium">{row.day}</td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={row.hourlyRate}
                    onChange={(e) => updateRow(setter, index, "hourlyRate", Number(e.target.value))}
                    className="w-24 text-center"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={row.totalHours}
                    onChange={(e) => updateRow(setter, index, "totalHours", Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={row.totalBasePrice}
                    onChange={(e) => updateRow(setter, index, "totalBasePrice", Number(e.target.value))}
                    className="w-24 text-center"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={row.addOn}
                    onChange={(e) => updateRow(setter, index, "addOn", Number(e.target.value))}
                    className="w-24 text-center"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={row.discountPercent}
                    onChange={(e) => updateRow(setter, index, "discountPercent", Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={row.discountAmount}
                    onChange={(e) => updateRow(setter, index, "discountAmount", Number(e.target.value))}
                    className="w-24 text-center"
                  />
                </td>
                <td className="border border-border p-2 text-center">${row.salesTax.toFixed(2)}</td>
                <td className="border border-border p-2 text-center">${row.gratuity.toFixed(2)}</td>
                <td className="border border-border p-2 text-center">${row.xolaFee.toFixed(2)}</td>
                <td className="border border-border p-2 text-center font-bold">${row.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Premier Party Cruises - Pricing Summary Sheet</h1>
        
        <h2 className="text-3xl font-bold mb-6 mt-8 text-primary">Pricing for 1-14 Guests</h2>
        {renderTable("14P (Day Tripper) - Base", pricing14, setPricing14, "20%")}
        {renderTable("14P (Day Tripper) + Essentials", pricing14Essentials, setPricing14Essentials, "20%")}
        {renderTable("14P (Day Tripper) + Ultimate", pricing14Ultimate, setPricing14Ultimate, "20%")}
        
        <h2 className="text-3xl font-bold mb-6 mt-8 text-primary">Pricing for 15-25 Guests</h2>
        {renderTable("25P (Meeseeks/The Irony) - Base", pricing25, setPricing25, "20%")}
        {renderTable("25P (Meeseeks/The Irony) + Essentials", pricing25Essentials, setPricing25Essentials, "20%")}
        {renderTable("25P (Meeseeks/The Irony) + Ultimate", pricing25Ultimate, setPricing25Ultimate, "20%")}
        
        <h2 className="text-3xl font-bold mb-6 mt-8 text-primary">Pricing for 26-30 Guests</h2>
        {renderTable("30P (Meeseeks/The Irony) - Base (includes $50/hr extra crew)", pricing26_30, setPricing26_30, "20%")}
        {renderTable("30P (Meeseeks/The Irony) + Essentials (includes $50/hr extra crew)", pricing26_30Essentials, setPricing26_30Essentials, "20%")}
        {renderTable("30P (Meeseeks/The Irony) + Ultimate (includes $50/hr extra crew)", pricing26_30Ultimate, setPricing26_30Ultimate, "20%")}
        
        <h2 className="text-3xl font-bold mb-6 mt-8 text-primary">Pricing for 31-50 Guests</h2>
        {renderTable("50P (Clever Girl) - Base", pricing50, setPricing50, "20%")}
        {renderTable("50P (Clever Girl) + Essentials", pricing50Essentials, setPricing50Essentials, "20%")}
        {renderTable("50P (Clever Girl) + Ultimate", pricing50Ultimate, setPricing50Ultimate, "20%")}
        
        <h2 className="text-3xl font-bold mb-6 mt-8 text-primary">Pricing for 51-75 Guests</h2>
        {renderTable("75P (Clever Girl) - Base (includes $100/hr extra crew)", pricing51_75, setPricing51_75, "20%")}
        {renderTable("75P (Clever Girl) + Essentials (includes $100/hr extra crew)", pricing51_75Essentials, setPricing51_75Essentials, "20%")}
        {renderTable("75P (Clever Girl) + Ultimate (includes $100/hr extra crew)", pricing51_75Ultimate, setPricing51_75Ultimate, "20%")}

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Notes:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Sales Tax: 8.25% of subtotal (base + add-ons - discounts)</li>
            <li>Gratuity: 20% for all boats</li>
            <li>Xola Fee: 3% of subtotal</li>
            <li>All values are editable - totals recalculate automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SummarySheet;
