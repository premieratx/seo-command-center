import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Separator } from "@/quote-app/components/ui/separator";
import { Loader2, Send, CalendarDays, Users, Ship, AlertTriangle } from "lucide-react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "sonner";
import { parseAddOnsFromNotes } from "@/quote-app/lib/xolaAddOns";
import { formatTimeCSTFull } from "@/quote-app/lib/utils";
import { addDays } from "date-fns";

interface AdminInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
}

export const AdminInvoiceDialog = ({ open, onOpenChange, booking }: AdminInvoiceDialogProps) => {
  const [sending, setSending] = useState(false);

  if (!booking) return null;

  const bStartDate = booking.time_slot?.start_at ? new Date(booking.time_slot.start_at) : null;
  const eventDateStr = bStartDate
    ? bStartDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
    : "No date";
  const startTime = bStartDate ? formatTimeCSTFull(booking.time_slot.start_at) : "";
  const endDate = bStartDate ? new Date(bStartDate.getTime() + 4 * 60 * 60 * 1000) : null;
  const endTime = endDate ? formatTimeCSTFull(endDate.toISOString()) : "";

  const totalPrice = booking.amount || 0;
  const amountPaid = booking.amount_paid || booking.deposit_amount || 0;
  const balanceRemaining = totalPrice - amountPaid;
  const balanceDue = bStartDate ? addDays(bStartDate, -14) : null;
  const balanceDueStr = balanceDue
    ? balanceDue.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
    : "";

  const bIsDisco = booking.time_slot?.experience?.type === 'disco_cruise' || booking.time_slot?.experience?.type === 'disco';
  const boatName = booking.time_slot?.boat?.name || "TBD";
  const boatCapacityMap: Record<string, number> = { "Day Tripper": 14, "Clever Girl": 50, "Meeseeks": 25, "The Irony": 25 };
  const boatCap = boatCapacityMap[boatName] || 0;
  const experienceLabel = bIsDisco ? "ATX Disco Cruise" : boatCap > 0 ? `${boatCap}-Person Private Cruise` : "Private Cruise";

  const addOns = parseAddOnsFromNotes(booking.notes);

  // Parse balance payments from notes
  const balancePayments: { date: string; amount: number }[] = [];
  if (booking.notes) {
    const paymentRegex = /\[Balance Payment (\d{4}-\d{2}-\d{2})\]: \$(\d+\.?\d*)/g;
    let match;
    while ((match = paymentRegex.exec(booking.notes)) !== null) {
      balancePayments.push({
        date: new Date(match[1] + 'T12:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        amount: parseFloat(match[2]),
      });
    }
  }

  const handleSendInvoice = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-invoice", {
        body: {
          bookingId: booking.id,
          recipientEmail: booking.customer?.email,
          recipientPhone: booking.customer?.phone,
        },
      });

      if (error) throw error;

      toast.success(`Invoice sent to ${booking.customer?.email}!`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to send invoice:", err);
      toast.error(err.message || "Failed to send invoice");
    } finally {
      setSending(false);
    }
  };

  if (balanceRemaining <= 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-300">No Balance Due</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">This booking is paid in full. No invoice needed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-500 text-slate-300 hover:bg-slate-700 hover:text-white">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sky-300 flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Invoice — {booking.customer?.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Review the invoice details below before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Details */}
          <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-sky-400 shrink-0" />
              <span className="font-semibold text-white">{eventDateStr}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Ship className="h-4 w-4 text-sky-400 shrink-0" />
              <span>{experienceLabel} — {boatName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Users className="h-4 w-4 text-sky-400 shrink-0" />
              <span>{booking.headcount} guests • {startTime} – {endTime} CST</span>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Amount</span>
              <span className="font-semibold text-white">${totalPrice.toFixed(2)}</span>
            </div>
            <Separator className="bg-slate-600" />

            {/* Payments */}
            <div className="flex justify-between">
              <span className="text-slate-400">Deposit</span>
              <span className="text-emerald-400">−${(booking.deposit_amount || 0).toFixed(2)}</span>
            </div>
            {balancePayments.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-slate-400">Payment — {p.date}</span>
                <span className="text-emerald-400">−${p.amount.toFixed(2)}</span>
              </div>
            ))}

            {/* Add-ons */}
            {addOns.length > 0 && (
              <>
                <Separator className="bg-slate-600" />
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Add-Ons</p>
                {addOns.map((addon, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-slate-300">{addon.name}{addon.quantity > 1 ? ` ×${addon.quantity}` : ''}</span>
                    <span className="text-sky-300">{addon.unitPrice > 0 ? `$${(addon.unitPrice * addon.quantity).toFixed(2)}` : 'Free'}</span>
                  </div>
                ))}
              </>
            )}

            <Separator className="bg-slate-600" />
            <div className="flex justify-between font-semibold text-base">
              <span className="text-amber-300">Remaining Balance</span>
              <span className="text-amber-400">${balanceRemaining.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Due By</span>
              <span className="text-amber-300 font-medium">{balanceDueStr}</span>
            </div>
          </div>

          {/* Recipient */}
          <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 space-y-1 text-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Sending To</p>
            <p className="text-white font-medium">{booking.customer?.name}</p>
            <p className="text-sky-300">{booking.customer?.email}</p>
            {booking.customer?.phone && <p className="text-slate-400">{booking.customer.phone} (SMS)</p>}
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              This will create a Stripe invoice for <strong>${balanceRemaining.toFixed(2)}</strong> and send it via email{booking.customer?.phone ? ' and SMS' : ''}. The payment will automatically update the booking when paid.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-500 text-slate-300 hover:bg-slate-700 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSendInvoice}
            disabled={sending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send Invoice — ${balanceRemaining.toFixed(2)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
