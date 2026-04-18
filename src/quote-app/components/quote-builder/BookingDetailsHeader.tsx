import { format } from "date-fns";
import { Calendar, Clock, Users, Ship, Sparkles } from "lucide-react";
import { getRecommendedBoat } from "@/quote-app/lib/boatSelection";

interface BookingDetailsHeaderProps {
  eventDate: Date;
  startTime?: string;
  endTime?: string;
  guestCount: number;
  experienceType: string;
  boatName?: string;
  duration?: number;
  packageName?: string;
  promoCode?: string;
}

export const BookingDetailsHeader = ({
  eventDate,
  startTime,
  endTime,
  guestCount,
  experienceType,
  boatName: providedBoatName,
  duration,
  packageName,
  promoCode
}: BookingDetailsHeaderProps) => {
  const dayOfWeek = format(eventDate, "EEEE");
  const formattedDate = format(eventDate, "MMMM d, yyyy");
  
  // ALWAYS use recommended boat for private cruises based on current guest count
  // This ensures header reflects correct boat even when guest count changes
  const isDiscoCruise = experienceType?.toLowerCase().includes('disco');
  const recommendedBoat = getRecommendedBoat(guestCount);
  const boatName = isDiscoCruise 
    ? (providedBoatName || "ATX Disco Cruise")
    : (providedBoatName || recommendedBoat.boatName);

  return (
    <div className="bg-gradient-to-r from-fancy-gold/20 to-fancy-accent/20 border-2 border-fancy-gold/30 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-fancy-gold mb-3 uppercase tracking-wide">
        Your Booking Selections
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
        {duration && (
          <div className="space-y-1">
            <Clock className="h-5 w-5 mx-auto text-fancy-gold" />
            <p className="text-2xl font-bold text-fancy-text">{duration} Hours</p>
            <p className="text-xs text-fancy-text-light uppercase tracking-wide">Duration</p>
          </div>
        )}
        <div className="space-y-1">
          <Calendar className="h-5 w-5 mx-auto text-fancy-gold" />
          <p className="text-2xl font-bold text-fancy-text">{format(eventDate, "MMM d")}</p>
          <p className="text-xs text-fancy-text-light uppercase tracking-wide">{dayOfWeek}</p>
        </div>
        {startTime && endTime && (
          <div className="space-y-1">
            <Clock className="h-5 w-5 mx-auto text-fancy-gold" />
            <p className="text-lg font-bold text-fancy-text leading-tight">{startTime}</p>
            <p className="text-xs text-fancy-text-light uppercase tracking-wide">to {endTime}</p>
          </div>
        )}
        <div className="space-y-1">
          <Users className="h-5 w-5 mx-auto text-fancy-gold" />
          <p className="text-2xl font-bold text-fancy-text">{guestCount}</p>
          <p className="text-xs text-fancy-text-light uppercase tracking-wide">Guests</p>
        </div>
        <div className="space-y-1">
          <Sparkles className="h-5 w-5 mx-auto text-fancy-gold" />
          <p className="text-lg font-bold text-fancy-text leading-tight">{experienceType}</p>
          <p className="text-xs text-fancy-text-light uppercase tracking-wide">Experience</p>
        </div>
        {boatName && (
          <div className="space-y-1">
            <Ship className="h-5 w-5 mx-auto text-fancy-gold" />
            <p className="text-lg font-bold text-fancy-text leading-tight">{boatName}</p>
            <p className="text-xs text-fancy-text-light uppercase tracking-wide">Boat</p>
          </div>
        )}
        {packageName && (
          <div className="space-y-1">
            <Sparkles className="h-5 w-5 mx-auto text-fancy-gold" />
            <p className="text-lg font-bold text-fancy-text leading-tight">{packageName}</p>
            <p className="text-xs text-fancy-text-light uppercase tracking-wide">Package</p>
          </div>
        )}
        {promoCode && (
          <div className="space-y-1 col-span-2 md:col-span-1">
            <div className="text-lg font-bold text-green-500">🎉</div>
            <p className="text-lg font-bold text-green-500 leading-tight">{promoCode}</p>
            <p className="text-xs text-fancy-text-light uppercase tracking-wide">Discount Applied</p>
          </div>
        )}
      </div>
    </div>
  );
};
