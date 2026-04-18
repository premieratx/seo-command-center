import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Badge } from "@/quote-app/components/ui/badge";
import { Separator } from "@/quote-app/components/ui/separator";
import { Lightbox } from "@/quote-app/components/ui/lightbox";
import { SEOHead } from "@/quote-app/components/SEOHead";
import {
  Home, MapPin, FileText, Camera, Car, Compass,
  Anchor, Ship, CheckCircle, ShoppingCart, ExternalLink, Wine, CreditCard,
  Key, Loader2, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { AVAILABLE_TABS, type TabDefinition } from "@/quote-app/lib/dashboardTabs";
import TransportTabContent from "@/quote-app/components/inn-cahoots/TransportTabContent";
import InnCahootsAddOns, { ADD_ON_CATEGORIES } from "@/quote-app/components/inn-cahoots/InnCahootsAddOns";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";
import ppcLogo from "@/quote-app/assets/ppc-logo-round.png";
import innCahootsLogo from "@/quote-app/assets/inn-cahoots-logo.png";
import atxDiscoCruiseLogo from "@/quote-app/assets/atx-disco-cruise-logo.png";
import fiveStarLogo from "@/quote-app/assets/five-star-logo.png";
import chickTripsLogo from "@/quote-app/assets/chick-trips-logo.png";
import lynnsLodgingLogo from "@/quote-app/assets/lynns-lodging-logo.png";

// Tab hero images for Inn Cahoots template
import alcoholDeliveryImg from "@/quote-app/assets/tabs/alcohol-delivery.jpg";
import boatRentalsImg from "@/quote-app/assets/tabs/boat-rentals-party.jpg";
import conciergeServicesImg from "@/quote-app/assets/tabs/concierge-services.jpg";
import boatRentalsPlainImg from "@/quote-app/assets/tabs/boat-rentals.jpg";

// Detail slide cards
import slide14 from "@/quote-app/assets/slides/private-cruise-14-slide.png";
import slide25 from "@/quote-app/assets/slides/private-cruise-25-slide.png";
import slide50 from "@/quote-app/assets/slides/private-cruise-50-slide.png";
import slideDisco from "@/quote-app/assets/slides/disco-cruise-slide.png";

// Alcohol delivery service tiles
import tileSuiteDelivery from "@/quote-app/assets/tiles/suite-delivery.jpg";
import tileBoatDelivery from "@/quote-app/assets/tiles/boat-delivery.jpg";
import tileCocktailBar from "@/quote-app/assets/tiles/cocktail-bar.jpg";
import tileStockFridge from "@/quote-app/assets/tiles/stock-fridge.jpg";
import tileGroupOrdering from "@/quote-app/assets/tiles/group-ordering.jpg";
import tilePrivateCruises from "@/quote-app/assets/boats/clever-girl-6.jpg";
import tileAllInclusive from "@/quote-app/assets/party/disco_fun_best2.jpg";
import tileDiscoCruise from "@/quote-app/assets/party/disco_wigs.jpg";
import tileDiscountTransport from "@/quote-app/assets/fetii-van.jpg";


// Boat photos
import cleverGirl1 from "@/quote-app/assets/boats/clever-girl-1.jpg";
import cleverGirl3 from "@/quote-app/assets/boats/clever-girl-3.jpg";
import cleverGirl4 from "@/quote-app/assets/boats/clever-girl-4.jpg";
import cleverGirl6 from "@/quote-app/assets/boats/clever-girl-6.jpg";
import cleverGirl9 from "@/quote-app/assets/boats/clever-girl-9.jpg";
import dayTripper1 from "@/quote-app/assets/boats/day-tripper-1.jpg";
import dayTripper2 from "@/quote-app/assets/boats/day-tripper-2.jpg";
import dayTripper3 from "@/quote-app/assets/boats/day-tripper-3.jpg";
import dayTripper4 from "@/quote-app/assets/boats/day-tripper-4.jpg";
import meeseeks1 from "@/quote-app/assets/boats/meeseeks-1.jpg";
import meeseeks2 from "@/quote-app/assets/boats/meeseeks-2.jpg";
import meeseeks3 from "@/quote-app/assets/boats/meeseeks-3.jpg";
import irony1 from "@/quote-app/assets/boats/irony-1.jpg";
import ironyNew1 from "@/quote-app/assets/boats/irony-new-1.jpg";
import ironyNew2 from "@/quote-app/assets/boats/irony-new-2.jpg";

import discoFun from "@/quote-app/assets/party/disco_fun_first.jpg";
import discoFun27 from "@/quote-app/assets/party/disco_fun_27.jpg";
import discoFun28 from "@/quote-app/assets/party/disco_fun_28.jpg";
import discoFun29 from "@/quote-app/assets/party/disco_fun29.jpg";
import discoFunBest from "@/quote-app/assets/party/disco_fun_best2.jpg";
import groupPic from "@/quote-app/assets/party/Group_Pic_6_22.jpg";
import djPic from "@/quote-app/assets/party/DJ_Pic.jpg";
import discoWigs from "@/quote-app/assets/party/disco_wigs.jpg";
import unicornPic from "@/quote-app/assets/party/unicorn_pic.jpg";

// Non-bach slides available if needed in future

const boatPhotosMap: Record<string, { photos: string[]; capacity: string; description: string; slide: string }> = {
  "Day Tripper": {
    photos: [dayTripper1, dayTripper2, dayTripper3, dayTripper4],
    capacity: "Up to 14 guests",
    description: "Perfect for intimate groups. Spacious deck, great sound system, and swimming access.",
    slide: slide14,
  },
  "Meeseeks / The Irony": {
    photos: [meeseeks1, meeseeks2, meeseeks3, ironyNew1, ironyNew2, irony1],
    capacity: "15–25 guests",
    description: "Mid-size pontoons ideal for bachelor/bachelorette parties. Room to dance, swim, and party.",
    slide: slide25,
  },
  "Clever Girl": {
    photos: [cleverGirl1, cleverGirl3, cleverGirl4, cleverGirl6, cleverGirl9],
    capacity: "Up to 75 guests",
    description: "Single-deck with giant dance floor, bars in the middle, stage on the front — the perfect party platform for up to 75 guests.",
    slide: slide50,
  },
};

const allBoatPhotos: Record<string, string[]> = {
  "Clever Girl": [cleverGirl1, cleverGirl3, cleverGirl4, cleverGirl6, cleverGirl9],
  "Day Tripper": [dayTripper1, dayTripper2, dayTripper3, dayTripper4],
  "Meeseeks": [meeseeks1, meeseeks2, meeseeks3],
  "The Irony": [irony1, ironyNew1, ironyNew2],
};

const experiencePhotos = [discoFun, discoFunBest, discoFun27, discoFun28, discoFun29, groupPic, djPic, discoWigs, unicornPic];

const DEFAULT_SUITE_PHOTOS = [
  "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87a1786b90b4c154a39_bedroom.jpg",
  "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87b34dc0a249b136548_inn-cahoots.webp",
  "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87aaa98c1dc467768e6_bedroom-1.webp",
  "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/691ba024274e926fffc40fbf_ymu9dUZQ.jpeg",
  "https://cdn.prod.website-files.com/64777de2ba9fa1dd6fafa3a4/68f4c87a7f0723612dc62b00_bar.webp",
];

const ICON_MAP: Record<string, React.ElementType> = {
  Key, ShoppingCart, Car, Wine, Compass, Anchor, FileText, Camera, Home, CreditCard, Ship,
};

interface DashboardConfig {
  id: string;
  name: string;
  slug: string;
  company_name: string;
  dashboard_type: string;
  tabs: string[];
  settings: Record<string, any>;
}

const DynamicDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  // Lifted add-on selections so reservation tab can display them
  const [addOnSelections, setAddOnSelections] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      if (!slug) { setError("No dashboard specified"); setLoading(false); return; }
      const { data, error: fetchError } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();
      if (fetchError || !data) {
        setError("Dashboard not found");
      } else {
        setConfig({
          ...data,
          tabs: (data.tabs as any) || [],
          settings: (data.settings as any) || {},
        });
      }
      setLoading(false);
    };
    fetchConfig();
  }, [slug]);

  // Set initial active tab once config loads
  useEffect(() => {
    if (config && !activeTab) {
      const firstTab = config.tabs.map(id => AVAILABLE_TABS.find(t => t.id === id)).filter(Boolean)[0];
      if (firstTab) setActiveTab(firstTab.id);
    }
  }, [config, activeTab]);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/80 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 text-lg">{error || "Dashboard not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabDefs = config.tabs
    .map(id => AVAILABLE_TABS.find(t => t.id === id))
    .filter((t): t is TabDefinition => !!t);

  const quoteEmbedUrl = `${window.location.origin}/quote-v2?sourceType=${config.slug}_dashboard&autoResize=1`;

  const renderTabContent = (tab: TabDefinition) => {
    switch (tab.id) {
      // === Inn Cahoots Tabs ===
      case 'ic_reservation': {
        const s = config.settings;
        const suitePhotos = (config.settings?.custom_images as string[])?.length > 0 ? (config.settings.custom_images as string[]) : DEFAULT_SUITE_PHOTOS;
        const allItems = ADD_ON_CATEGORIES.flatMap(c => c.items);
        const selectedAddOns = allItems.filter(item => (addOnSelections[item.name] || 0) > 0);
        const addOnTotal = selectedAddOns.reduce((sum, item) => sum + item.price * (addOnSelections[item.name] || 0), 0);

        // Compute due date: 2 weeks before arrival/start
        let dueDate: string | null = null;
        if (s?.date_display_type === 'date_range' && s?.arrival_date) {
          const arrival = new Date(s.arrival_date + 'T00:00:00');
          const due = new Date(arrival);
          due.setDate(due.getDate() - 14);
          dueDate = format(due, 'MMMM d, yyyy');
        } else if (s?.date_display_type === 'time_range' && s?.start_time) {
          const start = new Date(s.start_time);
          const due = new Date(start);
          due.setDate(due.getDate() - 14);
          dueDate = format(due, 'MMMM d, yyyy');
        }

        const isTransportPartner = config.dashboard_type === 'transport_partner';

        return (
          <div className="space-y-4">
            {/* Date/Time Info */}
            {s?.date_display_type && (
              <Card className="bg-slate-800/70 border-amber-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    {isTransportPartner ? 'Trip Details' : s.date_display_type === 'date_range' ? 'Stay Details' : 'Event Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {s.date_display_type === 'date_range' ? (
                      <>
                        <div className="bg-slate-700/40 border border-slate-600/40 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Arrival</p>
                          <p className="text-lg font-bold text-white">{s.arrival_date ? format(new Date(s.arrival_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}</p>
                        </div>
                        <div className="bg-slate-700/40 border border-slate-600/40 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Departure</p>
                          <p className="text-lg font-bold text-white">{s.departure_date ? format(new Date(s.departure_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-700/40 border border-slate-600/40 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Start Time</p>
                          <p className="text-lg font-bold text-white">{s.start_time ? format(new Date(s.start_time), 'MMM d, h:mm a') : '—'}</p>
                        </div>
                        <div className="bg-slate-700/40 border border-slate-600/40 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">End Time</p>
                          <p className="text-lg font-bold text-white">{s.end_time ? format(new Date(s.end_time), 'MMM d, h:mm a') : '—'}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Pickup & Dropoff Locations */}
                  {(s?.pickup_location || s?.dropoff_location) && (
                    <div className="grid grid-cols-2 gap-4">
                      {s.pickup_location && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">📍 Pickup Location</p>
                          <p className="text-sm font-semibold text-white">{s.pickup_location}</p>
                        </div>
                      )}
                      {s.dropoff_location && (
                        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-center">
                          <p className="text-xs text-sky-400 uppercase tracking-wider mb-1">📍 Dropoff Location</p>
                          <p className="text-sm font-semibold text-white">{s.dropoff_location}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Photos */}
            <Card className="bg-slate-800/70 border-amber-500/20 text-white">
              <CardHeader>
                <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {isTransportPartner ? `${config.company_name} Fleet & Services` : 'Suite Photos'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {suitePhotos.map((photo, idx) => (
                    <img key={idx} src={photo} alt={`${isTransportPartner ? 'Fleet' : 'Suite'} ${idx+1}`} className="rounded-lg hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full cursor-pointer" onClick={() => openLightbox(suitePhotos, idx)} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add-On Summary */}
            {selectedAddOns.length > 0 && (
              <Card className="bg-slate-800/70 border-emerald-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-emerald-300 flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Selected Add-Ons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedAddOns.map(item => {
                    const qty = addOnSelections[item.name] || 1;
                    return (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <span className="text-white">{item.name}</span>
                          {qty > 1 && <span className="text-slate-400">×{qty}</span>}
                        </div>
                        <span className="text-emerald-300 font-semibold">${(item.price * qty).toFixed(0)}</span>
                      </div>
                    );
                  })}
                  <Separator className="bg-slate-700/50" />
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white">Add-Ons Total</span>
                    <span className="text-emerald-300 text-lg">${addOnTotal.toFixed(0)}</span>
                  </div>
                  {dueDate && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center mt-2">
                      <p className="text-xs text-amber-400 uppercase tracking-wider">Payment Due By</p>
                      <p className="text-base font-bold text-amber-300 mt-1">{dueDate}</p>
                      <p className="text-xs text-slate-400 mt-1">2 weeks before arrival</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Due date even without add-ons */}
            {selectedAddOns.length === 0 && dueDate && (
              <Card className="bg-slate-800/70 border-amber-500/20 text-white">
                <CardContent className="py-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-400 uppercase tracking-wider">Payment Due By</p>
                    <p className="text-base font-bold text-amber-300 mt-1">{dueDate}</p>
                    <p className="text-xs text-slate-400 mt-1">2 weeks before arrival</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      }

      case 'ic_concierge':
        return <InnCahootsAddOns openExternalLink={openExternalLink} selections={addOnSelections} onSelectionsChange={setAddOnSelections} />;

      case 'ic_transport':
        return <TransportTabContent openExternalLink={openExternalLink} openLightbox={openLightbox} guestCount={15} />;

      case 'ic_alcohol':
        return (
          <div className="space-y-4">
            <div className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-4 py-3">
              <p className="text-sm text-purple-200 text-center leading-relaxed">
                <span className="font-semibold text-purple-300">Party on Delivery</span> is a concierge and alcohol delivery business and an official partner with {config.company_name}, providing delivery and concierge services to our amazing guests. Let them handle the details so you can focus on having the best weekend ever.
              </p>
            </div>

            {/* Service Photo Tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {[
                { label: "Pre-Arrival Alcohol Delivery", img: tileSuiteDelivery },
                { label: "Direct-to-Boat Alcohol Delivery", img: tileBoatDelivery },
                { label: "Cocktail Bar Setups", img: tileCocktailBar },
                { label: "Stock the Fridge Service", img: tileStockFridge },
                { label: "Group Ordering & Split Pay", img: tileGroupOrdering },
              ].map((tile) => (
                <div key={tile.label} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={tile.img} alt={tile.label} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col items-center justify-end p-3">
                    <span className="text-white text-xs sm:text-sm font-bold text-center leading-tight">{tile.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-amber-500/10 p-6 sm:p-8 flex flex-col items-center gap-4 text-center">
              <div className="text-4xl">🎉</div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Ready to Order?</h3>
              <p className="text-slate-300 text-sm max-w-md">
                Browse cocktail kits, beer, wine, liquor, and party supplies — delivered straight to your suite or boat.
              </p>
              <a
                href={config.settings?.alcohol_delivery_url || "https://partyondelivery.com/dashboard/CRHAE2"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-colors text-base"
              >
                <ExternalLink className="h-5 w-5" />
                Open Party On Delivery Store
              </a>
            </div>
          </div>
        );

      case 'ic_map':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-slate-800/70 border-amber-500/20 text-white">
              <CardHeader><CardTitle className="text-lg text-amber-300 flex items-center gap-2"><MapPin className="h-5 w-5" />Map & Directions</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div className="rounded-lg overflow-hidden border border-amber-500/20">
                  <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445!2d-97.727!3d30.264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s1221+E+6th+St+Austin+TX+78702!5e0!3m2!1sen!2sus!4v1700000000000" width="100%" height="250" style={{ border: 0 }} allowFullScreen loading="lazy" title="Location" />
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-white">{config.company_name}</p>
                  <p>1221 E 6th St, Austin, TX 78702</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/70 border-amber-500/20 text-white">
              <CardHeader><CardTitle className="text-lg text-amber-300 flex items-center gap-2"><FileText className="h-5 w-5" />House Rules & Info</CardTitle></CardHeader>
              <CardContent className="text-slate-300">
                <ul className="text-sm space-y-2.5">
                  <li className="flex gap-2"><span className="text-emerald-400">✅</span><span>Check-in: 3:00 PM / Check-out: 11:00 AM</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✅</span><span>Private kitchen — cook and store your own food</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✅</span><span>BYOB — Stock the suite with your own drinks</span></li>
                  <li className="flex gap-2"><span className="text-red-400">❌</span><span>No smoking indoors</span></li>
                  <li className="flex gap-2"><span className="text-red-400">❌</span><span>No excessive noise after 10 PM</span></li>
                  <li className="flex gap-2"><span className="text-red-400">❌</span><span>No pets allowed</span></li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'ic_boats':
        return (
          <div className="space-y-6">
            {/* Highlight Video */}
            <div className="rounded-xl overflow-hidden border border-sky-500/20 aspect-video w-full">
              <video
                src="/videos/PPC_Non-Bach_Compilation.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="bg-gradient-to-r from-sky-500/15 to-purple-500/10 border border-sky-500/30 rounded-xl p-3 sm:p-6 flex items-center gap-3">
              <img src={ppcLogo.src} alt="Premier Party Cruises" className="h-10 w-10 sm:h-16 sm:w-16 rounded-full shrink-0" />
              <div className="flex-1 text-center min-w-0">
                <h2 className="text-sm sm:text-2xl font-bold text-white">Premier Party Cruises</h2>
                <p className="text-sky-300 text-[11px] sm:text-sm mt-1">Austin's #1 party boat experience on Lake Travis. BYOB, professional DJ, photographer & giant floats included on disco cruises!</p>
              </div>
              <img src={ppcLogo.src} alt="Premier Party Cruises" className="h-10 w-10 sm:h-16 sm:w-16 rounded-full hidden sm:block shrink-0" />
            </div>

            {/* Service Photo Tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {[
                { label: "Private Cruises", img: tilePrivateCruises },
                { label: "All Inclusive Party Packages", img: tileAllInclusive },
                { label: "ATX Disco Cruise", img: tileDiscoCruise },
                { label: "Discount Transportation", img: tileDiscountTransport },
                { label: "Direct to Boat Alcohol Delivery", img: tileBoatDelivery },
              ].map((tile) => (
                <div key={tile.label} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={tile.img} alt={tile.label} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col items-center justify-end p-3">
                    <span className="text-white text-xs sm:text-sm font-bold text-center leading-tight">{tile.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={() => document.getElementById('dynamic-quote-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                <FileText className="h-4 w-4 mr-2" /> Get a Quote
              </Button>
              <Button onClick={() => document.getElementById('dynamic-booking-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-sky-600 hover:bg-sky-500 text-white">
                <Anchor className="h-4 w-4 mr-2" /> Book Now
              </Button>
            </div>

            {/* ATX Disco Cruise */}
            <Card className="bg-slate-800/70 border-sky-500/20 text-white">
              <CardHeader className="px-3 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <img src={atxDiscoCruiseLogo.src} alt="ATX Disco Cruise" className="h-16 w-16 sm:h-28 sm:w-28 object-contain shrink-0" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-4xl text-sky-300 text-center">
                      🪩 The ATX Disco Cruise
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 text-center">Exclusively for Bachelorette and Bachelor Parties</p>
                  </div>
                  <img src={atxDiscoCruiseLogo.src} alt="ATX Disco Cruise" className="h-16 w-16 sm:h-28 sm:w-28 object-contain shrink-0 hidden sm:block" />
                </div>
                <CardDescription className="text-slate-400 text-center text-xs sm:text-sm">
                  Per-person tickets — DJ, photographer, giant floats, disco ball cups & more included!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-sky-500/20 aspect-video w-full">
                  <iframe
                    src="https://www.youtube.com/embed/USWZ3BrexEI?autoplay=1&mute=1&loop=1&playlist=USWZ3BrexEI&playsinline=1"
                    title="ATX Disco Cruise Experience"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { day: "Friday", time: "12–4 PM", price: "$95/person" },
                    { day: "Saturday", time: "11 AM–3 PM", price: "$105/person" },
                    { day: "Saturday", time: "3:30–7:30 PM", price: "$85/person" },
                  ].map((slot) => (
                    <div key={slot.time} className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white text-sm">{slot.day}</p>
                        <p className="text-xs text-purple-300">{slot.time}</p>
                      </div>
                      <p className="text-emerald-300 font-bold text-lg">{slot.price}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 text-center">Prices before gratuity (20%), tax (8.25%) & booking fee (3%)</p>

                <h4 className="text-sm font-semibold text-sky-300 uppercase tracking-wider pt-2">The Disco Cruise Experience</h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <div
                    className="relative rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden aspect-square group"
                    onClick={() => openLightbox([slideDisco, ...experiencePhotos], 0)}
                  >
                    <img src={slideDisco.src} alt="ATX Disco Cruise details & pricing" className="object-cover object-top w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col items-center justify-end pb-2 px-1">
                      <span className="text-white text-[10px] sm:text-xs font-bold text-center leading-tight">📋 Tap for Details</span>
                    </div>
                  </div>
                  {experiencePhotos.map((photo, idx) => (
                    <img
                      key={`disco-${idx}`}
                      src={photo}
                      alt={`Disco cruise experience ${idx + 1}`}
                      className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-square w-full"
                      onClick={() => openLightbox([slideDisco, ...experiencePhotos], idx + 1)}
                    />
                  ))}
                </div>

                <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2 text-sm">✨ Every Disco Cruise Ticket Includes:</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-300">
                    <span>🎵 Professional DJ</span>
                    <span>📸 Professional Photographer</span>
                    <span>🦄 Largest Unicorn Float in the Country</span>
                    <span>🏖️ 3 Giant 6'x20' Lily Pad Floats</span>
                    <span>🧊 Private Cooler + 30lbs Ice</span>
                    <span>🪩 Disco Ball Necklace for VIP</span>
                    <span>🥤 Souvenir ATX Disco Cruise Koozies</span>
                    <span>💧 Ice Water Stations</span>
                    <span>🫧 Bubble Wands</span>
                    <span>📛 Name Tags</span>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3 text-sm">🪩 Available Disco Cruise Add-Ons:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-300">
                    <span>• Combined Bride/Groom Sparkle Package — <strong className="text-purple-300">$175</strong></span>
                    <span>• Bride Sparkle Package — <strong className="text-purple-300">$100</strong></span>
                    <span>• Groom Sparkle Package — <strong className="text-purple-300">$100</strong></span>
                    <span>• Mimosa Party Cooler — <strong className="text-purple-300">$100</strong></span>
                    <span>• 5 Disco Ball Cups — <strong className="text-purple-300">$40</strong></span>
                    <span>• Disco Queen Package Upgrade — <strong className="text-emerald-300">Free</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Private Cruise Boats */}
            <Card className="bg-slate-800/70 border-sky-500/20 text-white">
              <CardHeader className="px-3 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <img src={ppcLogo.src} alt="Premier Party Cruises" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-contain shrink-0" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-3xl text-sky-300 text-center">
                      ⛵ Private Party Cruises for up to 14, 25, 50-75 Guests
                    </CardTitle>
                  </div>
                  <img src={ppcLogo.src} alt="Premier Party Cruises" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-contain shrink-0 hidden sm:block" />
                </div>
                <CardDescription className="text-slate-400 text-center text-xs sm:text-sm">
                  Rent a whole boat for your group — BYOB, pick your time, bring your own vibe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(boatPhotosMap).map(([boatName, boat]) => (
                  <div key={boatName} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white text-base">{boatName}</h3>
                        <p className="text-xs text-sky-300">{boat.capacity}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{boat.description}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      <div
                        className="relative rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden aspect-[4/3] group"
                        onClick={() => openLightbox([boat.slide, ...boat.photos], 0)}
                      >
                        <img src={boat.slide} alt={`${boatName} details & pricing`} className="object-cover object-top w-full h-full" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col items-center justify-end pb-2 px-1">
                          <span className="text-white text-[10px] sm:text-xs font-bold text-center leading-tight">📋 Tap for Details & Pricing</span>
                        </div>
                      </div>
                      {boat.photos.map((photo, idx) => (
                        <img
                          key={`${boatName}-${idx}`}
                          src={photo}
                          alt={`${boatName} photo ${idx + 1}`}
                          className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full"
                          onClick={() => openLightbox([boat.slide, ...boat.photos], idx + 1)}
                        />
                      ))}
                    </div>
                    {boatName !== "Clever Girl" && <Separator className="bg-slate-700/50" />}
                  </div>
                ))}

                <Separator className="bg-sky-500/20 mt-4" />
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-white mb-3 text-sm">🎉 Available Private Cruise Add-Ons:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-300">
                    <span>• Ultimate Disco Package + Pre-Party Setup — <strong className="text-sky-300">$350</strong></span>
                    <span>• Essentials Package + Pre-Party Setup — <strong className="text-sky-300">$200</strong></span>
                    <span>• Additional 1–25 Guests — <strong className="text-sky-300">$400</strong></span>
                    <span>• Professional Photographer — <strong className="text-sky-300">$600</strong></span>
                    <span>• Professional DJ — <strong className="text-sky-300">$600</strong></span>
                    <span>• Bartender Service — <strong className="text-sky-300">$600</strong></span>
                    <span>• Party-Cooler Setup — <strong className="text-sky-300">$150</strong></span>
                    <span>• Mimosa Party Cooler — <strong className="text-sky-300">$100</strong></span>
                    <span>• Lily Pad Float (6'×20') — <strong className="text-sky-300">$50</strong></span>
                    <span>• 5 Disco Ball Cups — <strong className="text-sky-300">$30</strong></span>
                    <span>• 5 Premier Koozies — <strong className="text-sky-300">$20</strong></span>
                    <span>• Personal Unicorn Float — <strong className="text-sky-300">$20</strong></span>
                    <span>• 20-Lb Bags of Ice — <strong className="text-sky-300">$8</strong></span>
                    <span>• Bubble Wands — <strong className="text-sky-300">$3</strong></span>
                    <span>• Party On Delivery — <strong className="text-emerald-300">Free</strong></span>
                    <span>• Fetii Ride 25% Discount — <strong className="text-emerald-300">Free</strong></span>
                    <span>• $50 POD Voucher — <strong className="text-emerald-300">Free</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Private Cruise Pricing Slides */}
            <Card className="bg-slate-800/70 border-sky-500/20 text-white">
              <CardHeader>
                <CardTitle className="text-lg text-sky-300 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Private Cruise Pricing & Details
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Tap any card to see full details, pricing, and add-ons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Up to 14 Guests", boat: "Day Tripper", slide: slide14 },
                    { label: "Up to 25 Guests", boat: "Meeseeks / The Irony", slide: slide25 },
                    { label: "Up to 50-75 Guests", boat: "Clever Girl", slide: slide50 },
                  ].map((tier) => (
                    <div
                      key={tier.label}
                      className="relative rounded-xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-sky-400/60 transition-all"
                      onClick={() => openLightbox([tier.slide], 0)}
                    >
                      <img src={tier.slide} alt={tier.label} className="w-full object-cover object-top aspect-[3/4]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col items-center justify-end pb-4 px-2">
                        <p className="font-bold text-white text-sm">{tier.label}</p>
                        <p className="text-xs text-sky-300">{tier.boat}</p>
                        <p className="text-[10px] text-yellow-300 mt-1 font-semibold">📋 Tap to View Full Details</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quote Builder */}
            <div id="dynamic-quote-section" />
            <Card className="bg-slate-800/70 border-sky-500/20 text-white overflow-hidden">
              <CardHeader className="px-2 sm:px-6">
                <CardTitle className="text-base sm:text-lg text-sky-300 flex items-center gap-2">
                  <FileText className="h-5 w-5 shrink-0" />
                  Get an Instant Quote
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs sm:text-sm">
                  Select your date, party type, and group size to see exact pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <iframe
                  src={quoteEmbedUrl}
                  title="Quote Builder"
                  className="w-full border-none"
                  style={{ minHeight: '900px', height: '900px' }}
                  allow="payment; clipboard-write"
                />
              </CardContent>
            </Card>

            {/* Xola Booking */}
            <div id="dynamic-booking-section" />
            <Card className="bg-slate-800/70 border-sky-500/20 text-white overflow-hidden">
              <CardHeader className="px-2 sm:px-6">
                <CardTitle className="text-lg sm:text-xl text-sky-300 text-center">
                  ⛵ Book Your Boat Now
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-4">
                <XolaBookingWidget />
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="bg-gradient-to-r from-sky-500/15 to-emerald-500/10 border border-sky-500/30 rounded-xl p-6 text-center space-y-3">
              <p className="text-white font-bold text-lg">Questions? We're here to help!</p>
              <p className="text-sky-300 text-sm">Text or call us anytime</p>
              <a href="tel:5125765460" className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg text-lg transition-colors">
                📞 (512) 576-5460
              </a>
            </div>
          </div>
        );

      // === Lead Dashboard Tabs ===
      case 'ld_quote':
        return (
          <Card className="bg-slate-800/70 border-sky-500/20 text-white overflow-hidden">
            <CardHeader><CardTitle className="text-lg text-sky-300 flex items-center gap-2"><FileText className="h-5 w-5" />Quote Builder</CardTitle></CardHeader>
            <CardContent className="p-0">
              <iframe src={quoteEmbedUrl} title="Quote Builder" className="w-full border-none" style={{ minHeight: '900px', height: '900px' }} allow="payment; clipboard-write" />
            </CardContent>
          </Card>
        );

      case 'ld_booking':
        return <XolaBookingWidget />;

      case 'ld_photos':
      case 'cd_photos':
        return (
          <Card className="bg-slate-800/70 border-sky-500/20 text-white">
            <CardHeader><CardTitle className="text-lg text-sky-300 flex items-center gap-2"><Camera className="h-5 w-5" />Our Boats & Experience</CardTitle></CardHeader>
            <CardContent>
              {Object.entries(allBoatPhotos).map(([name, photos]) => (
                <div key={name} className="mb-6">
                  <h3 className="text-sm font-semibold text-sky-300 mb-3 uppercase tracking-wider">{name}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {photos.map((photo, idx) => (
                      <img key={idx} src={photo} alt={`${name} ${idx+1}`} className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full" onClick={() => openLightbox(photos, idx)} />
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <h3 className="text-sm font-semibold text-sky-300 mb-3 uppercase tracking-wider">Experience Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {experiencePhotos.map((photo, idx) => (
                    <img key={idx} src={photo} alt={`Experience ${idx+1}`} className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full" onClick={() => openLightbox(experiencePhotos, idx)} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'ld_transport':
      case 'cd_transport':
        return <TransportTabContent openExternalLink={openExternalLink} openLightbox={openLightbox} guestCount={15} />;

      case 'ld_alcohol':
      case 'cd_alcohol':
        return (
          <div className="space-y-4">
            <div className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-4 py-3">
              <p className="text-sm text-purple-200 text-center leading-relaxed">
                <span className="font-semibold text-purple-300">Party on Delivery</span> is a concierge and alcohol delivery business providing delivery and concierge services to our amazing guests. Let them handle the details so you can focus on having the best weekend ever.
              </p>
            </div>

            {/* Service Photo Tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {[
                { label: "Pre-Arrival Alcohol Delivery", img: tileSuiteDelivery },
                { label: "Direct-to-Boat Alcohol Delivery", img: tileBoatDelivery },
                { label: "Cocktail Bar Setups", img: tileCocktailBar },
                { label: "Stock the Fridge Service", img: tileStockFridge },
                { label: "Group Ordering & Split Pay", img: tileGroupOrdering },
              ].map((tile) => (
                <div key={tile.label} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={tile.img} alt={tile.label} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col items-center justify-end p-3">
                    <span className="text-white text-xs sm:text-sm font-bold text-center leading-tight">{tile.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-amber-500/10 p-6 sm:p-8 flex flex-col items-center gap-4 text-center">
              <div className="text-4xl">🎉</div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Ready to Order?</h3>
              <p className="text-slate-300 text-sm max-w-md">
                Browse cocktail kits, beer, wine, liquor, and party supplies — delivered straight to your suite or boat.
              </p>
              <a
                href={config.settings?.alcohol_delivery_url || "https://partyondelivery.com/dashboard/CRHAE2"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-colors text-base"
              >
                <ExternalLink className="h-5 w-5" />
                Open Party On Delivery Store
              </a>
            </div>
          </div>
        );



      case 'ld_map':
      case 'cd_map':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-slate-800/70 border-sky-500/20 text-white">
              <CardHeader><CardTitle className="text-lg text-sky-300 flex items-center gap-2"><MapPin className="h-5 w-5" />Map & Directions</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div className="rounded-lg overflow-hidden border border-sky-500/20">
                  <iframe src="https://maps.google.com/maps?q=Anderson+Mill+Marina,+Leander,+TX&t=&z=15&ie=UTF8&iwloc=&output=embed" width="100%" height="250" style={{ border: 0 }} allowFullScreen loading="lazy" title="Anderson Mill Marina" />
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-white">Anderson Mill Marina</p>
                  <p>13993 FM 2769, Leander, TX 78641</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/70 border-sky-500/20 text-white">
              <CardHeader><CardTitle className="text-lg text-sky-300 flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Boat Rules</CardTitle></CardHeader>
              <CardContent className="text-slate-300">
                <ul className="text-sm space-y-2.5">
                  <li className="flex gap-2"><span className="text-emerald-400">✅</span><span>BYOB — no glass containers</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✅</span><span>Non-marking shoes recommended</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✅</span><span>Arrive 15 minutes before departure</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✅</span><span>You can swim!</span></li>
                  <li className="flex gap-2"><span className="text-red-400">❌</span><span>No glass bottles</span></li>
                  <li className="flex gap-2"><span className="text-red-400">❌</span><span>No smoking on the boat</span></li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      // === Customer Dashboard Tabs (simplified for dynamic use) ===
      case 'cd_reservation':
        return (
          <Card className="bg-slate-800/70 border-sky-500/20 text-white">
            <CardHeader><CardTitle className="text-lg text-sky-300">Booking Details</CardTitle></CardHeader>
            <CardContent className="text-slate-300 text-sm">
              <p>This tab displays booking details when linked to a specific booking. Configure the dashboard URL with <code className="bg-slate-700 px-1 rounded">?booking=ID</code> to load real data.</p>
            </CardContent>
          </Card>
        );

      case 'cd_addons':
        return (
          <Card className="bg-slate-800/70 border-sky-500/20 text-white">
            <CardHeader><CardTitle className="text-lg text-sky-300">Add-On Store</CardTitle></CardHeader>
            <CardContent className="text-slate-300 text-sm">
              <p>The add-on store requires a booking context. Link to this dashboard with <code className="bg-slate-700 px-1 rounded">?booking=ID</code> to enable the store.</p>
            </CardContent>
          </Card>
        );

      case 'cd_stays':
        return (
          <div className="space-y-4">
            <Card className="bg-slate-800/70 border-sky-500/20 text-white">
              <CardHeader>
                <CardTitle className="text-lg text-sky-300 flex items-center gap-2"><Home className="h-5 w-5" />Inn Cahoots — Austin's Premier Group Stay</CardTitle>
                <CardDescription className="text-slate-400">Condo-style suites on East 6th Street, perfect for bach parties.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "The Penthouse Suite", image: DEFAULT_SUITE_PHOTOS[1], sleeps: "8–10", beds: "3BR • 2BA", price: "From $450/night" },
                  { name: "The Bunk Suite", image: DEFAULT_SUITE_PHOTOS[0], sleeps: "10–14", beds: "4BR • 3BA", price: "From $550/night" },
                  { name: "The Loft Suite", image: DEFAULT_SUITE_PHOTOS[2], sleeps: "6–8", beds: "2BR • 2BA", price: "From $350/night" },
                ].map((suite, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-4 bg-slate-700/40 border border-slate-600/40 rounded-lg overflow-hidden">
                    <img src={suite.image} alt={suite.name} className="w-full sm:w-48 h-36 sm:h-auto object-cover shrink-0" />
                    <div className="p-4 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white">{suite.name}</h3>
                        <span className="text-emerald-300 font-bold text-sm whitespace-nowrap">{suite.price}</span>
                      </div>
                      <p className="text-xs text-sky-300">{suite.beds} • Sleeps {suite.sleeps}</p>
                    </div>
                  </div>
                ))}
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 text-center space-y-3">
                  <p className="text-sm text-slate-300">📍 <strong className="text-white">1221 E 6th St, Austin, TX 78702</strong></p>
                  <Button onClick={() => openExternalLink("https://www.inncahoots.com/listings")} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                    <ExternalLink className="h-4 w-4 mr-2" /> Book a Suite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'cd_waiver':
        return (
          <Card className="bg-slate-800/70 border-sky-500/20 text-white">
            <CardHeader><CardTitle className="text-lg text-sky-300">Waiver</CardTitle></CardHeader>
            <CardContent className="text-slate-300 text-sm">
              <p>The waiver tab requires a booking context. Link with <code className="bg-slate-700 px-1 rounded">?booking=ID</code> to show waiver progress.</p>
            </CardContent>
          </Card>
        );

      case 'cd_pay':
        return (
          <Card className="bg-slate-800/70 border-sky-500/20 text-white">
            <CardHeader><CardTitle className="text-lg text-sky-300">Pay Balance</CardTitle></CardHeader>
            <CardContent className="text-slate-300 text-sm">
              <p>The payment tab requires a booking context. Link with <code className="bg-slate-700 px-1 rounded">?booking=ID</code> to enable payments.</p>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card className="bg-slate-800/70 border-sky-500/20 text-white">
            <CardContent className="py-8 text-center text-slate-400">
              Tab "{tab.label}" content placeholder
            </CardContent>
          </Card>
        );
    }
  };

  // Map tab IDs to hero images and display labels for Inn Cahoots template
  const tabCardMap: Record<string, { image: string; label: string; subtitle: string }> = {
    // Inn Cahoots tabs
    ic_alcohol: { image: alcoholDeliveryImg.src, label: "Alcohol Delivery", subtitle: "Get drinks delivered to your suite or boat" },
    ic_boats: { image: boatRentalsImg.src, label: "⛵ Boat Rentals", subtitle: "Austin's #1 party boats on Lake Travis" },
    ic_concierge: { image: conciergeServicesImg.src, label: "Concierge Services", subtitle: "Add-ons, upgrades & party extras" },
    ic_reservation: { image: tileSuiteDelivery.src, label: "Reservation", subtitle: "Suite details & payment info" },
    ic_transport: { image: tileDiscountTransport.src, label: "Transport", subtitle: "Get to the lake in style" },
    ic_map: { image: conciergeServicesImg.src, label: "Map & Info", subtitle: "Location, directions & house rules" },
    // Customer Dashboard tabs
    cd_reservation: { image: boatRentalsImg.src, label: "Reservation", subtitle: "Booking details & payment breakdown" },
    cd_addons: { image: conciergeServicesImg.src, label: "Add-Ons", subtitle: "Upgrades & party extras" },
    cd_photos: { image: tileAllInclusive.src, label: "Photos", subtitle: "Boat & experience photo galleries" },
    cd_transport: { image: tileDiscountTransport.src, label: "Transport", subtitle: "Get to the lake in style" },
    cd_stays: { image: tileSuiteDelivery.src, label: "Places to Stay", subtitle: "Condo-style suites on East 6th" },
    cd_waiver: { image: boatRentalsPlainImg.src, label: "Waiver", subtitle: "Sign & share your waiver" },
    cd_alcohol: { image: alcoholDeliveryImg.src, label: "Alcohol Delivery", subtitle: "Get drinks delivered to your suite or boat" },
    cd_map: { image: boatRentalsPlainImg.src, label: "Map & Rules", subtitle: "Marina directions & boat rules" },
    cd_pay: { image: conciergeServicesImg.src, label: "Pay Balance", subtitle: "Pay your remaining balance" },
    // Lead Dashboard tabs
    ld_quote: { image: boatRentalsImg.src, label: "Quote Builder", subtitle: "Get an instant quote" },
    ld_booking: { image: tileAllInclusive.src, label: "Book Now", subtitle: "Book your boat directly" },
    ld_photos: { image: tileAllInclusive.src, label: "Photos", subtitle: "Boat & experience photo galleries" },
    ld_transport: { image: tileDiscountTransport.src, label: "Transport", subtitle: "Get to the lake in style" },
    ld_alcohol: { image: alcoholDeliveryImg.src, label: "Alcohol Delivery", subtitle: "Get drinks delivered to your suite or boat" },
    ld_map: { image: boatRentalsPlainImg.src, label: "Map & Rules", subtitle: "Marina directions & boat rules" },
  };

  const isInnCahootsTemplate = config.settings?.template === 'inn_cahoots';

  // Resolve partner logo from website URL (with local overrides for known partners)
  const partnerLogoUrl = (() => {
    const websiteUrl = config.settings?.partner_website_url;
    if (!websiteUrl) return null;
    try {
      const domain = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname;
      // Local logo overrides for partners not indexed by Clearbit
      // Check for custom uploaded logo first
      const customLogoUrl = config.settings?.custom_logo_url;
      if (customLogoUrl) return customLogoUrl;

      const logoOverrides: Record<string, string> = {
        'fivestarvacationhomerentals.com': fiveStarLogo,
        'www.fivestarvacationhomerentals.com': fiveStarLogo,
        'chicktripsatx.com': chickTripsLogo,
        'www.chicktripsatx.com': chickTripsLogo,
        'lynnslodging.com': lynnsLodgingLogo,
        'www.lynnslodging.com': lynnsLodgingLogo,
      };
      return logoOverrides[domain] || `https://logo.clearbit.com/${domain}`;
    } catch { return null; }
  })();
  const partnerFaviconUrl = (() => {
    const websiteUrl = config.settings?.partner_website_url;
    if (!websiteUrl) return null;
    try {
      const domain = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch { return null; }
  })();

  if (isInnCahootsTemplate) {
    const tabCards = tabDefs.map(tab => ({
      id: tab.id,
      label: tabCardMap[tab.id]?.label || tab.label,
      image: tabCardMap[tab.id]?.image || alcoholDeliveryImg,
      subtitle: tabCardMap[tab.id]?.subtitle || tab.description,
    }));

    return (
      <>
        <SEOHead title={`${config.name} — ${config.company_name}`} description={`${config.company_name} dashboard`} />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 w-full">
          {/* Inn Cahoots-style Header */}
          <div className="bg-slate-800/60 border-b border-sky-500/20 backdrop-blur-sm relative">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center">
              <div className="logo-shimmer-wrap relative overflow-hidden inline-block">
                <img
                  src={partnerLogoUrl || innCahootsLogo}
                  alt={config.company_name}
                  className="h-16 sm:h-28 object-contain logo-shimmer"
                  onError={(e) => {
                    if (partnerFaviconUrl && (e.target as HTMLImageElement).src !== partnerFaviconUrl) {
                      (e.target as HTMLImageElement).src = partnerFaviconUrl;
                    }
                  }}
                />
              </div>
              <p className="text-white text-xl sm:text-2xl font-bold mt-1 uppercase tracking-widest">
                Guest Concierge
              </p>
            </div>
            <style>{`
              .logo-shimmer {
                animation: shimmerFadeIn 19.2s ease-in-out both;
              }
              @keyframes shimmerFadeIn {
                0% { opacity: 0; filter: brightness(0.6); }
                20% { opacity: 1; filter: brightness(1.6); }
                40% { filter: brightness(0.9); }
                60% { filter: brightness(1.4); }
                80% { filter: brightness(1.1); }
                100% { opacity: 1; filter: brightness(1); }
              }
              .logo-shimmer-wrap::after {
                content: '';
                position: absolute;
                top: 0; left: -100%; width: 50%; height: 100%;
                background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.7) 55%, transparent 70%);
                animation: shimmerSweep 6s ease-in-out 0.5s forwards;
                pointer-events: none;
              }
              @keyframes shimmerSweep {
                0% { left: -100%; }
                100% { left: 250%; }
              }
            `}</style>
          </div>

          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
              <TabsList className={`bg-transparent p-0 h-auto w-full grid gap-1.5 sm:gap-4 rounded-b-none mb-0`} style={{ gridTemplateColumns: `repeat(${tabCards.length}, 1fr)` }}>
                {tabCards.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="p-0 h-auto rounded-xl transition-all duration-300 overflow-hidden relative group
                      data-[state=active]:rounded-b-none data-[state=active]:shadow-lg data-[state=active]:shadow-amber-400/20
                      border-2 sm:border-4 border-transparent
                      data-[state=active]:border-amber-400 data-[state=active]:border-b-0
                      data-[state=inactive]:rounded-xl data-[state=inactive]:border-slate-600/50"
                  >
                    <div className="aspect-[4/3] sm:aspect-[16/9] relative w-full">
                      <img src={tab.image} alt={tab.label} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5" />
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 sm:pb-4 px-2">
                        <h3 className="text-[11px] sm:text-lg font-black text-white tracking-tight drop-shadow-lg leading-tight text-center px-1">
                          {tab.label}
                        </h3>
                        <p className="text-[9px] sm:text-xs text-amber-200/70 mt-0.5 drop-shadow hidden sm:block font-medium">{tab.subtitle}</p>
                      </div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Content area with connector strip */}
              <div className="border-2 sm:border-4 border-amber-400 border-t-0 rounded-b-xl bg-slate-900/60 backdrop-blur-sm">
                {/* Connector strip */}
                <div className="flex items-stretch -mx-[2px] sm:-mx-[4px] h-[2px] sm:h-[4px] -mt-px">
                  {tabCards.map((tab, i) => {
                    const isActive = activeTab === tab.id;
                    const isFirst = i === 0;
                    const isLast = i === tabCards.length - 1;
                    return (
                      <div key={tab.id} className="contents">
                        {isFirst && <div className={`w-[2px] sm:w-[4px] ${isActive ? '' : 'bg-amber-400'}`} />}
                        <div className={`flex-1 ${isActive ? '' : 'bg-amber-400'}`} />
                        {!isLast && <div className="w-[6px] sm:w-[16px] bg-amber-400" />}
                        {isLast && <div className={`w-[2px] sm:w-[4px] ${isActive ? '' : 'bg-amber-400'}`} />}
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 sm:p-6">
                  {tabDefs.map(tab => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                      {renderTabContent(tab)}
                    </TabsContent>
                  ))}
                </div>
              </div>
            </Tabs>

            <div className="mt-8 pb-8 text-center text-sm text-slate-500">
              <p>Questions? Contact us at <a href="mailto:info@partyondelivery.com" className="text-amber-400 underline">info@partyondelivery.com</a></p>
              <p className="mt-1">© {new Date().getFullYear()} {config.company_name} • Austin, TX</p>
            </div>
          </div>
        </div>

        <Lightbox images={lightboxImages} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
      </>
    );
  }

  // Default template rendering
  return (
    <>
      <SEOHead title={`${config.name} — ${config.company_name}`} description={`${config.company_name} dashboard`} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800/60 border-b border-sky-500/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-4">
            {partnerLogoUrl ? (
              <img
                src={partnerLogoUrl}
                alt={config.company_name}
                className="h-14 w-auto object-contain rounded"
                onError={(e) => {
                  if (partnerFaviconUrl && (e.target as HTMLImageElement).src !== partnerFaviconUrl) {
                    (e.target as HTMLImageElement).src = partnerFaviconUrl;
                  }
                }}
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Home className="h-7 w-7 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{config.name}</h1>
              <p className="text-amber-300 text-sm">{config.company_name}</p>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <Tabs defaultValue={tabDefs[0]?.id} className="space-y-4">
            <TabsList className="bg-slate-800/80 border border-sky-500/20 w-full flex-wrap h-auto p-1 gap-1">
              {tabDefs.map(tab => {
                const IconComp = ICON_MAP[tab.icon];
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`${tab.activeColor} data-[state=active]:text-white ${tab.textColor} text-xs sm:text-sm flex-1 min-w-[80px]`}
                  >
                    {IconComp && <IconComp className="h-3.5 w-3.5 mr-1 hidden sm:inline" />}
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {tabDefs.map(tab => (
              <TabsContent key={tab.id} value={tab.id}>
                {renderTabContent(tab)}
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-8 pb-8 text-center text-sm text-slate-500">
            <p>Powered by Premier Party Cruises</p>
            <p className="mt-1">© {new Date().getFullYear()} {config.company_name}</p>
          </div>
        </div>
      </div>

      <Lightbox images={lightboxImages} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </>
  );
};

export default DynamicDashboard;
