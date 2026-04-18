import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { DiscoCruisePhotoGallery } from "@/quote-app/components/DiscoCruisePhotoGallery";

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
import meeseeks4 from "@/quote-app/assets/boats/meeseeks-4.jpg";
import meeseeks5 from "@/quote-app/assets/boats/meeseeks-5.jpg";
import irony1 from "@/quote-app/assets/boats/irony-1.jpg";
import irony2 from "@/quote-app/assets/boats/irony-2.jpg";
import irony3 from "@/quote-app/assets/boats/irony-3.jpg";
import irony4 from "@/quote-app/assets/boats/irony-4.jpg";
import irony5 from "@/quote-app/assets/boats/irony-5.jpg";
import irony6 from "@/quote-app/assets/boats/irony-6.jpg";
import ironyNew1 from "@/quote-app/assets/boats/irony-new-1.jpg";
import ironyNew2 from "@/quote-app/assets/boats/irony-new-2.jpg";

const boatTabs = {
  "14-person": {
    label: "14-Person Private Cruise",
    mobileLabel: "14-Person\nPrivate Cruise",
    desktopLabel: "14-Person\nPVT Cruise",
    emoji: "⛵",
    subtitle: "Day Tripper",
    photos: [dayTripper1, dayTripper2, dayTripper3, dayTripper4],
  },
  "25-person": {
    label: "25-Person Private Cruise",
    mobileLabel: "25-Person\nPrivate Cruise",
    desktopLabel: "25-Person\nPVT Cruise",
    emoji: "🚤",
    subtitle: "Meeseeks / The Irony",
    photos: [ironyNew1, ironyNew2, meeseeks1, meeseeks2, meeseeks3, meeseeks4, meeseeks5, irony1, irony2, irony3, irony4, irony5, irony6],
  },
  "50-person": {
    label: "50-Person Private Cruise",
    mobileLabel: "50-Person\nPrivate Cruise",
    desktopLabel: "50-Person\nPVT Cruise",
    emoji: "🛥️",
    subtitle: "Clever Girl",
    photos: [cleverGirl1, cleverGirl3, cleverGirl4, cleverGirl6, cleverGirl9],
  },
};

interface BachPhotoGalleryProps {
  openLightbox: (images: string[], index: number) => void;
}

export const BachPhotoGallery = ({ openLightbox }: BachPhotoGalleryProps) => {
  return (
    <Tabs defaultValue="disco" className="w-full">
      <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-700/50 mb-4 h-auto">
        <TabsTrigger
          value="disco"
          className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white py-2 leading-tight whitespace-pre-line text-center"
        >
          <span className="sm:hidden">🪩 ATX Disco<br/>Cruise</span>
          <span className="hidden sm:inline">🪩 ATX Disco<br/>Cruise</span>
        </TabsTrigger>
        {Object.entries(boatTabs).map(([key, tab]) => (
          <TabsTrigger
            key={key}
            value={key}
            className="text-xs sm:text-sm data-[state=active]:bg-sky-600 data-[state=active]:text-white py-2 leading-tight whitespace-pre-line text-center"
          >
            <span className="sm:hidden">{tab.emoji} {tab.mobileLabel}</span>
            <span className="hidden sm:inline">{tab.emoji} {tab.desktopLabel}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="disco" className="m-0">
        <DiscoCruisePhotoGallery lazyDelay={0} />
      </TabsContent>

      {Object.entries(boatTabs).map(([key, tab]) => (
        <TabsContent key={key} value={key} className="m-0">
          <h3 className="text-sm font-semibold text-sky-300 mb-1 uppercase tracking-wider">
            {tab.subtitle}
          </h3>
          <p className="text-xs text-slate-400 mb-3">{tab.label} — Private Cruise</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tab.photos.map((photo, idx) => (
              <img
                key={`${key}-${idx}`}
                src={photo}
                alt={`${tab.subtitle} photo ${idx + 1}`}
                className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-[4/3] w-full"
                onClick={() => openLightbox(tab.photos, idx)}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};
