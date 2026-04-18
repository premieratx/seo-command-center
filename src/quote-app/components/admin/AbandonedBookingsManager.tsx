import { useState, useEffect } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/quote-app/components/ui/table";
import { Badge } from "@/quote-app/components/ui/badge";
import { Loader2, AlertCircle, Mail, Phone, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/quote-app/hooks/use-toast";
import { formatPartyType } from "@/quote-app/lib/utils";

interface AbandonedBooking {
  id: string;
  created_at: string;
  updated_at: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  event_date: string;
  party_type: string;
  guest_count: number;
  time_slot_id?: string;
  selected_boat_name?: string;
  selected_time_start?: string;
  selected_time_end?: string;
  package_type?: string;
  ticket_count?: number;
  quoted_amount?: number;
  deposit_amount?: number;
  quote_url?: string;
  last_step: string;
  status: string;
}

export const AbandonedBookingsManager = () => {
  const [bookings, setBookings] = useState<AbandonedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAbandonedBookings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-abandoned-bookings');
      
      if (error) throw error;
      setBookings(data?.bookings || []);
    } catch (error: any) {
      console.error('Error fetching abandoned bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load abandoned bookings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAbandonedBookings();

    // Set up realtime subscription
    const channel = supabase
      .channel('abandoned-bookings-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'abandoned_bookings' 
      }, () => {
        fetchAbandonedBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStepBadge = (step: string) => {
    const steps: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      lead_capture: { label: "Lead Captured", variant: "outline" },
      slot_selected: { label: "Slot Selected", variant: "secondary" },
      package_selected: { label: "Package Selected", variant: "default" },
      checkout_started: { label: "Checkout Started", variant: "destructive" },
    };

    const stepInfo = steps[step] || { label: step, variant: "outline" as const };
    return <Badge variant={stepInfo.variant}>{stepInfo.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Abandoned Bookings</CardTitle>
          <CardDescription>Track customers who started but didn't complete checkout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No abandoned bookings found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abandoned Bookings ({bookings.length})</CardTitle>
        <CardDescription>Customers who started but didn't complete checkout</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Event Details</TableHead>
                <TableHead>Selection Progress</TableHead>
                <TableHead>Last Step</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{booking.customer_name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {booking.customer_email}
                      </div>
                      {booking.customer_phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {booking.customer_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(booking.event_date), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {booking.guest_count} guests
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPartyType(booking.party_type)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      {booking.selected_boat_name && (
                        <div className="font-medium">{booking.selected_boat_name}</div>
                      )}
                      {booking.selected_time_start && booking.selected_time_end && (
                        <div className="text-muted-foreground">
                          {booking.selected_time_start} - {booking.selected_time_end}
                        </div>
                      )}
                      {booking.package_type && (
                        <div className="text-primary capitalize">
                          {booking.package_type.replace(/_/g, ' ')}
                        </div>
                      )}
                      {booking.ticket_count && (
                        <div className="text-muted-foreground">
                          {booking.ticket_count} tickets
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStepBadge(booking.last_step)}
                  </TableCell>
                  <TableCell>
                    {booking.quoted_amount ? (
                      <div className="space-y-1">
                        <div className="font-medium">${booking.quoted_amount.toFixed(2)}</div>
                        {booking.deposit_amount && (
                          <div className="text-xs text-muted-foreground">
                            Deposit: ${booking.deposit_amount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      <div>Started: {format(new Date(booking.created_at), "MMM d, h:mm a")}</div>
                      <div className="text-muted-foreground">
                        Updated: {format(new Date(booking.updated_at), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};