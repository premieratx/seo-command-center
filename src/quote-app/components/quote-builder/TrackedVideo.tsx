import React, { useRef, useEffect, useState } from 'react';
import { useEngagementTracking } from '@/quote-app/hooks/useEngagementTracking';

interface TrackedVideoProps {
  src: string;
  videoType: 'loom' | 'youtube';
  title?: string;
  className?: string;
  leadId?: string;
  quoteNumber?: string;
  allow?: string;
}

// Extract video ID from various URL formats
const extractVideoId = (url: string, type: 'loom' | 'youtube'): string => {
  if (type === 'loom') {
    const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : '';
  } else {
    // Handle youtube.com/embed/, youtube.com/watch?v=, and youtu.be/ formats
    const match = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  }
};

// Build proper embed URL with tracking enabled
const buildEmbedUrl = (src: string, type: 'loom' | 'youtube'): string => {
  const videoId = extractVideoId(src, type);
  
  if (!videoId) {
    console.warn('Could not extract video ID from:', src);
    return src; // Return original URL as fallback
  }
  
  if (type === 'loom') {
    return `https://www.loom.com/embed/${videoId}`;
  } else {
    // Enable YouTube API for tracking - use nocookie domain for better embedding
    return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0`;
  }
};

export const TrackedVideo: React.FC<TrackedVideoProps> = ({
  src,
  videoType,
  title = 'Video',
  className = '',
  leadId,
  quoteNumber,
  allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastProgressRef = useRef(0);
  const watchTimeRef = useRef(0);
  const pollingRef = useRef<number | null>(null);
  
  const engagement = useEngagementTracking(leadId, quoteNumber);
  
  const embedUrl = buildEmbedUrl(src, videoType);

  // Start tracking when user actively clicks to play
  const startTracking = () => {
    if (!hasStarted) {
      console.log('📹 Video tracking started:', src);
      setHasStarted(true);
      setIsPlaying(true);
      engagement.trackVideoPlayStarted(src, videoType);
      startPolling();
    } else if (!isPlaying) {
      console.log('📹 Video resumed:', src);
      setIsPlaying(true);
      startPolling();
    }
  };

  const startPolling = () => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Start watch time polling
    pollingRef.current = window.setInterval(() => {
      watchTimeRef.current++;
      
      // Estimate progress based on watch time
      // Loom videos average 2-5 min, YouTube bach video is 13 min
      const estimatedDuration = videoType === 'loom' ? 180 : 780;
      const estimatedProgress = Math.min(
        Math.floor((watchTimeRef.current / estimatedDuration) * 100),
        100
      );
      
      // Track milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (estimatedProgress >= milestone && lastProgressRef.current < milestone) {
          console.log(`📹 Video milestone ${milestone}%:`, watchTimeRef.current, 's');
          lastProgressRef.current = estimatedProgress;
          engagement.trackVideoProgress(src, videoType, milestone, watchTimeRef.current);
        }
      }
    }, 1000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPlaying(false);
  };

  // Detect when user clicks on the iframe to interact with video
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || hasStarted) return;

    // Handle when iframe gains focus (user clicked inside it)
    const handleWindowBlur = () => {
      // Short delay to check if iframe got focus
      setTimeout(() => {
        if (document.activeElement === iframe) {
          startTracking();
        }
      }, 50);
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [hasStarted, src, videoType]);

  // Handle visibility changes - pause tracking when tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else if (document.visibilityState === 'visible' && hasStarted) {
        // Resume if already started (user may have just switched tabs)
        // Don't auto-resume - let user click again
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
    };
  }, [hasStarted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        className={className}
        allow={allow}
        allowFullScreen
      />
      {/* Invisible overlay to detect first click - only shown before video started */}
      {!hasStarted && (
        <div
          className="absolute inset-0 cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation();
            startTracking();
            // Remove overlay by updating state (hasStarted = true)
          }}
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
};

export default TrackedVideo;
