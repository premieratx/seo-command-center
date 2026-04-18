import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BookingSummary {
  id: string;
  customer_name: string;
  customer_email: string;
  event_date: string;
  experience_title: string;
}

interface SmartPromptBarProps {
  bookings: BookingSummary[];
  onSelectBookings: (ids: string[]) => void;
}

function getRelativeDateRange(lower: string): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=Sun

  if (lower.includes("this weekend")) {
    const sat = new Date(today);
    sat.setDate(today.getDate() + (6 - dayOfWeek));
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    return { from: sat, to: sun };
  }
  if (lower.includes("next weekend")) {
    const sat = new Date(today);
    sat.setDate(today.getDate() + (6 - dayOfWeek) + 7);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    return { from: sat, to: sun };
  }
  if (lower.includes("this week")) {
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: mon, to: sun };
  }
  if (lower.includes("next week")) {
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: mon, to: sun };
  }
  if (lower.includes("this month")) {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: first, to: last };
  }
  if (lower.includes("next month")) {
    const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { from: first, to: last };
  }
  if (lower.includes("today")) {
    return { from: today, to: today };
  }
  if (lower.includes("tomorrow")) {
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    return { from: tmrw, to: tmrw };
  }

  // "next N days/weeks/months"
  const nextNMatch = lower.match(/next\s+(\d+)\s+(day|week|month)s?/);
  if (nextNMatch) {
    const n = parseInt(nextNMatch[1], 10);
    const unit = nextNMatch[2];
    const end = new Date(today);
    if (unit === "day") end.setDate(today.getDate() + n);
    else if (unit === "week") end.setDate(today.getDate() + n * 7);
    else if (unit === "month") end.setMonth(today.getMonth() + n);
    return { from: today, to: end };
  }

  return null;
}

function getMonthDateRange(lower: string): { from: Date; to: Date } | null {
  const months: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  const monthPattern = /\b(?:in|during|for)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(?:\s+(\d{4}))?\b/;
  const match = lower.match(monthPattern);
  if (!match) return null;

  const month = months[match[1]];
  if (month === undefined) return null;

  const anyYearInPrompt = lower.match(/\b(20\d{2})\b/);
  const year = match[2]
    ? parseInt(match[2], 10)
    : anyYearInPrompt
      ? parseInt(anyYearInPrompt[1], 10)
      : new Date().getFullYear();

  return {
    from: new Date(year, month, 1),
    to: new Date(year, month + 1, 0),
  };
}

function parsePrompt(prompt: string, bookings: BookingSummary[]): string[] {
  const lower = prompt.toLowerCase();

  const fillerWords = new Set([
    "find",
    "show",
    "get",
    "list",
    "all",
    "bookings",
    "booking",
    "cruise",
    "cruises",
    "for",
    "by",
    "the",
    "a",
    "an",
    "send",
    "message",
    "to",
    "customer",
    "customers",
    "this",
    "next",
    "weekend",
    "week",
    "month",
    "today",
    "tomorrow",
    "between",
    "and",
    "from",
    "of",
    "thru",
    "through",
    "in",
    "on",
    "during",
    "disco",
    "private",
    "days",
    "weeks",
    "months",
  ]);

  let typeFilter: "disco" | "private" | null = null;
  if (lower.includes("disco")) typeFilter = "disco";
  else if (lower.includes("private")) typeFilter = "private";

  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  const relative = getRelativeDateRange(lower);
  if (relative) {
    fromDate = relative.from;
    toDate = relative.to;
  } else {
    const patterns = [
      /between\s+(.+?)\s+and\s+(.+?)$/,
      /from\s+(.+?)\s+to\s+(.+?)$/,
      /(?:of|for)\s+(.+?)\s+to\s+(.+?)$/,
      /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?:\s+\d{4})?)\s*(?:to|-|–|thru|through)\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?:\s+\d{4})?)/,
      /(\w+\s+\d{1,2}(?:[,\s]+\d{4})?)\s*(?:to|-|–|thru|through)\s*(\w+\s+\d{1,2}(?:[,\s]+\d{4})?)/,
    ];

    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match) {
        fromDate = parseFuzzyDate(match[1].trim());
        toDate = parseFuzzyDate(match[2].trim());
        if (fromDate && toDate) break;
        fromDate = null;
        toDate = null;
      }
    }

    if (!fromDate || !toDate) {
      const monthRange = getMonthDateRange(lower);
      if (monthRange) {
        fromDate = monthRange.from;
        toDate = monthRange.to;
      }
    }
  }

  let nameQuery = lower
    .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?(\s+\d{4})?/g, "")
    .replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(,?\s*\d{4})?\b/g,
      ""
    )
    .replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(\s+\d{4})?\b/g,
      ""
    )
    .replace(/\b(this|next)\s+(weekend|week|month)\b/g, "")
    .replace(/\bnext\s+\d+\s+(day|week|month)s?\b/g, "")
    .replace(/\b(today|tomorrow)\b/g, "");

  const remainingWords = nameQuery
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 0 && !fillerWords.has(w) && !/^\d+$/.test(w)
    );
  const nameSearch = remainingWords.join(" ").trim();

  console.log(
    "[SmartPrompt] type:",
    typeFilter,
    "from:",
    fromDate,
    "to:",
    toDate,
    "nameSearch:",
    nameSearch,
    "bookings count:",
    bookings.length
  );

  const results = bookings.filter((b) => {
    if (typeFilter) {
      const title = b.experience_title.toLowerCase();
      if (typeFilter === "disco" && !title.includes("disco")) return false;
      if (typeFilter === "private" && !title.includes("private")) return false;
    }

    if (fromDate && toDate && b.event_date) {
      const eventDate = new Date(b.event_date);
      const eventDay = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      if (eventDay < fromDate || eventDay > toDate) return false;
    }

    if (nameSearch) {
      const name = b.customer_name.toLowerCase();
      const email = b.customer_email.toLowerCase();
      if (!name.includes(nameSearch) && !email.includes(nameSearch)) return false;
    }

    return true;
  });

  return results.map((b) => b.id);
}

function parseFuzzyDate(str: string): Date | null {
  const months: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  const namedMatch = str.match(/^(\w+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
  if (namedMatch) {
    const monthNum = months[namedMatch[1].toLowerCase()];
    if (monthNum !== undefined) {
      const year = namedMatch[3]
        ? parseInt(namedMatch[3])
        : new Date().getFullYear();
      return new Date(year, monthNum, parseInt(namedMatch[2]));
    }
  }

  const slashMatch = str.match(
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s+(\d{4}))?$/
  );
  if (slashMatch) {
    const yearStr = slashMatch[3] || slashMatch[4];
    const year = yearStr
      ? parseInt(yearStr.length === 2 ? "20" + yearStr : yearStr)
      : new Date().getFullYear();
    return new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export const SmartPromptBar = ({ bookings, onSelectBookings }: SmartPromptBarProps) => {
  const [prompt, setPrompt] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePrompt = () => {
    if (!prompt.trim()) return;
    if (bookings.length === 0) {
      toast.error("Bookings are still loading — try again in a moment");
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      const matchedIds = parsePrompt(prompt, bookings);
      if (matchedIds.length === 0) {
        onSelectBookings([]);
        toast.error("No matching bookings found for that prompt");
      } else {
        onSelectBookings(matchedIds);
        toast.success(`Found ${matchedIds.length} matching booking${matchedIds.length > 1 ? "s" : ""}`);
      }
      setProcessing(false);
    }, 300);
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-2.5 h-4 w-4 text-amber-400" />
        <Input
          placeholder='Try: "bookings this weekend" or "disco cruises in april"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePrompt()}
          className="bg-slate-800/50 border-slate-600 text-white pl-9 placeholder:text-slate-500"
        />
      </div>
      <Button
        onClick={handlePrompt}
        disabled={processing || !prompt.trim()}
        size="sm"
        className="bg-amber-600 hover:bg-amber-500 text-white shrink-0"
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      </Button>
    </div>
  );
};
