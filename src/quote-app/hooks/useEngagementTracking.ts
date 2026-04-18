import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/quote-app/integrations/supabase/client';

// Generate a unique session ID for this browser session
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('engagement_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('engagement_session_id', sessionId);
  }
  return sessionId;
};

// Event types for engagement tracking
export type EngagementEventType = 
  | 'quote_opened'
  | 'quote_viewed'
  | 'video_play_started'
  | 'video_progress_25'
  | 'video_progress_50'
  | 'video_progress_75'
  | 'video_progress_100'
  | 'video_paused'
  | 'scroll_depth_update'
  | 'xola_tab_opened'
  | 'xola_booking_started'
  | 'gamma_link_clicked'
  | 'gamma_embed_scroll'
  | 'quote_builder_interaction'
  | 'session_end';

interface EngagementEventData {
  [key: string]: any;
}

interface SessionState {
  quoteOpenCount: number;
  videosStarted: string[];
  videoMaxProgress: { [videoUrl: string]: number };
  totalVideoWatchSeconds: number;
  maxScrollDepthPercent: number;
  xolaTabOpened: boolean;
  xolaBookingStarted: boolean;
  gammaLinkClicked: boolean;
  gammaScrollDepthPercent: number;
  quoteBuilderInteractions: number;
  firstSeenAt: string;
  lastActivityAt: string;
}

// Shared session state across the app
let sessionState: SessionState = {
  quoteOpenCount: 0,
  videosStarted: [],
  videoMaxProgress: {},
  totalVideoWatchSeconds: 0,
  maxScrollDepthPercent: 0,
  xolaTabOpened: false,
  xolaBookingStarted: false,
  gammaLinkClicked: false,
  gammaScrollDepthPercent: 0,
  quoteBuilderInteractions: 0,
  firstSeenAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
};

// Track if we've already set up beforeunload
let beforeUnloadSetup = false;

export const useEngagementTracking = (leadId?: string, quoteNumber?: string) => {
  const sessionId = useRef(getSessionId());
  const leadIdRef = useRef(leadId);
  const quoteNumberRef = useRef(quoteNumber);

  // Update refs when props change
  useEffect(() => {
    leadIdRef.current = leadId;
    quoteNumberRef.current = quoteNumber;
  }, [leadId, quoteNumber]);

  // Track individual event
  const trackEvent = useCallback(async (
    eventType: EngagementEventType,
    eventData: EngagementEventData = {}
  ) => {
    console.log('📊 Engagement tracking:', eventType, eventData);

    // Update session state
    sessionState.lastActivityAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('engagement_events')
        .insert({
          session_id: sessionId.current,
          lead_id: leadIdRef.current || null,
          quote_number: quoteNumberRef.current || null,
          event_type: eventType,
          event_data: eventData,
          page_url: window.location.href,
        });

      if (error) {
        console.error('❌ Error tracking engagement event:', error);
      } else {
        console.log(`✅ Engagement tracked: ${eventType}`);
      }
    } catch (error) {
      console.error('❌ Error tracking engagement event:', error);
    }
  }, []);

  // Track quote open
  const trackQuoteOpened = useCallback(() => {
    sessionState.quoteOpenCount++;
    trackEvent('quote_opened', { openCount: sessionState.quoteOpenCount });
  }, [trackEvent]);

  // Track video play started
  const trackVideoPlayStarted = useCallback((videoUrl: string, videoType: 'loom' | 'youtube') => {
    if (!sessionState.videosStarted.includes(videoUrl)) {
      sessionState.videosStarted.push(videoUrl);
    }
    trackEvent('video_play_started', { videoUrl, videoType });
  }, [trackEvent]);

  // Track video progress (milestones: 25, 50, 75, 100)
  const trackVideoProgress = useCallback((
    videoUrl: string, 
    videoType: 'loom' | 'youtube',
    progressPercent: number,
    watchedSeconds: number
  ) => {
    const currentMax = sessionState.videoMaxProgress[videoUrl] || 0;
    
    // Only track if this is a new milestone
    if (progressPercent > currentMax) {
      sessionState.videoMaxProgress[videoUrl] = progressPercent;
      sessionState.totalVideoWatchSeconds += watchedSeconds;

      // Track milestone events
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (progressPercent >= milestone && currentMax < milestone) {
          trackEvent(`video_progress_${milestone}` as EngagementEventType, {
            videoUrl,
            videoType,
            milestone,
            watchedSeconds,
          });
        }
      }
    }
  }, [trackEvent]);

  // Track scroll depth
  const trackScrollDepth = useCallback((depthPercent: number) => {
    if (depthPercent > sessionState.maxScrollDepthPercent) {
      sessionState.maxScrollDepthPercent = depthPercent;
      trackEvent('scroll_depth_update', { depthPercent });
    }
  }, [trackEvent]);

  // Track Xola tab opened
  const trackXolaTabOpened = useCallback(() => {
    if (!sessionState.xolaTabOpened) {
      sessionState.xolaTabOpened = true;
      trackEvent('xola_tab_opened', {});
    }
  }, [trackEvent]);

  // Track Xola booking started
  const trackXolaBookingStarted = useCallback(() => {
    if (!sessionState.xolaBookingStarted) {
      sessionState.xolaBookingStarted = true;
      trackEvent('xola_booking_started', {});
    }
  }, [trackEvent]);

  // Track Gamma link click
  const trackGammaLinkClicked = useCallback((linkUrl: string) => {
    sessionState.gammaLinkClicked = true;
    trackEvent('gamma_link_clicked', { linkUrl });
  }, [trackEvent]);

  // Track Gamma embed scroll
  const trackGammaEmbedScroll = useCallback((scrollPercent: number) => {
    if (scrollPercent > sessionState.gammaScrollDepthPercent) {
      sessionState.gammaScrollDepthPercent = scrollPercent;
      trackEvent('gamma_embed_scroll', { scrollPercent });
    }
  }, [trackEvent]);

  // Track quote builder interaction
  const trackQuoteBuilderInteraction = useCallback((interactionType: string, details: any = {}) => {
    sessionState.quoteBuilderInteractions++;
    trackEvent('quote_builder_interaction', { interactionType, ...details });
  }, [trackEvent]);

  // Flush session data to GHL
  const flushToGHL = useCallback(async () => {
    console.log('📤 Flushing engagement data to GHL...');
    
    try {
      const sessionDurationSeconds = Math.floor(
        (new Date().getTime() - new Date(sessionState.firstSeenAt).getTime()) / 1000
      );

      const payload = {
        sessionId: sessionId.current,
        leadId: leadIdRef.current,
        quoteNumber: quoteNumberRef.current,
        sessionState: {
          ...sessionState,
          sessionDurationSeconds,
        },
      };

      const { error } = await supabase.functions.invoke('send-engagement-to-ghl', {
        body: payload,
      });

      if (error) {
        console.error('❌ Error sending to GHL:', error);
      } else {
        console.log('✅ Engagement data sent to GHL');
      }
    } catch (error) {
      console.error('❌ Error flushing to GHL:', error);
    }
  }, []);

  // Set up session end tracking (beforeunload, visibilitychange)
  useEffect(() => {
    if (beforeUnloadSetup) return;
    beforeUnloadSetup = true;

    // Send beacon on page unload (most reliable)
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for reliability on page close
      const payload = JSON.stringify({
        sessionId: sessionId.current,
        leadId: leadIdRef.current,
        quoteNumber: quoteNumberRef.current,
        sessionState: {
          ...sessionState,
          sessionDurationSeconds: Math.floor(
            (new Date().getTime() - new Date(sessionState.firstSeenAt).getTime()) / 1000
          ),
        },
      });

      // Try sendBeacon first (works even when page is closing)
      const beaconUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-engagement-to-ghl`;
      navigator.sendBeacon(beaconUrl, payload);
    };

    // Also track on visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushToGHL();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushToGHL]);

  return {
    trackEvent,
    trackQuoteOpened,
    trackVideoPlayStarted,
    trackVideoProgress,
    trackScrollDepth,
    trackXolaTabOpened,
    trackXolaBookingStarted,
    trackGammaLinkClicked,
    trackGammaEmbedScroll,
    trackQuoteBuilderInteraction,
    flushToGHL,
    sessionId: sessionId.current,
  };
};

// Video tracking hook for iframe videos (Loom, YouTube)
export const useVideoTracking = (
  videoRef: React.RefObject<HTMLIFrameElement | HTMLVideoElement>,
  videoUrl: string,
  videoType: 'loom' | 'youtube',
  engagement: ReturnType<typeof useEngagementTracking>
) => {
  const hasStarted = useRef(false);
  const lastProgressRef = useRef(0);
  const watchTimeRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  // For native video elements
  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.tagName !== 'VIDEO') return;

    const nativeVideo = video as HTMLVideoElement;

    const handlePlay = () => {
      if (!hasStarted.current) {
        hasStarted.current = true;
        engagement.trackVideoPlayStarted(videoUrl, videoType);
      }
      
      // Start tracking watch time
      intervalRef.current = window.setInterval(() => {
        watchTimeRef.current++;
        const progress = Math.floor((nativeVideo.currentTime / nativeVideo.duration) * 100);
        if (progress > lastProgressRef.current) {
          lastProgressRef.current = progress;
          engagement.trackVideoProgress(videoUrl, videoType, progress, watchTimeRef.current);
        }
      }, 1000);
    };

    const handlePause = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    nativeVideo.addEventListener('play', handlePlay);
    nativeVideo.addEventListener('pause', handlePause);
    nativeVideo.addEventListener('ended', handlePause);

    return () => {
      nativeVideo.removeEventListener('play', handlePlay);
      nativeVideo.removeEventListener('pause', handlePause);
      nativeVideo.removeEventListener('ended', handlePause);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [videoRef, videoUrl, videoType, engagement]);

  return {
    markAsStarted: () => {
      if (!hasStarted.current) {
        hasStarted.current = true;
        engagement.trackVideoPlayStarted(videoUrl, videoType);
      }
    },
    updateProgress: (progressPercent: number) => {
      watchTimeRef.current++;
      if (progressPercent > lastProgressRef.current) {
        lastProgressRef.current = progressPercent;
        engagement.trackVideoProgress(videoUrl, videoType, progressPercent, watchTimeRef.current);
      }
    },
  };
};

// Scroll tracking hook - tracks window scroll when containerRef is null, container scroll otherwise
export const useScrollTracking = (
  containerRef: React.RefObject<HTMLElement> | null,
  engagement: ReturnType<typeof useEngagementTracking>
) => {
  useEffect(() => {
    let maxDepth = 0;

    const handleScroll = () => {
      let scrollPercent: number;
      
      if (containerRef?.current) {
        // Container scroll tracking
        const container = containerRef.current;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        scrollPercent = scrollHeight > 0 
          ? Math.floor((container.scrollTop / scrollHeight) * 100)
          : 0;
      } else {
        // Window scroll tracking - for full page scrolling
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        scrollPercent = documentHeight > 0 
          ? Math.floor((window.scrollY / documentHeight) * 100)
          : 0;
      }
      
      if (scrollPercent > maxDepth && scrollPercent <= 100) {
        maxDepth = scrollPercent;
        engagement.trackScrollDepth(scrollPercent);
      }
    };

    // Listen on container if provided, otherwise window
    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also track initial scroll position
    handleScroll();
    
    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, engagement]);
};
