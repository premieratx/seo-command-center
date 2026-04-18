import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LeadCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventDate: Date;
  partyType: string;
  guestCount: number;
  quoteUrl: string;
  onLeadCreated?: (data: { firstName: string; lastName: string; email: string; phone: string }) => void;
}

export const LeadCaptureModal = ({
  open,
  onOpenChange,
  eventDate,
  partyType,
  guestCount,
  quoteUrl,
  onLeadCreated
}: LeadCaptureModalProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create full quote URL
      const fullQuoteUrl = `https://booking.premierpartycruises.com${quoteUrl}`;
      
      // Detect source type and URL with improved detection
      const isEmbedded = window.self !== window.top;
      
      // Try to get source from URL params first (for explicit tracking)
      // This is CRITICAL for cross-origin iframes where document.referrer strips the path
      const urlParams = new URLSearchParams(window.location.search);
      const paramSourceUrl = urlParams.get('sourceUrl');
      const paramSourceType = urlParams.get('sourceType');
      
      // Determine source URL with fallbacks
      // Priority: 1) Explicit sourceUrl param (full URL with path), 2) referrer, 3) current URL
      let sourceUrl: string;
      if (paramSourceUrl) {
        // Use the explicitly passed sourceUrl - this preserves the full path/query params
        sourceUrl = decodeURIComponent(paramSourceUrl);
      } else if (isEmbedded && document.referrer) {
        // For embedded widgets without explicit param, use referrer (may be stripped to base domain)
        sourceUrl = document.referrer;
      } else {
        // For main quote builder, use current page URL
        sourceUrl = window.location.href;
      }
      
      // Determine source type
      let sourceType: string;
      if (paramSourceType) {
        sourceType = paramSourceType;
      } else if (isEmbedded) {
        sourceType = 'embedded_quote_builder';
      } else if (window.location.pathname === '/new-quote') {
        sourceType = 'new_quote';
      } else if (window.location.hostname === 'booking.premierpartycruises.com') {
        sourceType = 'main_quote_builder';
      } else {
        sourceType = 'main_quote_builder';
      }
      
      // Create lead in database
      // Create lead via Edge Function (uses service role + validation) and triggers integrations
      const { data: createLeadResp, error: createLeadErr } = await supabase.functions.invoke('create-lead', {
        body: {
          firstName,
          lastName,
          email,
          phone,
          eventDate: eventDate.toISOString().split('T')[0],
          partyType,
          guestCount,
          quoteUrl: fullQuoteUrl,
          sourceType,
          sourceUrl,
        },
      });

      if (createLeadErr) throw createLeadErr;
      console.log('Lead created successfully:', createLeadResp);

      toast({
        title: "Quote Ready!",
        description: "We've sent your personalized quote to your email and phone.",
      });

      // Call onLeadCreated callback if provided
      if (onLeadCreated) {
        onLeadCreated({ firstName, lastName, email, phone });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">View Your Quote</DialogTitle>
          <DialogDescription>
            Enter your details to see available cruises for your party
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "View My Quote"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
