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

export interface BoatDetails {
  id: string;
  name: string;
  displayName: string;
  capacity: number;
  capacityRange?: string;
  hourlyRate: number;
  images: string[];
  description: string;
  included: string[];
  packages: {
    name: string;
    description: string;
    price?: string;
  }[];
}

export const boatDetails: Record<string, BoatDetails> = {
  "meeseeks-irony": {
    id: "meeseeks-irony",
    name: "Meeseeks / The Irony",
    displayName: "Meeseeks / The Irony (30 max)",
    capacity: 30,
    hourlyRate: 250,
    images: [...[meeseeks1, meeseeks2, meeseeks3, meeseeks4, meeseeks5], ...[irony1, irony2, irony3, irony4, irony5, irony6]],
    description: "Twin 30-passenger party boats - interchangeable and equally awesome! Whichever boat is available for your time slot will be assigned at booking. Both feature spacious decks, premium sound systems, and all the amenities you need for an unforgettable celebration.",
    included: [
      "BYOB (Bring Your Own Beverages)",
      "Premium Bluetooth sound system",
      "Coolers with ice",
      "Life jackets for all guests",
      "Professional captain and crew",
      "Fuel included",
      "Shade covering"
    ],
    packages: [
      {
        name: "Standard Package",
        description: "Perfect for casual cruises and celebrations"
      },
      {
        name: "Essentials Package",
        description: "Adds decorations and party supplies for your event"
      },
      {
        name: "Ultimate Package",
        description: "Complete party experience with premium decorations and amenities"
      }
    ]
  },
  "meeseeks": {
    id: "meeseeks",
    name: "Meeseeks",
    displayName: "Meeseeks",
    capacity: 30,
    hourlyRate: 250,
    images: [meeseeks1, meeseeks2, meeseeks3, meeseeks4, meeseeks5],
    description: "Our largest party boat with a spacious upper deck featuring luxurious lounge seating and premium amenities. Perfect for big celebrations and large groups.",
    included: [
      "BYOB (Bring Your Own Beverages)",
      "Premium Bluetooth sound system",
      "Coolers with ice",
      "Life jackets for all guests",
      "Professional captain and crew",
      "Fuel included",
      "Luxury upper deck lounge seating",
      "Shade covering"
    ],
    packages: [
      {
        name: "Standard Package",
        description: "Perfect for casual cruises and sightseeing tours"
      },
      {
        name: "Essentials Package",
        description: "Adds decorations and party supplies for your celebration"
      },
      {
        name: "Ultimate Package",
        description: "Complete party experience with premium decorations, party games, and special amenities"
      }
    ]
  },
  "the-irony": {
    id: "the-irony",
    name: "The Irony",
    displayName: "The Irony",
    capacity: 30,
    hourlyRate: 350,
    images: [irony1, irony2, irony3, irony4, irony5, irony6],
    description: "Classic double-decker party boat with wooden deck and red accents. Features comfortable bench seating and a great sound system, perfect for medium-sized groups.",
    included: [
      "BYOB (Bring Your Own Beverages)",
      "Bluetooth sound system",
      "Coolers with ice",
      "Life jackets for all guests",
      "Professional captain and crew",
      "Fuel included",
      "Shade covering on upper deck"
    ],
    packages: [
      {
        name: "Standard Package",
        description: "Perfect for casual cruises and celebrations"
      },
      {
        name: "Essentials Package",
        description: "Adds decorations and party supplies for your event"
      },
      {
        name: "Ultimate Package",
        description: "Complete party experience with premium decorations and amenities"
      }
    ]
  },
  "clever-girl": {
    id: "clever-girl",
    name: "Clever Girl",
    displayName: "Clever Girl",
    capacity: 50,
    hourlyRate: 300,
    images: [], // TODO: Add images
    description: "Intimate and cozy boat perfect for small groups and close-knit celebrations. Great for bachelor/bachelorette parties and family outings.",
    included: [
      "BYOB (Bring Your Own Beverages)",
      "Premium Bluetooth sound system",
      "Coolers with ice",
      "Life jackets for all guests",
      "Professional captain",
      "Fuel included",
      "Covered seating area"
    ],
    packages: [
      {
        name: "Standard Package",
        description: "Perfect for casual cruises and intimate gatherings"
      },
      {
        name: "Essentials Package",
        description: "Adds decorations and party supplies"
      },
      {
        name: "Ultimate Package",
        description: "Premium experience with full decorations and party amenities"
      }
    ]
  },
  "day-tripper": {
    id: "day-tripper",
    name: "Day Tripper",
    displayName: "Day Tripper",
    capacity: 14,
    hourlyRate: 200,
    images: [], // TODO: Add images
    description: "Small and nimble boat perfect for intimate groups. Ideal for couples, small families, or close friends looking for a personalized cruise experience.",
    included: [
      "BYOB (Bring Your Own Beverages)",
      "Bluetooth sound system",
      "Coolers with ice",
      "Life jackets for all guests",
      "Professional captain",
      "Fuel included"
    ],
    packages: [
      {
        name: "Standard Package",
        description: "Perfect for small group cruises"
      },
      {
        name: "Essentials Package",
        description: "Adds party decorations and supplies"
      },
      {
        name: "Ultimate Package",
        description: "Complete party package with premium amenities"
      }
    ]
  }
};

export const getBoatByName = (name: string): BoatDetails | undefined => {
  const normalizedName = name.toLowerCase().replace(/[^a-z]/g, '');
  
  // Check for combined group first
  if (normalizedName.includes('meeseeks') && normalizedName.includes('irony')) {
    return boatDetails['meeseeks-irony'];
  }
  // Check for exact matches
  if (normalizedName.includes('meeseeks')) {
    return boatDetails.meeseeks;
  }
  if (normalizedName.includes('irony')) {
    return boatDetails['the-irony'];
  }
  if (normalizedName.includes('clevergirl') || normalizedName.includes('clever')) {
    return boatDetails['clever-girl'];
  }
  if (normalizedName.includes('daytripper') || normalizedName.includes('tripper')) {
    return boatDetails['day-tripper'];
  }
  
  return undefined;
};
