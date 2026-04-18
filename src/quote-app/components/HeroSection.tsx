import { Button } from "@/quote-app/components/ui/button";
import { Anchor, ChevronDown } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary-glow to-accent">
      {/* Animated wave overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="white"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center text-white">
        <div className="mb-6 flex justify-center">
          <Anchor className="h-20 w-20 animate-bounce" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">
          Premier Party Cruises
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto drop-shadow-md">
          Austin's ultimate floating celebration experience. Private cruises & disco parties on Lake Austin.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6 hover:scale-105 transition-transform shadow-lg"
            onClick={onGetStarted}
          >
            Build Your Quote
            <ChevronDown className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="text-lg px-8 py-6 hover:scale-105 transition-transform shadow-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            onClick={() => window.location.href = '/get-quote'}
          >
            Quick Quote Form
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-3xl font-bold">4</p>
            <p className="text-sm">Premium Boats</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-3xl font-bold">75</p>
            <p className="text-sm">Max Capacity</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-3xl font-bold">7</p>
            <p className="text-sm">Days a Week</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-3xl font-bold">∞</p>
            <p className="text-sm">Fun Guaranteed</p>
          </div>
        </div>
      </div>
    </div>
  );
};
