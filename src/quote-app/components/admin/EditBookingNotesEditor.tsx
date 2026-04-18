import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Button } from "@/quote-app/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface AddOnItem {
  name: string;
  price: number;
  quantity: number;
}

interface ParsedNotes {
  xolaBookingId: string;
  experience: string;
  ticketPrice: string;
  ticketCount: string;
  discountAmount: string;
  tax: string;
  gratuity: string;
  serviceFee: string;
  adjustment: string;
  addOns: AddOnItem[];
  freeAddOns: string[]; // comma-separated legacy add-ons
  rawExtra: string; // anything we couldn't parse
}

function parseNotesString(notes: string): ParsedNotes {
  const result: ParsedNotes = {
    xolaBookingId: "",
    experience: "",
    ticketPrice: "",
    ticketCount: "",
    discountAmount: "",
    tax: "",
    gratuity: "",
    serviceFee: "",
    adjustment: "",
    addOns: [],
    freeAddOns: [],
    rawExtra: "",
  };

  if (!notes) return result;

  // Split by pipe
  const segments = notes.split("|").map((s) => s.trim());
  const unmatched: string[] = [];

  for (const seg of segments) {
    if (/^Xola Booking ID:\s*/i.test(seg)) {
      result.xolaBookingId = seg.replace(/^Xola Booking ID:\s*/i, "").trim();
    } else if (/^Experience:\s*/i.test(seg)) {
      result.experience = seg.replace(/^Experience:\s*/i, "").trim();
    } else if (/^Ticket Price:\s*/i.test(seg)) {
      result.ticketPrice = seg.replace(/^Ticket Price:\s*/i, "").trim();
    } else if (/^Ticket Count:\s*/i.test(seg)) {
      result.ticketCount = seg.replace(/^Ticket Count:\s*/i, "").trim();
    } else if (/^Discount Amount:\s*/i.test(seg)) {
      result.discountAmount = seg.replace(/^Discount Amount:\s*/i, "").trim();
    } else if (/^Tax:\s*/i.test(seg)) {
      result.tax = seg.replace(/^Tax:\s*/i, "").trim();
    } else if (/^Gratuity:\s*/i.test(seg)) {
      result.gratuity = seg.replace(/^Gratuity:\s*/i, "").trim();
    } else if (/^Service Fee:\s*/i.test(seg)) {
      result.serviceFee = seg.replace(/^Service Fee:\s*/i, "").trim();
    } else if (/^Adjustment\s*\(.*?\):\s*/i.test(seg)) {
      result.adjustment = seg.replace(/^Adjustment\s*\(.*?\):\s*/i, "").trim();
    } else if (/^Add-On:\s*/i.test(seg)) {
      const raw = seg.replace(/^Add-On:\s*/i, "").trim();
      const m = raw.match(/^(.+?)\s+x(\d+)\s*@\s*\$?([\d.]+)$/i);
      if (m) {
        result.addOns.push({
          name: m[1].trim(),
          quantity: parseInt(m[2]) || 1,
          price: parseFloat(m[3]) || 0,
        });
      } else {
        result.addOns.push({ name: raw, quantity: 1, price: 0 });
      }
    } else if (/^(?!Paid\s)Add-ons:\s*/i.test(seg)) {
      const items = seg.replace(/^Add-ons:\s*/i, "").split(",").map((s) => s.trim()).filter(Boolean);
      result.freeAddOns = items;
    } else if (/^Paid Add-Ons:\s*/i.test(seg)) {
      const entries = seg.replace(/^Paid Add-Ons:\s*/i, "").split(",").map((s) => s.trim()).filter(Boolean);
      for (const entry of entries) {
        const colonMatch = entry.match(/^(.+?):(\d+\.?\d*)$/);
        if (colonMatch) {
          result.addOns.push({
            name: colonMatch[1].trim(),
            quantity: 1,
            price: parseFloat(colonMatch[2]) || 0,
          });
        }
      }
    } else if (seg) {
      unmatched.push(seg);
    }
  }

  result.rawExtra = unmatched.join(" | ");
  return result;
}

function buildNotesString(parsed: ParsedNotes): string {
  const parts: string[] = [];

  if (parsed.xolaBookingId) parts.push(`Xola Booking ID: ${parsed.xolaBookingId}`);
  if (parsed.experience) parts.push(`Experience: ${parsed.experience}`);
  if (parsed.freeAddOns.length > 0) parts.push(`Add-ons: ${parsed.freeAddOns.join(",")}`);
  
  for (const addon of parsed.addOns) {
    parts.push(`Add-On: ${addon.name} x${addon.quantity} @ ${addon.price}`);
  }

  if (parsed.ticketPrice) parts.push(`Ticket Price: ${parsed.ticketPrice}`);
  if (parsed.ticketCount) parts.push(`Ticket Count: ${parsed.ticketCount}`);
  if (parsed.discountAmount) parts.push(`Discount Amount: ${parsed.discountAmount}`);
  if (parsed.tax) parts.push(`Tax: ${parsed.tax}`);
  if (parsed.gratuity) parts.push(`Gratuity: ${parsed.gratuity}`);
  if (parsed.serviceFee) parts.push(`Service Fee: ${parsed.serviceFee}`);
  if (parsed.adjustment) parts.push(`Adjustment (Stripe Booking): ${parsed.adjustment}`);
  if (parsed.rawExtra) parts.push(parsed.rawExtra);

  return parts.join(" | ");
}

interface EditBookingNotesEditorProps {
  notes: string;
  onChange: (notes: string) => void;
}

export const EditBookingNotesEditor = ({ notes, onChange }: EditBookingNotesEditorProps) => {
  const [parsed, setParsed] = useState<ParsedNotes>(() => parseNotesString(notes));
  const [showRaw, setShowRaw] = useState(false);
  const [rawNotes, setRawNotes] = useState(notes);
  const lastPropNotes = useRef(notes);
  const isInternalChange = useRef(false);

  // Sync from parent only when the prop actually changes externally
  useEffect(() => {
    if (notes !== lastPropNotes.current) {
      lastPropNotes.current = notes;
      if (!isInternalChange.current) {
        setParsed(parseNotesString(notes));
        setRawNotes(notes);
      }
      isInternalChange.current = false;
    }
  }, [notes]);

  const emitChange = useCallback((nextParsed: ParsedNotes) => {
    if (showRaw) return;
    const nextNotes = buildNotesString(nextParsed);
    isInternalChange.current = true;
    lastPropNotes.current = nextNotes;
    onChange(nextNotes);
  }, [showRaw, onChange]);

  const updateField = (field: keyof ParsedNotes, value: string) => {
    setParsed((prev) => {
      const next = { ...prev, [field]: value };
      emitChange(next);
      return next;
    });
  };

  const updateAddOn = (index: number, field: keyof AddOnItem, value: string | number) => {
    setParsed((prev) => {
      const newAddOns = [...prev.addOns];
      newAddOns[index] = { ...newAddOns[index], [field]: value };
      const next = { ...prev, addOns: newAddOns };
      emitChange(next);
      return next;
    });
  };

  const addNewAddOn = () => {
    setParsed((prev) => {
      const next = { ...prev, addOns: [...prev.addOns, { name: "", quantity: 1, price: 0 }] };
      emitChange(next);
      return next;
    });
  };

  const removeAddOn = (index: number) => {
    setParsed((prev) => {
      const next = { ...prev, addOns: prev.addOns.filter((_, i) => i !== index) };
      emitChange(next);
      return next;
    });
  };

  const addFreeAddOn = () => {
    setParsed((prev) => {
      const next = { ...prev, freeAddOns: [...prev.freeAddOns, ""] };
      emitChange(next);
      return next;
    });
  };

  const updateFreeAddOn = (index: number, value: string) => {
    setParsed((prev) => {
      const updated = [...prev.freeAddOns];
      updated[index] = value;
      const next = { ...prev, freeAddOns: updated };
      emitChange(next);
      return next;
    });
  };

  const removeFreeAddOn = (index: number) => {
    setParsed((prev) => {
      const next = { ...prev, freeAddOns: prev.freeAddOns.filter((_, i) => i !== index) };
      emitChange(next);
      return next;
    });
  };

  if (showRaw) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Raw Notes</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange(rawNotes);
              setParsed(parseNotesString(rawNotes));
              setShowRaw(false);
            }}
          >
            Switch to Structured
          </Button>
        </div>
        <textarea
          value={rawNotes}
          onChange={(e) => {
            setRawNotes(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Booking Details</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRawNotes(buildNotesString(parsed));
            setShowRaw(true);
          }}
        >
          Edit Raw Notes
        </Button>
      </div>

      {/* Reference Info (read-only-ish) */}
      <div className="grid grid-cols-2 gap-3">
        {parsed.xolaBookingId && (
          <div>
            <Label className="text-xs text-muted-foreground">Xola Booking ID</Label>
            <Input
              value={parsed.xolaBookingId}
              onChange={(e) => updateField("xolaBookingId", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}
        {parsed.experience && (
          <div>
            <Label className="text-xs text-muted-foreground">Experience</Label>
            <Input
              value={parsed.experience}
              onChange={(e) => updateField("experience", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Pricing Fields */}
      <div className="border rounded-lg p-3 space-y-3">
        <Label className="text-sm font-medium">Pricing</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Ticket Price ($)</Label>
            <Input
              value={parsed.ticketPrice}
              onChange={(e) => updateField("ticketPrice", e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. 95"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ticket Count</Label>
            <Input
              value={parsed.ticketCount}
              onChange={(e) => updateField("ticketCount", e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. 1 (flat rate)"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Discount Amount ($)</Label>
            <Input
              value={parsed.discountAmount}
              onChange={(e) => updateField("discountAmount", e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. 150"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Adjustment ($)</Label>
            <Input
              value={parsed.adjustment}
              onChange={(e) => updateField("adjustment", e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. -50"
            />
          </div>
        </div>
      </div>

      {/* Tax, Tip & Fees */}
      <div className="border rounded-lg p-3 space-y-3">
        <Label className="text-sm font-medium">Tax, Tip & Fees</Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Sales Tax (8.25%)</Label>
            <Input
              value={parsed.tax}
              onChange={(e) => updateField("tax", e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. 30.94"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tip (20%)</Label>
            <Input
              value={parsed.gratuity}
              onChange={(e) => updateField("gratuity", e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. 83"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Service Fee (3%)</Label>
            <Input
              value={parsed.serviceFee}
              onChange={(e) => updateField("serviceFee", e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. 14.94"
            />
          </div>
        </div>
      </div>

      {/* Paid Add-Ons */}
      <div className="border rounded-lg p-3 space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Paid Add-Ons</Label>
          <Button type="button" variant="outline" size="sm" onClick={addNewAddOn}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        {parsed.addOns.length === 0 && (
          <p className="text-xs text-muted-foreground">No paid add-ons</p>
        )}
        {parsed.addOns.map((addon, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={addon.name}
                onChange={(e) => updateAddOn(i, "name", e.target.value)}
                className="h-8 text-sm"
                placeholder="e.g. Groom Sparkle Package"
              />
            </div>
            <div className="w-16">
              <Label className="text-xs text-muted-foreground">Qty</Label>
              <Input
                type="number"
                min="1"
                value={addon.quantity}
                onChange={(e) => updateAddOn(i, "quantity", parseInt(e.target.value) || 1)}
                className="h-8 text-sm"
              />
            </div>
            <div className="w-24">
              <Label className="text-xs text-muted-foreground">Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={addon.price}
                onChange={(e) => updateAddOn(i, "price", parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive"
              onClick={() => removeAddOn(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Free Add-Ons */}
      <div className="border rounded-lg p-3 space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Free / Included Add-Ons</Label>
          <Button type="button" variant="outline" size="sm" onClick={addFreeAddOn}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        {parsed.freeAddOns.length === 0 && (
          <p className="text-xs text-muted-foreground">No free add-ons</p>
        )}
        {parsed.freeAddOns.map((item, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                value={item}
                onChange={(e) => updateFreeAddOn(i, e.target.value)}
                className="h-8 text-sm"
                placeholder="e.g. $50 POD Voucher"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive"
              onClick={() => removeFreeAddOn(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Extra notes */}
      {parsed.rawExtra && (
        <div>
          <Label className="text-xs text-muted-foreground">Other Notes</Label>
          <Input
            value={parsed.rawExtra}
            onChange={(e) => updateField("rawExtra", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      )}
    </div>
  );
};
