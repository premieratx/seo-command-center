import { useState, useRef } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Loader2, RefreshCw, FileUp, CheckCircle } from "lucide-react";
import { Progress } from "@/quote-app/components/ui/progress";

/**
 * Parses a CSV line handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/** Patterns for add-on names that are party info / metadata, NOT real add-ons */
const PARTY_INFO_PATTERNS = [
  /^what'?s?\s+the\s+average\s+age/i,
  /^what\s+kind\s+of\s+party/i,
  /^family\s+event$/i,
  /^confirmation\s+code$/i,
];

function isPartyInfoHeader(name: string): boolean {
  return PARTY_INFO_PATTERNS.some(p => p.test(name.trim()));
}

/** Headers that represent free "inclusions" info, not purchasable add-ons */
const INCLUSIONS_PATTERNS = [
  /^(BASIC|DISCO QUEEN|SUPER SPARKLE)\s+PACKAGE\s+INCLUSIONS/i,
];

function isInclusionsHeader(name: string): boolean {
  return INCLUSIONS_PATTERNS.some(p => p.test(name.trim()));
}

/** Headers for "additional guests" add-ons */
const ADDITIONAL_GUESTS_PATTERNS = [
  /^additional\s+\d+\s+to\s+\d+\s+guests?$/i,
  /^addi?i?tional\s+\d+\s+guests?$/i,
  /^additional\s+\d+-\d+\s+guests?$/i,
];

function isAdditionalGuestsAddon(name: string): boolean {
  return ADDITIONAL_GUESTS_PATTERNS.some(p => p.test(name.trim()));
}

interface AddOnEntry {
  name: string;
  quantity: number;
  amount: number;
}

interface ParsedBooking {
  xolaId: string;
  product: string;
  customerName: string;
  email: string;
  headcount: number;
  baseAmount: number;
  stateSalesTax: number;
  tip: number;
  addOnTax: number;
  gratuity: number;
  addOnsTotal: number;
  couponCode: string;
  couponAmount: number;
  partnerDiscount: number;
  partnerName: string;
  adjustments: number;
  totalValue: number;
  revenue: number;
  paymentStatus: string;
  status: string;
  addOns: AddOnEntry[];
}

function mapProduct(product: string): { experienceType: string } {
  if (product.includes("Private") || product.includes("3-Hour")) {
    return { experienceType: "private_cruise" };
  }
  return { experienceType: "disco_cruise" };
}

/** Derive private cruise capacity from product name */
function derivePrivateCapacity(product: string): number {
  const match = product.match(/(\d+)-Person\s+Private/i);
  return match ? parseInt(match[1]) : 0;
}

function parseFullCSV(csvText: string): ParsedBooking[] {
  const lines = csvText.split("\n").filter(l => l.trim());
  if (lines.length < 3) return [];

  const headerRow = parseCSVLine(lines[0]);
  const subHeaderRow = parseCSVLine(lines[1]);

  // Find add-on column pairs by looking at sub-header row for "Quantity" entries
  // Starting after the known columns (col 34+)
  const addOnColumns: { name: string; qtyCol: number; amtCol: number }[] = [];
  
  for (let i = 34; i < subHeaderRow.length - 1; i++) {
    if (subHeaderRow[i]?.toLowerCase() === "quantity" && subHeaderRow[i + 1]?.toLowerCase() === "amount") {
      // Find the header name - look backwards from this position to find the non-empty header
      let headerName = headerRow[i] || "";
      if (!headerName) {
        // Sometimes the header is in a previous column
        for (let j = i - 1; j >= 34; j--) {
          if (headerRow[j]) {
            headerName = headerRow[j];
            break;
          }
        }
      }
      if (headerName && !isPartyInfoHeader(headerName) && !isInclusionsHeader(headerName)) {
        addOnColumns.push({ name: headerName, qtyCol: i, amtCol: i + 1 });
      }
      i++; // skip the Amount column
    }
  }

  console.log(`Found ${addOnColumns.length} add-on columns`);

  const results: ParsedBooking[] = [];

  // Process data rows (skip 2 header rows)
  for (let lineIdx = 2; lineIdx < lines.length; lineIdx++) {
    const v = parseCSVLine(lines[lineIdx]);
    
    const xolaId = v[0] || "";
    const status = v[28] || "";
    
    // Skip cancelled or non-confirmed bookings
    if (!xolaId || status !== "Confirmed") continue;

    const product = v[2] || "";
    const customerName = v[5] || "";
    const email = v[6] || "";
    const headcount = parseInt(v[7]) || 1;
    const baseAmount = parseFloat(v[11]) || 0;
    const stateSalesTax = parseFloat(v[13]) || 0;
    const tip = parseFloat(v[14]) || 0;
    const addOnTax = parseFloat(v[15]) || 0;
    const gratuity = parseFloat(v[16]) || 0;
    const addOnsTotal = parseFloat(v[17]) || 0;
    const couponCode = v[18] || "";
    const couponAmount = parseFloat(v[19]) || 0;
    const partnerDiscount = parseFloat(v[20]) || 0;
    const partnerName = v[22] || "";
    const adjustments = parseFloat(v[23]) || 0;
    const totalValue = parseFloat(v[24]) || 0;
    const revenue = parseFloat(v[25]) || 0;
    const paymentStatus = v[26] || "Paid";

    // Extract add-ons with qty > 0
    const addOns: AddOnEntry[] = [];
    for (const col of addOnColumns) {
      const qty = parseInt(v[col.qtyCol]) || 0;
      const amt = parseFloat(v[col.amtCol]) || 0;
      if (qty > 0) {
        addOns.push({ name: col.name, quantity: qty, amount: amt });
      }
    }

    results.push({
      xolaId, product, customerName, email, headcount, baseAmount,
      stateSalesTax, tip, addOnTax, gratuity, addOnsTotal,
      couponCode, couponAmount, partnerDiscount, partnerName,
      adjustments, totalValue, revenue, paymentStatus, status, addOns,
    });
  }

  return results;
}

function buildNotesString(b: ParsedBooking): string {
  const { experienceType } = mapProduct(b.product);
  const isDisco = experienceType === "disco_cruise";

  // Calculate ticket price
  const ticketPrice = isDisco
    ? Math.round((b.baseAmount / Math.max(b.headcount, 1)) * 100) / 100
    : b.baseAmount;

  // Service fee = Revenue - Total Value (Xola's 3% fee)
  const serviceFee = Math.round((b.revenue - b.totalValue) * 100) / 100;

  // Tax = State Sales Tax + Add-On Tax  
  const totalTax = Math.round((b.stateSalesTax + b.addOnTax) * 100) / 100;

  // Gratuity: use the Gratuity column, fallback to Tip
  const totalGratuity = b.gratuity || b.tip || 0;

  // Discount amount = abs(coupon amount) + abs(partner discount) + abs(adjustments)
  const discountAmount = Math.abs(b.couponAmount) + Math.abs(b.partnerDiscount) + Math.abs(b.adjustments);

  // Calculate actual guest count for private cruises with headcount=1
  let actualGuests = b.headcount;
  if (!isDisco && b.headcount <= 1) {
    const derivedCapacity = derivePrivateCapacity(b.product);
    if (derivedCapacity > 0) actualGuests = derivedCapacity;
  }

  // Add additional guest add-on quantities to headcount
  for (const addon of b.addOns) {
    if (isAdditionalGuestsAddon(addon.name)) {
      actualGuests += addon.quantity;
    }
  }

  const parts: string[] = [
    `Xola Booking ID: ${b.xolaId}`,
    `Experience: ${b.product}`,
    `Ticket Price: ${ticketPrice}`,
  ];

  if (actualGuests !== b.headcount) {
    parts.push(`Guests: ${actualGuests}`);
  }

  if (discountAmount > 0) {
    parts.push(`Discount Amount: ${discountAmount}`);
  }

  if (b.adjustments && Math.abs(b.adjustments) > 0) {
    parts.push(`Adjustments: ${Math.abs(b.adjustments)}`);
  }

  if (b.couponCode) {
    parts.push(`Coupon: ${b.couponCode}`);
  }

  if (b.partnerName) {
    parts.push(`Partner: ${b.partnerName}`);
  }

  if (totalTax > 0) {
    parts.push(`Tax: ${totalTax}`);
  }

  if (totalGratuity > 0) {
    parts.push(`Gratuity: ${totalGratuity}`);
  }

  if (serviceFee > 0) {
    parts.push(`Service Fee: ${serviceFee}`);
  }

  // Add each add-on as a separate "Add-On:" entry
  for (const addon of b.addOns) {
    const unitPrice = addon.quantity > 0
      ? Math.round((addon.amount / addon.quantity) * 100) / 100
      : 0;
    parts.push(`Add-On: ${addon.name} x${addon.quantity} @ $${unitPrice}`);
  }

  return parts.join(" | ");
}

const BATCH_SIZE = 25;

export const XolaCsvSyncButton = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedBookings, setParsedBookings] = useState<ParsedBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ updated: number; notFound: number; errors: number } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const bookings = parseFullCSV(text);
      setParsedBookings(bookings);
      setResults(null);
      toast({
        title: `CSV Loaded`,
        description: `${bookings.length} confirmed bookings parsed. Ready to sync notes.`,
      });
    };
    reader.readAsText(file);
  };

  const handleSync = async () => {
    if (!parsedBookings.length) return;
    setLoading(true);
    setProgress(0);
    setResults(null);

    try {
      // Build updates
      const updates = parsedBookings.map(b => {
        const { experienceType } = mapProduct(b.product);
        const isDisco = experienceType === "disco_cruise";

        // Calculate actual guest count
        let actualGuests = b.headcount;
        if (!isDisco && b.headcount <= 1) {
          const derivedCapacity = derivePrivateCapacity(b.product);
          if (derivedCapacity > 0) actualGuests = derivedCapacity;
        }
        // Add additional guest add-on quantities
        for (const addon of b.addOns) {
          if (isAdditionalGuestsAddon(addon.name)) {
            actualGuests += addon.quantity;
          }
        }

        return {
          xolaId: b.xolaId,
          notes: buildNotesString(b),
          couponCode: b.couponCode || null,
          revenue: b.revenue,
          amountPaid: null as number | null,
          paymentStatus: b.paymentStatus,
          headcount: actualGuests,
        };
      });

      // Send in batches
      let totalUpdated = 0, totalNotFound = 0, totalErrors = 0;
      const batches: typeof updates[] = [];
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        batches.push(updates.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        const { data, error } = await supabase.functions.invoke("batch-update-booking-notes", {
          body: { updates: batches[i] },
        });

        if (error) throw error;

        const r = data.results;
        totalUpdated += r.updated;
        totalNotFound += r.notFound;
        totalErrors += r.errors;
        setProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      setResults({ updated: totalUpdated, notFound: totalNotFound, errors: totalErrors });
      toast({
        title: "Sync Complete! 🎉",
        description: `${totalUpdated} bookings updated, ${totalNotFound} not found, ${totalErrors} errors.`,
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h3 className="font-bold text-lg">🔄 Sync Xola CSV → Dashboard Notes</h3>
      <p className="text-sm text-muted-foreground">
        Upload the full Xola CSV to update all booking notes with exact tax, tip, fees, add-ons, and coupon codes.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!parsedBookings.length && (
        <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full">
          <FileUp className="mr-2 h-4 w-4" />
          Select Xola CSV File
        </Button>
      )}

      {parsedBookings.length > 0 && !results && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {parsedBookings.length} confirmed bookings parsed. This will update notes with exact financial data and add-ons from the CSV.
          </p>
          <Button onClick={handleSync} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing... {progress}%
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync {parsedBookings.length} Bookings
              </>
            )}
          </Button>
          {loading && <Progress value={progress} />}
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">
              {results.updated} updated, {results.notFound} not found, {results.errors} errors
            </span>
          </div>
          <Button
            onClick={() => { setParsedBookings([]); setResults(null); if (fileRef.current) fileRef.current.value = ""; }}
            variant="outline"
            size="sm"
          >
            Upload Another CSV
          </Button>
        </div>
      )}
    </div>
  );
};
