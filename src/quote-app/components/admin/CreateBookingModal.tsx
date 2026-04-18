import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "@/quote-app/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/quote-app/lib/utils";

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

interface CreateBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  // Optional defaults when launching from Calendar
  defaultDate?: Date;
  defaultBoatId?: string;
  defaultExperienceType?: string; // 'private_cruise' | 'disco_cruise'
  defaultTimeSlotId?: string;
}

export const CreateBookingModal = ({ open, onOpenChange, onSuccess, defaultDate, defaultBoatId, defaultExperienceType, defaultTimeSlotId }: CreateBookingModalProps) => {
  const [boats, setBoats] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    experienceType: "",
    boatId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    timeSlotId: "",
    headcount: "",
    partyType: "",
    packageType: "standard",
    amount: "",
    depositAmount: "",
    status: "confirmed"
  });

  useEffect(() => {
    if (open) {
      fetchBoatsAndExperiences();
      // Apply defaults when opening from Calendar
      setSelectedDate(defaultDate ?? undefined);
      setFormData((prev) => ({
        ...prev,
        experienceType: defaultExperienceType || prev.experienceType,
        boatId: defaultBoatId || prev.boatId,
        timeSlotId: defaultTimeSlotId || prev.timeSlotId,
      }));
    }
  }, [open]);

  useEffect(() => {
    if (selectedDate && formData.experienceType && formData.boatId) {
      fetchAvailableSlots();
    }
  }, [selectedDate, formData.experienceType, formData.boatId]);

  const fetchBoatsAndExperiences = async () => {
    const [boatsRes, experiencesRes] = await Promise.all([
      supabase.from("boats").select("*").eq("status", "active").order("name"),
      supabase.from("experiences").select("*").eq("active", true).order("type")
    ]);
    
    setBoats(boatsRes.data || []);
    setExperiences(experiencesRes.data || []);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !formData.experienceType || !formData.boatId) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr + 'T00:00:00');
    const endOfDay = new Date(dateStr + 'T23:59:59');

    // First get the experience ID for the selected type
    const { data: experienceData } = await supabase
      .from("experiences")
      .select("id")
      .eq("type", formData.experienceType)
      .single();

    if (!experienceData) {
      setTimeSlots([]);
      return;
    }

    const { data } = await supabase
      .from("time_slots")
      .select(`
        *,
        boat:boats(*),
        experience:experiences(*)
      `)
      .eq("boat_id", formData.boatId)
      .eq("experience_id", experienceData.id)
      .gte("start_at", startOfDay.toISOString())
      .lte("start_at", endOfDay.toISOString())
      .in("status", ["open", "held"])
      .order("start_at", { ascending: true });

    setTimeSlots(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-upsert-booking', {
        body: {
          bookingId: null,
          timeSlotId: formData.timeSlotId,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone || null,
          headcount: parseInt(formData.headcount),
          partyType: formData.partyType,
          packageType: formData.packageType,
          amount: parseFloat(formData.amount),
          depositAmount: parseFloat(formData.depositAmount),
          status: formData.status,
          notes: null,
        }
      });

      if (error) throw error;

      toast({ title: "Success", description: "Booking created successfully" });
      onOpenChange(false);
      onSuccess();
      setSelectedDate(undefined);
      setFormData({
        experienceType: "",
        boatId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        timeSlotId: "",
        headcount: "",
        partyType: "",
        packageType: "standard",
        amount: "",
        depositAmount: "",
        status: "confirmed"
      });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>
            Add a booking manually to update availability
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Experience Type & Boat Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceType">Experience Type *</Label>
              <Select 
                value={formData.experienceType} 
                onValueChange={(val) => setFormData({ ...formData, experienceType: val, timeSlotId: "" })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience type" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(experiences.map(e => e.type))].map(type => (
                    <SelectItem key={type} value={type}>
                      {type === 'disco_cruise' ? 'Disco Cruise' : 'Private Cruise'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="boat">Boat *</Label>
              <Select 
                value={formData.boatId} 
                onValueChange={(val) => setFormData({ ...formData, boatId: val, timeSlotId: "" })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select boat" />
                </SelectTrigger>
                <SelectContent>
                  {boats.map(boat => (
                    <SelectItem key={boat.id} value={boat.id}>{boat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Select Date *</Label>
            <div className="border rounded-md p-3 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setFormData({ ...formData, timeSlotId: "" });
                }}
                disabled={(date) => date < new Date()}
                className={cn("pointer-events-auto")}
              />
            </div>
          </div>

          {/* Time Slot Selection */}
          {selectedDate && formData.experienceType && formData.boatId && (
            <div className="space-y-2">
              <Label htmlFor="timeSlot">Time Slot *</Label>
              <Select value={formData.timeSlotId} onValueChange={(val) => setFormData({ ...formData, timeSlotId: val })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeSlots.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No available time slots</div>
                  ) : (
                    timeSlots.map(slot => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {new Date(slot.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - 
                        {new Date(slot.end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} 
                        ({slot.capacity_available} available)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Customer Information */}
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
              <Label htmlFor="customerPhone">Customer Phone *</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headcount">Guest Count *</Label>
              <Input
                id="headcount"
                type="number"
                min="1"
                value={formData.headcount}
                onChange={(e) => setFormData({ ...formData, headcount: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Party Type & Package */}
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
                  {formData.experienceType === 'disco_cruise' ? (
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
              <Label htmlFor="depositAmount">Deposit Amount ($) *</Label>
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
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
