import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Loader2, Database, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/quote-app/components/ui/alert";

export const SeedDataButton = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { toast } = useToast();

  const seedTimeSlots = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-time-slots', { body: { reset: true } });
      
      if (error) throw error;

      toast({
        title: "Time slots created!",
        description: `Successfully created ${data.count} time slots through end of 2026.`
      });
    } catch (error: any) {
      console.error("Error seeding time slots:", error);
      toast({
        title: "Error seeding data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const sendTestBookingWebhook = async () => {
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-booking-webhook');
      
      if (error) throw error;

      toast({
        title: "Test booking sent!",
        description: "Sample booking payload sent to your GHL webhook. Check your GHL automation to map the fields."
      });
    } catch (error: any) {
      console.error("Error sending test webhook:", error);
      toast({
        title: "Error sending test webhook",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            Click below to populate all time slots from today through December 31, 2026 based on your weekly schedule and pricing rules.
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={seedTimeSlots} 
          disabled={isSeeding}
          size="lg"
          className="w-full"
        >
          {isSeeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Seeding Time Slots...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Seed Time Slots (Today - End 2026)
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <Alert>
          <Send className="h-4 w-4" />
          <AlertDescription>
            Send a sample booking payload to your GHL webhook to help you map fields in your automation.
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={sendTestBookingWebhook} 
          disabled={isSendingTest}
          size="lg"
          className="w-full"
          variant="outline"
        >
          {isSendingTest ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Test Webhook...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Test Booking to GHL
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
