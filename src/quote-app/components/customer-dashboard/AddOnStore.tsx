import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Switch } from "@/quote-app/components/ui/switch";
import { Badge } from "@/quote-app/components/ui/badge";
import { Separator } from "@/quote-app/components/ui/separator";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, ShoppingCart, Plus, Minus, CheckCircle } from "lucide-react";
import { toast } from "sonner";

// Party/experience photos for add-on thumbnails
import discoFunBest from "@/quote-app/assets/party/disco_fun_best2.jpg";
import discoWigs from "@/quote-app/assets/party/disco_wigs.jpg";
import unicornPic from "@/quote-app/assets/party/unicorn_pic.jpg";
import groupPic from "@/quote-app/assets/party/Group_Pic_6_22.jpg";
import djPic from "@/quote-app/assets/party/DJ_Pic.jpg";
import discoFun27 from "@/quote-app/assets/party/disco_fun_27.jpg";
import discoFun28 from "@/quote-app/assets/party/disco_fun_28.jpg";
import discoFun29 from "@/quote-app/assets/party/disco_fun29.jpg";
import discoFun from "@/quote-app/assets/party/disco_fun_first.jpg";
import imgGlam from "@/quote-app/assets/party/IMG_7635.jpg";

export interface AddOnItem {
  id: string;
  name: string;
  price: number;
  image: string;
  type: "toggle" | "quantity";
  description?: string;
  maxQty?: number;
}

const discoAddOns: AddOnItem[] = [
  { id: "sparkle-package", name: "Disco Sparkle Package", price: 100, image: discoFunBest.src, type: "toggle", description: "Disco ball cups, necklaces, bubble guns, flags, personal unicorn floats & more" },
  { id: "mimosa-cooler", name: "Mimosa Party Cooler", price: 100, image: discoFun27.src, type: "toggle", description: "Extra cooler with ice, 3 fruit juices, champagne flutes, Chambong & bubble wands" },
  { id: "disco-ball-cups-5", name: "5 Disco Ball Cups", price: 40, image: discoFun28.src, type: "quantity", maxQty: 10 },
];

const privateAddOns: AddOnItem[] = [
  { id: "ultimate-50", name: "Ultimate Disco Package + Pre-Party Setup (50 People)", price: 350, image: discoFunBest.src, type: "quantity", maxQty: 3, description: "Premium decorations, party games & special amenities for up to 50 guests" },
  { id: "essentials-50", name: "Essentials Package + Pre-Party Setup (50 People)", price: 200, image: discoFun29.src, type: "quantity", maxQty: 3, description: "Decorations and party supplies for up to 50 guests" },
  { id: "additional-25-guests", name: "Additional 1 to 25 Guests", price: 400, image: groupPic.src, type: "toggle", description: "Expand your cruise to accommodate 25 more guests" },
  { id: "photographer", name: "Professional Photographer", price: 600, image: imgGlam.src, type: "toggle", description: "Professional photos of your entire cruise experience" },
  { id: "dj", name: "Professional DJ", price: 600, image: djPic.src, type: "toggle", description: "Live DJ to keep the party going the entire cruise" },
  { id: "bartender", name: "Bartender", price: 600, image: discoFun27.src, type: "quantity", maxQty: 3, description: "Professional bartender service" },
  { id: "party-cooler-setup", name: "Party-Cooler Setup", price: 150, image: discoFun28.src, type: "quantity", maxQty: 5, description: "Pre-stocked cooler setup for your group" },
  { id: "mimosa-cooler-pvt", name: "Mimosa Party Cooler", price: 100, image: discoFun27.src, type: "toggle", description: "Extra cooler with ice, 3 fruit juices, champagne flutes & Chambong" },
  { id: "lily-pad", name: "Lily Pad Float", price: 50, image: unicornPic.src, type: "quantity", maxQty: 5, description: "Giant 6'x20' lily pad float for swimming" },
  { id: "disco-ball-cups-pvt", name: "5 Disco Ball Cups", price: 30, image: discoFun28.src, type: "quantity", maxQty: 10 },
  { id: "premier-koozies", name: "5 Premier Koozies", price: 20, image: discoFun.src, type: "quantity", maxQty: 10 },
  { id: "unicorn-float", name: "Personal Unicorn Float", price: 20, image: unicornPic.src, type: "quantity", maxQty: 10 },
  { id: "ice-bags", name: "20-Lb Bags of Ice", price: 8, image: discoFun29.src, type: "quantity", maxQty: 20 },
  { id: "bubble-wands", name: "Bubble Wands", price: 3, image: discoWigs.src, type: "quantity", maxQty: 30 },
  { id: "party-on-delivery", name: "Party On Delivery: Drinks & Party Supplies (Please Select If Interested)", price: 0, image: discoFun.src, type: "toggle", description: "We'll coordinate drink and party supply delivery" },
  { id: "fetii-ride", name: "Fetii Ride 25% Discount All Weekend (Please Select If Interested)", price: 0, image: groupPic.src, type: "toggle", description: "Get 25% off Fetii group rides all weekend" },
  { id: "pod-voucher", name: "$50 POD Voucher", price: 0, image: discoFun29.src, type: "toggle", description: "Redeemable voucher for Party On Delivery" },
];

export interface ConfirmedAddOn {
  name: string;
  unitPrice: number;
  quantity: number;
}

/** Map of add-on ID → purchased quantity (for showing saved state) */
export interface ExistingAddOnQuantity {
  id: string;
  quantity: number;
}

interface AddOnStoreProps {
  bookingId: string;
  experienceType: string;
  customerEmail: string;
  partyType: string;
  onTotalChange?: (total: number) => void;
  onAddOnsConfirmed?: (items: ConfirmedAddOn[]) => void;
  existingAddOnIds?: string[];
  /** Quantities for existing add-ons (from notes parsing + session confirmations) */
  existingAddOnQuantities?: ExistingAddOnQuantity[];
}

export const AddOnStore = ({ bookingId, experienceType, customerEmail, partyType, onTotalChange, onAddOnsConfirmed, existingAddOnIds = [], existingAddOnQuantities = [] }: AddOnStoreProps) => {
  const addOns = experienceType === "disco_cruise" ? discoAddOns : privateAddOns;
  
  // Build a lookup of existing quantities
  const existingQtyMap: Record<string, number> = {};
  for (const eq of existingAddOnQuantities) {
    existingQtyMap[eq.id] = (existingQtyMap[eq.id] || 0) + eq.quantity;
  }
  // Also include existingAddOnIds (qty=1 for toggle items not in quantities list)
  for (const id of existingAddOnIds) {
    if (!existingQtyMap[id]) {
      existingQtyMap[id] = 1;
    }
  }

  const [selections, setSelections] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleItem = (id: string) => {
    setSelections(prev => ({
      ...prev,
      [id]: prev[id] ? 0 : 1
    }));
  };

  const setQuantity = (id: string, qty: number, maxQty: number = 99) => {
    setSelections(prev => ({
      ...prev,
      [id]: Math.max(0, Math.min(qty, maxQty))
    }));
  };

  const getTotal = () => {
    return addOns.reduce((sum, addon) => {
      const qty = selections[addon.id] || 0;
      return sum + (addon.price * qty);
    }, 0);
  };

  const getSelectedItems = () => {
    return addOns
      .filter(a => (selections[a.id] || 0) > 0)
      .map(a => ({ ...a, quantity: selections[a.id] }));
  };

  const handleSubmit = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      toast.error("Please select at least one add-on");
      return;
    }

    setSubmitting(true);
    try {
      // Demo mode — simulate success without calling edge function
      if (bookingId === "demo-preview") {
        await new Promise((resolve) => setTimeout(resolve, 800));
        toast.success("Add-ons added to your invoice!");
        const confirmed = selectedItems.map(item => ({ name: item.name, unitPrice: item.price, quantity: item.quantity }));
        onAddOnsConfirmed?.(confirmed);
        setSubmitted(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke("add-booking-addons", {
        body: {
          bookingId,
          customerEmail,
          addOns: selectedItems.map(item => ({
            name: item.name,
            unitPrice: item.price,
            quantity: item.quantity,
          })),
        },
      });

      if (error) throw error;

      toast.success("Add-ons added to your invoice!");
      const confirmed = selectedItems.map(item => ({ name: item.name, unitPrice: item.price, quantity: item.quantity }));
      onAddOnsConfirmed?.(confirmed);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Failed to add add-ons:", err);
      toast.error("Failed to add add-ons. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const total = getTotal();
  const selectedCount = getSelectedItems().length;

  // Notify parent of total changes
  const prevTotalRef = useState({ value: 0 })[0];
  if (total !== prevTotalRef.value) {
    prevTotalRef.value = total;
    onTotalChange?.(total);
  }

  if (submitted) {
    return (
      <Card className="bg-slate-800/70 border-emerald-500/30 text-white">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto" />
          <h3 className="text-2xl font-bold text-emerald-300">Add-Ons Added!</h3>
          <p className="text-slate-300 max-w-md mx-auto">
            Your add-ons have been added to your booking invoice. You'll receive an updated invoice at <strong className="text-sky-300">{customerEmail}</strong>.
          </p>
          <Button
            onClick={() => { setSubmitted(false); setSelections({}); }}
            variant="outline"
            className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
          >
            Add More Items
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cart Summary Bar */}
      {selectedCount > 0 && (
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border border-sky-500/30 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-sky-400" />
            <span className="text-white font-medium">{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</span>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-sm">
              ${total.toFixed(2)}
            </Badge>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...</>
            ) : (
              <>Add to Invoice</>
            )}
          </Button>
        </div>
      )}

      <Card className="bg-slate-800/70 border-sky-500/20 text-white">
        <CardHeader>
          <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Add-Ons for Your {experienceType === "disco_cruise" ? "Disco Cruise" : "Private Cruise"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {addOns.map((addon, idx) => {
            const qty = selections[addon.id] || 0;
            const isActive = qty > 0;
            const purchasedQty = existingQtyMap[addon.id] || 0;
            const alreadyPurchased = purchasedQty > 0;

            return (
              <div key={addon.id}>
                <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${alreadyPurchased ? 'bg-emerald-500/10 border border-emerald-500/20' : isActive ? 'bg-sky-500/10 border border-sky-500/20' : 'hover:bg-slate-700/50'}`}>
                  {/* Thumbnail */}
                  <img
                    src={addon.image}
                    alt={addon.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-white leading-tight">
                      {addon.name}
                      {alreadyPurchased && (
                        <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                          Added
                        </Badge>
                      )}
                    </h4>
                    {addon.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{addon.description}</p>
                    )}
                    <p className="text-sm font-medium text-sky-300 mt-0.5">
                      {addon.price === 0 ? "Free" : `$${addon.price.toFixed(0)}/add-on`}
                    </p>
                  </div>

                  {/* Control */}
                  <div className="flex-shrink-0">
                    {alreadyPurchased ? (
                      <div className="text-right">
                        {addon.type === "quantity" && purchasedQty > 1 ? (
                          <span className="text-xs text-emerald-400 font-medium">Qty: {purchasedQty}</span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium">✓ Added</span>
                        )}
                      </div>
                    ) : addon.type === "toggle" ? (
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleItem(addon.id)}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-slate-700 border-slate-500 text-white hover:bg-slate-600 hover:text-white"
                          onClick={() => setQuantity(addon.id, qty - 1, addon.maxQty)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center font-bold text-white text-lg">{qty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-sky-600 border-sky-500 text-white hover:bg-sky-500 hover:text-white"
                          onClick={() => setQuantity(addon.id, qty + 1, addon.maxQty)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {idx < addOns.length - 1 && <Separator className="bg-slate-700/50" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Bottom checkout button */}
      {selectedCount > 0 && (
        <div className="bg-slate-800/70 border border-sky-500/20 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Total: <span className="text-sky-300">${total.toFixed(2)}</span></p>
            <p className="text-xs text-slate-400">Will be added to your booking invoice</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...</>
            ) : (
              <>Add to Invoice ({selectedCount} item{selectedCount !== 1 ? 's' : ''})</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
