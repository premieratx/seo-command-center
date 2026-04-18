import { supabase } from "@/quote-app/integrations/supabase/client";

const AFFILIATE_STORAGE_KEY = 'affiliate_code';
const AFFILIATE_TIMESTAMP_KEY = 'affiliate_timestamp';
const AFFILIATE_CLICK_ID_KEY = 'affiliate_click_id';
const AFFILIATE_DATA_KEY = 'affiliate_data';
const AFFILIATE_LANDING_URL_KEY = 'affiliate_landing_url';
const COOKIE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AffiliateData {
  code: string;
  clickId: string;
  affiliateId: string;
  codeId: string;
  timestamp: number;
}

export type ComponentType = 
  | 'main_quote_builder'
  | 'embedded_quote_builder'
  | 'main_chat_agent'
  | 'embedded_chat_agent'
  | 'chat_popup_widget';

/**
 * Initialize affiliate tracking - call this on app load
 */
export function initAffiliateTracking() {
  try {
    // Check URL for affiliate code
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode = urlParams.get('ref');
    
    if (affiliateCode) {
      // Store affiliate code and timestamp
      localStorage.setItem(AFFILIATE_STORAGE_KEY, affiliateCode.toUpperCase());
      localStorage.setItem(AFFILIATE_TIMESTAMP_KEY, Date.now().toString());
      // Store the full landing URL (for lead sheet referrer)
      localStorage.setItem(AFFILIATE_LANDING_URL_KEY, window.location.href);
      console.log('Affiliate code stored:', affiliateCode, 'Landing URL:', window.location.href);
    }
  } catch (error) {
    console.error('Error initializing affiliate tracking:', error);
  }
}

/**
 * Get the original affiliate landing URL (for lead sheet referrer)
 */
export function getAffiliateLandingUrl(): string | null {
  try {
    const landingUrl = localStorage.getItem(AFFILIATE_LANDING_URL_KEY);
    const timestamp = localStorage.getItem(AFFILIATE_TIMESTAMP_KEY);
    
    if (!landingUrl || !timestamp) {
      return null;
    }
    
    // Check if expired
    const age = Date.now() - parseInt(timestamp);
    if (age > COOKIE_DURATION) {
      return null;
    }
    
    return landingUrl;
  } catch (error) {
    console.error('Error getting affiliate landing URL:', error);
    return null;
  }
}

/**
 * Get stored affiliate code if within cookie duration
 */
export function getAffiliateCode(): string | null {
  try {
    const affiliateCode = localStorage.getItem(AFFILIATE_STORAGE_KEY);
    const timestamp = localStorage.getItem(AFFILIATE_TIMESTAMP_KEY);
    
    if (!affiliateCode || !timestamp) {
      return null;
    }
    
    // Check if cookie has expired
    const age = Date.now() - parseInt(timestamp);
    if (age > COOKIE_DURATION) {
      clearAffiliateCode();
      return null;
    }
    
    return affiliateCode;
  } catch (error) {
    console.error('Error getting affiliate code:', error);
    return null;
  }
}

/**
 * Get full affiliate data for tracking
 */
export function getAffiliateData(): AffiliateData | null {
  try {
    const dataStr = localStorage.getItem(AFFILIATE_DATA_KEY);
    if (!dataStr) return null;
    
    const data: AffiliateData = JSON.parse(dataStr);
    
    // Check if expired
    const age = Date.now() - data.timestamp;
    if (age > COOKIE_DURATION) {
      clearAffiliateCode();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting affiliate data:', error);
    return null;
  }
}

/**
 * Store affiliate data from tracking
 */
function storeAffiliateData(data: AffiliateData) {
  try {
    localStorage.setItem(AFFILIATE_DATA_KEY, JSON.stringify(data));
    localStorage.setItem(AFFILIATE_STORAGE_KEY, data.code);
    localStorage.setItem(AFFILIATE_TIMESTAMP_KEY, data.timestamp.toString());
    localStorage.setItem(AFFILIATE_CLICK_ID_KEY, data.clickId);
  } catch (error) {
    console.error('Error storing affiliate data:', error);
  }
}

/**
 * Clear stored affiliate code
 */
export function clearAffiliateCode() {
  try {
    localStorage.removeItem(AFFILIATE_STORAGE_KEY);
    localStorage.removeItem(AFFILIATE_TIMESTAMP_KEY);
    localStorage.removeItem(AFFILIATE_CLICK_ID_KEY);
    localStorage.removeItem(AFFILIATE_DATA_KEY);
    localStorage.removeItem(AFFILIATE_LANDING_URL_KEY);
  } catch (error) {
    console.error('Error clearing affiliate code:', error);
  }
}

/**
 * Track affiliate click
 */
export async function trackAffiliateClick(componentType: ComponentType) {
  try {
    const affiliateCode = getAffiliateCode();
    if (!affiliateCode) {
      return null;
    }

    const { data, error } = await supabase.functions.invoke('track-affiliate-click', {
      body: {
        affiliateCode,
        componentType,
        sourceUrl: window.location.href,
        referrerUrl: document.referrer,
      },
    });

    if (error) {
      console.error('Error tracking affiliate click:', error);
      return null;
    }

    // Store the complete affiliate data including click ID
    if (data?.clickId && data?.affiliateId && data?.codeId) {
      storeAffiliateData({
        code: affiliateCode,
        clickId: data.clickId,
        affiliateId: data.affiliateId,
        codeId: data.codeId,
        timestamp: Date.now(),
      });
    }

    return data;
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    return null;
  }
}

/**
 * Track affiliate conversion (lead or booking)
 */
export async function trackAffiliateConversion(
  componentType: ComponentType,
  conversionType: 'lead' | 'booking' | 'payment',
  options: {
    leadId?: string;
    bookingId?: string;
    bookingAmount?: number;
  }
) {
  try {
    const affiliateCode = getAffiliateCode();
    if (!affiliateCode) {
      return null;
    }

    const { data, error } = await supabase.functions.invoke('track-affiliate-conversion', {
      body: {
        affiliateCode,
        componentType,
        conversionType,
        leadId: options.leadId,
        bookingId: options.bookingId,
        bookingAmount: options.bookingAmount,
      },
    });

    if (error) {
      console.error('Error tracking affiliate conversion:', error);
      return null;
    }

    console.log('Affiliate conversion tracked:', data);
    return data;
  } catch (error) {
    console.error('Error tracking affiliate conversion:', error);
    return null;
  }
}

/**
 * Get affiliate links for all components
 */
export function getAffiliateLinks(affiliateCode: string): Record<string, string> {
  const baseUrl = window.location.origin;
  const ref = `ref=${affiliateCode}`;
  
  // Public website home link (production domain)
  const websiteHome = `https://premierpartycruises.com/?${ref}`;
  
  return {
    website_home: websiteHome,
    main_quote_builder: `${baseUrl}/?${ref}`,
    embedded_quote_builder: `${baseUrl}/quote-widget?${ref}`,
    main_chat_agent: `${baseUrl}/chat-agent?${ref}`,
    embedded_chat_agent: `${baseUrl}/chat-agent-embed?${ref}`,
    chat_popup_widget: `${baseUrl}/?${ref}`,
  };
}

/**
 * Generate embed code for affiliate
 */
export function generateAffiliateEmbedCode(
  affiliateCode: string,
  componentType: 'embedded_quote_builder' | 'embedded_chat_agent' | 'chat_popup_widget'
): string {
  const baseUrl = window.location.origin;
  
  if (componentType === 'embedded_quote_builder') {
    return `<iframe 
  src="${baseUrl}/quote-widget?ref=${affiliateCode}" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: none; border-radius: 8px;">
</iframe>`;
  }
  
  if (componentType === 'embedded_chat_agent') {
    return `<iframe 
  src="${baseUrl}/chat-agent-embed?ref=${affiliateCode}" 
  width="400" 
  height="600" 
  frameborder="0"
  style="border: none; border-radius: 8px;">
</iframe>`;
  }
  
  if (componentType === 'chat_popup_widget') {
    return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/widget.js?ref=${affiliateCode}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  }
  
  return '';
}
