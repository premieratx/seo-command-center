import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Loader2, Anchor } from "lucide-react";

interface QuoteDisplayProps {
  selectedDate: Date | undefined;
  partyType: string | null;
  guestCount: number;
  isLoading: boolean;
}

export const QuoteDisplay = ({ selectedDate, partyType, guestCount, isLoading }: QuoteDisplayProps) => {
  if (!selectedDate || !partyType) {
    return null;
  }

  return (
    <Card className="border-2 shadow-lg bg-background/80 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Your Custom Quote
        </CardTitle>
        <CardDescription className="text-base">
          Available experiences for your party
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Finding the perfect cruise for you...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-6 text-center">
              <Anchor className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium mb-2">
                We're preparing your personalized quote!
              </p>
              <p className="text-sm text-muted-foreground">
                Date: {selectedDate.toLocaleDateString()} • Guests: {guestCount} • Type: {partyType}
              </p>
            </div>
            
            <Button size="lg" className="w-full">
              View Available Time Slots
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
