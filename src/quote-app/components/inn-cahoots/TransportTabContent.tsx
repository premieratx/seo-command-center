import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Textarea } from "@/quote-app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Badge } from "@/quote-app/components/ui/badge";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { Car, Smartphone, Download, ExternalLink, Users, Clock, MapPin, Send, Bus, CheckCircle, CalendarIcon, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/quote-app/lib/utils";
import { supabase } from "@/quote-app/integrations/supabase/client";

import fetiiVan from "@/quote-app/assets/fetii-van.jpg";

const INN_CAHOOTS_ADDRESS = "1221 E 6th St, Austin, TX 78702";
const MARINA_ADDRESS = "13993 FM 2769, Leander, TX 78641";

const elegantFleet = [
  {
    name: "Executive Sedan",
    provider: "Elegant Limo Austin",
    capacity: 3,
    subtitle: "Cadillac XTS or Similar",
    description: "Plush leather seating, dual illuminating vanity mirrors, rear armrest & drink holders, AM/FM stereo. Complimentary water, hand sanitizer & mints.",
    images: [
      "https://elegantlimoaustin.com/uploads/fleets/xts.png",
      "https://elegantlimoaustin.com/uploads/fleets/99857557671xts.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/53101521537group_2.png",
      "https://elegantlimoaustin.com/uploads/fleets/3269514706202_copy_2.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/6989854090502_copy.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/1790628060302.jpg",
    ],
  },
  {
    name: "Luxury SUV",
    provider: "Elegant Limo Austin",
    capacity: 6,
    subtitle: "Lincoln Navigator or Similar",
    description: "Plush leather seating, dual illuminating vanity mirrors, rear armrest & drink holders, AM/FM stereo. Spacious cargo area for luggage.",
    images: [
      "https://elegantlimoaustin.com/uploads/fleets/82016131874lincoln_navigator_2020.png",
      "https://elegantlimoaustin.com/uploads/fleets/75032756996lincoln_front_copy.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/18269728673licoln_inside_copy.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/69867871793lincoln_back_seats_copy.jpg",
    ],
  },
  {
    name: "Mercedes Sprinter",
    provider: "Elegant Limo Austin",
    capacity: 10,
    subtitle: "Luxury Sprinter Van",
    description: "Plush leather seating, dual illuminating vanity mirrors, rear armrest & drink holders, AM/FM stereo. Complimentary water, hand sanitizer & mints. Perfect for medium groups and wine tours.",
    images: [
      "https://elegantlimoaustin.com/uploads/fleets/45365671950sprinter_limo.png",
      "https://elegantlimoaustin.com/uploads/fleets/62840798710mercedes2.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/58920927981mercecdes_interiror.jpg",
    ],
  },
  {
    name: "Mini Coach / Party Bus",
    provider: "Elegant Limo Austin",
    capacity: 31,
    subtitle: "Limo-Style Party Bus",
    description: "Plush leather seating, fiber-optic lighting, premium sound system, drink holders. Complimentary water, hand sanitizer & mints. Perfect for bachelor/bachelorette parties!",
    images: [
      "https://elegantlimoaustin.com/uploads/fleets/limobus.png",
      "https://elegantlimoaustin.com/uploads/fleets/9678034218606_copy_2.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/4931038221206.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/2030626888606_copy.jpg",
      "https://elegantlimoaustin.com/uploads/fleets/48493207370mini-coach-retouch_copy.png",
    ],
  },
  {
    name: "Goldie",
    provider: "Fly Rides",
    capacity: 40,
    subtitle: "40-Passenger Party Bus",
    description: "Bling bling! This shiny gold party bus is ready for your party. Full sound system, LED lighting, and open floor plan for dancing.",
    images: [
      "https://fly-rides.com/wp-content/uploads/2019/10/GOLDIE.png",
    ],
  },
  {
    name: "CandyCane",
    provider: "Fly Rides",
    capacity: 50,
    subtitle: "50-Passenger Party Bus",
    description: "This party bus is TOO SWEEEEEET! Full sound system, LED party lighting, and spacious open layout. A ride you will never forget!",
    images: [
      "https://fly-rides.com/wp-content/uploads/2019/10/1CandyCane-24-800.png",
    ],
  },
  {
    name: "Let's Roll ATX Party Bus",
    provider: "Let's Roll ATX",
    capacity: 30,
    subtitle: "30-Passenger Party Bus",
    description: "Austin's premier party bus experience! State-of-the-art sound system, dynamic LED lighting, custom bench seating, integrated cup holders, and high-performance A/C. 4-hour minimum. Where the journey IS the party!",
    images: [
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/97a97737-c4e9-4ba1-97c2-c42d23f38238/IMG_0262.jpg",
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/f1132f8b-9915-4313-979f-673c0bb3abe3/IMG_0070.jpg",
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/9024e776-eae0-4f27-ac61-29f8f63d3206/IMG_0006.jpg",
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/dc0960e5-910c-429b-9c37-c5bfb91a35b0/IMG_9905.jpg",
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/f54e2dee-7398-4b77-9324-316f82859cf8/IMG_9912.jpg",
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/032e9fcd-85ef-478d-8dbb-d7aad0f57896/IMG_9932.jpg",
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/bc93a374-577a-451c-adf2-ea2b60e23554/IMG_9959.jpg",
      "https://images.squarespace-cdn.com/content/v1/6516f7b783251b4dacf89aad/6299e8f0-f0b9-482c-87d9-21b51712c7c7/IMG_9921.jpg",
    ],
  },
  {
    name: "Blue Steel",
    provider: "Fly Rides",
    capacity: 50,
    subtitle: "50-Passenger Party Bus",
    description: "Really really really ridiculously good looking! This old school classic will make your group feel like supermodels on the runway.",
    images: [
      "https://fly-rides.com/wp-content/uploads/2019/10/blue-steel.png",
    ],
  },
  {
    name: "DayDream",
    provider: "Fly Rides",
    capacity: 50,
    subtitle: "50-Passenger Party Bus",
    description: "A dreamy ride you will never forget! Full sound system, spacious layout, and vibrant design perfect for any celebration.",
    images: [
      "https://fly-rides.com/wp-content/uploads/2022/05/Untitled-569-%C3%97-427-px-617-%C3%97-128-px-550-%C3%97-160-px.png",
    ],
  },
  {
    name: "Patriot",
    provider: "Fly Rides",
    capacity: 50,
    subtitle: "50-Passenger Party Bus",
    description: "Do it for your country. 🇺🇸 By far, the most American party bus you're going to find in Austin!",
    images: [
      "https://fly-rides.com/wp-content/uploads/2019/10/PATRIOT.png",
    ],
  },
  {
    name: "Texas Two-Step",
    provider: "Fly Rides",
    capacity: 50,
    subtitle: "50-Passenger Party Bus",
    description: "As unique as the Lone Star State itself. The newest party bus in the fleet — the perfect dance partner for your party!",
    images: [
      "https://fly-rides.com/wp-content/uploads/2019/09/14.png",
    ],
  },
];

// Time options for picker
const timeOptions = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
];

interface TransportTabContentProps {
  openExternalLink: (url: string) => void;
  openLightbox: (images: string[], index: number) => void;
  guestCount: number;
  partyType?: string;
  isBooked?: boolean;
  defaultDestination?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

const TransportTabContent = ({ openExternalLink, openLightbox, guestCount, partyType = '', isBooked = true, defaultDestination, customerName: propName, customerEmail: propEmail, customerPhone: propPhone }: TransportTabContentProps) => {
  const [passengerCount, setPassengerCount] = useState("5");
  const [pickupAddress, setPickupAddress] = useState(INN_CAHOOTS_ADDRESS);
  const [customPickup, setCustomPickup] = useState("");
  const [pickupType, setPickupType] = useState("inn_cahoots");
  const [destinationAddress, setDestinationAddress] = useState(defaultDestination || "");
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [pickupTime, setPickupTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState(propName || "");
  const [customerEmail, setCustomerEmail] = useState(propEmail || "");
  const [customerPhone, setCustomerPhone] = useState(propPhone || "");

  const numPassengers = parseInt(passengerCount) || 0;
  const suitableVehicles = elegantFleet.filter(v => v.capacity >= numPassengers);

  const handlePickupTypeChange = (value: string) => {
    setPickupType(value);
    if (value === "inn_cahoots") {
      setPickupAddress(INN_CAHOOTS_ADDRESS);
    } else {
      setPickupAddress(customPickup);
    }
  };

  const handleSubmitInquiry = async () => {
    if (!pickupDate || !pickupTime || !endTime || !destinationAddress || !customerEmail) {
      toast.error("Please fill in all required fields including your email");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-transport-inquiry", {
        body: {
          customerName,
          customerEmail,
          customerPhone,
          pickupAddress,
          destinationAddress,
          pickupDate: format(pickupDate, "yyyy-MM-dd"),
          pickupTime,
          endTime,
          passengerCount,
          selectedVehicle,
          specialRequests,
        },
      });

      if (error) throw error;
      setInquirySubmitted(true);
      toast.success("Inquiry sent! Check your email for confirmation.");
    } catch (err: any) {
      console.error("Inquiry error:", err);
      toast.error("Failed to send inquiry. Please try again or call (512) 576-7975.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetii capacity per van based on party type
  const fetiiCapPerVan = useMemo(() => {
    const norm = partyType.toLowerCase().replace(/[^a-z]/g, '');
    if (norm.includes('bachelor') && !norm.includes('bachelorette') && !norm.includes('combined')) return 12;
    return 14; // bachelorette, combined, or default
  }, [partyType]);

  const fetiiVansNeeded = Math.ceil(guestCount / fetiiCapPerVan);

  // Build recommended vehicles for this group size
  const recommendedVehicles = useMemo(() => {
    const results: { type: 'fetii' | 'private'; vehicle?: typeof elegantFleet[0]; label: string; scrollTo: string; image: string; capacity: string; provider: string; providerColor: string; multiplier?: number }[] = [];
    
    // Always show Fetii with multiplier
    results.push({
      type: 'fetii',
      label: 'Fetii Sprinter Van',
      scrollTo: 'transport-fetii-section',
      image: fetiiVan,
      capacity: `${fetiiCapPerVan} passengers each`,
      provider: 'Fetii',
      providerColor: 'bg-amber-500/20 text-amber-300',
      multiplier: fetiiVansNeeded > 1 ? fetiiVansNeeded : undefined,
    });
    
    // Add matching private vehicles from the fleet
    // For small groups (≤ fetiiCapPerVan), only show vehicles sized appropriately (not huge party buses)
    const maxRecommendedCapacity = guestCount <= fetiiCapPerVan ? fetiiCapPerVan : Infinity;
    const matching = elegantFleet.filter(v => v.capacity >= guestCount && v.capacity <= maxRecommendedCapacity);
    matching.forEach(v => {
      results.push({
        type: 'private',
        vehicle: v,
        label: v.name,
        scrollTo: 'transport-private-section',
        image: v.images[0],
        capacity: `${v.capacity} passengers`,
        provider: v.provider,
        providerColor: v.provider === "Fly Rides" ? "bg-sky-500/20 text-sky-300" : v.provider === "Let's Roll ATX" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300",
      });
    });
    
    return results;
  }, [guestCount, fetiiCapPerVan, fetiiVansNeeded]);

  return (
    <div className="space-y-4">
      {/* Recommended Vehicles for Group Size */}
      {recommendedVehicles.length > 0 && (
        <Card className="bg-slate-800/70 border-emerald-500/20 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-emerald-300 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recommended for Your Group ({guestCount} guests)
            </CardTitle>
            <CardDescription className="text-slate-400">
              These options fit your group size — tap to learn more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {recommendedVehicles.map((rec, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (rec.type === 'private' && rec.vehicle) {
                      setSelectedVehicle(rec.vehicle.name);
                    }
                    document.getElementById(rec.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex-shrink-0 w-44 bg-slate-700/40 border border-slate-600/30 rounded-lg overflow-hidden hover:border-emerald-500/50 transition-all group text-left relative"
                >
                  <div className="relative">
                    <img
                      src={rec.image}
                      alt={rec.label}
                      className="w-full h-24 object-cover group-hover:opacity-90 transition-opacity bg-slate-800"
                    />
                    {rec.multiplier && (
                      <span className="absolute top-1.5 right-1.5 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                        ×{rec.multiplier}
                      </span>
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-semibold text-white truncate">{rec.label}{rec.multiplier ? ` ×${rec.multiplier}` : ''}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1 py-0.5 rounded ${rec.providerColor}`}>{rec.provider}</span>
                      <span className="text-[10px] text-slate-500">{rec.capacity}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">View details ↓</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fetii Group Rides */}
      <Card id="transport-fetii-section" className="bg-slate-800/70 border-amber-500/20 text-white">
        <CardHeader>
          <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Fetii Group Rides — 25% Off!
          </CardTitle>
          <CardDescription className="text-slate-400">
            Get your whole group around Austin in one big ride
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-300">
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <img src={fetiiVan} alt="Fetii 12-14 passenger Sprinter van" className="w-full sm:w-40 h-28 object-cover rounded-lg shrink-0" />
            <div className="text-center sm:text-left space-y-2 flex-1">
              <p className="text-sm">Use discount code for <strong className="text-white">25% off</strong> your Fetii ride:</p>
              <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                <div className="inline-block bg-slate-900/70 border border-emerald-500/30 rounded-lg px-6 py-3">
                  <span className={`text-2xl font-bold text-emerald-300 tracking-widest ${!isBooked ? 'blur-[5px] select-none pointer-events-none' : ''}`}>PPCAUSTIN</span>
                </div>
                {!isBooked && (
                  <span className="text-xs text-amber-300 font-medium italic">🎉 Code available after you book online!</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm">Fetii is a group rideshare app with 12–14 passenger Sprinter vans — perfect for getting your whole crew around town!</p>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" onClick={() => openExternalLink("https://apps.apple.com/us/app/fetii-ride/id1470368285")} className="flex items-center justify-center gap-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 transition-colors">
              <Download className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white">App Store</span>
            </Button>
            <Button type="button" onClick={() => openExternalLink("https://play.google.com/store/apps/details?id=com.fetii.user&hl=en_US&gl=US")} className="flex items-center justify-center gap-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 transition-colors">
              <Download className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">Google Play</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Elegant Limousines Fleet */}
      <Card id="transport-private-section" className="bg-slate-800/70 border-amber-500/20 text-white">
        <CardHeader>
          <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Private Van & Party Bus Rentals
          </CardTitle>
          <CardDescription className="text-slate-400">
            Luxury chauffeured transportation from three trusted Austin companies — <strong className="text-amber-300">Elegant Limo Austin</strong> (sedans, SUVs, sprinters, party bus), <strong className="text-sky-300">Fly Rides</strong> (40–50 passenger party buses), and <strong className="text-emerald-300">Let's Roll ATX</strong> (30-passenger party bus).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Passenger Filter */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Users className="h-5 w-5 text-amber-400" />
              <Label className="text-sm text-amber-200 font-semibold">How many passengers?</Label>
              <Select value={passengerCount} onValueChange={setPassengerCount}>
                <SelectTrigger className="w-32 bg-slate-700/60 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? "passenger" : "passengers"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {numPassengers > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                Showing {suitableVehicles.length} vehicle{suitableVehicles.length !== 1 ? "s" : ""} that fit {numPassengers} passenger{numPassengers !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Vehicle Tiles */}
          {suitableVehicles.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <p>No single vehicle fits {numPassengers} passengers. Consider booking multiple vehicles or contact Elegant Limo for custom options.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suitableVehicles.map((vehicle) => (
                <div
                  key={vehicle.name}
                  className="bg-slate-700/30 border border-slate-600/30 rounded-lg overflow-hidden hover:border-amber-500/40 transition-colors cursor-pointer group"
                  onClick={() => openLightbox(vehicle.images, 0)}
                >
                  <div className="relative">
                    <img
                      src={vehicle.images[0]}
                      alt={vehicle.name}
                      className="w-full h-44 object-cover group-hover:opacity-90 transition-opacity bg-slate-800"
                    />
                    {vehicle.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        📷 {vehicle.images.length} photos
                      </span>
                    )}
                    {numPassengers > 0 && numPassengers <= vehicle.capacity && (
                      <span className="absolute top-2 left-2 bg-emerald-500/90 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Fits your group
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white text-sm">{vehicle.name}</h3>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs shrink-0">
                        <Users className="h-3 w-3 mr-1" />
                        {vehicle.capacity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${vehicle.provider === "Fly Rides" ? "bg-sky-500/20 text-sky-300" : vehicle.provider === "Let's Roll ATX" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                        {vehicle.provider}
                      </span>
                      <span className="text-xs text-slate-500">{vehicle.subtitle}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{vehicle.description}</p>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVehicle(vehicle.name);
                        document.getElementById("transport-inquiry-form")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="w-full mt-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs"
                    >
                      Select & Inquire
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-300">Elegant Limo Austin</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openExternalLink("https://www.elegantlimoaustin.com/reservations")} className="bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" /> Website
                </Button>
                <Button size="sm" onClick={() => openExternalLink("tel:+15122106232")} className="bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs">
                  <Phone className="h-3 w-3 mr-1" /> (512) 210-6232
                </Button>
              </div>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-sky-300">Fly Rides — Austin's Best Party Bus Since 2014</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openExternalLink("https://fly-rides.com")} className="bg-sky-600 hover:bg-sky-500 text-black font-semibold text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" /> Website
                </Button>
                <Button size="sm" onClick={() => openExternalLink("tel:+15127661400")} className="bg-sky-600 hover:bg-sky-500 text-black font-semibold text-xs">
                  <Phone className="h-3 w-3 mr-1" /> (512) 766-1400
                </Button>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-300">Let's Roll ATX — Where the Journey IS the Party</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openExternalLink("https://www.letsrollatx.com")} className="bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" /> Website
                </Button>
                <Button size="sm" onClick={() => openExternalLink("tel:+15124003033")} className="bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-xs">
                  <Phone className="h-3 w-3 mr-1" /> (512) 400-3033
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transportation Inquiry Form */}
      <Card id="transport-inquiry-form" className="bg-slate-800/70 border-amber-500/20 text-white">
        <CardHeader>
          <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
            <Send className="h-5 w-5" />
            Transportation Inquiry
          </CardTitle>
          <CardDescription className="text-slate-400">
            Request a quote for private transportation — we'll connect you with the right provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inquirySubmitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Inquiry Submitted!</h3>
              <p className="text-slate-300 text-sm max-w-md mx-auto">
                We've sent you a confirmation email. We'll be in touch soon with options and pricing!
              </p>
              <Button onClick={() => setInquirySubmitted(false)} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 mt-2">
                Submit Another Inquiry
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold">Your Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold">Email *</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold">Phone</Label>
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(512) 555-1234"
                    className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Pickup Address */}
              <div className="space-y-2">
                <Label className="text-sm text-amber-200 font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Pickup Address
                </Label>
                <Select value={pickupType} onValueChange={handlePickupTypeChange}>
                  <SelectTrigger className="bg-slate-700/60 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inn_cahoots">🏠 Inn Cahoots — {INN_CAHOOTS_ADDRESS}</SelectItem>
                    <SelectItem value="custom">📍 Enter a different address</SelectItem>
                  </SelectContent>
                </Select>
                {pickupType === "custom" && (
                  <Input
                    value={customPickup}
                    onChange={(e) => { setCustomPickup(e.target.value); setPickupAddress(e.target.value); }}
                    placeholder="Enter pickup address..."
                    className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500"
                  />
                )}
              </div>

              {/* Destination Address */}
              <div className="space-y-2">
                <Label className="text-sm text-amber-200 font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Destination Address
                </Label>
                <Input
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Where are you headed? (e.g. 6th Street, Lake Travis marina, airport...)"
                  className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Pickup Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-slate-700/60 border-slate-600 text-white hover:bg-slate-600",
                          !pickupDate && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {pickupDate ? format(pickupDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={setPickupDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold">Pickup Time *</Label>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger className="bg-slate-700/60 border-slate-600 text-white">
                      <SelectValue placeholder="Select time..." />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold">End Time *</Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="bg-slate-700/60 border-slate-600 text-white">
                      <SelectValue placeholder="Select time..." />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Passengers & Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Number of Passengers
                  </Label>
                  <Select value={passengerCount} onValueChange={setPassengerCount}>
                    <SelectTrigger className="bg-slate-700/60 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} passenger{n !== 1 ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-200 font-semibold flex items-center gap-1.5">
                    <Car className="h-4 w-4" />
                    Preferred Vehicle
                  </Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger className="bg-slate-700/60 border-slate-600 text-white">
                      <SelectValue placeholder="Select a vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suitableVehicles.map(v => (
                        <SelectItem key={v.name} value={v.name}>{v.name} (up to {v.capacity})</SelectItem>
                      ))}
                      {suitableVehicles.length === 0 && (
                        <SelectItem value="custom" disabled>No vehicles fit — contact for options</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Special Requests */}
              <div className="space-y-2">
                <Label className="text-sm text-amber-200 font-semibold">Special Requests (optional)</Label>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requests? (e.g. round-trip, multiple stops, champagne, decorations...)"
                  className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
                />
              </div>

              {/* Summary */}
              {(pickupAddress || destinationAddress) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2 text-sm">
                  <h4 className="font-semibold text-amber-300 text-xs uppercase tracking-wider">Trip Summary</h4>
                  {pickupAddress && <p className="text-slate-300"><span className="text-slate-400">From:</span> {pickupAddress}</p>}
                  {destinationAddress && <p className="text-slate-300"><span className="text-slate-400">To:</span> {destinationAddress}</p>}
                  {pickupDate && <p className="text-slate-300"><span className="text-slate-400">Date:</span> {format(pickupDate, "PPPP")}</p>}
                  {pickupTime && endTime && <p className="text-slate-300"><span className="text-slate-400">Time:</span> {pickupTime} — {endTime}</p>}
                  {passengerCount && <p className="text-slate-300"><span className="text-slate-400">Passengers:</span> {passengerCount}</p>}
                  {selectedVehicle && <p className="text-slate-300"><span className="text-slate-400">Vehicle:</span> {selectedVehicle}</p>}
                </div>
              )}

              <Button 
                onClick={handleSubmitInquiry} 
                disabled={isSubmitting}
                className="w-full bg-amber-600 hover:bg-amber-500 text-black font-semibold py-3"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Submit Transportation Inquiry</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Getting Around Austin */}
      <Card className="bg-slate-800/70 border-amber-500/20 text-white">
        <CardHeader>
          <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
            <Car className="h-5 w-5" />
            Getting Around Austin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-300">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">📍 Anderson Mill Marina</h3>
            <p className="font-medium text-white">13993 FM 2769</p>
            <p className="text-sm text-slate-400">Leander, TX 78641 — Premier Party Cruises Home Base</p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-white">🚗 Tips</h3>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>Rideshare (Uber/Lyft) or Fetii recommended for bar-hopping</li>
              <li>Limited street parking — consider rideshare for downtown</li>
              <li>East 6th has tons of walkable bars and restaurants</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportTabContent;
