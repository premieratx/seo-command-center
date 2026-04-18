import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/quote-app/hooks/use-toast";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { format } from "date-fns";
import { EditBookingNotesEditor } from "./EditBookingNotesEditor";

interface EditBookingModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BOATS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Day Tripper", capacity: 14 },
  { id: "22222222-2222-2222-2222-222222222222", name: "Meeseeks", capacity: 30 },
  { id: "33333333-3333-3333-3333-333333333333", name: "The Irony", capacity: 30 },
  { id: "44444444-4444-4444-4444-444444444444", name: "Clever Girl", capacity: 75 },
];

const PACKAGE_TYPES = [
  "private_14",
  "private_25",
  "private_30",
  "private_50",
  "basic_bach",
  "disco_queen",
  "super_sparkle",
  "disco_cruise",
];

export const EditBookingModal = ({ booking, isOpen, onClose, onSuccess }: EditBookingModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    headcount: booking?.headcount || 0,
    amount: booking?.amount || 0,
    deposit_amount: booking?.deposit_amount || 0,
    amount_paid: booking?.amount_paid || booking?.deposit_amount || 0,
    notes: booking?.notes || "",
    status: booking?.status || "pending",
    package_type: booking?.package_type || "",
    party_type: booking?.party_type || "",
  });

  // Slot override fields
  const [slotOverride, setSlotOverride] = useState({
    enabled: false,
    boat_id: booking?.time_slot?.boat?.id || "",
    date: booking?.time_slot?.start_at ? format(new Date(booking.time_slot.start_at), "yyyy-MM-dd") : "",
    start_time: booking?.time_slot?.start_at ? format(new Date(booking.time_slot.start_at), "HH:mm") : "",
    end_time: booking?.time_slot?.end_at ? format(new Date(booking.time_slot.end_at), "HH:mm") : "",
  });

  useEffect(() => {
    if (booking) {
      setFormData({
        headcount: booking.headcount,
        amount: booking.amount,
        deposit_amount: booking.deposit_amount,
        amount_paid: booking.amount_paid || booking.deposit_amount || 0,
        notes: booking.notes || "",
        status: booking.status,
        package_type: booking.package_type || "",
        party_type: booking.party_type || "",
      });
      setSlotOverride({
        enabled: false,
        boat_id: booking.time_slot?.boat?.id || "",
        date: booking.time_slot?.start_at ? format(new Date(booking.time_slot.start_at), "yyyy-MM-dd") : "",
        start_time: booking.time_slot?.start_at ? format(new Date(booking.time_slot.start_at), "HH:mm") : "",
        end_time: booking.time_slot?.end_at ? format(new Date(booking.time_slot.end_at), "HH:mm") : "",
      });
    }
  }, [booking]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates: any = {
        headcount: parseInt(formData.headcount.toString()),
        amount: parseFloat(formData.amount.toString()),
        deposit_amount: parseFloat(formData.deposit_amount.toString()),
        amount_paid: parseFloat(formData.amount_paid.toString()),
        notes: formData.notes,
        status: formData.status,
        package_type: formData.package_type,
        party_type: formData.party_type,
      };

      // If slot override is enabled, create a new time slot and reassign
      if (slotOverride.enabled) {
        const startAt = new Date(`${slotOverride.date}T${slotOverride.start_time}:00`);
        const endAt = new Date(`${slotOverride.date}T${slotOverride.end_time}:00`);

        const { data: slotData, error: slotError } = await supabase.functions.invoke('sync-booking-slots', {
          body: {
            action: 'create-slot-for-booking',
            bookingId: booking.id,
            boat_id: slotOverride.boat_id,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
          }
        });

        if (slotError) {
          console.error('Slot creation error:', slotError);
          throw new Error('Failed to reassign boat/time slot');
        }
        
        // The edge function already reassigned the booking's time_slot_id
        console.log('New slot created:', slotData?.newSlotId);
      }

      const { data, error } = await supabase.functions.invoke('admin-edit-booking', {
        body: { bookingId: booking.id, updates }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-booking', {
        body: { bookingId: booking.id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete booking",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!booking) return null;

  const remainingBalance = formData.amount - formData.amount_paid;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update booking details for {booking.customer?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info (read-only) */}
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{booking.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{booking.customer?.email}</span>
            </div>
          </div>

          {/* Cruise Details - Editable */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Cruise Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="package_type">Package Type</Label>
                <select
                  id="package_type"
                  value={formData.package_type}
                  onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {PACKAGE_TYPES.map(pt => (
                    <option key={pt} value={pt}>{pt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="party_type">Party Type</Label>
                <select
                  id="party_type"
                  value={formData.party_type}
                  onChange={(e) => setFormData({ ...formData, party_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="bachelorette">Bachelorette</option>
                  <option value="bachelor">Bachelor</option>
                  <option value="birthday">Birthday</option>
                  <option value="corporate">Corporate</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Current Boat/Date/Time display */}
            <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Boat:</span>
                <span className="font-medium">{booking.time_slot?.boat?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time:</span>
                <span className="font-medium">
                  {booking.time_slot?.start_at ? format(new Date(booking.time_slot.start_at), "MMM d, yyyy 'at' h:mm a") : 'TBD'}
                </span>
              </div>
            </div>

            {/* Toggle to reassign boat/time */}
            <div>
              <Button
                type="button"
                variant={slotOverride.enabled ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSlotOverride(prev => ({ ...prev, enabled: !prev.enabled }))}
              >
                {slotOverride.enabled ? "Cancel Reassignment" : "Reassign Boat / Date / Time"}
              </Button>
            </div>

            {slotOverride.enabled && (
              <div className="border border-dashed border-destructive/50 rounded-lg p-3 space-y-3 bg-destructive/5">
                <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>This will create a new time slot for this booking</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="boat_id" className="text-xs">Boat</Label>
                    <select
                      id="boat_id"
                      value={slotOverride.boat_id}
                      onChange={(e) => setSlotOverride({ ...slotOverride, boat_id: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {BOATS.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.capacity}p)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="slot_date" className="text-xs">Date</Label>
                    <Input
                      id="slot_date"
                      type="date"
                      className="h-9"
                      value={slotOverride.date}
                      onChange={(e) => setSlotOverride({ ...slotOverride, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_time" className="text-xs">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      className="h-9"
                      value={slotOverride.start_time}
                      onChange={(e) => setSlotOverride({ ...slotOverride, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time" className="text-xs">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      className="h-9"
                      value={slotOverride.end_time}
                      onChange={(e) => setSlotOverride({ ...slotOverride, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financial & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="headcount">Guest Count</Label>
              <Input
                id="headcount"
                type="number"
                min="1"
                value={formData.headcount}
                onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="deposit_paid">Deposit Paid</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            <div>
              <Label htmlFor="amount">Total Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="deposit_amount">Deposit Amount ($)</Label>
              <Input
                id="deposit_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.deposit_amount}
                onChange={(e) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="amount_paid">Amount Paid ($)</Label>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Remaining Balance</Label>
              <div className="h-10 px-3 rounded-md border border-input bg-muted flex items-center font-semibold">
                ${remainingBalance.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <EditBookingNotesEditor
              notes={formData.notes}
              onChange={(newNotes) => setFormData((prev) => ({ ...prev, notes: newNotes }))}
            />
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Booking
              </>
            )}
          </Button>

          <div className="space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
