import { format } from "date-fns";
import { Calendar, Users, PartyPopper, Music, Clock, Ship, Edit2, Package } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { Button } from "@/quote-app/components/ui/button";
import { Calendar as CalendarComponent } from "@/quote-app/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { useState } from "react";
import { formatPackageName } from "@/quote-app/lib/utils";

interface SelectionSummaryHeaderProps {
  selectedDate: Date | undefined;
  partyType: string | null;
  guestCount: number;
  experienceType?: 'disco_cruise' | 'private_cruise' | null;
  packageType?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  boatName?: string | null;
  onDateEdit?: (date: Date) => void;
  onPartyTypeEdit?: (type: string) => void;
  onGuestCountEdit?: (count: number) => void;
  onTimeEdit?: () => void;
  onPackageEdit?: () => void;
  onBoatEdit?: () => void;
}

const partyTypeOptions = [
  { value: "bachelor_party", label: "Bachelor Party" },
  { value: "bachelorette_party", label: "Bachelorette Party" },
  { value: "combined_bach", label: "Combined Bach Party" },
  { value: "birthday_party", label: "Birthday Party" },
  { value: "corporate_event", label: "Corporate Event" },
  { value: "wedding_event", label: "Wedding Event" },
  { value: "graduation", label: "Graduation Party" },
  { value: "other", label: "Other" }
];

export const SelectionSummaryHeader = ({
  selectedDate,
  partyType,
  guestCount,
  experienceType,
  packageType,
  timeStart,
  timeEnd,
  boatName,
  onDateEdit,
  onPartyTypeEdit,
  onGuestCountEdit,
  onTimeEdit,
  onPackageEdit,
  onBoatEdit
}: SelectionSummaryHeaderProps) => {
  const [tempGuestCount, setTempGuestCount] = useState(guestCount);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);

  if (!selectedDate && !partyType) {
    return null;
  }

  const getPartyTypeDisplay = (type: string | null) => {
    if (!type) return "";
    const types: { [key: string]: string } = {
      combined_bach: "Combined Bach Party",
      bachelorette_party: "Bachelorette Party",
      bachelor_party: "Bachelor Party",
      birthday_party: "Birthday Party",
      corporate_event: "Corporate Event",
      wedding_event: "Wedding Event",
      graduation: "Graduation Party",
      other: "Special Event"
    };
    return types[type] || type;
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date && onDateEdit) {
      onDateEdit(date);
      setDatePopoverOpen(false);
    }
  };

  const handlePartyTypeChange = (value: string) => {
    if (onPartyTypeEdit) {
      onPartyTypeEdit(value);
      setPartyPopoverOpen(false);
    }
  };

  const handleGuestCountSubmit = () => {
    if (onGuestCountEdit && tempGuestCount > 0) {
      onGuestCountEdit(tempGuestCount);
      setGuestPopoverOpen(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-primary/20 shadow-md">
      <div className="container mx-auto px-2 sm:px-4 py-3">
        <h2 className="text-sm md:text-base font-bold text-primary mb-3 text-center">
          Here are the details for your cruise — complete your booking below
        </h2>
        
        {/* 3-column grid for all confirmed details with edit buttons */}
        <div className="grid grid-cols-3 gap-2 max-w-4xl mx-auto">
          {/* Date */}
          {selectedDate && (
            <div className="bg-card border border-border rounded-lg p-2 shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Calendar className="h-3 w-3 text-primary flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground font-medium">Event Date</p>
                </div>
                {onDateEdit && (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 z-50 bg-popover border-2 shadow-xl" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <p className="font-semibold text-xs leading-tight truncate">
                {format(selectedDate, "EEE, MMM d")}
              </p>
            </div>
          )}

          {/* Party Type */}
          {partyType && (
            <div className="bg-card border border-border rounded-lg p-2 shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <PartyPopper className="h-3 w-3 text-primary flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground font-medium">Party Type</p>
                </div>
                {onPartyTypeEdit && (
                  <Popover open={partyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 z-50 bg-popover" align="start">
                      <div className="space-y-2">
                        <Label>Party Type</Label>
                        <Select value={partyType} onValueChange={handlePartyTypeChange}>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {partyTypeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <p className="font-semibold text-xs leading-tight truncate">
                {getPartyTypeDisplay(partyType)}
              </p>
            </div>
          )}

          {/* Time */}
          {timeStart && timeEnd && (
            <div className="bg-card border border-border rounded-lg p-2 shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-3 w-3 text-primary flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground font-medium">Time</p>
                </div>
                {onTimeEdit && (
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10" onClick={onTimeEdit}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="font-semibold text-[11px] leading-tight">
                {timeStart}
                <br />
                to {timeEnd}
              </p>
            </div>
          )}

          {/* Boat */}
          {boatName && (
            <div className="bg-card border border-border rounded-lg p-2 shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Ship className="h-3 w-3 text-primary flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground font-medium">Boat</p>
                </div>
                {onBoatEdit && (
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10" onClick={onBoatEdit}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="font-semibold text-xs leading-tight truncate">
                {boatName}
              </p>
            </div>
          )}

          {/* Guests */}
          {guestCount > 0 && (
            <div className="bg-card border border-border rounded-lg p-2 shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Users className="h-3 w-3 text-primary flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground font-medium">Guests</p>
                </div>
                {onGuestCountEdit && (
                  <Popover open={guestPopoverOpen} onOpenChange={setGuestPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 z-50 bg-popover" align="start">
                      <div className="space-y-3">
                        <Label>Number of Guests</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={tempGuestCount}
                          onChange={(e) => setTempGuestCount(parseInt(e.target.value) || 1)}
                          className="bg-background"
                        />
                        <Button onClick={handleGuestCountSubmit} size="sm" className="w-full">Update</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <p className="font-semibold text-xs leading-tight">
                {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
              </p>
            </div>
          )}

          {/* Package */}
          {packageType && (
            <div className="bg-card border border-border rounded-lg p-2 shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Package className="h-3 w-3 text-primary flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground font-medium">Package</p>
                </div>
                {onPackageEdit && (
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10" onClick={onPackageEdit}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="font-semibold text-xs leading-tight truncate">
                {formatPackageName(packageType)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
