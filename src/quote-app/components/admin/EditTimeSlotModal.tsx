import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Badge } from "@/quote-app/components/ui/badge";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "@/quote-app/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

const PARTY_TYPES = [
  { id: "bachelor", label: "Bachelor Party" },
  { id: "bachelorette", label: "Bachelorette Party" },
  { id: "combined_bach", label: "Combined Bach Party" },
  { id: "wedding", label: "Wedding Event" },
  { id: "corporate", label: "Corporate Event" },
  { id: "birthday", label: "Birthday Party" },
  { id: "graduation", label: "Graduation" },
  { id: "other", label: "Other" },
];

interface EditTimeSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  timeSlot: any;
}

export const EditTimeSlotModal = ({ open, onOpenChange, onSuccess, timeSlot }: EditTimeSlotModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("status");
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [showNewBookingForm, setShowNewBookingForm] = useState(false);
  const [formData, setFormData] = useState({
    status: timeSlot?.status || "open",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    headcount: "",
    partyType: "",
    packageType: "standard",
    amount: "",
    depositAmount: "",
    notes: "",
    bookingStatus: "confirmed"
  });

  const isDiscoCruise = timeSlot?.experience?.type === 'disco_cruise';
  const totalBookedTickets = allBookings.reduce((sum, b) => sum + (b.headcount || 0), 0);
  const availableTickets = (timeSlot?.capacity_total || 0) - totalBookedTickets;

  useEffect(() => {
    if (open && timeSlot) {
      setFormData(prev => ({ ...prev, status: timeSlot.status }));
      fetchAllBookings();
      setShowNewBookingForm(false);
      setEditingBookingId(null);
    }
  }, [open, timeSlot]);

  const fetchAllBookings = async () => {
    if (!timeSlot?.id) return;
    
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        customer:customers(*)
      `)
      .eq("time_slot_id", timeSlot.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    setAllBookings(data || []);
    
    // For private cruises, auto-populate form if there's a booking
    if (!isDiscoCruise && data && data.length > 0) {
      const booking = data[0];
      if (booking.customer) {
        setFormData(prev => ({
          ...prev,
          customerName: booking.customer.name,
          customerEmail: booking.customer.email,
          customerPhone: booking.customer.phone || "",
        headcount: booking.headcount.toString(),
        partyType: booking.party_type,
        packageType: booking.package_type,
        amount: booking.amount.toString(),
        depositAmount: booking.deposit_amount.toString(),
        notes: booking.notes || "",
        bookingStatus: booking.status
        }));
        setEditingBookingId(booking.id);
        setActiveTab("booking");
      }
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      headcount: "",
      partyType: "",
      packageType: "standard",
      amount: "",
      depositAmount: "",
      notes: "",
      bookingStatus: "confirmed"
    }));
    setEditingBookingId(null);
    setShowNewBookingForm(false);
  };

  const handleEditBooking = (booking: any) => {
    if (!booking.customer) return;
    setFormData(prev => ({
      ...prev,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      customerPhone: booking.customer.phone || "",
      headcount: booking.headcount.toString(),
      partyType: booking.party_type,
      packageType: booking.package_type,
      amount: booking.amount.toString(),
      depositAmount: booking.deposit_amount.toString(),
      notes: booking.notes || "",
      bookingStatus: booking.status
    }));
    setEditingBookingId(booking.id);
    setShowNewBookingForm(true);
  };

  const handleStatusChange = async () => {
    setIsLoading(true);
    try {
      const updates: any = { status: formData.status };
      
      // If marking as available, reset capacity
      if (formData.status === "open") {
        updates.capacity_available = timeSlot.capacity_total;
      }

      const { error } = await supabase
        .from("time_slots")
        .update(updates)
        .eq("id", timeSlot.id);

      if (error) throw error;

      toast({ title: "Success", description: "Time slot status updated" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const headcountNum = parseInt(formData.headcount);

      // Capacity check for disco (client-side guard only)
      if (isDiscoCruise && !editingBookingId) {
        if (headcountNum > availableTickets) {
          toast({
            title: "Error",
            description: `Only ${availableTickets} tickets available. Cannot book ${headcountNum} tickets.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke('admin-upsert-booking', {
        body: {
          bookingId: editingBookingId,
          timeSlotId: timeSlot.id,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone || null,
          headcount: headcountNum,
          partyType: formData.partyType,
          packageType: formData.packageType,
          amount: parseFloat(formData.amount),
          depositAmount: parseFloat(formData.depositAmount),
          notes: formData.notes || null,
          status: formData.bookingStatus,
        }
      });

      if (error) throw error;

      toast({ title: "Success", description: "Booking saved successfully" });
      await fetchAllBookings();
      resetForm();
    } catch (error: any) {
      console.error("Error saving booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save booking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeSlotCapacity = async () => {
    // Fetch all active bookings for this slot
    const { data: bookings } = await supabase
      .from("bookings")
      .select("headcount")
      .eq("time_slot_id", timeSlot.id)
      .neq("status", "cancelled");

    const totalBooked = bookings?.reduce((sum, b) => sum + b.headcount, 0) || 0;
    const newAvailable = timeSlot.capacity_total - totalBooked;

    await supabase
      .from("time_slots")
      .update({ 
        capacity_available: Math.max(0, newAvailable),
        status: newAvailable <= 0 ? 'booked' : 'open'
      })
      .eq("id", timeSlot.id);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from("bookings")
        .update({ status: "cancelled", canceled_at: new Date().toISOString() })
        .eq("id", bookingId);

      await updateTimeSlotCapacity();
      await fetchAllBookings();
      resetForm();

      toast({ title: "Success", description: "Booking cancelled" });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!timeSlot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Time Slot</DialogTitle>
          <DialogDescription>
            {timeSlot.boat?.name} - {timeSlot.experience?.title}
            <br />
            {new Date(timeSlot.start_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="booking">Booking Details</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="space-y-2">
              <Label>Time Slot Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Available</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.status === "open" && "Open for bookings"}
                {formData.status === "booked" && "Fully booked"}
                {formData.status === "unavailable" && "Not available for booking"}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusChange} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="booking" className="space-y-4">
            {/* Capacity Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">
                    {isDiscoCruise ? "Tickets" : "Boat Capacity"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalBookedTickets} booked • {availableTickets} available • {timeSlot?.capacity_total} total
                  </p>
                </div>
                <Badge variant={availableTickets > 0 ? "default" : "secondary"}>
                  {availableTickets > 0 ? "Available" : "Full"}
                </Badge>
              </div>
            </Card>

            {/* Existing Bookings List (for Disco Cruises) */}
            {isDiscoCruise && allBookings.length > 0 && (
              <div className="space-y-2">
                <Label>Current Bookings ({allBookings.length})</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {allBookings.map((booking) => (
                    <Card key={booking.id} className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{booking.customer?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.customer?.email || 'No email'} • {booking.headcount} tickets
                          </p>
                          <p className="text-xs">
                            ${booking.amount} • Paid: ${booking.deposit_amount}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditBooking(booking)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBooking(booking.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Booking Button (for Disco Cruises) */}
            {isDiscoCruise && !showNewBookingForm && availableTickets > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewBookingForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Booking
              </Button>
            )}

            {/* Booking Form */}
            {(showNewBookingForm || !isDiscoCruise) && (
              <form onSubmit={handleBookingSubmit} className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Customer Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Customer Phone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headcount">Guest Count *</Label>
                  <Input
                    id="headcount"
                    type="number"
                    min="1"
                    max={timeSlot.capacity_total}
                    value={formData.headcount}
                    onChange={(e) => setFormData({ ...formData, headcount: e.target.value })}
                    required
                  />
                </div>
              </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partyType">Party Type *</Label>
                <Select value={formData.partyType} onValueChange={(val) => setFormData({ ...formData, partyType: val })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select party type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTY_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageType">Package</Label>
                <Select value={formData.packageType} onValueChange={(val) => setFormData({ ...formData, packageType: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    {timeSlot?.experience?.type === 'disco_cruise' ? (
                      <>
                        <SelectItem value="basic">Basic Bach Package</SelectItem>
                        <SelectItem value="disco_queen">Disco Queen Package</SelectItem>
                        <SelectItem value="sparkle">Sparkle Package</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="standard">Standard Private Cruise</SelectItem>
                        <SelectItem value="essentials">Essentials Package</SelectItem>
                        <SelectItem value="ultimate">Ultimate Package</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Total Amount ($) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Amount Paid ($) *</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookingStatus">Booking Status</Label>
                  <Select value={formData.bookingStatus} onValueChange={(val) => setFormData({ ...formData, bookingStatus: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional booking notes..."
                />
              </div>

                <div className="flex gap-2 justify-between pt-4">
                  <div>
                    {isDiscoCruise && showNewBookingForm && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingBookingId ? "Update Booking" : "Create Booking"}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Close button when not showing form */}
            {isDiscoCruise && !showNewBookingForm && (
              <div className="flex justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
