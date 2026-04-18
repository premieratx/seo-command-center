import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/quote-app/integrations/supabase/client';

// Generate a unique session ID for this browser session
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('quote_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('quote_session_id', sessionId);
  }
  return sessionId;
};

// A/B Test Variant: Determines step order
// Variant A = Date first, Variant B = Party Type first
// Uses hourly rotation: Even hours (CST) = A, Odd hours = B
export type ABVariant = 'A' | 'B';

const getABVariant = (): ABVariant => {
  // A/B Test DISABLED - Always show Date Picker first (Variant A)
  // Previous test ran from Feb 2-3, 2026
  const variant: ABVariant = 'A';
  sessionStorage.setItem('quote_ab_variant', variant);
  console.log(`📊 A/B Test DISABLED: Always Variant A (Date Picker First)`);
  return variant;
};

export type QuoteAnalyticsEvent = 
  | 'quote_started'
  | 'date_selected'
  | 'party_type_selected'
  | 'guest_count_selected'
  | 'lead_form_shown'
  | 'lead_form_completed'
  | 'package_selected'
  | 'checkout_started';

interface TrackEventData {
  [key: string]: any;
}

export const useQuoteAnalytics = () => {
  const sessionId = useRef(getSessionId());
  const abVariant = useRef(getABVariant());
  const trackedEvents = useRef<Set<string>>(new Set());

  const trackEvent = useCallback(async (
    eventType: QuoteAnalyticsEvent,
    eventData: TrackEventData = {}
  ) => {
    // Create a unique key for this event to prevent duplicates
    const eventKey = `${eventType}-${JSON.stringify(eventData)}`;
    
    // Skip if we've already tracked this exact event in this session
    if (trackedEvents.current.has(eventKey)) {
      console.log('📊 Skipping duplicate event:', eventType);
      return;
    }

    // Always include the A/B variant in event data
    const enrichedEventData = {
      ...eventData,
      flow_variant: abVariant.current,
    };

    console.log('📊 Attempting to track event:', eventType, enrichedEventData);

    try {
      const { error } = await supabase
        .from('quote_analytics')
        .insert({
          session_id: sessionId.current,
          event_type: eventType,
          event_data: enrichedEventData,
          page_url: window.location.href,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('❌ Error tracking analytics event:', error);
      } else {
        // Mark this event as tracked
        trackedEvents.current.add(eventKey);
        console.log(`✅ Tracked: ${eventType}`, enrichedEventData);
      }
    } catch (error) {
      console.error('❌ Error tracking analytics event:', error);
    }
  }, []);

  // Track page view on mount
  useEffect(() => {
    console.log('📊 Quote analytics initialized, session:', sessionId.current, 'variant:', abVariant.current);
    trackEvent('quote_started', {});
  }, [trackEvent]);

  return { trackEvent, abVariant: abVariant.current };
};
