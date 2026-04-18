import { useState, useEffect } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Badge } from "@/quote-app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/quote-app/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/quote-app/components/ui/dialog";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { CreditCard, DollarSign, Calendar, Loader2, X, Play } from "lucide-react";

interface Installment {
  id: string;
  booking_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  booking: {
    id: string;
    customer: {
      name: string;
      email: string;
    };
    time_slot: {
      start_at: string;
    };
  };
}

export const InstallmentsManager = () => {
  const { toast } = useToast();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargeLoading, setChargeLoading] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [numberOfInstallments, setNumberOfInstallments] = useState(3);

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_installments')
        .select(`
          *,
          booking:bookings(
            id,
            customer:customers(name, email),
            time_slot:time_slots(start_at)
          )
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setInstallments(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading installments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChargeInstallment = async (installmentId: string) => {
    setChargeLoading(installmentId);
    try {
      const { data, error } = await supabase.functions.invoke('charge-installment', {
        body: { installmentId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Installment charged successfully",
      });

      await loadInstallments();
    } catch (error: any) {
      toast({
        title: "Error charging installment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChargeLoading(null);
    }
  };

  const handleCancelInstallment = async (installmentId: string) => {
    if (!confirm('Are you sure you want to cancel this installment?')) return;
    
    try {
      const { error } = await supabase
        .from('payment_installments')
        .update({ status: 'canceled' })
        .eq('id', installmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Installment canceled",
      });

      await loadInstallments();
    } catch (error: any) {
      toast({
        title: "Error canceling installment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProcessDue = async () => {
    setChargeLoading('batch');
    try {
      const { data, error } = await supabase.functions.invoke('process-due-installments');

      if (error) throw error;

      const results = data?.results || {};
      toast({
        title: "Batch Processing Complete",
        description: `Processed: ${results.processed || 0}, Succeeded: ${results.succeeded || 0}, Failed: ${results.failed || 0}`,
      });

      await loadInstallments();
    } catch (error: any) {
      toast({
        title: "Error processing installments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChargeLoading(null);
    }
  };

  const handleCreateInstallmentPlan = async () => {
    if (!bookingId || numberOfInstallments < 2) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid booking ID and number of installments (2-12)",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-installment-plan', {
        body: {
          bookingId,
          numberOfInstallments,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${numberOfInstallments} installments`,
      });

      setCreateDialogOpen(false);
      setBookingId("");
      setNumberOfInstallments(3);
      await loadInstallments();
    } catch (error: any) {
      toast({
        title: "Error creating installment plan",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      paid: "default",
      failed: "destructive",
      canceled: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Setup Alert */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
          🚨 Important: Set Up Automatic Charging
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
          Payment installments need a cron job to charge automatically on due dates. Without it, you'll have to manually click "Process Due Now" daily.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open('https://github.com/YOUR_REPO/blob/main/STRIPE_PAYMENT_MANAGEMENT.md#setting-up-automatic-charging-cron-job', '_blank')}
          >
            📖 Setup Guide
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open('https://supabase.com/dashboard/project/tgambsdjfwgoohkqopns/sql/new', '_blank')}
          >
            Open Supabase SQL Editor
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Installments
              </CardTitle>
              <CardDescription>Manage payment installment plans and auto-charge due payments</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary"
                onClick={handleProcessDue}
                disabled={chargeLoading === 'batch'}
              >
                {chargeLoading === 'batch' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Process Due Now
                  </>
                )}
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Create Plan
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Installment Plan</DialogTitle>
                <DialogDescription>
                  Set up a payment plan for an existing booking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bookingId">Booking ID</Label>
                  <Input
                    id="bookingId"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    placeholder="Enter booking ID"
                  />
                </div>
                <div>
                  <Label htmlFor="installments">Number of Installments (2-12)</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="2"
                    max="12"
                    value={numberOfInstallments}
                    onChange={(e) => setNumberOfInstallments(parseInt(e.target.value))}
                  />
                </div>
                <Button 
                  onClick={handleCreateInstallmentPlan} 
                  disabled={createLoading}
                  className="w-full"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Installment Plan"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : installments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No installments found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{installment.booking.customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {installment.booking.customer.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>#{installment.installment_number}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(installment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(installment.due_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(installment.booking.time_slot.start_at)}
                    </TableCell>
                    <TableCell>{getStatusBadge(installment.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {installment.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleChargeInstallment(installment.id)}
                              disabled={chargeLoading === installment.id}
                            >
                              {chargeLoading === installment.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Charging...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Charge Now
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelInstallment(installment.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {installment.status === 'paid' && installment.paid_at && (
                          <div className="flex flex-col gap-1">
                            <div className="text-xs text-muted-foreground">
                              Paid {formatDate(installment.paid_at)}
                            </div>
                            {installment.stripe_payment_intent_id && (
                              <a
                                href={`https://dashboard.stripe.com/payments/${installment.stripe_payment_intent_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                View in Stripe →
                              </a>
                            )}
                          </div>
                        )}
                        {installment.status === 'failed' && (
                          <div className="flex flex-col gap-2">
                            <div className="text-xs text-destructive">Payment failed</div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChargeInstallment(installment.id)}
                              disabled={chargeLoading === installment.id}
                            >
                              Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
