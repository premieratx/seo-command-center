import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Calendar, Clock, Ship, Package, Users, Edit2, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { formatPartyType, formatPackageName } from "@/quote-app/lib/utils";

interface StickyBookingSummaryProps {
  eventDate?: Date;
  startTime?: string;
  endTime?: string;
  boatName?: string;
  packageName?: string;
  ticketCount?: number;
  partyType?: string;
  totalPrice?: number;
  onEditTimeSlot?: () => void;
  onEditPackage?: () => void;
  onEditTickets?: () => void;
  onEditDate?: () => void;
}

export const StickyBookingSummary = ({
  eventDate,
  startTime,
  endTime,
  boatName,
  packageName,
  ticketCount,
  partyType,
  totalPrice,
  onEditTimeSlot,
  onEditPackage,
  onEditTickets,
  onEditDate,
}: StickyBookingSummaryProps) => {
  const hasAnySelection = eventDate || startTime || packageName || ticketCount || partyType;

  if (!hasAnySelection) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/30">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-base sm:text-lg font-bold text-center">Your Booking Details</CardTitle>
        <p className="text-xs text-center text-muted-foreground">Checkout source of truth</p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Event Date */}
          {eventDate && (
            <div className="bg-background rounded-lg p-2 border relative">
              {onEditDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0.5 right-0.5 h-5 w-5 p-0"
                  onClick={onEditDate}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground">Event Date</span>
              </div>
              <p className="text-sm font-bold leading-tight">{format(eventDate, "MMM d")}</p>
              <p className="text-xs text-muted-foreground">{format(eventDate, "EEEE")}</p>
            </div>
          )}

          {/* Party Type */}
          {partyType && (
            <div className="bg-background rounded-lg p-2 border">
              <div className="flex items-center gap-1.5 mb-1">
                <PartyPopper className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground">Party Type</span>
              </div>
              <p className="text-sm font-bold leading-tight">{formatPartyType(partyType)}</p>
            </div>
          )}

          {/* Time Slot */}
          {startTime && endTime && (
            <div className="bg-background rounded-lg p-2 border relative">
              {onEditTimeSlot && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0.5 right-0.5 h-5 w-5 p-0"
                  onClick={onEditTimeSlot}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground">Time</span>
              </div>
              <p className="text-sm font-bold leading-tight">{startTime}</p>
              <p className="text-xs text-muted-foreground">to {endTime}</p>
            </div>
          )}

          {/* Boat */}
          {boatName && (
            <div className="bg-background rounded-lg p-2 border">
              <div className="flex items-center gap-1.5 mb-1">
                <Ship className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground">Boat</span>
              </div>
              <p className="text-sm font-bold leading-tight">{boatName}</p>
            </div>
          )}

          {/* Package */}
          {packageName && (
            <div className="bg-background rounded-lg p-2 border relative">
              {onEditPackage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0.5 right-0.5 h-5 w-5 p-0"
                  onClick={onEditPackage}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground">Package</span>
              </div>
              <p className="text-sm font-bold leading-tight">{formatPackageName(packageName)}</p>
            </div>
          )}

          {/* Guests/Tickets */}
          {ticketCount && ticketCount > 0 && (
            <div className="bg-background rounded-lg p-2 border relative">
              {onEditTickets && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0.5 right-0.5 h-5 w-5 p-0"
                  onClick={onEditTickets}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground">Guests</span>
              </div>
              <p className="text-2xl font-bold text-primary">{ticketCount}</p>
            </div>
          )}

          {/* Total Price */}
          {totalPrice && totalPrice > 0 && (
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-2 border-2 border-green-500 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-semibold text-green-700 dark:text-green-400">Grand Total</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">${totalPrice.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Includes tax & gratuity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
