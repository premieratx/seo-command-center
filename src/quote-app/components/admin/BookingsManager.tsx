import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Badge } from "@/quote-app/components/ui/badge";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, Plus, Mail, FileText, Edit, Copy, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { CreateBookingModal } from "./CreateBookingModal";
import { EditBookingModal } from "./EditBookingModal";
import { useToast } from "@/quote-app/hooks/use-toast";
import { formatPartyType, formatTimeCSTShort } from "@/quote-app/lib/utils";

export const BookingsManager = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendingInvoiceNow, setSendingInvoiceNow] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'active' | 'canceled'>('active');
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();

    // Set up real-time subscription for new bookings
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Booking change detected, refreshing...');
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-bookings', { body: { limit: 200 } });
      if (error) throw error;
      let list = (data?.bookings ?? data ?? []) as any[];

      // Fallback to direct query if function errors (RLS allows public SELECT on bookings)
      if (!list || list.length === 0) {
        const { data: direct, error: directErr } = await supabase
          .from("bookings")
          .select(`
            *,
            time_slot:time_slots(*, boat:boats(*), experience:experiences(*)),
            customer:customers(*)
          `)
          .order("created_at", { ascending: false });
        if (!directErr) list = direct ?? [];
      }

      setBookings(list);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvoice = async (booking: any) => {
    setGeneratingInvoice(booking.id);
    try {
      const amountPaid = Number(booking.amount_paid ?? booking.deposit_amount);
      const remainingBalance = Math.max(0, Number(booking.amount) - amountPaid);

      if (remainingBalance <= 0) {
        toast({
          title: "No invoice needed",
          description: "This booking is already paid in full.",
          variant: "destructive",
        });
        return;
      }

      // Calculate due date (2 weeks before cruise)
      const startDate = new Date(booking.time_slot.start_at);
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() - 14);

      const { data, error } = await supabase.functions.invoke('create-stripe-invoice', {
        body: {
          bookingId: booking.id,
          customerEmail: booking.customer.email,
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          boatName: booking.time_slot.boat.name,
          experienceTitle: booking.time_slot.experience.title,
          experienceType: booking.time_slot.experience.type,
          packageType: booking.package_type,
          partyType: booking.party_type,
          guestCount: booking.headcount,
          maxCapacity: booking.time_slot.boat.capacity,
          totalAmount: Number(booking.amount),
          amountPaid: amountPaid,
          remainingBalance: remainingBalance,
          eventDate: format(new Date(booking.time_slot.start_at), 'yyyy-MM-dd'),
          startTime: format(new Date(booking.time_slot.start_at), 'h:mm a'),
          endTime: format(new Date(booking.time_slot.end_at), 'h:mm a'),
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          promoCode: booking.promo_code || null,
          discount: 0, // Calculate if needed
          affiliateCode: null, // Add if available
        }
      });

      if (error) throw error;

      toast({
        title: "Invoice Generated",
        description: "Stripe invoice has been created successfully.",
      });

      fetchBookings();
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const handleSendInvoiceEmail = async (booking: any) => {
    const email = emailInputs[booking.id] || booking.customer.email;
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(booking.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          bookingId: booking.id,
          recipientEmail: email,
          recipientName: booking.customer.name,
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Invoice email sent to ${email}`,
      });
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice email",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleSendInvoiceNow = async (booking: any, email: string, phone: string) => {
    setSendingInvoiceNow(booking.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-invoice', {
        body: {
          bookingId: booking.id,
          recipientEmail: email,
          recipientPhone: phone,
        }
      });

      if (error) throw error;

      toast({
        title: "Invoice Sent!",
        description: `Invoice generated and sent via email${phone ? ' and SMS' : ''}`,
      });

      // Refresh bookings to show updated invoice URL
      fetchBookings();
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    } finally {
      setSendingInvoiceNow(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>View and manage all bookings</CardDescription>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Booking
            </Button>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant={viewTab === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewTab('active')}
            >
              Active ({bookings.filter(b => b.status !== 'canceled' && b.status !== 'refunded').length})
            </Button>
            <Button
              variant={viewTab === 'canceled' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setViewTab('canceled')}
            >
              Cancelled ({bookings.filter(b => b.status === 'canceled' || b.status === 'refunded').length})
            </Button>
          </div>
        </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No bookings yet
          </p>
        ) : (
          <div className="space-y-4">
            {bookings
              .filter(b => viewTab === 'canceled' 
                ? (b.status === 'canceled' || b.status === 'refunded')
                : (b.status !== 'canceled' && b.status !== 'refunded')
              )
              .map(booking => {
              const amountPaid = Number(booking.amount_paid ?? (booking.status === 'confirmed' ? booking.amount : booking.deposit_amount));
              const remainingBalance = Math.max(0, Number(booking.amount) - amountPaid);
              const isPaidInFull = remainingBalance <= 0.01;

              // Due date = two weeks before cruise date
              const getDueDate = () => {
                const startStr = booking.time_slot?.start_at;
                if (!startStr) return 'TBD';
                const bookingDate = new Date(startStr);
                const dueDate = new Date(bookingDate);
                dueDate.setDate(dueDate.getDate() - 14);
                return format(dueDate, "MMM d, yyyy");
              };

              return (
                <Card key={booking.id} className="p-4">
                  <div className="space-y-3">
                  <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">{booking.customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.customer.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.customer.phone}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          title="Copy dashboard link"
                          onClick={() => {
                            const url = `https://booking.premierpartycruises.com/customer-dashboard?booking=${booking.id}`;
                            navigator.clipboard.writeText(url);
                            toast({ title: "Link copied!", description: url });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingBooking(booking)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Badge variant={
                          isPaidInFull ? "default" :
                          booking.status === "pending" || booking.status === "held" ? "secondary" :
                          "outline"
                        }>
                          {isPaidInFull ? "Paid in Full" : booking.status}
                        </Badge>
                        {booking.alcohol_delivery_url && (
                          <span className="flex items-center gap-1 text-yellow-500 font-bold text-sm animate-pulse">
                            <CheckCircle className="h-4 w-4" />
                            <span>🍹 POD Linked</span>
                          </span>
                        )}
                      </div>
                    </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Boat</p>
                          <p className="font-medium">{booking.time_slot?.boat?.name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Experience</p>
                          <p className="font-medium">{booking.time_slot?.experience?.title || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date & Time</p>
                          <p className="font-medium">
                            {booking.time_slot?.start_at ? format(new Date(booking.time_slot.start_at), "MMM d, yyyy") : 'TBD'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.time_slot?.start_at ? formatTimeCSTShort(booking.time_slot.start_at) : '--'} - 
                            {booking.time_slot?.end_at ? formatTimeCSTShort(booking.time_slot.end_at) : '--'} CST
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Guests / Capacity</p>
                          <p className="font-medium">{booking.headcount} guests</p>
                          <p className="text-xs text-muted-foreground">{formatPartyType(booking.party_type)}</p>
                        </div>
                      </div>

                    <div className="border-t pt-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-bold text-lg">${booking.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount Paid</p>
                          <p className="font-bold text-lg text-green-600">
                            ${amountPaid.toFixed(2)}
                          </p>
                        </div>
                        {!isPaidInFull && remainingBalance > 0 && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Remaining Balance</p>
                              <p className="font-semibold text-orange-600">
                                ${remainingBalance.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Due Date</p>
                              <p className="font-semibold">{getDueDate()}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground mb-2">Invoice</p>
                              {booking.stripe_invoice_url ? (
                                <div className="space-y-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(booking.stripe_invoice_url, '_blank')}
                                    className="w-full"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Stripe Invoice
                                  </Button>
                                  {booking.invoice_sent_at && (
                                    <p className="text-xs text-muted-foreground">
                                      Sent {format(new Date(booking.invoice_sent_at), "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                  )}
                                  <div className="flex gap-2">
                                    <Input
                                      type="email"
                                      placeholder={booking.customer.email}
                                      value={emailInputs[booking.id] || ''}
                                      onChange={(e) => setEmailInputs(prev => ({ ...prev, [booking.id]: e.target.value }))}
                                      className="flex-1"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendInvoiceEmail(booking)}
                                      disabled={sendingEmail === booking.id}
                                    >
                                      {sendingEmail === booking.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Mail className="mr-2 h-4 w-4" />
                                          Send
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateInvoice(booking)}
                                    disabled={generatingInvoice === booking.id}
                                    className="w-full"
                                  >
                                    {generatingInvoice === booking.id ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Generate Invoice
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleSendInvoiceNow(booking, 'ppcaustin@gmail.com', '5125767975')}
                                    disabled={sendingInvoiceNow === booking.id}
                                    className="w-full"
                                  >
                                    {sendingInvoiceNow === booking.id ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Invoice Now (Email + SMS)
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        {booking.promo_code && (
                          <div>
                            <p className="text-muted-foreground">Promo Code Used</p>
                            <p className="font-mono font-bold text-primary">
                              {booking.promo_code}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Package</p>
                          <p className="font-medium capitalize">{booking.package_type}</p>
                        </div>
                      </div>
                    </div>

                    {(booking.source_url || booking.source_type || booking.promo_code) && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Attribution & Source</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {booking.source_type && (
                            <div>
                              <p className="text-muted-foreground">Widget Type</p>
                              <p className="font-mono text-xs">{booking.source_type}</p>
                            </div>
                          )}
                          {booking.source_url && (
                            <div>
                              <p className="text-muted-foreground">Source URL</p>
                              <p className="font-mono text-xs truncate max-w-[300px]" title={booking.source_url}>
                                {booking.source_url}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {booking.notes && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{booking.notes}</p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Booking ID: {booking.id.slice(0, 8)}... • Created {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <CreateBookingModal 
      open={isModalOpen} 
      onOpenChange={setIsModalOpen}
      onSuccess={fetchBookings}
    />
    <EditBookingModal
      booking={editingBooking}
      isOpen={!!editingBooking}
      onClose={() => setEditingBooking(null)}
      onSuccess={fetchBookings}
    />
  </>
  );
};
