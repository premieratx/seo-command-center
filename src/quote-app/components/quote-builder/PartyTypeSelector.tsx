import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Heart, Users, Briefcase, Cake, GraduationCap, PartyPopper } from "lucide-react";

const partyTypes = [
  { id: "bachelorette_party", label: "Bachelorette Party", icon: Heart },
  { id: "bachelor_party", label: "Bachelor Party", icon: PartyPopper },
  { id: "combined_bach", label: "Combined Bachelorette & Bachelor Party", icon: Users },
  { id: "wedding_event", label: "Wedding Event", icon: Heart },
  { id: "corporate_event", label: "Corporate Event", icon: Briefcase },
  { id: "birthday_party", label: "Birthday Party", icon: Cake },
  { id: "graduation", label: "Graduation Party", icon: GraduationCap },
  { id: "other", label: "Any Other Occasion", icon: PartyPopper },
];

interface PartyTypeSelectorProps {
  selectedType: string | null;
  onTypeSelect: (type: string) => void;
  compact?: boolean;
}

export const PartyTypeSelector = ({ selectedType, onTypeSelect, compact = false }: PartyTypeSelectorProps) => {
  const [activeButtonIndex, setActiveButtonIndex] = useState(-1);

  useEffect(() => {
    // Start button sequence animation after a short delay
    const buttonSequence = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        setActiveButtonIndex(index);
        index++;
        if (index >= partyTypes.length) {
          clearInterval(interval);
          setTimeout(() => setActiveButtonIndex(-1), 400);
        }
      }, 195); // Each button lights up for 195ms
    }, 300);

    return () => {
      clearTimeout(buttonSequence);
    };
  }, []);

  if (compact) {
    return (
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          What's the occasion?
        </h3>
        <RadioGroup value={selectedType || ""} onValueChange={onTypeSelect}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {partyTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.id} className="flex items-center">
                  <RadioGroupItem 
                    value={type.id} 
                    id={`party-${type.id}`} 
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`party-${type.id}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm border-2 rounded-lg cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary w-full"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="whitespace-nowrap font-medium">{type.label}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <RadioGroup value={selectedType || ""} onValueChange={onTypeSelect}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {partyTypes.map((type, index) => {
            const Icon = type.icon;
            const isHighlighted = activeButtonIndex === index;
            return (
              <div key={type.id} className="flex items-center">
                <RadioGroupItem 
                  value={type.id} 
                  id={`party-${type.id}`} 
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`party-${type.id}`}
                  className={`flex flex-col items-center justify-center gap-1.5 sm:gap-2 w-full min-h-[70px] sm:min-h-20 py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm rounded-lg cursor-pointer transition-all duration-300 hover:bg-accent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary ${
                    isHighlighted 
                      ? 'border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]' 
                      : 'border-2 border-primary/60'
                  }`}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <span className="font-medium text-center leading-tight break-words">{type.label}</span>
                </Label>
              </div>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
};
