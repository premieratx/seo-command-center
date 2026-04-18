import { useEffect, useState } from "react";

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
}

const VoiceVisualizer = ({ isActive, isSpeaking, isUserSpeaking }: VoiceVisualizerProps) => {
  const [bars, setBars] = useState<number[]>([]);
  
  // User colors (warm disco colors)
  const userColors = [
    'hsl(330, 100%, 60%)', // Hot pink
    'hsl(350, 100%, 65%)', // Red-pink
    'hsl(30, 100%, 60%)',  // Orange
    'hsl(45, 100%, 55%)',  // Golden yellow
  ];
  
  // AI colors (cool neon colors)
  const aiColors = [
    'hsl(280, 100%, 65%)', // Purple
    'hsl(200, 100%, 60%)', // Cyan
    'hsl(170, 100%, 55%)', // Turquoise
    'hsl(260, 100%, 70%)', // Violet
  ];
  
  const neutralColors = [
    'hsl(0, 0%, 70%)',     // Gray
    'hsl(0, 0%, 60%)',     // Darker gray
  ];

  useEffect(() => {
    // Initialize bars
    const barCount = 32;
    setBars(Array(barCount).fill(0.1));

    if (!isActive) return;

    const interval = setInterval(() => {
      setBars(prev => prev.map((_, i) => {
        if (!isActive && !isSpeaking && !isUserSpeaking) return 0.1;
        
        // More dramatic animation when speaking
        if (isSpeaking || isUserSpeaking) {
          // Create wave pattern with more variation
          const wave = Math.sin((Date.now() / 100) + (i * 0.3));
          const random = Math.random() * 0.7;
          return Math.max(0.2, Math.min(1, 0.4 + wave * 0.3 + random));
        }
        
        // Subtle idle animation
        const idle = Math.sin((Date.now() / 300) + (i * 0.2)) * 0.15;
        return 0.2 + idle;
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, isSpeaking, isUserSpeaking]);

  const getBarColor = (index: number) => {
    if (!isActive) return neutralColors[index % neutralColors.length];
    
    if (isUserSpeaking) {
      return userColors[index % userColors.length];
    } else if (isSpeaking) {
      return aiColors[index % aiColors.length];
    }
    
    return neutralColors[index % neutralColors.length];
  };

  return (
    <div className="flex items-end justify-center gap-1.5 h-32">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-2 rounded-full transition-all duration-100 ease-out"
          style={{
            height: `${height * 100}%`,
            backgroundColor: getBarColor(i),
            boxShadow: (isSpeaking || isUserSpeaking) 
              ? `0 0 10px ${getBarColor(i)}` 
              : 'none',
            opacity: isActive ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default VoiceVisualizer;
