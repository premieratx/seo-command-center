import { useEffect, useMemo, useRef, useState } from "react";

interface DiscoEqualizerProps {
  isActive: boolean;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
}

// Fullscreen, always-on animated equalizer background. Intensifies on voice activity.
const DiscoEqualizer = ({ isActive, isSpeaking, isUserSpeaking }: DiscoEqualizerProps) => {
  const BAR_COUNT = 56;
  const [heights, setHeights] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 10));
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  // Pre-generate per-bar phase offsets and frequencies for a rich "frequency band" feel
  const bandConfig = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const baseFreq = 0.6 + (i / BAR_COUNT) * 1.4; // 0.6 .. 2.0
      const noiseFreq = 0.8 + Math.random() * 0.6;  // 0.8 .. 1.4
      const phase = Math.random() * Math.PI * 2;
      const weight = Math.pow(Math.sin((i / BAR_COUNT) * Math.PI), 1.5); // emphasize center bars
      return { baseFreq, noiseFreq, phase, weight };
    });
  }, []);

  useEffect(() => {
    const animate = () => {
      const t = (performance.now() - startTimeRef.current) / 1000; // seconds

      // Idle base moves subtly, then ramps up with activity
      const idle = 0.12; // 12% height baseline movement
      const activeBoost = isActive ? 0.1 : 0;
      const speakBoost = isSpeaking ? 0.45 : 0;
      const userBoost = isUserSpeaking ? 0.45 : 0;

      const targetAmp = Math.min(0.85, idle + activeBoost + Math.max(speakBoost, userBoost));

      setHeights((prev) => {
        const next = new Array(BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          const { baseFreq, noiseFreq, phase, weight } = bandConfig[i];
          // Two combined waves + slight random jitter
          const wave = Math.sin(t * baseFreq * (1.5 + weight) + phase) * 0.5 + 0.5; // 0..1
          const wave2 = Math.sin(t * noiseFreq + phase * 1.3) * 0.5 + 0.5; // 0..1
          const combined = (wave * 0.65 + wave2 * 0.35) * weight + 0.1;
          const target = Math.max(0.06, Math.min(1, combined * targetAmp));

          // Smoothly interpolate to target to avoid jitter (lerp)
          const current = prev?.[i] ?? 0.1;
          next[i] = current + (target - current) * 0.2; // smoothing factor
        }
        return next as number[];
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [BAR_COUNT, bandConfig, isActive, isSpeaking, isUserSpeaking]);

  // Choose palette based on who is speaking
  const palette = isUserSpeaking
    ? { from: "from-pink-500/70", to: "to-orange-400/70", glow: "shadow-[0_0_24px_rgba(255,99,132,0.35)]" }
    : isSpeaking
    ? { from: "from-cyan-400/70", to: "to-purple-500/70", glow: "shadow-[0_0_24px_rgba(99,102,241,0.35)]" }
    : { from: "from-fuchsia-400/25", to: "to-cyan-400/25", glow: "shadow-none" };

  return (
    <div className="pointer-events-none fixed inset-0 z-0 flex items-end justify-center">
      {/* Bars container */}
      <div className="absolute bottom-0 left-0 right-0 mx-auto px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32">
        <div
          className={[
            "grid gap-1 sm:gap-1.5 md:gap-2",
            // Responsive column count via CSS vars for consistent spacing
            "grid-cols-[repeat(56,minmax(2px,1fr))]",
          ].join(" ")}
          aria-hidden
        >
          {heights.map((h, i) => (
            <div key={i} className="relative h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
              <div
                className={[
                  "absolute bottom-0 w-full rounded-t-full",
                  "bg-gradient-to-t",
                  palette.from,
                  palette.to,
                  isActive ? "backdrop-blur-[1px]" : "",
                  isSpeaking || isUserSpeaking ? "shadow-2xl" : "",
                ].join(" ")}
                style={{ height: `${Math.max(6, Math.round(h * 100))}%` }}
              />
              {/* Light beam overlay for disco vibe */}
              <div
                className={[
                  "absolute inset-x-0 bottom-0 h-12",
                  isSpeaking || isUserSpeaking ? "opacity-60" : "opacity-20",
                  "bg-gradient-to-t from-white/30 to-transparent",
                ].join(" ")}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Soft vignette to blend into background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  );
};

export default DiscoEqualizer;
