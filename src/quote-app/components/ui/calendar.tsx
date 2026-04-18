import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/quote-app/lib/utils";
import { buttonVariants } from "@/quote-app/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 h-[320px] flex flex-col",
        caption: "flex justify-center pt-1 relative items-center h-12",
        caption_label: "text-sm font-medium text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-14 w-14 bg-white border-gray-300 p-0 opacity-70 hover:opacity-100 text-gray-900",
        ),
        nav_button_previous: "absolute left-1 top-1",
        nav_button_next: "absolute right-1 top-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-600 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-purple-100 [&:has([aria-selected])]:bg-purple-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-gray-900 hover:bg-gray-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:from-purple-600 hover:to-cyan-600 focus:from-purple-600 focus:to-cyan-600",
        day_today: "bg-purple-100 text-purple-900 font-semibold",
        day_outside:
          "day-outside text-gray-400 opacity-50 aria-selected:bg-purple-100 aria-selected:text-gray-400 aria-selected:opacity-30",
        day_disabled: "text-gray-300 opacity-50",
        day_range_middle: "aria-selected:bg-purple-100 aria-selected:text-gray-900",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-8 w-8" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-8 w-8" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
