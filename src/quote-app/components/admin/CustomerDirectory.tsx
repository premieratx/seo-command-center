import { useState, useMemo } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Download, Search, Copy, ExternalLink, ArrowUpDown, CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface CustomerDirectoryProps {
  bookings: any[];
}

type SortKey = "name" | "date" | "headcount" | "experience";

export default function CustomerDirectory({ bookings }: CustomerDirectoryProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [experienceFilter, setExperienceFilter] = useState<"all" | "disco" | "private">("all");

  const boatCapacityMap: Record<string, number> = {
    "Day Tripper": 14, "Clever Girl": 50, "Meeseeks": 25, "The Irony": 25
  };

  const rows = useMemo(() => {
    return bookings.map((b: any) => {
      const name = b.customer?.name || "Guest";
      const email = b.customer?.email || "";
      const phone = b.customer?.phone || "";
      const startAt = b.time_slot?.start_at;
      const endAt = b.time_slot?.end_at;
      const cruiseDate = startAt
        ? new Date(startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
        : "TBD";
      const cruiseDateRaw = startAt || "";
      const headcount = b.headcount || 0;
      const isDisco = b.time_slot?.experience?.type === "disco_cruise" || b.time_slot?.experience?.type === "disco";
      const boatName = b.time_slot?.boat?.name || "";
      const cap = boatCapacityMap[boatName] || 0;
      const experience = isDisco ? "ATX Disco Cruise" : cap > 0 ? `${cap}-Person Private Cruise` : "Private Cruise";
      const dashUrl = `https://booking.premierpartycruises.com/customer-dashboard?booking=${b.id}`;
      const timeStart = startAt ? new Date(startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago" }) : "";
      const timeEnd = endAt ? new Date(endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago" }) : "";
      const packageType = b.package_type || "";
      const amount = b.amount || 0;
      const status = b.status || "";
      return { id: b.id, name, email, phone, cruiseDate, cruiseDateRaw, headcount, experience, dashUrl, isDisco, boatName, timeStart, timeEnd, packageType, amount, status };
    });
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    if (dateFrom) {
      list = list.filter(r => r.cruiseDateRaw && r.cruiseDateRaw >= dateFrom);
    }
    if (dateTo) {
      const toEnd = dateTo + "T23:59:59";
      list = list.filter(r => r.cruiseDateRaw && r.cruiseDateRaw <= toEnd);
    }
    if (experienceFilter === "disco") {
      list = list.filter(r => r.isDisco);
    } else if (experienceFilter === "private") {
      list = list.filter(r => !r.isDisco);
    }
    list = [...list].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "date") return a.cruiseDateRaw.localeCompare(b.cruiseDateRaw) * dir;
      if (sortKey === "headcount") return (a.headcount - b.headcount) * dir;
      if (sortKey === "experience") return a.experience.localeCompare(b.experience) * dir;
      return 0;
    });
    return list;
  }, [rows, search, sortKey, sortAsc, dateFrom, dateTo, experienceFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const downloadCsv = () => {
    const header = "First Name,Last Name,Email,Dashboard Link";
    const csvRows = filtered.map(r => {
      const parts = r.name.split(" ");
      const first = parts[0] || "";
      const last = parts.slice(1).join(" ") || "";
      return `"${first}","${last}","${r.email.replace(/"/g, '""')}","${r.dashUrl}"`;
    });
    const blob = new Blob([header + "\n" + csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer-dashboards.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV downloaded — ${filtered.length} rows`);
  };

  const downloadFullCsv = () => {
    const header = "Name,Email,Phone,Cruise Date,Time,# of People,Experience,Boat,Package,Amount,Status,Dashboard URL";
    const csvRows = filtered.map(r =>
      `"${r.name}","${r.email}","${r.phone}","${r.cruiseDate}","${r.timeStart}${r.timeEnd ? ' - ' + r.timeEnd : ''}",${r.headcount},"${r.experience}","${r.boatName}","${r.packageType}",${r.amount},"${r.status}","${r.dashUrl}"`
    );
    const blob = new Blob([header + "\n" + csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer-directory.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Full CSV downloaded — ${filtered.length} rows`);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setExperienceFilter("all");
    setSearch("");
  };

  const hasFilters = dateFrom || dateTo || experienceFilter !== "all" || search;

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="text-left text-xs font-semibold text-slate-300 px-3 py-2 cursor-pointer hover:text-white select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-sky-400" : "text-slate-500"}`} />
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 w-36 bg-slate-700/50 border-slate-600 text-white text-xs"
            placeholder="From"
          />
          <span className="text-slate-500 text-xs">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 w-36 bg-slate-700/50 border-slate-600 text-white text-xs"
            placeholder="To"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "disco", "private"] as const).map(v => (
            <Button
              key={v}
              size="sm"
              variant={experienceFilter === v ? "default" : "outline"}
              className={`h-7 text-xs ${experienceFilter === v ? "bg-sky-600 text-white" : "bg-slate-700 border-slate-600 text-slate-300"}`}
              onClick={() => setExperienceFilter(v)}
            >
              {v === "all" ? "All" : v === "disco" ? "Disco" : "Private"}
            </Button>
          ))}
        </div>
        {hasFilters && (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Count + Export */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">{filtered.length} of {rows.length} customers</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs bg-slate-700 border-slate-600 text-white hover:bg-slate-600" onClick={downloadCsv}>
            <Download className="h-3.5 w-3.5 mr-1" /> Simple CSV
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600" onClick={downloadFullCsv}>
            <Download className="h-3.5 w-3.5 mr-1" /> Full CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-600/50">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/70 border-b border-slate-600/50">
            <tr>
              <SortHeader label="Name" field="name" />
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Email</th>
              <SortHeader label="Cruise Date" field="date" />
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Time</th>
              <SortHeader label="# People" field="headcount" />
              <SortHeader label="Experience" field="experience" />
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Dashboard</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-800/10"} hover:bg-slate-700/40`}>
                <td className="px-3 py-2 font-medium text-white whitespace-nowrap">{r.name}</td>
                <td className="px-3 py-2 text-slate-300 text-xs">{r.email}</td>
                <td className="px-3 py-2 text-slate-300 text-xs whitespace-nowrap">{r.cruiseDate}</td>
                <td className="px-3 py-2 text-slate-300 text-xs whitespace-nowrap">{r.timeStart}{r.timeEnd ? ` – ${r.timeEnd}` : ""}</td>
                <td className="px-3 py-2 text-slate-300 text-xs text-center">{r.headcount}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <span className={r.isDisco ? "text-purple-300" : "text-sky-300"}>{r.experience}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      onClick={() => { navigator.clipboard.writeText(r.dashUrl); toast.success("Link copied!"); }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      onClick={() => window.open(r.dashUrl, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
