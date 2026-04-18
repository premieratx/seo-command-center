import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Badge } from "@/quote-app/components/ui/badge";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { cn } from "@/quote-app/lib/utils";
import {
  DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle,
  CalendarDays, CalendarIcon, Users
} from "lucide-react";
import { addDays, differenceInDays, isAfter, isBefore, isWithinInterval } from "date-fns";

interface RevenueAnalyticsProps {
  bookings: any[];
}

type DateRange = "all" | "7days" | "30days" | "90days" | "thisYear" | "custom";
type SortMetric = "revenue" | "paid" | "remaining";

export const RevenueAnalytics = ({ bookings }: RevenueAnalyticsProps) => {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [sortMetric, setSortMetric] = useState<SortMetric>("revenue");
  const [sortAsc, setSortAsc] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const now = new Date();

  const filteredBookings = useMemo(() => {
    if (dateRange === "all") return bookings;

    if (dateRange === "custom") {
      if (!customStart || !customEnd) return bookings;
      return bookings.filter((b: any) => {
        const eventDate = new Date(b.time_slot?.start_at || b.created_at);
        return isWithinInterval(eventDate, { start: customStart, end: addDays(customEnd, 1) });
      });
    }

    let startDate: Date;
    switch (dateRange) {
      case "7days":
        startDate = addDays(now, -7);
        break;
      case "30days":
        startDate = addDays(now, -30);
        break;
      case "90days":
        startDate = addDays(now, -90);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return bookings;
    }

    return bookings.filter((b: any) => {
      const eventDate = new Date(b.time_slot?.start_at || b.created_at);
      return isAfter(eventDate, startDate);
    });
  }, [bookings, dateRange, customStart, customEnd]);

  // Compute financial data — use booking.amount directly as the Xola grand total
  const bookingFinancials = useMemo(() => {
    return filteredBookings.map((b: any) => {
      // booking.amount IS the total Xola charges (includes gratuity, tax, fees, add-ons)
      const grandTotal = b.amount || 0;
      const amountPaid = b.amount_paid || b.deposit_amount || 0;
      const remaining = Math.max(0, grandTotal - amountPaid);

      const eventDate = new Date(b.time_slot?.start_at);
      const dueDate = addDays(eventDate, -14);

      return {
        ...b,
        grandTotal,
        amountPaid,
        remaining,
        dueDate,
        eventDate,
      };
    });
  }, [filteredBookings]);

  // Aggregate metrics
  const totals = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let dueIn14 = 0;
    let dueIn30 = 0;
    let dueIn60 = 0;
    let dueIn90 = 0;
    let pastDueCount = 0;
    let paidInFullCount = 0;

    bookingFinancials.forEach((bf) => {
      totalRevenue += bf.grandTotal;
      totalPaid += bf.amountPaid;
      totalRemaining += bf.remaining;

      if (bf.remaining > 0) {
        const daysUntilDue = differenceInDays(bf.dueDate, now);

        if (daysUntilDue < 0) {
          pastDueCount++;
        }
        if (daysUntilDue <= 14) dueIn14 += bf.remaining;
        if (daysUntilDue <= 30) dueIn30 += bf.remaining;
        if (daysUntilDue <= 60) dueIn60 += bf.remaining;
        if (daysUntilDue <= 90) dueIn90 += bf.remaining;
      } else {
        paidInFullCount++;
      }
    });

    return {
      totalRevenue,
      totalPaid,
      totalRemaining,
      dueIn14,
      dueIn30,
      dueIn60,
      dueIn90,
      pastDueCount,
      paidInFullCount,
      totalBookings: bookingFinancials.length,
    };
  }, [bookingFinancials]);

  // Sort bookings by selected metric
  const sortedBookings = useMemo(() => {
    const sorted = [...bookingFinancials].sort((a, b) => {
      const valA = sortMetric === "revenue" ? a.grandTotal : sortMetric === "paid" ? a.amountPaid : a.remaining;
      const valB = sortMetric === "revenue" ? b.grandTotal : sortMetric === "paid" ? b.amountPaid : b.remaining;
      return sortAsc ? valA - valB : valB - valA;
    });
    return sorted;
  }, [bookingFinancials, sortMetric, sortAsc]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const dateRanges: { value: DateRange; label: string }[] = [
    { value: "all", label: "All Time" },
    { value: "7days", label: "7 Days" },
    { value: "30days", label: "30 Days" },
    { value: "90days", label: "90 Days" },
    { value: "thisYear", label: "This Year" },
  ];

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Date Range:</span>
        {dateRanges.map((dr) => (
          <Button
            key={dr.value}
            size="sm"
            variant={dateRange === dr.value ? "default" : "outline"}
            className={`text-xs h-7 px-3 ${
              dateRange === dr.value
                ? "bg-sky-600 text-white hover:bg-sky-500"
                : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"
            }`}
            onClick={() => setDateRange(dr.value)}
          >
            {dr.label}
          </Button>
        ))}

        {/* Custom Date Range */}
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={dateRange === "custom" ? "default" : "outline"}
                className={`text-xs h-7 px-2 ${
                  dateRange === "custom"
                    ? "bg-sky-600 text-white hover:bg-sky-500"
                    : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"
                }`}
                onClick={() => setDateRange("custom")}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                {dateRange === "custom" && customStart
                  ? format(customStart, "MMM d")
                  : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={(d) => { setCustomStart(d); setDateRange("custom"); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-slate-500 text-xs">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={dateRange === "custom" ? "default" : "outline"}
                className={`text-xs h-7 px-2 ${
                  dateRange === "custom"
                    ? "bg-sky-600 text-white hover:bg-sky-500"
                    : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"
                }`}
                onClick={() => setDateRange("custom")}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                {dateRange === "custom" && customEnd
                  ? format(customEnd, "MMM d")
                  : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={(d) => { setCustomEnd(d); setDateRange("custom"); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Booking Count Banner */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-sky-400" />
        <span className="text-sm text-slate-300">
          <span className="font-bold text-white">{totals.totalBookings}</span> booking{totals.totalBookings !== 1 ? "s" : ""} in range
        </span>
        {totals.paidInFullCount > 0 && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs ml-2">
            {totals.paidInFullCount} paid in full
          </Badge>
        )}
        {totals.pastDueCount > 0 && (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
            {totals.pastDueCount} past due
          </Badge>
        )}
      </div>

      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-700/50 border-slate-600/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Total Revenue</span>
            </div>
            <p className="text-xl font-bold text-emerald-300">{fmt(totals.totalRevenue)}</p>
            <p className="text-xs text-slate-500">{totals.totalBookings} bookings</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 border-slate-600/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-sky-400" />
              <span className="text-xs text-slate-400">Amount Paid</span>
            </div>
            <p className="text-xl font-bold text-sky-300">{fmt(totals.totalPaid)}</p>
            <p className="text-xs text-slate-500">
              {totals.paidInFullCount} paid in full
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 border-slate-600/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">Amount Remaining</span>
            </div>
            <p className="text-xl font-bold text-amber-300">{fmt(totals.totalRemaining)}</p>
            <p className="text-xs text-slate-500">
              {totals.pastDueCount > 0 && (
                <span className="text-red-400">{totals.pastDueCount} past due</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 border-slate-600/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">Collection Rate</span>
            </div>
            <p className="text-xl font-bold text-purple-300">
              {totals.totalRevenue > 0
                ? ((totals.totalPaid / totals.totalRevenue) * 100).toFixed(1)
                : "0.0"}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Due Amounts */}
      <Card className="bg-slate-700/50 border-slate-600/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-400" />
            Amounts Due by Timeframe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Next 2 Weeks", amount: totals.dueIn14, color: "text-red-300" },
              { label: "Next 30 Days", amount: totals.dueIn30, color: "text-amber-300" },
              { label: "Next 60 Days", amount: totals.dueIn60, color: "text-yellow-300" },
              { label: "Next 90 Days", amount: totals.dueIn90, color: "text-slate-300" },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{fmt(item.amount)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sort Buttons + Booking List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          {([
            { value: "revenue" as SortMetric, label: "Total Revenue" },
            { value: "paid" as SortMetric, label: "Amount Paid" },
            { value: "remaining" as SortMetric, label: "Amount Remaining" },
          ]).map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={sortMetric === s.value ? "default" : "outline"}
              className={`text-xs h-7 px-3 ${
                sortMetric === s.value
                  ? "bg-sky-600 text-white hover:bg-sky-500"
                  : "bg-yellow-300/80 text-black border-yellow-400 hover:bg-yellow-300"
              }`}
              onClick={() => {
                if (sortMetric === s.value) {
                  setSortAsc(!sortAsc);
                } else {
                  setSortMetric(s.value);
                  setSortAsc(false);
                }
              }}
            >
              {s.label} {sortMetric === s.value ? (sortAsc ? "↑" : "↓") : ""}
            </Button>
          ))}
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {sortedBookings.map((bf) => {
            const isPastDue = bf.remaining > 0 && isBefore(bf.dueDate, now);
            const isDueSoon = bf.remaining > 0 && !isPastDue && differenceInDays(bf.dueDate, now) <= 14;

            return (
              <div
                key={bf.id}
                className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Badge className="bg-yellow-400/90 text-black font-bold text-xs">
                    {bf.customer?.name || "Guest"}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {new Date(bf.time_slot?.start_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "America/Chicago",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <p className="text-slate-500">Total</p>
                    <p className="text-emerald-300 font-semibold">{fmt(bf.grandTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Paid</p>
                    <p className="text-sky-300 font-semibold">{fmt(bf.amountPaid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Remaining</p>
                    <p className={`font-semibold ${bf.remaining > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                      {fmt(bf.remaining)}
                    </p>
                  </div>
                  {isPastDue && (
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Past Due
                    </Badge>
                  )}
                  {isDueSoon && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                      Due in {differenceInDays(bf.dueDate, now)}d
                    </Badge>
                  )}
                  {bf.remaining <= 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}

          {sortedBookings.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No bookings found for this date range.</p>
          )}
        </div>
      </div>
    </div>
  );
};
