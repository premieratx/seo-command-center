/**
 * Comprehensive registry of all add-on and package contents.
 * Used for displaying what's included in each item on dashboards and cruise prep.
 */

export interface AddonDetail {
  name: string;
  /** All matching name variants (lowercase) */
  matchPatterns: string[];
  description: string;
  items: string[];
}

export const ADDON_DETAILS: AddonDetail[] = [
  // Essentials packages
  {
    name: "Essentials 14p",
    matchPatterns: ["essentials package", "free essentials package", "essentials 14"],
    description: "Ready When You Arrive!",
    items: [
      "3 Bubble Wands",
      "6-Foot Folding Table",
      "(2) Large Coolers",
      "40lbs of Ice",
      "5-Gallon Water Dispenser",
      "10 Gallons of Water",
      "25 Solo Cups",
    ],
  },
  {
    name: "Essentials 25p",
    matchPatterns: ["essentials 25"],
    description: "Ready When You Arrive!",
    items: [
      "3 Bubble Wands",
      "6-Foot Folding Table",
      "(3) Large Coolers",
      "60lbs of Ice",
      "5-Gallon Water Dispenser",
      "15 Gallons of Water",
      "50 Solo Cups",
    ],
  },
  {
    name: "Essentials 50p",
    matchPatterns: ["essentials package + pre-party setup (50 people)", "essentials 50"],
    description: "Ready When You Arrive!",
    items: [
      "3 Bubble Wands",
      "(2) 6-Foot Folding Tables",
      "(3) 5-ft Coolers",
      "80lbs of Ice",
      "5-Gallon Water Dispenser",
      "15 Gallons of Water",
      "75 Solo Cups",
    ],
  },

  // Ultimate packages
  {
    name: "Ultimate 14p",
    matchPatterns: ["ultimate disco package 14", "ultimate 14"],
    description: "Everything Ready When You Arrive!",
    items: [
      "Personal Unicorn Float",
      "(3) Disco Balls Installed",
      "Bubble Gun",
      "3 Bubble Wands",
      "6'x20' Lily Pad Float",
      "3 Disco Ball Cups",
      "20 Champagne Flutes",
      "3 Fruit Juices",
      "2 Coolers",
      "40 lbs of Ice",
      "15 Gallons of Water",
      "5-Gallon Water Dispenser",
      "30 Solo Cups",
      "2 Bottles of SPF-50 Spray Sunscreen",
    ],
  },
  {
    name: "Ultimate 25p",
    matchPatterns: ["ultimate disco package", "free ultimate disco package", "free ultimate disco package (25-people pre-party setup)", "ultimate 25"],
    description: "Everything Ready When You Arrive!",
    items: [
      "(2) Personal Unicorn Floats",
      "(3) Disco Balls Installed",
      "Bubble Gun",
      "(3) Bubble Wands",
      "(2) 6'x20' Lily Pad Floats",
      "(5) Disco Ball Cups",
      "30 Champagne Flutes",
      "3 Fruit Juices",
      "3 Coolers",
      "60lbs of Ice",
      "15 Gallons of Water",
      "5-Gallon Water Dispenser",
      "50 Solo Cups",
      "2 Bottles of SPF-50 Spray Sunscreen",
    ],
  },
  {
    name: "Ultimate 50p",
    matchPatterns: ["ultimate disco package + pre-party setup (50 people)", "free ultimate disco package (50-people pre-party setup)", "ultimate 50"],
    description: "Everything Ready When You Arrive!",
    items: [
      "(3) Personal Unicorn Floats",
      "(2) Bubble Guns",
      "(3) 6'x20' Lily Pad Floats",
      "(5) Disco Ball Cups",
      "50 Champagne Flutes",
      "3 Fruit Juices",
      "3 Giant Coolers",
      "80 lbs of Ice",
      "15 Gallons of Water",
      "5-Gallon Water Dispenser",
      "75 Solo Cups",
      "4 Bottles of SPF-50 Spray Sunscreen",
    ],
  },

  // Disco cruise add-ons
  {
    name: "Mimosa Party Cooler",
    matchPatterns: ["mimosa party cooler", "free mimosa party cooler", "free mimosa cooler", "mimosa cooler"],
    description: "The ultimate brunch on the water",
    items: [
      "Large Extra Cooler w/Ice",
      "3 Fruit Juices",
      "Champagne Flutes (1 per person)",
      "A Chambong",
      "3 Bubble Wands",
    ],
  },
  {
    name: "Bride Sparkle Package",
    matchPatterns: ["bride sparkle package", "bride super sparkle package"],
    description: "Make the bride shine!",
    items: [
      "Disco Ball Cup for the Bride",
      "Bubble Gun",
      "Disco Bopper Headband",
      "Personal Unicorn Float for the Bride",
      "SPF-50 Sunscreen Spray (1 bottle per 5 people)",
      "Disco Ball Necklaces for the Whole Group",
    ],
  },
  {
    name: "Groom Manly Sparkle Package",
    matchPatterns: ["groom manly sparkle package", "groom sparkle package", "groom super sparkle package"],
    description: "Deck out the groom!",
    items: [
      "Disco Ball Cup for the Groom",
      "Disco Ball Necklaces for the Crew",
      '"Bad Day to Be a Beer" Flag',
      "SPF-50 Sunscreen Spray",
      "Personal Unicorn Float for the Groom",
    ],
  },
  {
    name: "Sparkle Together Package",
    matchPatterns: ["sparkle together package", "combined bride/groom sparkle package", "combined sparkle package"],
    description: "The ultimate combo for both bride & groom!",
    items: [
      "Disco Ball Cups for Both Bride and Groom",
      "Disco Ball Necklaces for the Crew",
      '"Bad Day to Be a Beer" Flag',
      "SPF-50 Sunscreen Spray",
      "Personal Unicorn Floats for Both Bride and Groom",
      "2 Bubble Guns",
      "Disco Bopper Headband for the Bride",
    ],
  },
  {
    name: "Disco Sparkle Package",
    matchPatterns: ["super sparkle package", "disco sparkle package", "free sparkle package", "super sparkle disco package"],
    description: "All the sparkle essentials!",
    items: [
      "Disco Ball Cup",
      "Bubble Gun",
      "Disco Bopper Headband",
      "Personal Unicorn Float",
      "SPF-50 Sunscreen Spray",
      "Disco Ball Necklaces for the Whole Group",
    ],
  },

  // POD vouchers
  {
    name: "$50 POD Voucher",
    matchPatterns: ["$50 pod voucher", "pod voucher"],
    description: "Party On Delivery perks for your cruise",
    items: [
      "Free Direct-to-Boat Alcohol Delivery ($25)",
      "Free Stock-the-Cooler Service",
      "Reserved Spot for Your Group",
      "Mystery Gift for Guest of Honor!",
    ],
  },
  {
    name: "$100 POD Concierge Voucher",
    matchPatterns: ["$100 concierge package", "concierge package", "$100 pod concierge voucher"],
    description: "Full concierge experience for your weekend",
    items: [
      "Free Airbnb/Hotel Alcohol Delivery ($25)",
      "Free Stock-the-Fridge Service ($25)",
      "Free Austin Survival Package ($60)",
      "— Includes: 12pk Rambler Sparkling Water",
      "— Chips & Salsa",
      "— 8 Shot Glasses",
      "— 4 Fresh Limes",
      "— 20 Solo Cups",
      "— 10 Ping Pong Balls",
      "— 20lbs of Ice",
      "— 10 Electrolyte Recovery Packets",
    ],
  },

  // Disco Queen / Basic Bach packages (from package_type field)
  {
    name: "Disco Queen Package",
    matchPatterns: ["disco queen", "disco_queen", "disco queen package"],
    description: "Premium disco cruise experience",
    items: [
      "All Standard Disco Cruise Inclusions",
      "Disco Ball Cup for the Guest of Honor",
      "Bubble Gun",
      "Disco Bopper Headband",
      "Personal Unicorn Float",
      "SPF-50 Sunscreen Spray",
      "Disco Ball Necklaces for the Whole Group",
    ],
  },
  {
    name: "Basic Bach Package",
    matchPatterns: ["basic bach", "basic_bach", "basic bach package"],
    description: "Essential bach cruise experience",
    items: [
      "All Standard Disco Cruise Inclusions",
      "Admission for Your Group",
      "Giant Unicorn Float",
      "Souvenir Koozies",
      "DJ & Photographer",
      "Lily Pad Floats",
      "Cooler with Ice",
      "Party Favors",
    ],
  },
  {
    name: "Super Sparkle Platinum",
    matchPatterns: ["super sparkle platinum", "super_sparkle_platinum", "super sparkle platinum package"],
    description: "The ultimate all-inclusive sparkle experience",
    items: [
      "Everything in Disco Queen Package",
      "Mimosa Party Cooler",
      "Extra Disco Ball Cups",
      "Premium Party Favors",
    ],
  },
];

/**
 * Find addon details by name (case-insensitive match against patterns).
 */
export function getAddonDetails(addonName: string): AddonDetail | null {
  const lower = addonName.toLowerCase().trim();
  return ADDON_DETAILS.find(d => 
    d.matchPatterns.some(p => lower.includes(p) || p.includes(lower))
  ) || null;
}

/**
 * Find addon details for a package_type field value.
 */
export function getPackageDetails(packageType: string): AddonDetail | null {
  const lower = packageType.toLowerCase().trim().replace(/_/g, ' ');
  return ADDON_DETAILS.find(d =>
    d.matchPatterns.some(p => lower === p || lower.includes(p) || p.includes(lower))
  ) || null;
}

/**
 * Given a list of add-on names (and optionally a package_type),
 * produce a flat inventory map: item → total quantity needed.
 */
export function aggregateInventory(
  addOns: { name: string; quantity: number }[],
  packageType?: string
): Map<string, number> {
  const inventory = new Map<string, number>();

  const addItems = (detail: AddonDetail | null, qty: number) => {
    if (!detail) return;
    for (const item of detail.items) {
      // Parse leading quantity like "(3) Bubble Wands" or "3 Fruit Juices"
      const qtyMatch = item.match(/^\(?(\d+)\)?\s+(.+)$/);
      let itemName: string;
      let itemQty: number;
      if (qtyMatch) {
        itemQty = parseInt(qtyMatch[1]) * qty;
        itemName = qtyMatch[2];
      } else {
        itemQty = qty;
        itemName = item;
      }
      // Clean up sub-items starting with "—"
      if (itemName.startsWith("—")) return; // skip sub-items for aggregation
      inventory.set(itemName, (inventory.get(itemName) || 0) + itemQty);
    }
  };

  for (const addon of addOns) {
    const detail = getAddonDetails(addon.name);
    addItems(detail, addon.quantity);
  }

  if (packageType) {
    const pkgDetail = getPackageDetails(packageType);
    addItems(pkgDetail, 1);
  }

  return inventory;
}
