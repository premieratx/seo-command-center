import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { useToast } from "@/quote-app/hooks/use-toast";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Extend Window interface for GTM dataLayer and TikTok pixel
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      instance: (id: string) => { track: (event: string, params?: Record<string, unknown>) => void };
    };
  }
}

// Fixed March 24th deadline at 11:59:59 PM CST
const SALE_DEADLINE_CST = new Date('2026-03-24T23:59:59-06:00');
const getDynamicDeadlineText = () => {
  const daysLeft = Math.max(0, Math.ceil((SALE_DEADLINE_CST.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  return `the next ${daysLeft} Days`;
};

// Current deal configuration - update this when deal changes
const CURRENT_DEAL = {
  discountAmount: 150,
  promoCode: 'PREMIERNEWYEAR',
  dealName: 'New Years Super Sale'
};

interface LeadCaptureFormProps {
  eventDate: Date;
  partyType: string;
  guestCount: number;
  quoteUrl: string;
  onLeadCreated: (data: { firstName: string; lastName: string; email: string; phone: string; quoteNumber?: string; leadId?: string }) => void;
}

export const LeadCaptureForm = ({ 
  eventDate, 
  partyType, 
  guestCount, 
  quoteUrl, 
  onLeadCreated 
}: LeadCaptureFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  // Dynamic deadline text
  const deadlineDateText = getDynamicDeadlineText();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fullQuoteUrl = `https://booking.premierpartycruises.com${quoteUrl}`;
      
      // Format date as YYYY-MM-DD for the backend
      const formattedDate = eventDate.toISOString().split('T')[0];
      
      // Detect source type and URL with improved detection
      const isEmbedded = window.self !== window.top;
      
      // Try to get source from URL params first (for explicit tracking)
      const urlParams = new URLSearchParams(window.location.search);
      const paramSourceUrl = urlParams.get('sourceUrl');
      const paramSourceType = urlParams.get('sourceType');
      
      // Determine source URL with fallbacks
      let sourceUrl: string;
      if (paramSourceUrl) {
        sourceUrl = paramSourceUrl;
      } else if (isEmbedded) {
        // For embedded widgets, use referrer (the page that embedded the iframe)
        sourceUrl = document.referrer || window.location.href;
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
      
      // Get affiliate data
      const { getAffiliateData, getAffiliateLandingUrl } = await import("@/quote-app/lib/affiliateTracking");
      const affiliateData = getAffiliateData();
      const affiliateLandingUrl = getAffiliateLandingUrl();
      
      const { data, error } = await supabase.functions.invoke("create-lead", {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          eventDate: formattedDate,
          partyType,
          guestCount,
          quoteUrl: fullQuoteUrl,
          sourceType,
          sourceUrl: affiliateLandingUrl || sourceUrl, // Use affiliate landing URL for sheet referrer
          affiliateId: affiliateData?.affiliateId,
          affiliateCodeId: affiliateData?.codeId,
          affiliateClickId: affiliateData?.clickId,
        },
      });

      if (error) throw error;

      // Fire GTM dataLayer event for Google Ads conversion tracking
      if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "lovable_quote_completed"
        });
        
        // Fire TikTok pixel conversion event
        if (window.ttq) {
          window.ttq.track('SubmitForm', {
            content_name: 'Quote Completed',
            content_category: partyType,
          });
        }
      }

      // Track affiliate conversion if affiliate code exists
      const { trackAffiliateConversion } = await import("@/quote-app/lib/affiliateTracking");
      await trackAffiliateConversion(
        sourceType as any,
        'lead',
        { leadId: data?.leadId }
      );

      toast({
        title: "Success!",
        description: "Your information has been saved. Let's find your perfect cruise!",
      });

      // Save resume URL for returning visitors
      try {
        sessionStorage.setItem('resumeQuoteUrl', fullQuoteUrl);
        if (data?.leadId) sessionStorage.setItem('leadId', data.leadId);
        if (data?.quoteNumber) sessionStorage.setItem('quoteNumber', data.quoteNumber);
      } catch {}

      // Navigate directly to the lead dashboard
      if (data?.leadId) {
        const dashboardUrl = `https://booking.premierpartycruises.com/lead-dashboard?lead=${data.leadId}`;
        if (window.parent !== window) {
          // Embedded in an iframe — redirect the parent page
          try { window.parent.location.href = dashboardUrl; } catch { window.location.href = dashboardUrl; }
        } else {
          window.location.href = dashboardUrl;
        }
      }

      onLeadCreated({ ...formData, quoteNumber: data?.quoteNumber, leadId: data?.leadId });
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
    <div className="w-full h-full flex flex-col justify-center">
        {/* Compact Header - Sale-themed with blue/yellow/black */}
        <div className="bg-[#1a2744] border-2 border-yellow-400 rounded-lg p-3 mb-3">
          <h2 className="text-lg font-extrabold text-yellow-400 mb-2 text-center leading-tight">
            Complete Your Quote to Check Availability & Book Online
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <div className="bg-yellow-400 text-[#1a2744] rounded-full w-6 h-6 flex items-center justify-center mb-1 text-sm font-bold">1</div>
              <p className="font-bold text-white text-xs leading-tight">View Quote Online</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-yellow-400 text-[#1a2744] rounded-full w-6 h-6 flex items-center justify-center mb-1 text-sm font-bold">2</div>
              <p className="font-bold text-white text-xs leading-tight">Book in {deadlineDateText} for ${CURRENT_DEAL.discountAmount} Off Your Booking!</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-yellow-400 text-[#1a2744] rounded-full w-6 h-6 flex items-center justify-center mb-1 text-sm font-bold">3</div>
              <p className="font-bold text-white text-xs leading-tight">Party On!</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="firstName" className="text-xs">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                disabled={isSubmitting}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                disabled={isSubmitting}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="email" className="text-xs">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isSubmitting}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="phone" className="text-xs">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={isSubmitting}
              className="h-8 text-sm"
            />
          </div>

          <Button 
            type="submit" 
            size="default"
            className="w-full text-sm py-2.5 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "View My Quote"
            )}
          </Button>
        </form>
    </div>
  );
};
