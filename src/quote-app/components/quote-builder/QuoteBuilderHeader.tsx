import { format } from "date-fns";
import { Calendar, Users, PartyPopper, Ship, Music, Clock } from "lucide-react";
import { Button } from "@/quote-app/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { Calendar as CalendarComponent } from "@/quote-app/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { useState } from "react";
import { getRecommendedBoat } from "@/quote-app/lib/pricing";
import { formatPartyType } from "@/quote-app/lib/utils";
import ppcLogo from "@/quote-app/assets/ppc-logo.png";

interface QuoteBuilderHeaderProps {
  selectedDate?: Date;
  partyType?: string | null;
  guestCount?: number;
  experienceType?: 'disco_cruise' | 'private_cruise' | null;
  packageType?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  boatName?: string | null;
  showStaticInfo?: boolean;
  compact?: boolean;
  onDateEdit?: (date: Date) => void;
  onPartyTypeEdit?: (type: string) => void;
  onGuestCountEdit?: (count: number) => void;
}

const partyTypeOptions = [
  { value: "bachelor_party", label: "Bachelor Party" },
  { value: "bachelorette_party", label: "Bachelorette Party" },
  { value: "combined_bach", label: "Combined Bachelorette & Bachelor Party" },
  { value: "birthday_party", label: "Birthday Party" },
  { value: "corporate_event", label: "Corporate Event" },
  { value: "graduation", label: "Graduation Party" },
  { value: "wedding_event", label: "Wedding Event" },
  { value: "other", label: "Any Other Occasion" }
];

export const QuoteBuilderHeader = ({
  selectedDate,
  partyType,
  guestCount,
  experienceType,
  packageType,
  timeStart,
  timeEnd,
  boatName,
  showStaticInfo = true,
  compact = false,
  onDateEdit,
  onPartyTypeEdit,
  onGuestCountEdit
}: QuoteBuilderHeaderProps) => {
  const [tempGuestCount, setTempGuestCount] = useState(guestCount || 10);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);

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

  const hasSelections = selectedDate || partyType || (guestCount && guestCount > 0);

  // Compact mode: single row with all info
  if (compact && hasSelections) {
    return (
      <div className="sticky top-0 z-50 bg-gradient-to-br from-primary via-primary-glow to-accent text-white py-2 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {selectedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">
                  {format(selectedDate, "MMM d, yyyy")}
                </span>
                {onDateEdit && (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs underline hover:bg-white/10 text-white">
                        Edit
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
            
            {partyType && (
              <div className="flex items-center gap-2">
                <PartyPopper className="h-4 w-4" />
                <span className="font-semibold">
                  {formatPartyType(partyType)}
                </span>
                {onPartyTypeEdit && (
                  <Popover open={partyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs underline hover:bg-white/10 text-white">
                        Edit
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 z-50" align="start">
                      <div className="space-y-2">
                        <Label>Party Type</Label>
                        <Select value={partyType} onValueChange={handlePartyTypeChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50">
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
            )}
            
            {guestCount && guestCount > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-semibold">
                  {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
                </span>
                {onGuestCountEdit && (
                  <Popover open={guestPopoverOpen} onOpenChange={setGuestPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs underline hover:bg-white/10 text-white">
                        Edit
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 z-50" align="start">
                      <div className="space-y-3">
                        <Label>Number of Guests</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={tempGuestCount}
                          onChange={(e) => setTempGuestCount(parseInt(e.target.value) || 1)}
                        />
                        <Button onClick={handleGuestCountSubmit} size="sm" className="w-full">
                          Update
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full mode with info blocks
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-br from-primary via-primary-glow to-accent text-white py-4 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left side - Logo and heading */}
          <div className="flex items-center gap-4">
            {/* Premier Party Cruises Logo */}
            <div className="hidden md:flex items-center justify-center">
              <img 
                src={ppcLogo.src} 
                alt="Premier Party Cruises" 
                className="w-16 h-16 object-contain"
              />
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Let's build your perfect party cruise.
              </h1>
              <p className="text-sm md:text-base opacity-90">
                Check availability and book online now
              </p>
            </div>
          </div>
          
          {/* Right side - Dynamic info blocks */}
          <div className="grid grid-cols-4 gap-2 md:gap-3 text-center">
            {/* Block 1: Day of Week + Event Date or Premium Boats */}
            <div className={hasSelections ? "bg-white border-2 border-blue-400 shadow-lg rounded-lg p-2 min-w-[70px] relative" : "bg-white/10 backdrop-blur-sm rounded-lg p-2 min-w-[70px]"}>
              {selectedDate && hasSelections ? (
                <>
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs font-bold leading-tight text-blue-900">
                    {format(selectedDate, "EEE")}
                  </p>
                  <p className="text-sm md:text-base font-bold leading-tight text-blue-900">
                    {format(selectedDate, "MMM d")}
                  </p>
                  <p className="text-[10px] text-blue-700">Event Date</p>
                  {onDateEdit && (
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-0 right-0 h-5 px-1 text-[9px] text-blue-600 underline hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4 z-50" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateChange}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              ) : showStaticInfo ? (
                <>
                  <p className="text-xl md:text-2xl font-bold">4</p>
                  <p className="text-xs">Premium Boats</p>
                </>
              ) : null}
            </div>

            {/* Block 2: Experience Type or Party Type or Max Capacity */}
            <div className={hasSelections && (experienceType || partyType) ? "bg-white border-2 border-blue-400 shadow-lg rounded-lg p-2 min-w-[70px] relative" : "bg-white/10 backdrop-blur-sm rounded-lg p-2 min-w-[70px]"}>
              {experienceType && hasSelections ? (
                <>
                  <Music className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-sm md:text-base font-bold leading-tight text-blue-900">
                    {experienceType === 'disco_cruise' ? 'Disco' : 'Private'}
                  </p>
                  <p className="text-[10px] text-blue-700">Experience</p>
                </>
              ) : partyType && hasSelections ? (
                <>
                  <PartyPopper className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-sm md:text-base font-bold leading-tight truncate text-blue-900">
                    {formatPartyType(partyType)}
                  </p>
                  <p className="text-[10px] text-blue-700">Party Type</p>
                  {onPartyTypeEdit && (
                    <Popover open={partyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-0 right-0 h-5 px-1 text-[9px] text-blue-600 underline hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 z-50" align="start">
                        <div className="space-y-2">
                          <Label>Party Type</Label>
                          <Select value={partyType} onValueChange={handlePartyTypeChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50">
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
                </>
              ) : showStaticInfo ? (
                <>
                  <p className="text-xl md:text-2xl font-bold">75</p>
                  <p className="text-xs">Max Capacity</p>
                </>
              ) : null}
            </div>

            {/* Block 3: Guest Count or Days a Week */}
            <div className={hasSelections && guestCount && guestCount > 0 ? "bg-white border-2 border-blue-400 shadow-lg rounded-lg p-2 min-w-[70px] relative" : "bg-white/10 backdrop-blur-sm rounded-lg p-2 min-w-[70px]"}>
              {guestCount && guestCount > 0 && hasSelections ? (
                <>
                  <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xl md:text-2xl font-bold text-blue-900">{guestCount}</p>
                  <p className="text-[10px] text-blue-700">Guests</p>
                  {onGuestCountEdit && (
                    <Popover open={guestPopoverOpen} onOpenChange={setGuestPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-0 right-0 h-5 px-1 text-[9px] text-blue-600 underline hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 z-50" align="start">
                        <div className="space-y-3">
                          <Label>Number of Guests</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={tempGuestCount}
                            onChange={(e) => setTempGuestCount(parseInt(e.target.value) || 1)}
                          />
                          <Button onClick={handleGuestCountSubmit} size="sm" className="w-full">
                            Update
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              ) : showStaticInfo ? (
                <>
                  <p className="text-xl md:text-2xl font-bold">7</p>
                  <p className="text-xs">Days a Week</p>
                </>
              ) : null}
            </div>

            {/* Block 4: Time Frame or Package or Boat */}
            <div className={hasSelections && (timeStart || packageType || (guestCount && guestCount > 0)) ? "bg-white border-2 border-blue-400 shadow-lg rounded-lg p-2 min-w-[70px]" : "bg-white/10 backdrop-blur-sm rounded-lg p-2 min-w-[70px]"}>
              {timeStart && timeEnd && hasSelections ? (
                <>
                  <Clock className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs font-bold leading-tight text-blue-900">
                    {timeStart}
                  </p>
                  <p className="text-xs font-bold leading-tight text-blue-900">
                    to {timeEnd}
                  </p>
                  <p className="text-[10px] text-blue-700">Time</p>
                </>
              ) : boatName && hasSelections ? (
                <>
                  <Ship className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-sm md:text-base font-bold leading-tight truncate text-blue-900">
                    {boatName}
                  </p>
                  <p className="text-[10px] text-blue-700">Boat</p>
                </>
              ) : guestCount && guestCount > 0 && hasSelections ? (
                <>
                  <Ship className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-sm md:text-base font-bold leading-tight truncate text-blue-900">
                    {getRecommendedBoat(guestCount)}
                  </p>
                  <p className="text-[10px] text-blue-700">Recommended</p>
                </>
              ) : showStaticInfo ? (
                <>
                  <p className="text-xl md:text-2xl font-bold">∞</p>
                  <p className="text-xs">Fun Guaranteed</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
