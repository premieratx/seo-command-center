import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/quote-app/components/ui/dialog";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Badge } from "@/quote-app/components/ui/badge";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

export const TimeSlotManager = () => {
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [boats, setBoats] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [isBulkGenDialogOpen, setIsBulkGenDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    boat_id: "",
    experience_id: "",
    start_at: "",
    end_at: "",
    capacity_total: "",
    capacity_available: "",
    hourly_rate: "",
    status: "open"
  });

  // Bulk generation form
  const [bulkGenData, setBulkGenData] = useState({
    startDate: "",
    endDate: "",
    boat_id: "",
    experience_id: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [slotsRes, boatsRes, experiencesRes] = await Promise.all([
        supabase.from("time_slots").select(`
          *,
          boat:boats(*),
          experience:experiences(*)
        `).order("start_at", { ascending: false }).limit(50),
        supabase.from("boats").select("*").eq("status", "active"),
        supabase.from("experiences").select("*").eq("active", true)
      ]);

      setTimeSlots(slotsRes.data || []);
      setBoats(boatsRes.data || []);
      setExperiences(experiencesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const slotData = {
        ...formData,
        capacity_total: parseInt(formData.capacity_total),
        capacity_available: parseInt(formData.capacity_available),
        hourly_rate: parseFloat(formData.hourly_rate)
      };

      if (editingSlot) {
        const { error } = await supabase
          .from("time_slots")
          .update(slotData)
          .eq("id", editingSlot.id);

        if (error) throw error;

        toast({
          title: "Time slot updated",
          description: "The time slot has been successfully updated."
        });
      } else {
        const { error } = await supabase
          .from("time_slots")
          .insert(slotData);

        if (error) throw error;

        toast({
          title: "Time slot created",
          description: "The time slot has been successfully created."
        });
      }

      setIsDialogOpen(false);
      setEditingSlot(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (slot: any) => {
    setEditingSlot(slot);
    setFormData({
      boat_id: slot.boat_id,
      experience_id: slot.experience_id,
      start_at: slot.start_at,
      end_at: slot.end_at,
      capacity_total: slot.capacity_total.toString(),
      capacity_available: slot.capacity_available.toString(),
      hourly_rate: slot.hourly_rate.toString(),
      status: slot.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time slot?")) return;

    try {
      const { error } = await supabase.from("time_slots").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Time slot deleted",
        description: "The time slot has been successfully deleted."
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleBulkGenerate = async () => {
    if (!bulkGenData.startDate || !bulkGenData.endDate || !bulkGenData.boat_id || !bulkGenData.experience_id) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-time-slots', {
        body: {
          startDate: bulkGenData.startDate,
          endDate: bulkGenData.endDate,
          boatId: bulkGenData.boat_id,
          experienceId: bulkGenData.experience_id
        }
      });

      if (error) throw error;

      toast({
        title: "Time slots generated!",
        description: `Successfully generated time slots from ${bulkGenData.startDate} to ${bulkGenData.endDate}`,
      });

      setIsBulkGenDialogOpen(false);
      setBulkGenData({ startDate: "", endDate: "", boat_id: "", experience_id: "" });
      fetchData();
    } catch (error: any) {
      console.error('Error generating slots:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate time slots",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      boat_id: "",
      experience_id: "",
      start_at: "",
      end_at: "",
      capacity_total: "",
      capacity_available: "",
      hourly_rate: "",
      status: "open"
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Time Slot Manager</CardTitle>
            <CardDescription>
              Create and manage available time slots for bookings
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkGenDialogOpen} onOpenChange={setIsBulkGenDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Bulk Generate Slots
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Generate Time Slots</DialogTitle>
                  <DialogDescription>
                    Generate time slots for a date range for a specific boat and experience
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={bulkGenData.startDate}
                        onChange={(e) => setBulkGenData({ ...bulkGenData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={bulkGenData.endDate}
                        onChange={(e) => setBulkGenData({ ...bulkGenData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Boat</Label>
                    <Select
                      value={bulkGenData.boat_id}
                      onValueChange={(value) => setBulkGenData({ ...bulkGenData, boat_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select boat" />
                      </SelectTrigger>
                      <SelectContent>
                        {boats.map(boat => (
                          <SelectItem key={boat.id} value={boat.id}>
                            {boat.name} (Capacity: {boat.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Experience</Label>
                    <Select
                      value={bulkGenData.experience_id}
                      onValueChange={(value) => setBulkGenData({ ...bulkGenData, experience_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {experiences.map(exp => (
                          <SelectItem key={exp.id} value={exp.id}>
                            {exp.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleBulkGenerate} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate Slots</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingSlot(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSlot ? "Edit Time Slot" : "Create New Time Slot"}
                </DialogTitle>
                <DialogDescription>
                  Configure the time slot details below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Boat</Label>
                    <Select
                      value={formData.boat_id}
                      onValueChange={(value) => setFormData({ ...formData, boat_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select boat" />
                      </SelectTrigger>
                      <SelectContent>
                        {boats.map(boat => (
                          <SelectItem key={boat.id} value={boat.id}>
                            {boat.name} (Capacity: {boat.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Experience</Label>
                    <Select
                      value={formData.experience_id}
                      onValueChange={(value) => setFormData({ ...formData, experience_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {experiences.map(exp => (
                          <SelectItem key={exp.id} value={exp.id}>
                            {exp.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_at}
                      onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total Capacity</Label>
                    <Input
                      type="number"
                      value={formData.capacity_total}
                      onChange={(e) => setFormData({ ...formData, capacity_total: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Available Capacity</Label>
                    <Input
                      type="number"
                      value={formData.capacity_available}
                      onChange={(e) => setFormData({ ...formData, capacity_available: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="held">Held</SelectItem>
                        <SelectItem value="booked">Booked</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingSlot(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSlot ? "Update" : "Create"} Time Slot
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {timeSlots.map(slot => (
              <Card key={slot.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {slot.boat.name} - {slot.experience.title}
                      </p>
                      <Badge variant={
                        slot.status === "open" ? "default" :
                        slot.status === "booked" ? "secondary" :
                        "outline"
                      }>
                        {slot.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(slot.start_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} - {new Date(slot.end_at).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <p className="text-sm">
                      {slot.experience?.type === 'disco_cruise' ? `$${slot.hourly_rate}/person` : `$${slot.hourly_rate}/hr`} • {slot.capacity_available}/{slot.capacity_total} capacity
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(slot)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(slot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
