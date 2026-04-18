import { Calculator, Presentation, ShoppingCart, Camera } from "lucide-react";
import { Button } from "@/quote-app/components/ui/button";
import { useEffect, useState } from "react";

interface StickyPricingNavProps {
  showPresentation?: boolean;
  showPhotoGallery?: boolean;
}

export const StickyPricingNav = ({ showPresentation = true, showPhotoGallery = false }: StickyPricingNavProps) => {
  const [activeButton, setActiveButton] = useState<number | null>(null);

  // Calculate total buttons for animation
  const buttonCount = 2 + (showPresentation ? 1 : 0) + (showPhotoGallery ? 1 : 0);

  useEffect(() => {
    // Sequential pulse animation on load
    const sequence = Array.from({ length: buttonCount }, (_, i) => i);
    const delay = Math.floor(2000 / buttonCount); // ~2sec total
    
    sequence.forEach((index, i) => {
      setTimeout(() => {
        setActiveButton(index);
        setTimeout(() => setActiveButton(null), 400);
      }, i * delay);
    });
  }, [buttonCount]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPulseClass = (index: number) => {
    return activeButton === index 
      ? 'ring-4 ring-primary/50 scale-110 transition-all duration-300' 
      : 'transition-all duration-300';
  };

  let buttonIndex = 0;

  return (
    <div className="sticky top-0 z-50 bg-yellow-100 border-b border-yellow-300 shadow-md">
      <div className="w-[80%] mx-auto px-1 py-1 sm:px-4 sm:py-3 flex justify-center gap-0.5 sm:gap-3">
        <Button 
          onClick={() => scrollToSection('calculator-section')}
          variant="outline"
          size="sm"
          className={`flex items-center gap-0.5 sm:gap-2 bg-white text-[10px] sm:text-sm h-6 sm:h-9 px-1.5 sm:px-3 ${getPulseClass(buttonIndex++)}`}
        >
          <Calculator className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden md:inline">Use Price Calculator</span>
          <span className="md:hidden">Calc</span>
        </Button>
        
        {showPresentation && (
          <Button 
            onClick={() => scrollToSection('presentation-section')}
            variant="outline"
            size="sm"
            className={`flex items-center gap-0.5 sm:gap-2 bg-white text-[10px] sm:text-sm h-6 sm:h-9 px-1.5 sm:px-3 ${getPulseClass(buttonIndex++)}`}
          >
            <Presentation className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">View Summary Presentation</span>
            <span className="md:hidden">Info</span>
          </Button>
        )}
        
        <Button 
          onClick={() => scrollToSection('booking-section')}
          size="sm"
          className={`flex items-center gap-0.5 sm:gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-sm h-6 sm:h-9 px-1.5 sm:px-3 ${getPulseClass(buttonIndex++)}`}
        >
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
          Book
        </Button>

        {showPhotoGallery && (
          <Button 
            onClick={() => scrollToSection('photo-gallery-section')}
            variant="outline"
            size="sm"
            className={`flex items-center gap-0.5 sm:gap-2 bg-white text-[10px] sm:text-sm h-6 sm:h-9 px-1.5 sm:px-3 ${getPulseClass(buttonIndex++)}`}
          >
            <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">View Disco Cruise Photos</span>
            <span className="md:hidden">Photos</span>
          </Button>
        )}
      </div>
    </div>
  );
};