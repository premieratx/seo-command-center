import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Card, CardContent } from "@/quote-app/components/ui/card";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";
import { toast } from "@/quote-app/hooks/use-toast";
import { BoatLink } from "@/quote-app/components/BoatLink";

// stripePromise is now loaded dynamically from the edge function to prevent live/test mismatch

interface EmbeddedStripeCheckoutProps {
  timeSlotId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  guestCount: number;
  partyType: string;
  packageType: string;
  amount: number;
  depositAmount: number;
  subtotal: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  boatName: string;
  experienceType?: string;
  ticketCount?: number;
  selectedAddons?: string[];
  onCheckoutStarted?: (data: any) => void;
  onDiscountApplied?: (discountCents: number) => void;
}

const CheckoutForm = ({
  timeSlotId,
  customerEmail,
  customerName,
  customerPhone,
  guestCount,
  partyType,
  packageType,
  amount,
  depositAmount,
  paymentType,
  promoCode,
  clientSecret,
  payNowCents,
  discountCents,
  eventDate,
  startTime,
  endTime,
  experienceType,
  onCheckoutStarted,
}: EmbeddedStripeCheckoutProps & {
  paymentType: 'deposit' | 'full';
  promoCode: string;
  clientSecret: string;
  payNowCents: number;
  discountCents: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentReady, setIsPaymentReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement) {
      toast({ title: 'Payment not ready', description: 'Please wait a moment and try again.', variant: 'destructive' });
      return;
    }

    // Trigger Stripe validation first to avoid premature failure toasts
    const { error: submitError } = await elements.submit();
    if (submitError) {
      // Let Stripe element surface inline errors (e.g., "Select a payment method")
      return;
    }

    setIsProcessing(true);

    // Track abandoned booking only (lead already created in LeadCaptureForm)
    try {
      if (onCheckoutStarted) {
        const ticketCount = experienceType === "Disco Cruise" ? guestCount : undefined;
        onCheckoutStarted({
          time_slot_id: timeSlotId,
          selected_time_start: startTime,
          selected_time_end: endTime,
          package_type: packageType,
          ticket_count: ticketCount,
          quoted_amount: amount / 100,
          deposit_amount: payNowCents / 100,
          last_step: 'payment_initiated',
        });
      }
    } catch (error) {
      console.error("Error tracking abandoned booking:", error);
    }

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: 'https://premierpartycruises.com',
          receipt_email: customerEmail,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        toast({
          title: 'Payment failed',
          description: result.error.message,
          variant: 'destructive'
        });
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // Only finalize booking after successful payment
        try {
          const { data, error } = await supabase.functions.invoke('finalize-booking', {
            body: {
              paymentIntentId: result.paymentIntent.id,
              timeSlotId,
              customerEmail,
              customerName,
              customerPhone,
              guestCount,
              partyType,
              packageType,
              totalAmount: amount,
              depositAmount: payNowCents,
              paymentType,
              promoCode,
              discount: discountCents,
            }
          });
          if (error) throw error;
        } catch (e: any) {
          console.error('Finalize booking error:', e);
          toast({ 
            title: 'Finalization issue', 
            description: 'Payment captured. Booking will be finalized via webhook.', 
            variant: 'default' 
          });
        }
        window.location.href = 'https://premierpartycruises.com';
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Payment processing failed',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        onReady={() => setIsPaymentReady(false)}
        onChange={(e: any) => setIsPaymentReady(!!e?.complete)}
      />
      <Button 
        type="submit"
        size="lg" 
        className="w-full" 
        disabled={!stripe || isProcessing || !isPaymentReady}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Complete Payment — ${((payNowCents) / 100).toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};

export const EmbeddedStripeCheckout = (props: EmbeddedStripeCheckoutProps) => {
  const [paymentType, setPaymentType] = useState<'deposit' | 'full'>('deposit');
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscountCents, setAppliedDiscountCents] = useState<number>(0);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [autoPromoAttempted, setAutoPromoAttempted] = useState(false);
  
  // Customer info state
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: props.customerEmail || "",
    phone: props.customerPhone || ""
  });

  // Parse name from props if provided
  React.useEffect(() => {
    if (props.customerName) {
      const nameParts = props.customerName.split(' ');
      setCustomerInfo(prev => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(' ') || "",
        email: props.customerEmail || prev.email,
        phone: props.customerPhone || prev.phone
      }));
    }
  }, [props.customerName, props.customerEmail, props.customerPhone]);

  // Auto-apply affiliate promo code on mount
  React.useEffect(() => {
    if (autoPromoAttempted) return;
    
    const autoApplyAffiliatePromo = async () => {
      try {
        const { getAffiliateData } = await import("@/quote-app/lib/affiliateTracking");
        const affiliateData = getAffiliateData();
        
        if (!affiliateData?.code) return;
        
        // Look up active promo for this affiliate code
        const { data: promoCodes, error } = await supabase
          .from('promo_codes')
          .select('code')
          .eq('active', true)
          .or(`code.eq.${affiliateData.code.toUpperCase()},affiliate_id.eq.${affiliateData.affiliateId}`)
          .limit(1)
          .maybeSingle();
        
        if (error || !promoCodes) {
          console.log('No active promo for affiliate:', affiliateData.code);
          return;
        }
        
        // Auto-apply the promo
        setPromoCode(promoCodes.code);
        console.log('✓ Auto-applying affiliate promo:', promoCodes.code);
        
        // Trigger promo application
        const { data: previewData, error: previewError } = await supabase.functions.invoke('create-stripe-checkout', {
          body: {
            timeSlotId: props.timeSlotId,
            amount: props.amount,
            depositAmount: props.depositAmount,
            subtotal: props.subtotal,
            paymentType,
            promoCode: promoCodes.code,
            preview: true,
          }
        });
        
        if (!previewError && typeof previewData?.discount === 'number') {
          setAppliedDiscountCents(previewData.discount);
          console.log('✓ Affiliate discount auto-applied:', previewData.discount / 100);
        }
      } catch (error) {
        console.error('Auto-promo error:', error);
      } finally {
        setAutoPromoAttempted(true);
      }
    };
    
    autoApplyAffiliatePromo();
  }, [autoPromoAttempted, props.timeSlotId, props.amount, props.depositAmount, props.subtotal, paymentType]);

  // Calculate deposit percentage based on event date (must come BEFORE calculateAmounts)
  const getCentralDate = () => {
    const now = new Date();
    const centralDateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const [month, day, year] = centralDateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const today = getCentralDate();
  const eventDateOnly = new Date(props.eventDate);
  const daysUntilEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const requiresHigherDeposit = daysUntilEvent < 14;
  const depositPercentage = requiresHigherDeposit ? 0.5 : 0.25;

  // Calculate amounts with discount applied correctly
  const calculateAmounts = () => {
    const subtotalDollars = props.subtotal / 100;
    const discountDollars = appliedDiscountCents / 100;
    
    // Apply discount to subtotal
    const discountedSubtotal = Math.max(0, subtotalDollars - discountDollars);
    
    // Tax and gratuity on discounted subtotal
    const tax = discountedSubtotal * 0.0825;
    const gratuity = discountedSubtotal * 0.20;
    
    // Calculate discounted total
    const fullAfterDiscountCents = Math.round((discountedSubtotal + tax + gratuity) * 100);
    
    // Use the CORRECT deposit percentage based on booking rules (not from original amounts!)
    const depositAfterDiscountCents = Math.round(fullAfterDiscountCents * depositPercentage);
    
    return {
      fullAmount: fullAfterDiscountCents,
      depositAmount: depositAfterDiscountCents,
      discountedSubtotal,
      tax,
      gratuity
    };
  };

  const amounts = calculateAmounts();
  
  const payNowCents = paymentType === 'deposit' ? amounts.depositAmount : amounts.fullAmount;

  // Notify parent when discount is applied
  React.useEffect(() => {
    if (props.onDiscountApplied) {
      props.onDiscountApplied(appliedDiscountCents);
    }
  }, [appliedDiscountCents, props.onDiscountApplied]);

  // If payment type changes after checkout started, re-initialize Payment Intent to keep amounts in sync
  React.useEffect(() => {
    if (clientSecret) {
      console.log('Payment type changed after checkout started — reinitializing Payment Intent');
      setClientSecret(null);
      setTimeout(() => { handleInitializeCheckout(); }, 0);
    }
  }, [paymentType]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    const code = promoCode.trim().toUpperCase();
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          timeSlotId: props.timeSlotId,
          amount: props.amount,
          depositAmount: props.depositAmount,
          subtotal: props.subtotal,
          paymentType,
          promoCode: code,
          preview: true,
        }
      });
      if (error) throw error;
      
      // CRITICAL SAFEGUARD: Validate discount doesn't exceed subtotal
      if (typeof data?.discount === 'number') {
        const discount = data.discount as number;
        
        if (discount > props.subtotal) {
          console.error('🚨 SAFEGUARD TRIGGERED: Discount exceeds subtotal!', {
            discount,
            subtotal: props.subtotal
          });
          toast({ 
            title: 'Invalid discount', 
            description: 'Discount cannot exceed subtotal amount',
            variant: 'destructive' 
          });
          setAppliedDiscountCents(0);
          return;
        }
        
        // CRITICAL SAFEGUARD: Verify amounts never exceed original
        if (data.fullAmountAfterDiscount > props.amount) {
          console.error('🚨 SAFEGUARD TRIGGERED: Discounted amount exceeds original!', {
            fullAmountAfterDiscount: data.fullAmountAfterDiscount,
            originalAmount: props.amount
          });
          toast({ 
            title: 'Calculation error', 
            description: 'Invalid discount calculation detected',
            variant: 'destructive' 
          });
          setAppliedDiscountCents(0);
          return;
        }
        
        console.log('✓ Promo validation passed:', {
          discount,
          fullAmountAfterDiscount: data.fullAmountAfterDiscount,
          depositAmountAfterDiscount: data.depositAmountAfterDiscount,
          breakdown: data.breakdown
        });
        
        setAppliedDiscountCents(discount);
        toast({ title: 'Promo applied', description: `Discount -$${(discount/100).toFixed(2)}` });
        // If checkout is already initialized, re-create the Payment Intent with the new discount
        if (clientSecret) {
          console.log('Promo changed after checkout started — reinitializing Payment Intent');
          setClientSecret(null);
          setTimeout(() => { handleInitializeCheckout(); }, 0);
        }
      }
    } catch (err: any) {
      setAppliedDiscountCents(0);
      toast({ title: 'Invalid code', description: err.message || 'Please check the code and try again', variant: 'destructive' });
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleInitializeCheckout = async () => {
    // Validate customer info
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all contact details",
        variant: "destructive"
      });
      return;
    }

    setIsInitializing(true);

    try {
      const customerName = `${customerInfo.firstName} ${customerInfo.lastName}`;
      
      // Calculate what we EXPECT to be charged (frontend calculation)
      const expectedAmount = paymentType === 'deposit' ? amounts.depositAmount : amounts.fullAmount;
      
      console.log('🔐 SAFEGUARD: Initializing checkout with expected amount:', {
        expectedAmount,
        paymentType,
        fullAmount: amounts.fullAmount,
        depositAmount: amounts.depositAmount
      });

      // Get affiliate data for payment tracking
      const { getAffiliateData, getAffiliateLandingUrl } = await import("@/quote-app/lib/affiliateTracking");
      const affiliateData = getAffiliateData();
      const affiliateLandingUrl = getAffiliateLandingUrl();
      const isEmbedded = window.self !== window.top;
      const sourceUrl = affiliateLandingUrl || (isEmbedded ? document.referrer || window.location.href : window.location.href);
      const sourceType = isEmbedded ? 'embedded_quote_builder' : 'main_quote_builder';

      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          timeSlotId: props.timeSlotId,
          customerEmail: customerInfo.email,
          customerName: customerName,
          customerPhone: customerInfo.phone,
          guestCount: props.guestCount,
          partyType: props.partyType,
          packageType: props.packageType,
          amount: props.amount,
          depositAmount: props.depositAmount,
          subtotal: props.subtotal,
          paymentType,
          promoCode: promoCode.trim() || null,
          affiliateId: affiliateData?.affiliateId || null,
          affiliateCodeId: affiliateData?.codeId || null,
          affiliateClickId: affiliateData?.clickId || null,
          sourceUrl: sourceUrl,
          sourceType: sourceType,
          eventDate: props.eventDate,
          startTime: props.startTime,
          endTime: props.endTime,
          boatName: props.boatName,
        }
      });

      if (error) throw error;

      // CRITICAL SAFEGUARD: Verify the amount returned from server matches what we expect
      if (data.amountAfterDiscount !== expectedAmount) {
        console.error('🚨 SAFEGUARD TRIGGERED: Server amount does not match frontend calculation!', {
          serverAmount: data.amountAfterDiscount,
          expectedAmount,
          difference: data.amountAfterDiscount - expectedAmount
        });
        toast({
          title: 'Calculation Mismatch',
          description: 'The payment amount does not match. Please refresh and try again.',
          variant: 'destructive'
        });
        setIsInitializing(false);
        return;
      }

      // CRITICAL SAFEGUARD: Verify deposit is never more than full amount
      if (paymentType === 'deposit' && data.depositAmountAfterDiscount > data.fullAmountAfterDiscount) {
        console.error('🚨 SAFEGUARD TRIGGERED: Deposit exceeds full amount!');
        toast({
          title: 'Calculation Error',
          description: 'Invalid payment calculation detected. Please contact support.',
          variant: 'destructive'
        });
        setIsInitializing(false);
        return;
      }

      console.log('✓ SAFEGUARD PASSED: Server amount matches frontend calculation', {
        verifiedAmount: data.amountAfterDiscount,
        breakdown: data.breakdown
      });

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        if (typeof data.discount === 'number') {
          setAppliedDiscountCents(data.discount);
        }
        const pk = data.publishableKey || "pk_live_51QpHRvGVXHcR5w0oWL5Y6b3MhGqEcBR8L7dKiZ4b8VcJDnBQRr0XhZ8dC7LqJ9mY6zX3qP2Nw8vL5tQ4sR3mK0oP00yYz8gH1L";
        setStripePromise(loadStripe(pk));
      }
    } catch (error: any) {
      console.error('Checkout initialization error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize checkout',
        variant: 'destructive'
      });
    } finally {
      setIsInitializing(false);
    }
  };


  // Deposit calculation is now done above in calculateAmounts section

  return (
    <Card className="border-2 border-primary/20 mt-3 sm:mt-4">
      <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 space-y-3 sm:space-y-4">
        {/* Customer Info Section */}
        <div className="space-y-3 pb-4 border-b">
          <Label className="text-base font-semibold">Contact Information</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="firstName" className="text-xs">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={customerInfo.firstName}
                onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                required
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={customerInfo.lastName}
                onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                required
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email" className="text-xs">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              required
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              required
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Payment Option Selection */}
        <div className="space-y-3 pb-4 border-b">
          <Label className="text-base font-semibold">Payment Option</Label>
          
          {requiresHigherDeposit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="text-amber-900 font-medium">⚠️ Booking within 14 days of cruise date</p>
              <p className="text-amber-800 text-xs mt-1">50% payment required now, remaining 50% due within 72 hours</p>
            </div>
          )}
          
          <RadioGroup value={paymentType} onValueChange={(val: any) => setPaymentType(val)}>
            <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors ${paymentType === 'deposit' ? 'border-green-500 bg-green-50/50' : 'border-input'}`}>
              <RadioGroupItem value="deposit" id="payment-deposit" />
              <Label htmlFor="payment-deposit" className="flex-1 cursor-pointer">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Pay Deposit ({Math.round(depositPercentage * 100)}%)</span>
                      <span className="font-bold text-primary">${(amounts.depositAmount / 100).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {requiresHigherDeposit 
                        ? `Remaining ${((amounts.fullAmount - amounts.depositAmount) / 100).toFixed(2)} due within 72 hours` 
                        : `Remaining ${((amounts.fullAmount - amounts.depositAmount) / 100).toFixed(2)} due 14 days before cruise`}
                    </p>
                  </div>
              </Label>
            </div>
            
            <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors ${paymentType === 'full' ? 'border-green-500 bg-green-50/50' : 'border-input'}`}>
              <RadioGroupItem value="full" id="payment-full" />
              <Label htmlFor="payment-full" className="flex-1 cursor-pointer">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Pay in Full</span>
                      <span className="font-bold text-primary">${(amounts.fullAmount / 100).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pay the full amount now
                    </p>
                  </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Promo Code Section */}
        <div className="space-y-2 pb-4 border-b">
          <Label htmlFor="promoCode">Discount Code (Optional)</Label>
          <div className="flex gap-2">
            <Input
              id="promoCode"
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            />
            <Button type="button" variant="secondary" onClick={handleApplyPromo} disabled={applyingPromo || !promoCode.trim()}>
              {applyingPromo ? 'Applying...' : 'Apply'}
            </Button>
          </div>
          {appliedDiscountCents > 0 && promoCode && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-green-700 dark:text-green-400">Discount Applied ({promoCode}):</span>
                <span className="font-bold text-green-700 dark:text-green-400">-${(appliedDiscountCents / 100).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Price Summary */}
        <div className="bg-accent/50 p-4 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">${(props.subtotal / 100).toFixed(2)}</span>
          </div>
          {appliedDiscountCents > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount:</span>
              <span>-${(appliedDiscountCents / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Sales Tax (8.25%):</span>
            <span className="text-muted-foreground">${amounts.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Gratuity (20%):</span>
            <span className="text-muted-foreground">${amounts.gratuity.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span className="text-primary">${(amounts.fullAmount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-xl pt-2 border-t-2 border-primary/30">
            <span className="text-primary">Amount Due Now:</span>
            <span className="text-primary">${(payNowCents / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Deadline Notice */}
        {!requiresHigherDeposit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <p className="font-medium">📅 Payment Deadline</p>
            <p className="mt-1">All payments must be completed 14 days before your cruise date.</p>
          </div>
        )}

        {/* Payment Element or Initialize Button */}
        {!clientSecret ? (
          <Button 
            size="lg" 
            className={
              props.experienceType === 'Disco Cruise'
                ? "w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg"
                : "w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-lg"
            }
            onClick={handleInitializeCheckout}
            disabled={isInitializing || !customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone}
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                {props.experienceType === 'Disco Cruise' ? '🎉 ' : '⚓ '}
                Continue to Payment
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Complete Payment</h3>
            </div>
            {stripePromise && (
              <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  {...props}
                  customerEmail={customerInfo.email}
                  customerName={`${customerInfo.firstName} ${customerInfo.lastName}`}
                  customerPhone={customerInfo.phone}
                  paymentType={paymentType}
                  promoCode={promoCode}
                  clientSecret={clientSecret}
                  payNowCents={payNowCents}
                  discountCents={appliedDiscountCents}
                />
              </Elements>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
