import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/quote-app/integrations/supabase/client';

interface LeadInfo {
  email: string;
  name: string;
  phone: string;
  firstName: string;
  lastName: string;
}

interface BookingDetails {
  eventDate: Date;
  partyType: string;
  guestCount: number;
  timeSlotId?: string;
  boatName?: string;
  startTime?: string;
  endTime?: string;
  packageType?: string;
  ticketCount?: number;
  quotedAmount?: number;
  depositAmount?: number;
}

export const useAbandonedBookingTracking = () => {
  const [abandonedBookingId, setAbandonedBookingId] = useState<string | null>(null);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);

  // Load lead info from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('leadInfo');
    if (stored) {
      try {
        setLeadInfo(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse lead info from session storage:', e);
      }
    }
  }, []);

  // Store lead info when captured
  const captureLeadInfo = useCallback((info: LeadInfo) => {
    setLeadInfo(info);
    sessionStorage.setItem('leadInfo', JSON.stringify(info));
  }, []);

  // Track abandoned booking with progressive updates - with retry logic
  const trackAbandoned = useCallback(async (
    details: BookingDetails,
    lastStep: 'lead_capture' | 'viewing_options' | 'selected_slot' | 'selected_package' | 'checkout_started' | 'payment_details'
  ) => {
    // If no lead info yet, skip tracking
    if (!leadInfo) {
      console.log('No lead info available yet for tracking');
      return null;
    }

    const attemptTracking = async (retryCount = 0): Promise<string | null> => {
      try {
        const quoteUrl = `https://booking.premierpartycruises.com/?date=${details.eventDate.toISOString().split('T')[0]}&partyType=${encodeURIComponent(details.partyType)}&guests=${details.guestCount}`;

        // Get affiliate data from storage
        const { getAffiliateData } = await import('@/quote-app/lib/affiliateTracking');
        const affiliateData = getAffiliateData();

        const payload = {
          customer_email: leadInfo.email,
          customer_name: leadInfo.name,
          customer_phone: leadInfo.phone,
          event_date: details.eventDate.toISOString().split('T')[0],
          party_type: details.partyType,
          guest_count: details.guestCount,
          time_slot_id: details.timeSlotId,
          selected_boat_name: details.boatName,
          selected_time_start: details.startTime,
          selected_time_end: details.endTime,
          package_type: details.packageType,
          ticket_count: details.ticketCount,
          quoted_amount: details.quotedAmount,
          deposit_amount: details.depositAmount,
          quote_url: quoteUrl,
          last_step: lastStep,
          affiliate_id: affiliateData?.affiliateId,
          affiliate_code_id: affiliateData?.codeId,
          affiliate_click_id: affiliateData?.clickId,
        };

        const { data: result, error } = await supabase.functions.invoke('log-abandoned-booking', {
          body: payload,
        });

        if (error) throw error;

        if (result?.id) {
          setAbandonedBookingId(result.id);
          console.log(`✅ Tracked abandoned booking at ${lastStep}:`, result.id);
          return result.id;
        }

        return null;
      } catch (error) {
        console.error(`Error tracking abandoned booking (attempt ${retryCount + 1}):`, error);
        
        // Retry up to 2 times with exponential backoff
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return attemptTracking(retryCount + 1);
        }
        
        return null;
      }
    };

    return attemptTracking();
  }, [leadInfo]);

  // Clear tracking when booking is completed
  const clearTracking = useCallback(() => {
    setAbandonedBookingId(null);
    // Keep lead info in case they want to book another cruise
  }, []);

  return {
    leadInfo,
    abandonedBookingId,
    captureLeadInfo,
    trackAbandoned,
    clearTracking,
  };
};
