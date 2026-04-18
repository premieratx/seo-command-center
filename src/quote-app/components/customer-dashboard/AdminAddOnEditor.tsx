import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Badge } from "@/quote-app/components/ui/badge";
import { Loader2, Plus, Trash2, Gift, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "sonner";
import { parseAddOnsFromNotes, type ParsedAddOn } from "@/quote-app/lib/xolaAddOns";

interface AdminAddOnEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    notes: string | null;
    amount: number;
    amount_paid: number | null;
    deposit_amount: number;
    customer: { name: string };
    stripe_invoice_id: string | null;
  };
  onBookingUpdated: (updatedBooking: any) => void;
}

// Curated list of free items available to add (display names)
const FREE_ITEMS_DISPLAY: { name: string; mapKey: string }[] = [
  { name: "$50 POD Voucher", mapKey: "$50 pod voucher" },
  { name: "$100 Concierge Package", mapKey: "$100 concierge package" },
  { name: "Free Sparkle Package", mapKey: "free sparkle package" },
  { name: "Free Mimosa Party Cooler", mapKey: "free mimosa party cooler" },
  { name: "Party On Delivery: Drinks & Party Supplies", mapKey: "party on delivery: drinks & party supplies" },
  { name: "Alcohol Delivery to Your Airbnb/Hotel", mapKey: "alcohol delivery to your airbnb/hotel" },
  { name: "Alcohol Delivery w/Your Drinks Stocked in a Cooler", mapKey: "alcohol delivery w/your drinks stocked in a cooler" },
  { name: "25% Fetii Ride Discount", mapKey: "fetii ride 25% discount" },
  { name: "Free Ultimate Disco Package", mapKey: "free ultimate disco package" },
  { name: "Free Essentials Package", mapKey: "free essentials package" },
  { name: "Super Sparkle Disco Package", mapKey: "super sparkle disco package" },
  { name: "Disco Queen Package", mapKey: "disco queen package" },
  { name: "Concierge Delivery Service", mapKey: "concierge delivery service" },
];

export const AdminAddOnEditor = ({ open, onOpenChange, booking, onBookingUpdated }: AdminAddOnEditorProps) => {
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<ParsedAddOn | null>(null);

  const currentAddOns = useMemo(() => parseAddOnsFromNotes(booking.notes), [booking.notes]);

  // Which free items are already present
  const currentAddOnNamesLower = useMemo(
    () => new Set(currentAddOns.map(a => a.name.toLowerCase())),
    [currentAddOns]
  );

  const availableFreeItems = useMemo(
    () => FREE_ITEMS_DISPLAY.filter(item => !currentAddOnNamesLower.has(item.name.toLowerCase())),
    [currentAddOnNamesLower]
  );

  const removeAddOnFromNotes = (notes: string | null, addonName: string): string => {
    if (!notes) return "";
    const lower = addonName.toLowerCase();
    let updated = notes;

    // Format 1: Pipe-separated "Add-On: Name x1 @ $price" entries
    // Remove the matching "| Add-On: Name x1 @ $price" or leading "Add-On: Name x1 @ $price |"
    const escapedName = addonName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match " | Add-On: <name> x<qty> @ $<price>" (case-insensitive on the name)
    const pipeEntryRegex = new RegExp(
      `\\s*\\|\\s*Add-On:\\s*${escapedName}\\s+x\\d+\\s*@\\s*\\$[\\d.]+`,
      'i'
    );
    updated = updated.replace(pipeEntryRegex, '');
    // Also handle if it's the first pipe entry (no leading |)
    const leadingEntryRegex = new RegExp(
      `Add-On:\\s*${escapedName}\\s+x\\d+\\s*@\\s*\\$[\\d.]+\\s*\\|?`,
      'i'
    );
    updated = updated.replace(leadingEntryRegex, '');

    // Format 2: Legacy comma-separated "Add-ons: item1, item2, item3"
    updated = updated.replace(
      /(Add-ons?:\s*)(.+?)(\s*\||$)/i,
      (match, prefix, items, suffix) => {
        const parts = items.split(",").map((s: string) => s.trim()).filter(Boolean);
        const filtered = parts.filter((p: string) => {
          const cleaned = p.replace(/^FREE\/OPTIONAL:\s*/i, '')
            .replace(/\s*\(Please Select If Interested\)/gi, '')
            .replace(/\s*\(Select If Interested\)/gi, '')
            .replace(/\s*-\s*SELECT IF INTERESTED!?/gi, '')
            .replace(/\s*\(\$[\d.,]+\s*[×x]\s*\d+\)/gi, '')
            .trim();
          return cleaned.toLowerCase() !== lower;
        });
        if (filtered.length === 0) return suffix === "|" ? "" : "";
        return prefix + filtered.join(", ") + suffix;
      }
    );

    // Format 3: Dashboard-added "[Add-ons YYYY-MM-DD]: name - $price"
    const dashboardRegex = new RegExp(
      `\\[Add-ons\\s+[\\d-]+\\]:\\s*${escapedName}[^\\n]*\\n?`,
      'gi'
    );
    updated = updated.replace(dashboardRegex, '');

    // Clean up any double pipes or trailing pipes
    updated = updated.replace(/\|\s*\|/g, '|').replace(/\|\s*$/, '').replace(/^\s*\|/, '').trim();

    return updated;
  };

  const addFreeAddOnToNotes = (notes: string | null, addonName: string): string => {
    // Use pipe-separated format consistent with the current notes structure
    const entry = `Add-On: ${addonName} x1 @ $0`;
    if (!notes) return entry;
    return `${notes} | ${entry}`;
  };

  const handleRemoveAddOn = async (addon: ParsedAddOn) => {
    // If priced, require confirmation
    if (addon.unitPrice > 0 && !confirmRemove) {
      setConfirmRemove(addon);
      return;
    }

    setSaving(true);
    try {
      const updatedNotes = removeAddOnFromNotes(booking.notes, addon.name);
      const priceChange = addon.unitPrice * addon.quantity;
      const newAmount = addon.unitPrice > 0 ? Math.max(0, booking.amount - priceChange) : booking.amount;

      const updates: any = { notes: updatedNotes };
      if (addon.unitPrice > 0) {
        updates.amount = newAmount;
      }

      const { data, error } = await supabase.functions.invoke("admin-edit-booking", {
        body: { bookingId: booking.id, updates },
      });
      if (error) throw error;

      // Update local state immediately with what we know changed
      const localUpdated = {
        ...booking,
        notes: updatedNotes,
        amount: addon.unitPrice > 0 ? newAmount : booking.amount,
      };
      onBookingUpdated(localUpdated);

      // Trigger Stripe re-sync if there's an invoice and price changed
      if (addon.unitPrice > 0 && booking.stripe_invoice_id) {
        try {
          await supabase.functions.invoke("sync-booking-to-stripe", {
            body: { bookingId: booking.id },
          });
        } catch (syncErr) {
          console.error("Stripe sync error (non-fatal):", syncErr);
        }
      }

      toast.success(`Removed "${addon.name}"${addon.unitPrice > 0 ? ` (−$${priceChange.toFixed(2)})` : ""}`);
      setConfirmRemove(null);
    } catch (err: any) {
      toast.error("Failed to remove add-on: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFreeItem = async (item: typeof FREE_ITEMS_DISPLAY[0]) => {
    setSaving(true);
    try {
      const updatedNotes = addFreeAddOnToNotes(booking.notes, item.name);
      const { data, error } = await supabase.functions.invoke("admin-edit-booking", {
        body: { bookingId: booking.id, updates: { notes: updatedNotes } },
      });
      if (error) throw error;

      // Update local state immediately
      const localUpdated = { ...booking, notes: updatedNotes };
      onBookingUpdated(localUpdated);
      toast.success(`Added "${item.name}"`);
    } catch (err: any) {
      toast.error("Failed to add item: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sky-300 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Edit Add-Ons — {booking.customer.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Toggle add-ons on/off. Free items update instantly. Priced items require confirmation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick-Add Free Items */}
            {availableFreeItems.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs text-emerald-300 uppercase tracking-wider font-semibold">Add Free Items</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableFreeItems.map(item => (
                    <Button
                      key={item.mapKey}
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 h-auto py-1.5 px-3"
                      onClick={() => handleAddFreeItem(item)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {item.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Add-Ons */}
            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Add-Ons ({currentAddOns.length})</p>
              {currentAddOns.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No add-ons on this booking</p>
              ) : (
                <div className="space-y-1">
                  {currentAddOns.map((addon, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-200 truncate block">
                          {addon.name}{addon.quantity > 1 ? ` ×${addon.quantity}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          variant="outline"
                          className={addon.unitPrice === 0
                            ? "border-emerald-500/30 text-emerald-300 text-xs"
                            : "border-sky-500/30 text-sky-300 text-xs"
                          }
                        >
                          {addon.unitPrice === 0 ? "Free" : `$${(addon.unitPrice * addon.quantity).toFixed(2)}`}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={saving}
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleRemoveAddOn(addon)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-500 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Priced Add-On Removal */}
      <Dialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Removal
            </DialogTitle>
          </DialogHeader>
          {confirmRemove && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Remove <strong className="text-white">"{confirmRemove.name}"</strong> (${(confirmRemove.unitPrice * confirmRemove.quantity).toFixed(2)})?
              </p>
              <p className="text-xs text-slate-400">
                This will reduce the booking total by ${(confirmRemove.unitPrice * confirmRemove.quantity).toFixed(2)} and re-sync the Stripe invoice.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmRemove(null)}
              className="border-slate-500 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => confirmRemove && handleRemoveAddOn(confirmRemove)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove & Update Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};