import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";

/**
 * Tracks tab clicks, active time, and scroll depth per tab for a lead dashboard.
 * Upserts data to `lead_tab_engagement` table.
 */
export const useTabEngagement = (leadId: string | null, activeTab: string) => {
  const lastTickRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTabRef = useRef<string | null>(null);
  const maxScrollRef = useRef(0);
  const flushInProgressRef = useRef(false);
  const periodicFlushRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async (tabName: string, seconds: number, scrollDepth: number, isClick: boolean) => {
    if (!leadId || !tabName) return;
    if (flushInProgressRef.current && !isClick) return; // prevent overlapping flushes
    
    // Skip trivial flushes (no click, no time, no scroll)
    if (!isClick && seconds < 1 && scrollDepth === 0) return;

    flushInProgressRef.current = true;
    try {
      const { data: existing, error: selectError } = await supabase
        .from("lead_tab_engagement")
        .select("id, click_count, total_seconds, max_scroll_depth")
        .eq("lead_id", leadId)
        .eq("tab_name", tabName)
        .maybeSingle();

      if (selectError) {
        console.error("📊 Tab engagement SELECT error:", selectError);
        return;
      }

      if (existing) {
        const { error: updateError } = await supabase.from("lead_tab_engagement").update({
          click_count: (existing.click_count || 0) + (isClick ? 1 : 0),
          total_seconds: (existing.total_seconds || 0) + Math.round(seconds),
          max_scroll_depth: Math.max(existing.max_scroll_depth || 0, scrollDepth),
          last_visited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        if (updateError) {
          console.error("📊 Tab engagement UPDATE error:", updateError);
        }
      } else {
        const { error: insertError } = await supabase.from("lead_tab_engagement").insert({
          lead_id: leadId,
          tab_name: tabName,
          click_count: isClick ? 1 : 0,
          total_seconds: Math.round(seconds),
          max_scroll_depth: scrollDepth,
          last_visited_at: new Date().toISOString(),
        });
        if (insertError) {
          console.error("📊 Tab engagement INSERT error:", insertError);
        }
      }
    } catch (err) {
      console.warn("Tab engagement flush failed:", err);
    } finally {
      flushInProgressRef.current = false;
    }
  }, [leadId]);

  const resetIdleTimer = useCallback(() => {
    if (isIdleRef.current) {
      isIdleRef.current = false;
      lastTickRef.current = Date.now();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => { isIdleRef.current = true; }, 30000);
  }, []);

  // Track scroll depth — listen on window with capture to catch all scroll events
  useEffect(() => {
    if (!leadId) return;
    maxScrollRef.current = 0;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
        if (pct > maxScrollRef.current) maxScrollRef.current = pct;
      }
      resetIdleTimer();
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [leadId, activeTab, resetIdleTimer]);

  // Track tab changes: flush previous tab, start new tracking
  useEffect(() => {
    if (!leadId) return;

    // Flush previous tab's accumulated time
    if (prevTabRef.current && prevTabRef.current !== activeTab) {
      const prevSeconds = accumulatedSecondsRef.current;
      const prevScroll = maxScrollRef.current;
      const prevTab = prevTabRef.current;
      accumulatedSecondsRef.current = 0;
      maxScrollRef.current = 0;
      if (prevSeconds > 0 || prevScroll > 0) {
        flush(prevTab, prevSeconds, prevScroll, false);
      }
    }

    // Log click for the newly active tab
    flush(activeTab, 0, 0, true);

    prevTabRef.current = activeTab;
    lastTickRef.current = Date.now();
    isIdleRef.current = false;
    resetIdleTimer();

    // Time tracking interval — tick every second
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isIdleRef.current && lastTickRef.current) {
        const now = Date.now();
        accumulatedSecondsRef.current += (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
      }
    }, 1000);

    // Periodic flush every 15 seconds so data isn't lost if user leaves without unload firing
    if (periodicFlushRef.current) clearInterval(periodicFlushRef.current);
    periodicFlushRef.current = setInterval(() => {
      if (accumulatedSecondsRef.current >= 5 && prevTabRef.current) {
        const secs = accumulatedSecondsRef.current;
        const scroll = maxScrollRef.current;
        accumulatedSecondsRef.current = 0;
        // Don't reset scroll — keep tracking max
        flush(prevTabRef.current, secs, scroll, false);
      }
    }, 15000);

    const handleActivity = () => resetIdleTimer();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (periodicFlushRef.current) clearInterval(periodicFlushRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [leadId, activeTab, flush, resetIdleTimer]);

  // Flush on page leave using sendBeacon for reliability
  useEffect(() => {
    if (!leadId) return;

    const handleBeforeUnload = () => {
      if (prevTabRef.current && accumulatedSecondsRef.current > 1) {
        // Use sendBeacon with Supabase REST API for reliable page-leave flushing
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/http_post`;
        // Fallback: just do the async call — it may or may not complete
        flush(prevTabRef.current, accumulatedSecondsRef.current, maxScrollRef.current, false);
        accumulatedSecondsRef.current = 0;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && prevTabRef.current && accumulatedSecondsRef.current > 1) {
        flush(prevTabRef.current, accumulatedSecondsRef.current, maxScrollRef.current, false);
        accumulatedSecondsRef.current = 0;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Component unmount flush
      if (prevTabRef.current && accumulatedSecondsRef.current > 1) {
        flush(prevTabRef.current, accumulatedSecondsRef.current, maxScrollRef.current, false);
      }
    };
  }, [leadId, flush]);
};
