import React, { useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Loader2, CreditCard, CheckCircle, DollarSign } from "lucide-react";
import { toast } from "@/quote-app/hooks/use-toast";

interface BalancePaymentFormProps {
  bookingId: string;
  remainingBalance: number; // in dollars
  balanceDueDate: string;
  customerEmail: string;
  customerName: string;
  onPaymentSuccess: (amountPaid: number) => void;
}

const StripePaymentForm = ({
  payNowCents,
  bookingId,
  onPaymentSuccess,
}: {
  payNowCents: number;
  bookingId: string;
  onPaymentSuccess: (amountPaid: number) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error: submitError } = await elements.submit();
    if (submitError) return;

    setIsProcessing(true);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        toast({ title: 'Payment failed', description: result.error.message, variant: 'destructive' });
      } else if (result.paymentIntent?.status === 'succeeded') {
        // Update booking with payment
        try {
          await supabase.functions.invoke('process-balance-payment', {
            body: {
              bookingId,
              paymentIntentId: result.paymentIntent.id,
              amountCents: payNowCents,
            },
          });
        } catch (err) {
          console.error('Process balance payment error:', err);
        }

        toast({ title: '✅ Payment successful!', description: `$${(payNowCents / 100).toFixed(2)} has been applied to your balance.` });
        onPaymentSuccess(payNowCents / 100);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Payment failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        onReady={() => setIsReady(false)}
        onChange={(e: any) => setIsReady(!!e?.complete)}
      />
      <Button
        type="submit"
        size="lg"
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
        disabled={!stripe || isProcessing || !isReady}
      >
        {isProcessing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
        ) : (
          <><CreditCard className="mr-2 h-4 w-4" /> Pay ${(payNowCents / 100).toFixed(2)}</>
        )}
      </Button>
    </form>
  );
};

export const BalancePaymentForm = ({
  bookingId,
  remainingBalance,
  balanceDueDate,
  customerEmail,
  customerName,
  onPaymentSuccess,
}: BalancePaymentFormProps) => {
  const [paymentOption, setPaymentOption] = useState<'full' | 'custom'>('full');
  const [customAmount, setCustomAmount] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const payNowCents = paymentOption === 'full'
    ? Math.round(remainingBalance * 100)
    : Math.round((parseFloat(customAmount) || 0) * 100);

  const isValidAmount = payNowCents >= 50 && payNowCents <= Math.round(remainingBalance * 100) + 1;

  const handleInitialize = async () => {
    if (!isValidAmount) {
      toast({ title: 'Invalid amount', description: `Enter between $0.50 and $${remainingBalance.toFixed(2)}`, variant: 'destructive' });
      return;
    }

    setIsInitializing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-balance-payment', {
        body: {
          bookingId,
          amountCents: payNowCents,
          customerEmail,
          customerName,
        },
      });

      if (error) {
        console.error('create-balance-payment error:', error);
        const msg = typeof error === 'object' && error.message ? error.message : 'Failed to initialize payment. Please try again.';
        throw new Error(msg);
      }

      if (!data?.clientSecret) {
        console.error('No clientSecret in response:', data);
        throw new Error(data?.error || 'Payment setup failed. Please try again.');
      }

      if (data.publishableKey && !stripePromise) {
        setStripePromise(loadStripe(data.publishableKey));
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to initialize payment', variant: 'destructive' });
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePaymentSuccess = (amountPaid: number) => {
    setPaymentComplete(true);
    setClientSecret(null);
    onPaymentSuccess(amountPaid);
  };

  if (paymentComplete) {
    return (
      <Card className="bg-emerald-500/10 border-emerald-500/30">
        <CardContent className="pt-6 text-center space-y-3">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-emerald-300">Payment Received!</h3>
          <p className="text-slate-300 text-sm">Your payment has been applied to your booking. Refresh the page to see updated totals.</p>
          <Button
            variant="outline"
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            onClick={() => window.location.reload()}
          >
            Refresh Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/70 border-sky-500/20 text-white">
      <CardHeader>
        <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pay Your Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Balance summary */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-amber-300/80 uppercase tracking-wider font-semibold">Remaining Balance</p>
            <p className="text-2xl font-bold text-amber-300">${remainingBalance.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Due by</p>
            <p className="text-sm font-semibold text-amber-300">{balanceDueDate}</p>
          </div>
        </div>

        {!clientSecret && (
          <>
            {/* Payment amount selection */}
            <RadioGroup
              value={paymentOption}
              onValueChange={(v) => {
                setPaymentOption(v as 'full' | 'custom');
                setClientSecret(null);
              }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 cursor-pointer hover:border-sky-500/30 transition-colors">
                <RadioGroupItem value="full" id="pay-full" className="border-sky-400 text-sky-400" />
                <Label htmlFor="pay-full" className="cursor-pointer flex-1">
                  <span className="text-white font-semibold">Pay Full Balance</span>
                  <span className="text-emerald-400 font-bold ml-2">${remainingBalance.toFixed(2)}</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 cursor-pointer hover:border-sky-500/30 transition-colors">
                <RadioGroupItem value="custom" id="pay-custom" className="border-sky-400 text-sky-400" />
                <Label htmlFor="pay-custom" className="cursor-pointer flex-1">
                  <span className="text-white font-semibold">Pay Custom Amount</span>
                </Label>
              </div>
            </RadioGroup>

            {paymentOption === 'custom' && (
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Enter amount ($0.50 – ${remainingBalance.toFixed(2)})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.50"
                    max={remainingBalance}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleInitialize}
              disabled={isInitializing || !isValidAmount}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              size="lg"
            >
              {isInitializing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up payment...</>
              ) : (
                <><CreditCard className="mr-2 h-4 w-4" /> Continue to Payment — ${(payNowCents / 100).toFixed(2)}</>
              )}
            </Button>
          </>
        )}

        {clientSecret && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#10b981',
                  colorBackground: '#1e293b',
                  colorText: '#e2e8f0',
                  colorDanger: '#ef4444',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <StripePaymentForm
              payNowCents={payNowCents}
              bookingId={bookingId}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </Elements>
        )}

        {clientSecret && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-300 w-full"
            onClick={() => setClientSecret(null)}
          >
            ← Change amount
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
