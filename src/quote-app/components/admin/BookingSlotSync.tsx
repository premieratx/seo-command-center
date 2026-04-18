import { useState, useMemo } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Button } from "@/quote-app/components/ui/button";
import { Badge } from "@/quote-app/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, Ship, Zap } from "lucide-react";
import { toast } from "sonner";

interface BookingSlotSyncProps {
  bookings: any[];
  onSyncComplete?: () => void;
}

interface TimeSlotMatch {
  bookingId: string;
  customerName: string;
  cruiseDate: string;
  cruiseDateRaw: string;
  timeStart: string;
  timeEnd: string;
  headcount: number;
  experience: string;
  boatName: string;
  isDisco: boolean;
  timeSlotId: string | null;
  slotStatus: string | null;
  capacityTotal: number | null;
  capacityAvailable: number | null;
  matchStatus: "linked" | "needs-sync" | "no-slot";
}

export default function BookingSlotSync({ bookings, onSyncComplete }: BookingSlotSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [fixingDupes, setFixingDupes] = useState(false);

  const matches: TimeSlotMatch[] = useMemo(() => {
    return bookings.map((b: any) => {
      const name = b.customer?.name || "Guest";
      const ts = b.time_slot;
      const startAt = ts?.start_at;
      const endAt = ts?.end_at;
      const expType = ts?.experience?.type || "";
      const isDisco = expType === "disco_cruise" || expType === "disco";
      const rawBoatName = ts?.boat?.name || "";
      // Display "Disco Boat" for disco cruises instead of actual boat name
      const boatName = isDisco ? "Disco Boat" : rawBoatName;
      const boatCap = ts?.boat?.capacity || 0;
      const experience = isDisco ? "ATX Disco Cruise" : boatCap > 0 ? `${boatCap}-Person Private Cruise` : "Private Cruise";
      const timeSlotId = b.time_slot_id || null;

      const cruiseDate = startAt
        ? new Date(startAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
        : "TBD";
      const timeStart = startAt
        ? new Date(startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago" })
        : "";
      const timeEnd = endAt
        ? new Date(endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago" })
        : "";

      const slotStatus = ts?.status || null;
      const capacityTotal = ts?.capacity_total ?? null;
      const capacityAvailable = ts?.capacity_available ?? null;

      let matchStatus: TimeSlotMatch["matchStatus"] = "no-slot";
      if (timeSlotId && ts) {
        if (slotStatus === "booked") {
          matchStatus = "linked";
        } else if (isDisco && capacityAvailable !== null && capacityTotal !== null && capacityAvailable < capacityTotal) {
          // Disco slot has had capacity reduced — it's synced
          matchStatus = "linked";
        } else if (!isDisco && slotStatus === "open") {
          matchStatus = "needs-sync";
        } else if (isDisco && capacityAvailable === capacityTotal) {
          matchStatus = "needs-sync";
        } else {
          matchStatus = "needs-sync";
        }
      }

      return {
        bookingId: b.id,
        customerName: name,
        cruiseDate,
        cruiseDateRaw: startAt || "",
        timeStart,
        timeEnd,
        headcount: b.headcount || 0,
        experience,
        boatName,
        isDisco,
        timeSlotId,
        slotStatus,
        capacityTotal,
        capacityAvailable,
        matchStatus,
      };
    }).sort((a, b) => a.cruiseDateRaw.localeCompare(b.cruiseDateRaw));
  }, [bookings]);

  // Group disco bookings by time_slot_id to get total ticket count per slot
  const discoSlotTotals = useMemo(() => {
    const totals: Record<string, { total: number; names: string[] }> = {};
    matches.filter(m => m.isDisco && m.timeSlotId).forEach(m => {
      if (!totals[m.timeSlotId!]) {
        totals[m.timeSlotId!] = { total: 0, names: [] };
      }
      totals[m.timeSlotId!].total += m.headcount;
      totals[m.timeSlotId!].names.push(m.customerName);
    });
    return totals;
  }, [matches]);

  const linkedCount = matches.filter(m => m.matchStatus === "linked").length;
  const needsSyncCount = matches.filter(m => m.matchStatus === "needs-sync").length;
  const noSlotCount = matches.filter(m => m.matchStatus === "no-slot").length;

  // Sync: call server-side edge function to update time_slot capacity/status
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-booking-slots", {
        body: { action: "sync" },
      });

      if (error) throw error;

      toast.success(`Synced ${data.updated} time slot(s) with the Quote Builder (${data.skipped} already synced)`);
      onSyncComplete?.();
    } catch (err) {
      console.error("Sync failed:", err);
      toast.error("Sync failed: " + (err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  // Fix double-bookings and remove duplicate time slots via server-side function
  const handleFixDoubleBookings = async () => {
    setFixingDupes(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-booking-slots", {
        body: { action: "fix-double-bookings" },
      });

      if (error) throw error;

      toast.success(`Fixed ${data.moved} double-booking(s), removed ${data.removed} duplicate slot(s)`);
      onSyncComplete?.();
    } catch (err) {
      console.error("Fix failed:", err);
      toast.error("Fix failed: " + (err as Error).message);
    } finally {
      setFixingDupes(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-slate-300 text-sm font-medium">Booking → Time Slot Matching</p>
          <p className="text-slate-500 text-xs">Shows how each booking maps to quote builder time slots.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white"
            onClick={handleFixDoubleBookings}
            disabled={fixingDupes || syncing}
          >
            {fixingDupes ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
            Fix Double Bookings & Duplicates
          </Button>
          {needsSyncCount > 0 && (
            <Button
              size="sm"
              className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white"
              onClick={handleSyncAll}
              disabled={syncing || fixingDupes}
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
              Sync {needsSyncCount} Slot{needsSyncCount !== 1 ? "s" : ""} Now
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-900/30 border border-emerald-600/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-300">{linkedCount}</div>
          <div className="text-xs text-emerald-400">Already Synced</div>
        </div>
        <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-300">{needsSyncCount}</div>
          <div className="text-xs text-amber-400">Needs Sync</div>
        </div>
        <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-300">{noSlotCount}</div>
          <div className="text-xs text-red-400">No Slot Link</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-600/50">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/70 border-b border-slate-600/50">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Customer</th>
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Cruise Date</th>
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Time</th>
              <th className="text-center text-xs font-semibold text-slate-300 px-3 py-2"># People</th>
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Experience</th>
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Boat</th>
              <th className="text-center text-xs font-semibold text-slate-300 px-3 py-2">Slot Status</th>
              <th className="text-left text-xs font-semibold text-slate-300 px-3 py-2">Quote Builder Impact</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m, i) => {
              const discoTotal = m.isDisco && m.timeSlotId ? discoSlotTotals[m.timeSlotId] : null;
              return (
                <tr key={m.bookingId} className={`border-b border-slate-700/50 ${i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-800/10"} hover:bg-slate-700/40`}>
                  <td className="px-3 py-2 font-medium text-white whitespace-nowrap text-xs">{m.customerName}</td>
                  <td className="px-3 py-2 text-slate-300 text-xs whitespace-nowrap">{m.cruiseDate}</td>
                  <td className="px-3 py-2 text-slate-300 text-xs whitespace-nowrap">{m.timeStart}{m.timeEnd ? ` – ${m.timeEnd}` : ""}</td>
                  <td className="px-3 py-2 text-slate-300 text-xs text-center">{m.headcount}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <span className={m.isDisco ? "text-purple-300" : "text-sky-300"}>{m.experience}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-300 text-xs whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Ship className="h-3 w-3 text-slate-500" />
                      {m.boatName || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {m.matchStatus === "linked" && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Synced
                      </Badge>
                    )}
                    {m.matchStatus === "needs-sync" && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Needs Sync
                      </Badge>
                    )}
                    {m.matchStatus === "no-slot" && (
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
                        No Slot
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.timeSlotId ? (
                      <div className="space-y-0.5">
                        {m.isDisco ? (
                          <>
                            <div className="text-slate-400">
                              Slot tickets: <span className="text-amber-300 font-bold">{discoTotal?.total || m.headcount}</span> / {m.capacityTotal || 100}
                            </div>
                            <div className="text-purple-400 text-[10px]">
                              Reduce capacity by {m.headcount} tickets
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-red-300 font-medium">
                              ✕ Block entire slot
                            </div>
                            <div className="text-slate-500 text-[10px]">Private cruise = full boat reserved</div>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">No time_slot_id on booking</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-xs text-slate-400 space-y-1">
        <p className="font-medium text-slate-300">How syncing works:</p>
        <p>• <strong className="text-purple-300">Disco cruises</strong>: reduces <code className="text-sky-300">capacity_available</code> by total ticket count for that slot.</p>
        <p>• <strong className="text-white">Private cruises</strong>: marks the slot as <code className="text-sky-300">booked</code> with 0 capacity — removes it from the Quote Builder.</p>
        <p>• <strong className="text-sky-300">Meeseeks &amp; The Irony</strong> are interchangeable 25-30 person boats. Booking one leaves the other available. A time slot only disappears when <strong>both</strong> are booked.</p>
        <p>• <strong className="text-amber-300">Day Tripper</strong> is the only 14-person boat. If double-booked, extras move to Meeseeks.</p>
        <p>• The Quote Builder only shows slots with <code className="text-sky-300">status = 'open'</code> and sufficient capacity.</p>
      </div>
    </div>
  );
}
