import { useState, useRef } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Loader2, Upload, FileUp, CheckCircle } from "lucide-react";
import { Progress } from "@/quote-app/components/ui/progress";

interface ImportRow {
  xolaReservationId: string;
  product: string;
  arrivalDate: string;
  arrivalTime: string;
  customerName: string;
  customerEmail: string;
  headcount: number;
  baseAmount: number;
  couponsAmount: number;
  totalValue: number;
  revenue: number;
  paymentStatus: string;
  taxAmount?: number;
  gratuity?: number;
  serviceFee?: number;
  addons?: string;
  phone?: string;
}

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

/** Find column index by matching header name (case-insensitive, partial match) */
function findCol(headers: string[], ...names: string[]): number {
  const normalized = headers.map(h => h.toLowerCase().replace(/[_\s]+/g, " ").trim());
  for (const name of names) {
    const n = name.toLowerCase();
    const idx = normalized.findIndex(h => h === n || h.includes(n));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCSV(csvText: string): ImportRow[] {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  
  // Parse headers from first row
  const headers = parseCSVLine(lines[0]);
  
  // Find columns dynamically
  const colId = findCol(headers, "reservation id", "booking id", "id");
  const colProduct = findCol(headers, "product", "experience");
  const colDate = findCol(headers, "arrival date", "date");
  const colTime = findCol(headers, "arrival time", "time");
  const colName = findCol(headers, "customer name", "name");
  const colEmail = findCol(headers, "customer email", "email");
  const colQty = findCol(headers, "quantity", "headcount", "guests");
  const colBase = findCol(headers, "base amount", "base");
  const colCoupons = findCol(headers, "coupons", "coupon");
  const colTotal = findCol(headers, "total value", "total");
  const colRevenue = findCol(headers, "revenue");
  const colPayment = findCol(headers, "payment status", "payment");
  const colTax = findCol(headers, "state sales tax", "tax");
  const colGratuity = findCol(headers, "gratuity", "tip");
  const colServiceFee = findCol(headers, "service fee");
  const colAddons = findCol(headers, "items add ons configuration name", "add ons", "addons");
  const colPhone = findCol(headers, "customer phone", "phone");
  
  // Use fallback indices if headers don't match (legacy format)
  const getId = (v: string[]) => v[colId >= 0 ? colId : 0] || "";
  const getProduct = (v: string[]) => v[colProduct >= 0 ? colProduct : 2] || "";
  const getDate = (v: string[]) => v[colDate >= 0 ? colDate : 3] || "";
  const getTime = (v: string[]) => v[colTime >= 0 ? colTime : 4] || "";
  const getName = (v: string[]) => v[colName >= 0 ? colName : 5] || "";
  const getEmail = (v: string[]) => v[colEmail >= 0 ? colEmail : 6] || "";
  
  // Skip header rows (1 or 2 depending on format)
  const dataStart = lines[1] && parseCSVLine(lines[1]).every(v => !v || isNaN(Number(v.replace(/[,$]/g, "")))) ? 2 : 1;
  
  return lines.slice(dataStart).map((line) => {
    const v = parseCSVLine(line);
    return {
      xolaReservationId: getId(v),
      product: getProduct(v),
      arrivalDate: getDate(v),
      arrivalTime: getTime(v),
      customerName: getName(v),
      customerEmail: getEmail(v),
      headcount: parseInt(v[colQty >= 0 ? colQty : 7]) || 1,
      baseAmount: parseFloat(v[colBase >= 0 ? colBase : 8]) || 0,
      couponsAmount: parseFloat(v[colCoupons >= 0 ? colCoupons : 15]) || 0,
      totalValue: parseFloat(v[colTotal >= 0 ? colTotal : 17]) || 0,
      revenue: parseFloat(v[colRevenue >= 0 ? colRevenue : 18]) || 0,
      paymentStatus: v[colPayment >= 0 ? colPayment : 19] || "Paid",
      taxAmount: colTax >= 0 ? (parseFloat(v[colTax]) || 0) : undefined,
      gratuity: colGratuity >= 0 ? (parseFloat(v[colGratuity]) || 0) : undefined,
      serviceFee: colServiceFee >= 0 ? (parseFloat(v[colServiceFee]) || 0) : undefined,
      addons: colAddons >= 0 ? (v[colAddons] || "") : undefined,
      phone: colPhone >= 0 ? (v[colPhone] || "") : undefined,
    };
  }).filter((r) => r.xolaReservationId && r.customerEmail);
}

const BATCH_SIZE = 25;

export const BulkXolaImportButton = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ created: number; skipped: number; errors: number } | null>(null);
  const [syncingInvoices, setSyncingInvoices] = useState(false);
  const [invoiceProgress, setInvoiceProgress] = useState(0);
  const [createdBookingIds, setCreatedBookingIds] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
      setResults(null);
      toast({ title: `CSV Loaded`, description: `${rows.length} booking rows parsed. Ready to import.` });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsedRows.length) return;
    setLoading(true);
    setProgress(0);
    setResults(null);

    const allCreated: string[] = [];
    let totalCreated = 0, totalSkipped = 0, totalErrors = 0;

    try {
      const batches = [];
      for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
        batches.push(parsedRows.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        const { data, error } = await supabase.functions.invoke("bulk-import-xola-bookings", {
          body: { bookings: batches[i] },
        });

        if (error) throw error;

        const r = data.results;
        totalCreated += r.created.length;
        totalSkipped += r.skipped.length;
        totalErrors += r.errors.length;

        // Extract booking IDs from created entries
        for (const entry of r.created) {
          const idMatch = entry.match(/\(([a-f0-9-]+)\)$/);
          if (idMatch) allCreated.push(idMatch[1]);
        }

        setProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      setCreatedBookingIds(allCreated);
      setResults({ created: totalCreated, skipped: totalSkipped, errors: totalErrors });
      toast({
        title: "Import Complete! 🎉",
        description: `Created ${totalCreated}, skipped ${totalSkipped} duplicates, ${totalErrors} errors.`,
      });
    } catch (err: any) {
      console.error("Import error:", err);
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInvoices = async () => {
    if (!createdBookingIds.length) return;
    setSyncingInvoices(true);
    setInvoiceProgress(0);

    let synced = 0;
    const INVOICE_BATCH = 3; // Stripe rate limit friendly

    try {
      for (let i = 0; i < createdBookingIds.length; i += INVOICE_BATCH) {
        const batch = createdBookingIds.slice(i, i + INVOICE_BATCH);
        await Promise.all(
          batch.map((bookingId) =>
            supabase.functions.invoke("sync-booking-to-stripe", { body: { bookingId } })
          )
        );
        synced += batch.length;
        setInvoiceProgress(Math.round((synced / createdBookingIds.length) * 100));
        // Small delay between batches for Stripe rate limits
        if (i + INVOICE_BATCH < createdBookingIds.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      toast({
        title: "Stripe Invoices Created! 📄",
        description: `${synced} draft invoices synced to Stripe.`,
      });
    } catch (err: any) {
      console.error("Invoice sync error:", err);
      toast({ title: "Invoice Sync Error", description: err.message, variant: "destructive" });
    } finally {
      setSyncingInvoices(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h3 className="font-bold text-lg">📦 Bulk Import Xola Bookings</h3>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!parsedRows.length && (
        <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full">
          <FileUp className="mr-2 h-4 w-4" />
          Select CSV File
        </Button>
      )}

      {parsedRows.length > 0 && !results && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {parsedRows.length} bookings parsed from CSV. Duplicates will be auto-detected and skipped.
          </p>
          <Button onClick={handleImport} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing... {progress}%
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import {parsedRows.length} Bookings
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
              {results.created} created, {results.skipped} skipped, {results.errors} errors
            </span>
          </div>

          {createdBookingIds.length > 0 && (
            <Button
              onClick={handleSyncInvoices}
              disabled={syncingInvoices}
              variant="outline"
              className="w-full"
            >
              {syncingInvoices ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Invoices... {invoiceProgress}%
                </>
              ) : (
                <>📄 Create {createdBookingIds.length} Stripe Draft Invoices</>
              )}
            </Button>
          )}
          {syncingInvoices && <Progress value={invoiceProgress} />}
        </div>
      )}
    </div>
  );
};
