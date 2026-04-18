import { useState, useEffect } from "react";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { cn } from "@/quote-app/lib/utils";

interface DateSelectorProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const DateSelector = ({ selectedDate, onDateSelect }: DateSelectorProps) => {
  const [isGlowing, setIsGlowing] = useState(true);
  
  // Allow calendar through end of 2027
  const maxDate = new Date('2027-12-31');

  // Animate border glow on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsGlowing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <div className="w-[80%] flex items-center justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          disabled={(date) => date < new Date() || date > maxDate}
          numberOfMonths={1}
          fromDate={new Date()}
          toDate={maxDate}
          fixedWeeks
          className={cn(
            "rounded-md pointer-events-auto w-full transition-all duration-500",
            "border-2 border-primary/60",
            isGlowing && "border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
          )}
          classNames={{
            months: "flex flex-col w-full",
            month: "space-y-2 w-full",
            caption: "flex justify-center pt-2 relative items-center h-8",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
            nav_button_previous: "absolute left-2",
            nav_button_next: "absolute right-2",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-xs",
            row: "flex w-full mt-1",
            cell: "flex-1 h-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "w-full h-full p-0 font-normal aria-selected:opacity-100 text-sm",
            day_range_end: "day-range-end",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
      </div>
    </div>
  );
};
