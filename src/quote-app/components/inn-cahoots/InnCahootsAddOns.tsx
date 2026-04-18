import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Switch } from "@/quote-app/components/ui/switch";
import { Badge } from "@/quote-app/components/ui/badge";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { ShoppingCart, Plus, Minus, Send, Loader2 } from "lucide-react";
import { toast } from "@/quote-app/hooks/use-toast";
import { supabase } from "@/quote-app/integrations/supabase/client";

// Add-on photo imports

import mimosaBarImg from "@/quote-app/assets/addons/mimosa-bar.jpg";
import oldFashionedImg from "@/quote-app/assets/addons/old-fashioned.jpg";
import brunchBarImg from "@/quote-app/assets/addons/brunch-bar.jpg";
import bloodyMaryImg from "@/quote-app/assets/addons/bloody-mary.jpg";
import shotBarImg from "@/quote-app/assets/addons/shot-bar.jpg";
import groceryDeliveryImg from "@/quote-app/assets/addons/grocery-delivery.jpg";
import djImg from "@/quote-app/assets/addons/dj.jpg";
import bartenderImg from "@/quote-app/assets/addons/bartender.jpg";
import hibachiImg from "@/quote-app/assets/addons/hibachi.jpg";
import massageImg from "@/quote-app/assets/addons/massage.jpg";
import discoBallImg from "@/quote-app/assets/addons/disco-ball.jpg";
import partyBusImg from "@/quote-app/assets/addons/party-bus.jpg";

interface AddOnItem {
  name: string;
  description: string;
  icon: string;
  price: number;
  type: "toggle" | "quantity";
  maxQty?: number;
  image: string;
}

interface CategoryGroup {
  category: string;
  categoryIcon: string;
  color: string;
  items: AddOnItem[];
}

export const ADD_ON_CATEGORIES: CategoryGroup[] = [
  {
    category: "Beverage & Concierge Services",
    categoryIcon: "🍹",
    color: "purple",
    items: [
      { name: "Mimosa Bar Setup", description: "Champagne, fresh juices (OJ, cranberry, grapefruit), and champagne flutes for the whole crew", icon: "🥂", price: 125, type: "toggle", image: mimosaBarImg },
      { name: "Old Fashioned Bar Setup", description: "Classic Old Fashioned bar with bourbon, bitters, simple syrup, orange peels & cherries", icon: "🥃", price: 150, type: "toggle", image: oldFashionedImg },
      { name: "Tequila Bar Setup", description: "100% agave tequila, fresh limes, grapefruit liqueur, Topo Chico, margarita salt, shot glasses & cocktail glasses", icon: "🍋", price: 175, type: "toggle", image: brunchBarImg },
      { name: "Bloody Mary Bar Setup", description: "Vodka, Bloody Mary mix, celery, olives, hot sauce, bacon & all the fixings", icon: "🍅", price: 125, type: "toggle", image: bloodyMaryImg },
      { name: "Shot Bar Setup", description: "Tequila, whiskey, or vodka shots with limes, salt, and chasers — ready to go", icon: "🥂", price: 100, type: "toggle", image: shotBarImg },
      { name: "Grocery Delivery & Stocking", description: "We'll shop, deliver, and stock your fridge & pantry before you arrive", icon: "🛒", price: 75, type: "toggle", image: groceryDeliveryImg },
    ],
  },
  {
    category: "Entertainment & Services",
    categoryIcon: "🎉",
    color: "sky",
    items: [
      { name: "Professional DJ", description: "Live DJ to keep the party going at your suite — speakers, lights & playlist curation included", icon: "🎧", price: 600, type: "toggle", image: djImg },
      { name: "Bartender Service", description: "Professional bartender to serve drinks at your suite party — 4 hour minimum", icon: "🍸", price: 400, type: "quantity", maxQty: 2, image: bartenderImg },
      { name: "Hibachi Chef Experience", description: "Private hibachi chef cooks right at your suite — full dinner for the whole group", icon: "🔥", price: 800, type: "toggle", image: hibachiImg },
      { name: "Massage Service", description: "Licensed massage therapist comes to your suite — 60-minute sessions per person", icon: "💆", price: 150, type: "quantity", maxQty: 10, image: massageImg },
      { name: "Transportation Arrangements", description: "Sprinter vans to party buses — we can arrange transportation throughout your stay", icon: "🚐", price: 200, type: "toggle", image: partyBusImg },
      { name: "Disco Ball Rental", description: "Motorized disco ball with LED lighting to transform your suite into a dance floor", icon: "🪩", price: 75, type: "toggle", image: discoBallImg },
    ],
  },
];

interface InnCahootsAddOnsProps {
  openExternalLink: (url: string) => void;
  selections?: Record<string, number>;
  onSelectionsChange?: (selections: Record<string, number>) => void;
}

const InnCahootsAddOns = ({ openExternalLink: _openExternalLink, selections: externalSelections, onSelectionsChange }: InnCahootsAddOnsProps) => {
  const [internalSelections, setInternalSelections] = useState<Record<string, number>>({});
  const selections = externalSelections ?? internalSelections;
  const updateSelections = (next: Record<string, number>) => {
    if (onSelectionsChange) onSelectionsChange(next);
    else setInternalSelections(next);
  };

  // Contact form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleItem = (name: string) => {
    updateSelections({ ...selections, [name]: selections[name] ? 0 : 1 });
  };

  const setQuantity = (name: string, qty: number, maxQty: number = 99) => {
    updateSelections({ ...selections, [name]: Math.max(0, Math.min(qty, maxQty)) });
  };

  const allItems = ADD_ON_CATEGORIES.flatMap(c => c.items);
  const selectedItems = allItems.filter(item => (selections[item.name] || 0) > 0);
  const total = selectedItems.reduce((sum, item) => sum + item.price * (selections[item.name] || 0), 0);

  const handleSubmitRequest = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: "Please fill in your name and email", variant: "destructive" });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ title: "Please select at least one service", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-concierge-request", {
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          selectedServices: selectedItems.map(item => ({
            name: item.name,
            qty: selections[item.name] || 1,
            price: item.price,
          })),
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast({ title: "Quote request sent!", description: "We'll follow up with a formal quote shortly." });
    } catch (err) {
      console.error("Error sending concierge request:", err);
      toast({ title: "Failed to send request", description: "Please try again or email info@partyondelivery.com directly.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cart summary */}
      {selectedItems.length > 0 && (
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border border-amber-500/30 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-amber-400" />
            <span className="text-white font-medium">{selectedItems.length} service{selectedItems.length !== 1 ? "s" : ""} selected</span>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-sm">
              ${total.toFixed(0)}
            </Badge>
          </div>
          <Button
            onClick={() => document.getElementById('concierge-quote-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          >
            Request Quote ↓
          </Button>
        </div>
      )}

      {ADD_ON_CATEGORIES.map((cat) => (
        <div key={cat.category} className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2 border-b border-amber-500/30 pb-2">
            <span className="text-xl">{cat.categoryIcon}</span>
            {cat.category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cat.items.map((item) => {
              const qty = selections[item.name] || 0;
              const isActive = qty > 0;
              return (
                <div
                  key={item.name}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    isActive
                      ? "border-amber-400 shadow-lg shadow-amber-500/20"
                      : "border-slate-700/50 hover:border-slate-500/50"
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="eager"
                      decoding="async"
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-200 ${
                        isActive ? "brightness-90" : "brightness-75 saturate-75"
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    {isActive && (
                      <div className="absolute top-2 left-2 bg-amber-400 rounded-full p-1">
                        <svg className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h4 className="font-bold text-white text-sm leading-tight drop-shadow-lg">{item.name}</h4>
                      <p className="text-[11px] text-slate-200/80 mt-0.5 line-clamp-2 drop-shadow">{item.description}</p>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between px-3 py-2.5 ${
                    isActive ? "bg-amber-400/10" : "bg-slate-800/90"
                  }`}>
                    <span className={`font-bold text-base ${isActive ? "text-amber-300" : "text-white"}`}>
                      ${item.price}
                      {item.type === "quantity" && <span className="text-xs font-normal text-slate-400 ml-1">each</span>}
                    </span>
                    {item.type === "toggle" ? (
                      <Switch checked={isActive} onCheckedChange={() => toggleItem(item.name)} />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-slate-700 border-slate-500 text-white hover:bg-slate-600 hover:text-white"
                          onClick={() => setQuantity(item.name, qty - 1, item.maxQty)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-bold text-white text-sm">{qty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-amber-600 border-amber-500 text-white hover:bg-amber-500 hover:text-white"
                          onClick={() => setQuantity(item.name, qty + 1, item.maxQty)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected Services Summary + Quote Request Form */}
      <div id="concierge-quote-form" className="space-y-4">
        {selectedItems.length > 0 && (
          <div className="bg-slate-800/70 border border-amber-500/30 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-400" />
              Your Selected Services
            </h3>
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      {(selections[item.name] || 0) > 1 && (
                        <p className="text-xs text-slate-400">Qty: {selections[item.name]}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-amber-300 font-bold">${(item.price * (selections[item.name] || 1)).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-amber-500/30 pt-3">
              <span className="text-white font-bold text-lg">Estimated Total</span>
              <span className="text-amber-300 font-bold text-xl">${total.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Quote Request Form */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6 space-y-5">
          {submitted ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">✅</div>
              <h3 className="text-xl font-bold text-white">Quote Request Sent!</h3>
              <p className="text-slate-300 text-sm">We've received your concierge request and will follow up with a formal quote shortly.</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white">Request a Formal Quote</h3>
                <p className="text-sm text-slate-300 mt-1">
                  {selectedItems.length > 0
                    ? "Fill in your details below and we'll send you a formal quote for the selected services."
                    : "Select services above, then fill in your details to request a formal quote."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ic-first-name" className="text-slate-300 text-sm">First Name *</Label>
                  <Input
                    id="ic-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-last-name" className="text-slate-300 text-sm">Last Name *</Label>
                  <Input
                    id="ic-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-email" className="text-slate-300 text-sm">Email *</Label>
                  <Input
                    id="ic-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-phone" className="text-slate-300 text-sm">Phone</Label>
                  <Input
                    id="ic-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              <Button
                onClick={handleSubmitRequest}
                disabled={isSubmitting || selectedItems.length === 0}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm sm:text-base py-6 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Sending...</>
                ) : (
                  <><Send className="h-5 w-5 mr-2 shrink-0" /> <span className="truncate">Request a Formal Quote to Add These Services to Your Stay</span></>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InnCahootsAddOns;
