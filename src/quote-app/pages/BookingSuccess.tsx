import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/quote-app/integrations/supabase/client";

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent');
    let cancelled = false;

    const run = async () => {
      try {
        if (paymentIntentId) {
          await supabase.functions.invoke('finalize-booking', {
            body: { paymentIntentId }
          });
        }
      } catch (e) {
        console.error('Finalize on success page failed:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Processing Payment...
              </>
            ) : (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Booking Confirmed!
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {isLoading ? (
            <p className="text-muted-foreground">
              Please wait while we confirm your booking...
            </p>
          ) : (
            <>
              <p className="text-lg">
                Thank you for your booking! We've sent a confirmation email to your inbox.
              </p>
              <p className="text-sm text-muted-foreground">
                You'll receive additional details about your cruise shortly.
              </p>
              <div className="pt-4 space-y-2">
                <Button 
                  onClick={() => window.location.href = '/portal'} 
                  size="lg" 
                  className="w-full"
                >
                  Browse Our Online Store
                </Button>
                <Button 
                  onClick={() => navigate("/")} 
                  size="lg" 
                  variant="outline"
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingSuccess;
