import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/quote-app/components/ui/checkbox";

interface BookingSummary {
  id: string;
  customer_name: string;
  customer_email: string;
  event_date: string;
  experience_title: string;
}

interface CompactRecipientListProps {
  bookings: BookingSummary[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const CompactRecipientList = ({
  bookings,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: CompactRecipientListProps) => {
  if (bookings.length === 0) return null;

  const allSelected = bookings.every((b) => selectedIds.includes(b.id));
  const someSelected = bookings.some((b) => selectedIds.includes(b.id));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getCruiseType = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("disco")) return { label: "Disco", color: "text-purple-400" };
    if (lower.includes("private")) return { label: "Private", color: "text-sky-400" };
    return { label: "Cruise", color: "text-slate-400" };
  };

  return (
    <div className="bg-sky-950/30 border border-sky-500/20 rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => allSelected ? onDeselectAll() : onSelectAll()}
            className="border-slate-500 data-[state=checked]:bg-sky-600"
          />
          <span className="text-xs text-sky-300 font-semibold">
            {selectedIds.length} of {bookings.length} selected
          </span>
        </div>
        {someSelected && (
          <button onClick={onDeselectAll} className="text-[10px] text-slate-400 hover:text-red-400">
            Clear
          </button>
        )}
      </div>

      {/* List */}
      <div className={`${bookings.length > 50 ? "max-h-52 overflow-y-auto" : ""} divide-y divide-slate-700/30`}>
        {bookings.map((b) => {
          const isSelected = selectedIds.includes(b.id);
          const cruise = getCruiseType(b.experience_title);
          const dashLink = `/customer-dashboard?booking=${b.id}`;

          return (
            <div
              key={b.id}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-700/30 cursor-pointer ${
                isSelected ? "bg-sky-900/20" : ""
              }`}
              onClick={() => onToggle(b.id)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(b.id)}
                className="border-slate-500 data-[state=checked]:bg-sky-600 shrink-0"
              />
              <span className="text-white font-medium truncate min-w-[100px] max-w-[140px]">
                {b.customer_name}
              </span>
              <span className="text-slate-500 shrink-0">{formatDate(b.event_date)}</span>
              <span className="text-slate-600 shrink-0">{formatTime(b.event_date)}</span>
              <span className={`${cruise.color} shrink-0 font-medium`}>{cruise.label}</span>
              <a
                href={dashLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto text-slate-500 hover:text-sky-400 shrink-0"
                title="Open dashboard"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
