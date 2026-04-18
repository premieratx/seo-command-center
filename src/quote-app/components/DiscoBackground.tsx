import { useEffect, useState } from "react";

interface DiscoLight {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface DiscoDot {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

const DiscoBackground = () => {
  const [lights, setLights] = useState<DiscoLight[]>([]);
  const [dots, setDots] = useState<DiscoDot[]>([]);

  useEffect(() => {
    // Generate disco ball light reflections
    const generatedLights: DiscoLight[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 80 + 40,
      delay: Math.random() * 3,
      duration: Math.random() * 3 + 2,
    }));
    setLights(generatedLights);

    // Generate animated dots
    const colors = [
      'hsl(330, 100%, 60%)', // Hot pink
      'hsl(280, 100%, 65%)', // Purple
      'hsl(200, 100%, 60%)', // Cyan
      'hsl(45, 100%, 55%)',  // Golden
      'hsl(170, 100%, 55%)', // Turquoise
    ];

    const generatedDots: DiscoDot[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 5,
    }));
    setDots(generatedDots);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-gray-950 to-cyan-950" />
      
      {/* Disco ball light reflections */}
      {lights.map((light) => (
        <div
          key={light.id}
          className="absolute rounded-full blur-3xl opacity-20 animate-pulse"
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${light.size}px`,
            height: `${light.size}px`,
            background: `radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)`,
            animationDelay: `${light.delay}s`,
            animationDuration: `${light.duration}s`,
          }}
        />
      ))}

      {/* Animated floating dots */}
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            backgroundColor: dot.color,
            boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
            animation: `float ${dot.duration}s ease-in-out infinite`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.6;
          }
          25% {
            transform: translate(20px, -30px) scale(1.2);
            opacity: 0.8;
          }
          50% {
            transform: translate(-20px, -60px) scale(0.9);
            opacity: 1;
          }
          75% {
            transform: translate(30px, -30px) scale(1.1);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default DiscoBackground;
