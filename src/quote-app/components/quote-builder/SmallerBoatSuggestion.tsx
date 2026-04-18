import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Ship, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface SmallerBoatSlot {
  id: string;
  boat_name: string;
  capacity: number;
  start_at: string;
  end_at: string;
}

interface SmallerBoatSuggestionProps {
  requestedGuestCount: number;
  eventDate: Date;
  availableSlots: SmallerBoatSlot[];
  onGuestCountChange: (newCount: number) => void;
}

export const SmallerBoatSuggestion = ({ 
  requestedGuestCount, 
  eventDate,
  availableSlots,
  onGuestCountChange 
}: SmallerBoatSuggestionProps) => {
  if (availableSlots.length === 0) return null;

  // Group slots by capacity and boat
  const capacityGroups = availableSlots.reduce((acc, slot) => {
    const key = slot.capacity;
    if (!acc[key]) {
      acc[key] = {
        capacity: slot.capacity,
        boat_name: slot.boat_name,
        count: 0
      };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<number, { capacity: number; boat_name: string; count: number }>);

  const suggestions = Object.values(capacityGroups).sort((a, b) => b.capacity - a.capacity);

  return (
    <Card className="border-2 border-amber-500/50 shadow-lg bg-gradient-to-br from-background to-amber-50/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-6 w-6" />
          Alternative Boat Available
        </CardTitle>
        <CardDescription>
          We're booked up for {requestedGuestCount} guests on {format(eventDate, "MMMM d")}, 
          but we have smaller boats available if you can adjust your group size.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.capacity}
            className="p-4 rounded-lg border border-amber-200 bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <Ship className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-foreground">{suggestion.boat_name}</h4>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Accommodates up to {suggestion.capacity} guests</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suggestion.count} time slot{suggestion.count > 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onGuestCountChange(suggestion.capacity)}
                variant="default"
                className="whitespace-nowrap"
              >
                View {suggestion.capacity}-Guest Options
              </Button>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t text-sm text-muted-foreground">
          <p className="italic">
            💡 Tip: Reducing your guest count will show you available time slots and pricing for our smaller vessels.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
