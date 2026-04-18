import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Calendar } from "lucide-react";
import { format, addDays, subDays } from "date-fns";

interface AlternativeDatesSelectorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const AlternativeDatesSelector = ({ currentDate, onDateChange }: AlternativeDatesSelectorProps) => {
  const generateAlternativeDates = () => {
    const dates = [];
    // Previous 3 days
    for (let i = 3; i >= 1; i--) {
      const date = subDays(currentDate, i);
      if (date >= new Date()) {
        dates.push(date);
      }
    }
    // Next 3 days
    for (let i = 1; i <= 3; i++) {
      dates.push(addDays(currentDate, i));
    }
    return dates;
  };

  const alternativeDates = generateAlternativeDates();

  return (
    <Card className="border-2 shadow-lg bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Alternative Dates
        </CardTitle>
        <CardDescription>Check availability on nearby dates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alternativeDates.map((date) => (
          <Button
            key={date.toISOString()}
            variant="outline"
            className="w-full justify-start"
            onClick={() => onDateChange(date)}
          >
            <div className="flex items-center justify-between w-full">
              <span>{format(date, "EEEE, MMMM d")}</span>
              <span className="text-xs text-muted-foreground">{format(date, "yyyy")}</span>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
