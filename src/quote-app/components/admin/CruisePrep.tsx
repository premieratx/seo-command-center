import { useState, useMemo } from "react";
import { CalendarDays, Clock, Users, ChevronDown, ChevronUp, Package, Ship, Info, Printer, RotateCcw } from "lucide-react";
import CruisePrepPrintDialog from "./CruisePrepPrintDialog";
import InventorySummaryDialog from "./InventorySummaryDialog";
import { Button } from "@/quote-app/components/ui/button";
import { Badge } from "@/quote-app/components/ui/badge";

import { Input } from "@/quote-app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/quote-app/components/ui/dialog";
import { parseAddOnsFromNotes, type ParsedAddOn } from "@/quote-app/lib/xolaAddOns";
import { getAddonDetails, getPackageDetails, type AddonDetail } from "@/quote-app/lib/addonDetails";
import { formatTimeCSTFull } from "@/quote-app/lib/utils";
import { addDays } from "date-fns";

interface CruisePrepProps {
  bookings: any[];
}

interface PrepBooking {
  id: string;
  customerName: string;
  date: Date;
  dateStr: string;
  startTime: string;
  endTime: string;
  headcount: number;
  boatName: string;
  experienceType: string;
  packageType: string;
  addOns: ParsedAddOn[];
  packageDetail: AddonDetail | null;
}

const HIDDEN_ADDON_PATTERNS = [
  /alcohol\s*delivery/i,
  /super\s*sparkle?\s*(package\s*inclusions|disco\s*package)/i,
  /concierge\s*delivery\s*service/i,
  /fetii\s*ride/i,
  /party\s*on\s*delivery/i,
  /\$?\s*50\s*POD\s*voucher/i,
  /\$?\s*100\s*concierge\s*package/i,
  /POD\s*voucher/i,
  /concierge\s*package/i,
  /what.?s\s*the\s*average\s*age/i,
  /what\s*kind\s*of\s*party/i,
];

export const CruisePrep = ({ bookings }: CruisePrepProps) => {
  const [daysAhead, setDaysAhead] = useState(7);
  const [detailAddon, setDetailAddon] = useState<AddonDetail | null>(null);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [printOpen, setPrintOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const prepBookings = useMemo<PrepBooking[]>(() => {
    const now = new Date();
    const cutoff = addDays(now, daysAhead);

    return bookings
      .filter((b: any) => {
        if (!b.time_slot?.start_at) return false;
        if (b.status === 'cancelled' || b.status === 'refunded') return false;
        const d = new Date(b.time_slot.start_at);
        return d >= now && d <= cutoff;
      })
      .map((b: any) => {
        const startDate = new Date(b.time_slot.start_at);
        const addOnsRaw = parseAddOnsFromNotes(b.notes);
        const addOns = addOnsRaw.filter(a => !HIDDEN_ADDON_PATTERNS.some(p => p.test(a.name)));
        
        // Also extract package_type as an "add-on" if it's a named package
        const pkgDetail = getPackageDetails(b.package_type || "");

        return {
          id: b.id,
          customerName: b.customer?.name || "Guest",
          date: startDate,
          dateStr: startDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "America/Chicago",
          }),
          startTime: formatTimeCSTFull(b.time_slot.start_at),
          endTime: formatTimeCSTFull(b.time_slot.end_at),
          headcount: b.headcount,
          boatName: b.time_slot?.boat?.name || "TBD",
          experienceType: b.time_slot?.experience?.type || "",
          packageType: b.package_type || "",
          addOns,
          packageDetail: pkgDetail,
        } as PrepBooking;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bookings, daysAhead]);

  const resetTimeline = () => setDaysAhead(7);

  const toggleExpanded = (id: string) => {
    setExpandedBookings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-slate-400 text-sm">Upcoming cruises and what needs to be prepared.</p>
        <div className="flex items-center gap-3">
          {prepBookings.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1.5"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
                onClick={() => setInventoryOpen(true)}
              >
                <Package className="h-3.5 w-3.5" />
                Inventory
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-400 hover:text-white gap-1"
            onClick={resetTimeline}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <span className="text-xs text-slate-400">Next</span>
          <Input
            type="number"
            min={1}
            max={90}
            value={daysAhead}
            onChange={e => setDaysAhead(Math.max(1, Math.min(90, parseInt(e.target.value) || 7)))}
            className="w-16 h-7 text-xs bg-slate-700/50 border-slate-600 text-white text-center"
          />
          <span className="text-xs text-slate-400">days</span>
        </div>
      </div>

      {prepBookings.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-8">No cruises in the next {daysAhead} days.</p>
      )}

      {/* Booking cards */}
      <div className="space-y-3">
        {prepBookings.map((pb) => {
          const isExpanded = expandedBookings.has(pb.id);
          const allItems = [...pb.addOns.map(a => ({ name: a.name, isPkg: false }))];
          if (pb.packageDetail) {
            allItems.unshift({ name: pb.packageType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), isPkg: true });
          }

          return (
            <div key={pb.id} className="bg-slate-700/50 rounded-lg border border-slate-600/50 overflow-hidden">
              {/* Header */}
              <div
                className="p-3 cursor-pointer hover:bg-slate-700/70 transition-colors"
                onClick={() => toggleExpanded(pb.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base text-white">{pb.customerName}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs">
                      <Ship className="h-3 w-3 mr-1" />
                      {pb.boatName}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-1">
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {pb.dateStr}
                  </span>
                  <span className="text-sky-200 text-xs flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {pb.startTime} – {pb.endTime}
                  </span>
                  <span className="text-white font-semibold text-sm flex items-center gap-0.5">
                    <Users className="h-3.5 w-3.5 text-sky-400" />
                    {pb.headcount}
                  </span>
                </div>

                {/* Add-on badges */}
                {allItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {allItems.map((item, idx) => (
                      <Badge
                        key={idx}
                        className={`text-xs font-medium cursor-pointer hover:opacity-80 ${
                          item.isPkg
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const detail = item.isPkg
                            ? getPackageDetails(pb.packageType)
                            : getAddonDetails(item.name);
                          if (detail) setDetailAddon(detail);
                        }}
                      >
                        <Info className="h-3 w-3 mr-1" />
                        {item.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-600/50 p-3 bg-slate-800/30 space-y-3">
                  {/* Package detail */}
                  {pb.packageDetail && (
                    <div>
                      <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
                        Package: {pb.packageType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <ul className="text-xs text-slate-300 space-y-0.5 ml-3">
                        {pb.packageDetail.items.map((item, i) => (
                          <li key={i} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Add-on details */}
                  {pb.addOns.length > 0 && (
                    <div>
                      <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">Add-Ons</p>
                      {pb.addOns.map((addon, idx) => {
                        const detail = getAddonDetails(addon.name);
                        return (
                          <div key={idx} className="mb-2">
                            <p className="text-sm text-slate-200 font-medium">
                              {addon.name}
                              {addon.quantity > 1 && <span className="text-slate-400 ml-1">×{addon.quantity}</span>}
                              {addon.unitPrice > 0 && <span className="text-emerald-400 ml-2">${(addon.unitPrice * addon.quantity).toFixed(0)}</span>}
                              {addon.unitPrice === 0 && <span className="text-sky-400 ml-2">Free</span>}
                            </p>
                            {detail && (
                              <ul className="text-xs text-slate-400 space-y-0.5 ml-3 mt-0.5">
                                {detail.items.map((item, i) => (
                                  <li key={i} className="list-disc">{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {allItems.length === 0 && (
                    <p className="text-xs text-slate-500">No add-ons or packages for this booking.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add-on Detail Dialog */}
      <Dialog open={!!detailAddon} onOpenChange={(open) => { if (!open) setDetailAddon(null); }}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-300">{detailAddon?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">{detailAddon?.description}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 mt-2">
            {detailAddon?.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="text-amber-400 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <CruisePrepPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        bookings={prepBookings}
      />

      <InventorySummaryDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        bookings={prepBookings}
        daysAhead={daysAhead}
      />
    </div>
  );
};
