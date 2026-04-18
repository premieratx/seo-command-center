import { useState, useEffect } from "react";
import { Slider } from "@/quote-app/components/ui/slider";
import { Users } from "lucide-react";

interface GuestCountSelectorProps {
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  onSubmit?: () => void;
}

export const GuestCountSelector = ({ guestCount, onGuestCountChange, onSubmit }: GuestCountSelectorProps) => {
  const [localCount, setLocalCount] = useState(guestCount);
  const [sliderFlash, setSliderFlash] = useState(false);

  useEffect(() => {
    // Flash the slider thumb on entrance
    const flash1 = setTimeout(() => setSliderFlash(true), 200);
    const flash2 = setTimeout(() => setSliderFlash(false), 600);
    const flash3 = setTimeout(() => setSliderFlash(true), 800);
    const flash4 = setTimeout(() => setSliderFlash(false), 1200);

    return () => {
      clearTimeout(flash1);
      clearTimeout(flash2);
      clearTimeout(flash3);
      clearTimeout(flash4);
    };
  }, []);

  const handleSliderChange = (value: number[]) => {
    setLocalCount(value[0]);
    onGuestCountChange(value[0]);
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center">
      <div className="space-y-6">
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-5xl sm:text-6xl font-bold text-primary">{localCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">guests</p>
          </div>
        </div>
        
        <div className="px-4 sm:px-8">
          <div className={`transition-all duration-200 ${sliderFlash ? 'ring-4 ring-yellow-400/60 ring-offset-2 ring-offset-background rounded-full' : ''}`}>
            <Slider
              value={[localCount]}
              onValueChange={handleSliderChange}
              min={1}
              max={75}
              step={1}
              className="cursor-pointer"
            />
          </div>
          <div className="flex justify-between mt-3 text-lg font-bold text-primary">
            <span>1</span>
            <span>75</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">Select between 1-75 guests</p>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-3 text-center border border-primary/20">
          <p className="text-sm font-medium leading-tight">
            {localCount <= 14 && "Perfect for Day Tripper (up to 14 guests)"}
            {localCount > 14 && localCount <= 30 && "Great for Meeseeks/The Irony (15-30 guests)"}
            {localCount > 30 && "Ideal for Clever Girl (31-75 guests)"}
          </p>
        </div>
      </div>
    </div>
  );
};
