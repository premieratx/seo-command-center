import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Button } from "@/quote-app/components/ui/button";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Badge } from "@/quote-app/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, Edit, Pencil } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { CreateBookingModal } from "./CreateBookingModal";
import { EditTimeSlotModal } from "./EditTimeSlotModal";
import { formatPartyType } from "@/quote-app/lib/utils";

export const CalendarView = () => {
  const [boats, setBoats] = useState<any[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<string>("all");
  const [selectedExperience, setSelectedExperience] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditSlotOpen, setIsEditSlotOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [createDefaults, setCreateDefaults] = useState<{ date?: Date; boatId?: string; experienceType?: string; timeSlotId?: string }>({});

  useEffect(() => {
    fetchBoats();
  }, []);

  useEffect(() => {
    fetchMonthData();

    // Set up real-time subscriptions for bookings and time slots
    const bookingsChannel = supabase
      .channel('calendar-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Booking change detected, refreshing calendar...');
          fetchMonthData();
        }
      )
      .subscribe();

    const slotsChannel = supabase
      .channel('calendar-slots-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'time_slots'
        },
        () => {
          console.log('Time slot change detected, refreshing calendar...');
          fetchMonthData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(slotsChannel);
    };
  }, [currentMonth, selectedBoat, selectedExperience]);

  const fetchBoats = async () => {
    const { data } = await supabase.from("boats").select("*").eq("status", "active");
    setBoats(data || []);
  };

  const fetchMonthData = async () => {
    setIsLoading(true);
    try {
      // Compute month bounds in America/Chicago to avoid DST/off-by-one issues
      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth() + 1; // 1-12
      const pad = (n: number) => String(n).padStart(2, '0');
      const startDateStr = `${y}-${pad(m)}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDateStr = `${y}-${pad(m)}-${pad(lastDay)}`;
      const getCentralOffset = (dateStr: string) => {
        try {
          const dt = new Date(`${dateStr}T12:00:00Z`);
          const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' }).formatToParts(dt);
          const tz = parts.find(p => p.type === 'timeZoneName')?.value || '';
          return tz.includes('CDT') ? '-05:00' : '-06:00';
        } catch { return '-06:00'; }
      };
      const startISO = `${startDateStr}T00:00:00${getCentralOffset(startDateStr)}`;
      const endISO = `${endDateStr}T23:59:59${getCentralOffset(endDateStr)}`;

      // Fetch time slots via service-role edge function to bypass RLS and include all statuses
      const { data: slotResp, error: slotErr } = await supabase.functions.invoke('list-time-slots', {
        body: {
          startISO,
          endISO,
          boatId: selectedBoat !== 'all' ? selectedBoat : null,
          experienceType: selectedExperience !== 'all' ? selectedExperience : null,
        }
      });
      if (slotErr) { console.error('list-time-slots error', slotErr); }
      let slots = (slotResp?.slots ?? slotResp ?? []) as any[];
      console.log('Calendar slots loaded:', slots.length, 'from edge function');

      // Fallback to direct query if function fails/empty
      if (!slots || slots.length === 0) {
        console.log('Falling back to direct time_slots query');
        const { data: directSlots } = await supabase
          .from('time_slots')
          .select('*, boat:boats(*), experience:experiences(*)')
          .gte('start_at', startISO)
          .lte('start_at', endISO)
          .in('status', ['open','held','booked'])
          .order('start_at', { ascending: true });
        slots = directSlots ?? [];
        console.log('Fallback slots loaded:', slots.length);
      }
      setTimeSlots(slots);

      // Fetch bookings via service-role edge function to bypass RLS
      const { data: bookingsResp, error: bookingsErr } = await supabase.functions.invoke('list-bookings', {
        body: { 
          startISO, 
          endISO, 
          boatId: selectedBoat !== 'all' ? selectedBoat : null,
          experienceType: selectedExperience !== 'all' ? selectedExperience : null,
        }
      });
      if (bookingsErr) { console.error('list-bookings error', bookingsErr); }
      let list = (bookingsResp?.bookings ?? bookingsResp ?? []) as any[];

      // Fallback to direct query if function fails
      if (!list || list.length === 0) {
        const { data: direct } = await supabase
          .from("bookings")
          .select(`
            *,
            time_slot:time_slots(*, boat:boats(*), experience:experiences(*)),
            customer:customers(*)
          `)
          .neq("status", "cancelled");
        list = (direct ?? []).filter(booking => {
          const slotDate = booking.time_slot?.start_at ? new Date(booking.time_slot.start_at) : null;
          return slotDate && slotDate >= new Date(startISO) && slotDate <= new Date(endISO);
        });
      }
      setBookings(list);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toChicagoDateStr = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const y = parts.find(p => p.type === 'year')?.value || '1970';
    const m = parts.find(p => p.type === 'month')?.value || '01';
    const d = parts.find(p => p.type === 'day')?.value || '01';
    return `${y}-${m}-${d}`;
  };

  const formatChicagoTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });

  const getDaySlots = (date: Date) => {
    const dateStr = toChicagoDateStr(date);
    return timeSlots.filter(slot => {
      const slotDate = toChicagoDateStr(new Date(slot.start_at));
      return slotDate === dateStr;
    });
  };

  const getDayBookings = (date: Date) => {
    const dateStr = toChicagoDateStr(date);
    return bookings.filter(booking => {
      const start = booking.time_slot?.start_at ? toChicagoDateStr(new Date(booking.time_slot.start_at)) : '';
      return start === dateStr;
    });
  };

  const selectedDateSlots = selectedDate ? getDaySlots(selectedDate) : [];
  const selectedDateBookings = selectedDate ? getDayBookings(selectedDate) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>
            View and manage time slots and bookings across your fleet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Select value={selectedBoat} onValueChange={setSelectedBoat}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by boat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boats</SelectItem>
                {boats.map(boat => (
                  <SelectItem key={boat.id} value={boat.id}>
                    {boat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedExperience} onValueChange={setSelectedExperience}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experiences</SelectItem>
                <SelectItem value="disco_cruise">ATX Disco Cruise</SelectItem>
                <SelectItem value="private_cruise">Private Cruise</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => fetchMonthData()}>
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md border"
                  modifiers={{
                    hasActivity: (date) => getDaySlots(date).length > 0 || getDayBookings(date).length > 0,
                    hasBookings: (date) => getDayBookings(date).length > 0
                  }}
                  modifiersStyles={{
                    hasActivity: { fontWeight: "600", color: "hsl(var(--primary))" },
                    hasBookings: { backgroundColor: "hsl(var(--primary) / 0.15)" }
                  }}
                />
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary/15" />
                    <span>Confirmed bookings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-primary" />
                    <span>Available slots</span>
                  </div>
                </div>
              </div>

              {/* Unified Day View - All Slots & Bookings Together */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                  </h3>

                  {selectedDate && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {selectedDateSlots.length === 0 && selectedDateBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No activity scheduled for this date
                        </p>
                      ) : (
                        <>
                          {/* Time Slots */}
                          {selectedDateSlots.length > 0 && (
                            <>
                              <h4 className="text-sm font-semibold text-primary sticky top-0 bg-background py-1 border-b">
                                Time Slots ({selectedDateSlots.length})
                              </h4>
                              {selectedDateSlots.map(slot => (
                                <Card key={slot.id} className="p-3 border-primary/20">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="space-y-1 flex-1">
                                      <p className="font-medium text-sm">
                                        {slot.boat.name} - {slot.experience.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatChicagoTime(slot.start_at)} - {formatChicagoTime(slot.end_at)}
                                      </p>
                                      <p className="text-xs">
                                        {slot.experience?.type === 'disco_cruise' ? `$${slot.hourly_rate}/person` : `$${slot.hourly_rate}/hr`} • {slot.capacity_available}/{slot.capacity_total} available
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={slot.status === "open" ? "default" : "outline"}>
                                        {slot.status}
                                      </Badge>
                                      <Button 
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingSlot(slot);
                                          setIsEditSlotOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                      <Button 
                                        size="sm"
                                        onClick={() => {
                                          setCreateDefaults({
                                            date: selectedDate,
                                            boatId: slot.boat.id,
                                            experienceType: slot.experience?.type,
                                            timeSlotId: slot.id,
                                          });
                                          setIsCreateModalOpen(true);
                                        }}
                                      >
                                        Book
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </>
                          )}

                          {/* Confirmed Bookings */}
                          {selectedDateBookings.length > 0 && (
                            <>
                              <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 sticky top-0 bg-background py-1 border-b mt-4">
                                Confirmed Bookings ({selectedDateBookings.length})
                              </h4>
                              {selectedDateBookings.map(booking => {
                                const bookingDate = booking.time_slot?.start_at ? new Date(booking.time_slot.start_at) : null;
                                const isPast = bookingDate && bookingDate < new Date();
                                const displayStatus = isPast && booking.status === "confirmed" ? "completed" : booking.status;
                                
                                return (
                                  <Card key={booking.id} className="p-3 bg-green-500/5 border-green-500/20">
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-1 flex-1">
                                        <p className="font-medium text-sm">
                                          {booking.customer.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatChicagoTime(booking.time_slot.start_at)} - {formatChicagoTime(booking.time_slot.end_at)}
                                        </p>
                                        <p className="text-xs">
                                          {booking.time_slot?.boat?.name} • {booking.headcount} guests
                                        </p>
                                        <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                                          ${booking.amount} • {formatPartyType(booking.party_type)}
                                        </p>
                                      </div>
                                      <Badge variant={
                                        displayStatus === "completed" ? "outline" :
                                        displayStatus === "confirmed" ? "default" :
                                        "secondary"
                                      }>
                                        {displayStatus}
                                      </Badge>
                                    </div>
                                  </Card>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateBookingModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchMonthData}
        defaultDate={createDefaults.date}
        defaultBoatId={createDefaults.boatId}
        defaultExperienceType={createDefaults.experienceType}
        defaultTimeSlotId={createDefaults.timeSlotId}
      />

      {editingSlot && (
        <EditTimeSlotModal
          open={isEditSlotOpen}
          onOpenChange={(open) => {
            setIsEditSlotOpen(open);
            if (!open) setEditingSlot(null);
          }}
          onSuccess={fetchMonthData}
          timeSlot={editingSlot}
        />
      )}
    </div>
  );
};
