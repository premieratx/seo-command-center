import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Checkbox } from "@/quote-app/components/ui/checkbox";
import { Printer, X, Ship, CalendarDays, Users, Clock } from "lucide-react";
import { getAddonDetails, getPackageDetails, type AddonDetail } from "@/quote-app/lib/addonDetails";
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
}

interface SelectedItems {
  [bookingId: string]: {
    selected: boolean;
    // track which add-ons are enabled by index
    addOns: boolean[];
    // whether to include the package
    includePackage: boolean;
  };
}

export default function CruisePrepPrintDialog({ open, onOpenChange, bookings }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<SelectedItems>(() => {
    const init: SelectedItems = {};
    for (const b of bookings) {
      init[b.id] = {
        selected: true,
        addOns: b.addOns.map(() => true),
        includePackage: !!b.packageDetail,
      };
    }
    return init;
  });

  // Re-init when bookings change
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
  }, [bookings]);

  // On open, reset
  const handleOpenChange = (o: boolean) => {
    if (o) resetItems();
    onOpenChange(o);
  };

  const toggleBooking = (id: string) => {
    setItems(prev => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id]?.selected },
    }));
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

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Cruise Prep Sheet</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
            .booking-card { page-break-inside: avoid; border: 1px solid #d4d4d4; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .booking-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
            .customer-name { font-size: 18px; font-weight: 700; }
            .boat-badge { background: #e0f2fe; color: #0369a1; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
            .meta { display: flex; gap: 16px; font-size: 13px; color: #555; margin-bottom: 12px; }
            .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 12px 0 6px; }
            .addon-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
            .addon-price { color: #16a34a; font-weight: 600; margin-left: 8px; font-size: 13px; }
            .item-list { list-style: disc; padding-left: 20px; margin-bottom: 10px; }
            .item-list li { font-size: 13px; color: #444; margin-bottom: 2px; }
            .sub-item { margin-left: 16px; color: #777; }
            @media print { body { padding: 12px; } .booking-card { border: 1px solid #ccc; } }
          </style>
        </head>
        <body>
          ${printContent}
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const selectedBookings = bookings.filter(b => items[b.id]?.selected);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-300 flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Cruise Prep Sheets
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-400 -mt-1">Select clients and toggle packages/add-ons to include.</p>

        {/* Client selection */}
        <div className="space-y-2 mt-2">
          {bookings.map(b => {
            const item = items[b.id];
            if (!item) return null;
            const isSelected = item.selected;

            return (
              <div key={b.id} className={`rounded-lg border transition-colors ${isSelected ? "border-amber-500/40 bg-slate-700/60" : "border-slate-600/30 bg-slate-800/40 opacity-50"}`}>
                {/* Client row */}
                <div className="flex items-center gap-3 p-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleBooking(b.id)}
                    className="border-slate-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
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

                {/* Package & add-on toggles */}
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
                        {addon.unitPrice === 0 && <span className="text-emerald-400 ml-1">Free</span>}
                        {addon.unitPrice > 0 && <span className="text-emerald-400 ml-1">${(addon.unitPrice * addon.quantity).toFixed(0)}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Print button */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-600/50">
          <span className="text-xs text-slate-400">{selectedBookings.length} of {bookings.length} selected</span>
          <Button
            onClick={handlePrint}
            disabled={selectedBookings.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        {/* Hidden printable content */}
        <div ref={printRef} className="hidden">
          {selectedBookings.map(b => {
            const item = items[b.id];
            if (!item) return null;

            const pkgDetail = item.includePackage ? b.packageDetail : null;
            const enabledAddOns = b.addOns.filter((_, idx) => item.addOns[idx]);

            return (
              <div key={b.id} className="booking-card">
                <div className="booking-header">
                  <span className="customer-name">{b.customerName}</span>
                  <span className="boat-badge">{b.boatName}</span>
                </div>
                <div className="meta">
                  <span>📅 {b.dateStr}</span>
                  <span>🕐 {b.startTime} – {b.endTime}</span>
                  <span>👥 {b.headcount}</span>
                </div>

                {pkgDetail && (
                  <>
                    <div className="section-label">Package: {b.packageType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                    <ul className="item-list">
                      {pkgDetail.items.map((it, i) => (
                        <li key={i} className={it.startsWith("—") ? "sub-item" : ""}>{it}</li>
                      ))}
                    </ul>
                  </>
                )}

                {enabledAddOns.length > 0 && (
                  <>
                    <div className="section-label">Add-Ons</div>
                    {enabledAddOns.map((addon, idx) => {
                      const detail = getAddonDetails(addon.name);
                      return (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <div className="addon-title">
                            {addon.name}
                            {addon.quantity > 1 && ` ×${addon.quantity}`}
                            <span className="addon-price">
                              {addon.unitPrice === 0 ? "Free" : `$${(addon.unitPrice * addon.quantity).toFixed(0)}`}
                            </span>
                          </div>
                          {detail && (
                            <ul className="item-list">
                              {detail.items.map((it, i) => (
                                <li key={i} className={it.startsWith("—") ? "sub-item" : ""}>{it}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {!pkgDetail && enabledAddOns.length === 0 && (
                  <p style={{ fontSize: 13, color: "#999" }}>No packages or add-ons selected for print.</p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
