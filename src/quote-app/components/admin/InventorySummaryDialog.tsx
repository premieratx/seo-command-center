import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Checkbox } from "@/quote-app/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";
import { Package, Printer, Ship, CalendarDays, Users, Clock } from "lucide-react";
import { aggregateInventory, type AddonDetail } from "@/quote-app/lib/addonDetails";
import type { ParsedAddOn } from "@/quote-app/lib/xolaAddOns";

interface PrepBooking {
  id: string;
  customerName: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  headcount: number;
  boatName: string;
  packageType: string;
  addOns: ParsedAddOn[];
  packageDetail: AddonDetail | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: PrepBooking[];
  daysAhead: number;
}

interface SelectedItems {
  [bookingId: string]: {
    selected: boolean;
    addOns: boolean[];
    includePackage: boolean;
  };
}

export default function InventorySummaryDialog({ open, onOpenChange, bookings, daysAhead }: Props) {
  const [items, setItems] = useState<SelectedItems>({});
  const [viewMode, setViewMode] = useState<"total" | "by-person">("total");
  const [generated, setGenerated] = useState(false);

  const resetItems = useCallback(() => {
    const init: SelectedItems = {};
    for (const b of bookings) {
      init[b.id] = {
        selected: true,
        addOns: b.addOns.map(() => true),
        includePackage: !!b.packageDetail,
      };
    }
    setItems(init);
    setGenerated(false);
  }, [bookings]);

  const handleOpenChange = (o: boolean) => {
    if (o) resetItems();
    onOpenChange(o);
  };

  const toggleBooking = (id: string) => {
    setItems(prev => ({ ...prev, [id]: { ...prev[id], selected: !prev[id]?.selected } }));
  };

  const toggleAddon = (bookingId: string, idx: number) => {
    setItems(prev => {
      const cur = { ...prev[bookingId] };
      const addOns = [...cur.addOns];
      addOns[idx] = !addOns[idx];
      return { ...prev, [bookingId]: { ...cur, addOns } };
    });
  };

  const togglePackage = (bookingId: string) => {
    setItems(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], includePackage: !prev[bookingId]?.includePackage },
    }));
  };

  const selectedBookings = bookings.filter(b => items[b.id]?.selected);

  // Total inventory across all selected
  const totalInventory = useMemo(() => {
    const allAddOns: { name: string; quantity: number }[] = [];
    const packageTypes: string[] = [];

    for (const b of selectedBookings) {
      const item = items[b.id];
      if (!item) continue;
      for (let i = 0; i < b.addOns.length; i++) {
        if (item.addOns[i]) {
          allAddOns.push({ name: b.addOns[i].name, quantity: b.addOns[i].quantity });
        }
      }
      if (item.includePackage && b.packageDetail) {
        packageTypes.push(b.packageType);
      }
    }

    const inventory = aggregateInventory(allAddOns);
    for (const pt of packageTypes) {
      const pkgInv = aggregateInventory([], pt);
      for (const [itm, qty] of pkgInv) {
        inventory.set(itm, (inventory.get(itm) || 0) + qty);
      }
    }
    return inventory;
  }, [selectedBookings, items]);

  // Per-person inventory
  const perPersonInventory = useMemo(() => {
    return selectedBookings.map(b => {
      const item = items[b.id];
      if (!item) return { booking: b, inventory: new Map<string, number>() };
      const addOns: { name: string; quantity: number }[] = [];
      for (let i = 0; i < b.addOns.length; i++) {
        if (item.addOns[i]) addOns.push({ name: b.addOns[i].name, quantity: b.addOns[i].quantity });
      }
      const inv = aggregateInventory(addOns, item.includePackage ? b.packageType : undefined);
      return { booking: b, inventory: inv };
    });
  }, [selectedBookings, items]);

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;

    let body = "";
    if (viewMode === "total") {
      body += `<h2 style="margin-bottom:12px;">Inventory Summary — Next ${daysAhead} Days (${selectedBookings.length} cruise${selectedBookings.length !== 1 ? "s" : ""})</h2>`;
      body += `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;border-bottom:2px solid #ccc;padding:6px;">Item</th><th style="text-align:right;border-bottom:2px solid #ccc;padding:6px;">Qty</th></tr></thead><tbody>`;
      for (const [itm, qty] of Array.from(totalInventory.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        body += `<tr><td style="padding:4px 6px;border-bottom:1px solid #eee;">${itm}</td><td style="text-align:right;padding:4px 6px;border-bottom:1px solid #eee;font-weight:700;">${qty}</td></tr>`;
      }
      body += `</tbody></table>`;
    } else {
      for (const { booking: b, inventory: inv } of perPersonInventory) {
        if (inv.size === 0) continue;
        body += `<div style="page-break-inside:avoid;border:1px solid #d4d4d4;border-radius:8px;padding:16px;margin-bottom:16px;">`;
        body += `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><strong style="font-size:16px;">${b.customerName}</strong><span style="background:#e0f2fe;color:#0369a1;padding:2px 10px;border-radius:12px;font-size:12px;">${b.boatName}</span></div>`;
        body += `<div style="font-size:13px;color:#555;margin-bottom:8px;">📅 ${b.dateStr} &nbsp; 🕐 ${b.startTime}–${b.endTime} &nbsp; 👥 ${b.headcount}</div>`;
        body += `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;border-bottom:1px solid #ccc;padding:4px;font-size:13px;">Item</th><th style="text-align:right;border-bottom:1px solid #ccc;padding:4px;font-size:13px;">Qty</th></tr></thead><tbody>`;
        for (const [itm, qty] of Array.from(inv.entries()).sort(([a], [b]) => a.localeCompare(b))) {
          body += `<tr><td style="padding:3px 4px;font-size:13px;">${itm}</td><td style="text-align:right;padding:3px 4px;font-size:13px;font-weight:600;">${qty}</td></tr>`;
        }
        body += `</tbody></table></div>`;
      }
    }

    win.document.write(`<html><head><title>Inventory Summary</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',system-ui,sans-serif;padding:24px;color:#1a1a1a;}@media print{body{padding:12px;}}</style></head><body>${body}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-300 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Generate Inventory Summary
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-400 -mt-1">Select cruises and toggle packages/add-ons to include in inventory.</p>

        {/* Booking selection */}
        <div className="space-y-2 mt-2">
          {bookings.map(b => {
            const item = items[b.id];
            if (!item) return null;
            const isSelected = item.selected;

            return (
              <div key={b.id} className={`rounded-lg border transition-colors ${isSelected ? "border-emerald-500/40 bg-slate-700/60" : "border-slate-600/30 bg-slate-800/40 opacity-50"}`}>
                <div className="flex items-center gap-3 p-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleBooking(b.id)}
                    className="border-slate-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-white truncate">{b.customerName}</span>
                      <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Ship className="h-3 w-3" />{b.boatName}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{b.dateStr}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.startTime}–{b.endTime}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{b.headcount}</span>
                    </div>
                  </div>
                </div>

                {isSelected && (b.packageDetail || b.addOns.length > 0) && (
                  <div className="border-t border-slate-600/30 px-3 pb-3 pt-2 space-y-1.5">
                    {b.packageDetail && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-700/40 rounded px-1.5 py-1 -mx-1.5">
                        <Checkbox
                          checked={item.includePackage}
                          onCheckedChange={() => togglePackage(b.id)}
                          className="border-slate-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-3.5 w-3.5"
                        />
                        <span className="text-amber-300 font-medium">
                          {b.packageType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </label>
                    )}
                    {b.addOns.map((addon, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-700/40 rounded px-1.5 py-1 -mx-1.5">
                        <Checkbox
                          checked={item.addOns[idx]}
                          onCheckedChange={() => toggleAddon(b.id, idx)}
                          className="border-slate-500 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 h-3.5 w-3.5"
                        />
                        <span className="text-purple-300">{addon.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* View mode + actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-600/50">
          <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as "total" | "by-person")} className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="total" id="inv-total" />
              <Label htmlFor="inv-total" className="text-xs text-slate-300 cursor-pointer">Total Needs</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="by-person" id="inv-person" />
              <Label htmlFor="inv-person" className="text-xs text-slate-300 cursor-pointer">By Person</Label>
            </div>
          </RadioGroup>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGenerated(true)}
              disabled={selectedBookings.length === 0}
              className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            >
              Generate
            </Button>
          </div>
        </div>

        {/* Generated inventory display */}
        {generated && selectedBookings.length > 0 && (
          <div className="mt-3 space-y-3">
            {viewMode === "total" ? (
              <div className="bg-slate-700/50 rounded-lg border border-emerald-500/30 p-4">
                <h3 className="text-emerald-300 font-bold text-sm flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" />
                  Total Inventory — Next {daysAhead} Days ({selectedBookings.length} cruise{selectedBookings.length !== 1 ? "s" : ""})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from(totalInventory.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([itm, qty]) => (
                      <div key={itm} className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-1.5">
                        <span className="text-sm text-slate-300">{itm}</span>
                        <span className="text-sm font-bold text-emerald-300 ml-2">{qty}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              perPersonInventory.filter(p => p.inventory.size > 0).map(({ booking: b, inventory: inv }) => (
                <div key={b.id} className="bg-slate-700/50 rounded-lg border border-sky-500/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{b.customerName}</span>
                    <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full">{b.boatName}</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {b.dateStr} · {b.startTime}–{b.endTime} · {b.headcount} guests
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {Array.from(inv.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([itm, qty]) => (
                        <div key={itm} className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-1">
                          <span className="text-xs text-slate-300">{itm}</span>
                          <span className="text-xs font-bold text-sky-300 ml-2">{qty}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Inventory
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
