import { Card, CardContent } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Calendar as CalendarComponent } from "@/quote-app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Calendar, Users, PartyPopper, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/quote-app/lib/utils";

interface SelectionSummaryProps {
  eventDate?: Date;
  partyType?: string;
  guestCount?: number;
  onDateChange?: (date: Date) => void;
  onPartyTypeChange?: (type: string) => void;
  onGuestCountChange?: (count: number) => void;
}

const partyTypeOptions = [
  { value: "bachelor_party", label: "Bachelor Party" },
  { value: "bachelorette_party", label: "Bachelorette Party" },
  { value: "combined_bach", label: "Combined Bach Party" },
  { value: "wedding_event", label: "Wedding Event" },
  { value: "corporate_event", label: "Corporate Event" },
  { value: "birthday_party", label: "Birthday Party" },
  { value: "graduation", label: "Graduation" },
  { value: "other", label: "Other" }
];

export const SelectionSummary = ({ 
  eventDate, 
  partyType, 
  guestCount,
  onDateChange,
  onPartyTypeChange,
  onGuestCountChange
}: SelectionSummaryProps) => {
  if (!eventDate && !partyType && !guestCount) return null;

  const getPartyTypeLabel = (type: string) => {
    return partyTypeOptions.find(opt => opt.value === type)?.label || type;
  };

  return (
    <Card className="border-2 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5 sticky top-4 z-10">
      <CardContent className="py-4">
        <div className="flex items-center justify-center gap-6 flex-wrap text-sm">
          {eventDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">{format(eventDate, "EEEE, MMMM d, yyyy")}</span>
              {onDateChange && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => date && onDateChange(date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
          {partyType && (
            <div className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-primary" />
              <span className="font-medium">{getPartyTypeLabel(partyType)}</span>
              {onPartyTypeChange && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 z-50" align="start">
                    <Select value={partyType} onValueChange={onPartyTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select party type" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background">
                        {partyTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
          {guestCount && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">{guestCount} guests</span>
              {onGuestCountChange && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 z-50" align="start">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Number of Guests</label>
                        <input
                          type="number"
                          min="1"
                          max="75"
                          value={guestCount}
                          onChange={(e) => onGuestCountChange(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
