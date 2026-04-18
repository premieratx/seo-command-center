import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Separator } from "@/quote-app/components/ui/separator";
import { Lightbox } from "@/quote-app/components/ui/lightbox";

import {
  FileText, Anchor,
  ExternalLink, CreditCard
} from "lucide-react";
import { SEOHead } from "@/quote-app/components/SEOHead";
import type { ConfirmedAddOn } from "@/quote-app/components/customer-dashboard/AddOnStore";

import InnCahootsAddOns from "@/quote-app/components/inn-cahoots/InnCahootsAddOns";
import { ADD_ON_CATEGORIES } from "@/quote-app/components/inn-cahoots/InnCahootsAddOns";
import { XolaBookingWidget } from "@/quote-app/components/quote-builder/XolaBookingWidget";
import ppcLogo from "@/quote-app/assets/ppc-logo-round.png";
import innCahootsLogo from "@/quote-app/assets/inn-cahoots-logo.png";
import atxDiscoCruiseLogo from "@/quote-app/assets/atx-disco-cruise-logo.png";

// Tab hero images
import alcoholDeliveryImg from "@/quote-app/assets/tabs/alcohol-delivery.jpg";
import boatRentalsImg from "@/quote-app/assets/tabs/boat-rentals-party.jpg";
import conciergeServicesImg from "@/quote-app/assets/tabs/concierge-services.jpg";

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

// Party/experience photos
import discoFun from "@/quote-app/assets/party/disco_fun_first.jpg";
import discoFun27 from "@/quote-app/assets/party/disco_fun_27.jpg";
import discoFun28 from "@/quote-app/assets/party/disco_fun_28.jpg";
import discoFun29 from "@/quote-app/assets/party/disco_fun29.jpg";
import discoFunBest from "@/quote-app/assets/party/disco_fun_best2.jpg";
import groupPic from "@/quote-app/assets/party/Group_Pic_6_22.jpg";
import djPic from "@/quote-app/assets/party/DJ_Pic.jpg";
import discoWigs from "@/quote-app/assets/party/disco_wigs.jpg";
import unicornPic from "@/quote-app/assets/party/unicorn_pic.jpg";

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

const boatPhotos: Record<string, { photos: string[]; capacity: string; description: string; slide: string }> = {
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

const experiencePhotos = [discoFun, discoFunBest, discoFun27, discoFun28, discoFun29, groupPic, djPic, discoWigs, unicornPic];

const InnCahootsDashboard = () => {
  const [_addOnTotal, _setAddOnTotal] = useState(0);
  const [_confirmedAddOns, _setConfirmedAddOns] = useState<ConfirmedAddOn[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("alcohol");

  // Preload all images in background so tab switches are instant
  useEffect(() => {
    const allImages = [
      // Alcohol tab
      tileSuiteDelivery, tileBoatDelivery, tileCocktailBar, tileStockFridge, tileGroupOrdering,
      // Boats tab
      tilePrivateCruises, tileAllInclusive, tileDiscoCruise, tileDiscountTransport,
      slide14, slide25, slide50, slideDisco,
      ...Object.values(boatPhotos).flatMap(b => b.photos),
      ...experiencePhotos,
      // Concierge tab (add-on images)
      ...ADD_ON_CATEGORIES.flatMap(cat => cat.items.map(item => item.image)),
      ppcLogo, atxDiscoCruiseLogo, innCahootsLogo,
      alcoholDeliveryImg, boatRentalsImg, conciergeServicesImg,
    ];
    allImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const _guestName = "Jamie";
  const _partyType = "Bachelor Party";
  const _guestCount = 15;

  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const quoteEmbedUrl = `${window.location.origin}/quote-v2?sourceType=inn_cahoots_dashboard&autoResize=1`;

  const tabCards = [
    {
      id: "alcohol",
      label: "Alcohol Delivery",
      image: alcoholDeliveryImg,
      subtitle: "Get drinks delivered to your suite or boat",
    },
    {
      id: "boats",
      label: "⛵ Boat Rentals",
      image: boatRentalsImg,
      subtitle: "Austin's #1 party boats on Lake Travis",
    },
    {
      id: "manage",
      label: "Concierge Services",
      image: conciergeServicesImg,
      subtitle: "Add-ons, upgrades & party extras",
    },
  ];

  return (
    <>
      <SEOHead
        title="Inn Cahoots Concierge Dashboard"
        description="Your Inn Cahoots reservation hub"
      />

      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 w-full">
        {/* Header */}
        <div className="bg-slate-800/60 border-b border-sky-500/20 backdrop-blur-sm relative">
          {!window.location.hostname.includes('premierpartycruises.com') && (
            <a
              href={`https://booking.premierpartycruises.com/inn-cahoots-dashboard${window.location.search}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 z-10"
            >
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Live
              </Button>
            </a>
          )}
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center">
            <div className="logo-shimmer-wrap relative overflow-hidden inline-block">
              <img src={innCahootsLogo} alt="Inn Cahoots" className="h-16 sm:h-28 object-contain logo-shimmer" />
            </div>
            <p className="text-white text-xl sm:text-2xl font-bold mt-1 overflow-hidden uppercase tracking-widest">
              {"Guest Concierge".split("").map((char, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    animation: `dropIn 0.4s ease-out ${3.5 + (i / 15) * 1.5}s both`,
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </p>
          </div>
          <style>{`
            @keyframes dropIn {
              0% { opacity: 0; transform: translateY(-30px); }
              100% { opacity: 1; transform: translateY(0); }
            }
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

          {/* Image Tab Navigation + Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
            <TabsList className="bg-transparent p-0 h-auto w-full grid grid-cols-3 gap-1.5 sm:gap-4 rounded-b-none mb-0">
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
                    <img
                      src={tab.image}
                      alt={tab.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
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

            {/* Content area wrapper — connected to active tab */}
            <div className="border-2 sm:border-4 border-amber-400 border-t-0 rounded-b-xl bg-slate-900/60 backdrop-blur-sm">
              {/* Connector strip: draws the top border line with a gap under the active tab */}
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
              {/* Alcohol Delivery */}
              <TabsContent value="alcohol" className="mt-0">
                <div className="space-y-4">
                  <div className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-4 py-3">
                    <p className="text-sm text-purple-200 text-center leading-relaxed">
                      <span className="font-semibold text-purple-300">Party on Delivery</span> is a concierge and alcohol delivery business and an official partner with Inn Cahoots, providing delivery and concierge services to our amazing guests. Let them handle the details so you can focus on having the best weekend ever.
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
                      href="https://partyondelivery.com/partners/mischief"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-colors text-base"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Open Party On Delivery Store
                    </a>
                  </div>
                </div>
              </TabsContent>

              {/* Boat Rentals */}
              <TabsContent value="boats" className="mt-0">
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
                    <img src={ppcLogo} alt="Premier Party Cruises" className="h-10 w-10 sm:h-16 sm:w-16 rounded-full shrink-0" />
                    <div className="flex-1 text-center min-w-0">
                      <h2 className="text-sm sm:text-2xl font-bold text-white">Premier Party Cruises</h2>
                      <p className="text-sky-300 text-[11px] sm:text-sm mt-1">Austin's #1 party boat experience on Lake Travis. BYOB, professional DJ, photographer & giant floats included on disco cruises!</p>
                    </div>
                    <img src={ppcLogo} alt="Premier Party Cruises" className="h-10 w-10 sm:h-16 sm:w-16 rounded-full hidden sm:block shrink-0" />
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
                    <Button
                      onClick={() => document.getElementById('inn-cahoots-quote-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Get a Quote
                    </Button>
                    <Button
                      onClick={() => document.getElementById('inn-cahoots-booking-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-sky-600 hover:bg-sky-500 text-white"
                    >
                      <Anchor className="h-4 w-4 mr-2" />
                      Book Now
                    </Button>
                  </div>

                  {/* ATX Disco Cruise */}
                  <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                    <CardHeader className="px-3 sm:px-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <img src={atxDiscoCruiseLogo} alt="ATX Disco Cruise" className="h-16 w-16 sm:h-28 sm:w-28 object-contain shrink-0" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-4xl text-sky-300 text-center">
                            🪩 The ATX Disco Cruise
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-slate-300 mt-1 text-center">Exclusively for Bachelorette and Bachelor Parties</p>
                        </div>
                        <img src={atxDiscoCruiseLogo} alt="ATX Disco Cruise" className="h-16 w-16 sm:h-28 sm:w-28 object-contain shrink-0 hidden sm:block" />
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
                          <img src={slideDisco} alt="ATX Disco Cruise details & pricing" className="object-cover object-top w-full h-full" />
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
                        <img src={ppcLogo} alt="Premier Party Cruises" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-contain shrink-0" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-3xl text-sky-300 text-center">
                            ⛵ Private Party Cruises for up to 14, 25, 50-75 Guests
                          </CardTitle>
                        </div>
                        <img src={ppcLogo} alt="Premier Party Cruises" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-contain shrink-0 hidden sm:block" />
                      </div>
                      <CardDescription className="text-slate-400 text-center text-xs sm:text-sm">
                        Rent a whole boat for your group — BYOB, pick your time, bring your own vibe
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(boatPhotos).map(([boatName, boat]) => (
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
                  <div id="inn-cahoots-quote-section" />
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
                  <div id="inn-cahoots-booking-section" />
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
                    <h3 className="text-lg font-bold text-white">Questions? We'd love to help plan your party!</h3>
                    <p className="text-sm text-slate-300">Call, text, or email — we'll customize the perfect boat day for your group.</p>
                   <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      <Button onClick={() => openExternalLink("tel:+15124885892")} className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm">
                        📞 (512) 488-5892
                      </Button>
                      <Button onClick={() => openExternalLink("mailto:clientservices@premierpartycruises.com")} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs sm:text-sm">
                        ✉️ Email Us
                      </Button>
                      <Button onClick={() => openExternalLink("https://premierpartycruises.com")} className="bg-white hover:bg-slate-100 text-black font-bold text-xs sm:text-sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Website
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Concierge Services */}
              <TabsContent value="manage" className="mt-0">
                <InnCahootsAddOns openExternalLink={openExternalLink} />
              </TabsContent>
              </div>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="mt-8 pb-8 text-center text-sm text-slate-500">
            <p>Questions? Contact us at <a href="mailto:info@partyondelivery.com" className="text-amber-400 underline">info@partyondelivery.com</a></p>
            <p className="mt-1">© {new Date().getFullYear()} Inn Cahoots • Austin, TX</p>
          </div>
        </div>
      </div>

      <Lightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default InnCahootsDashboard;
