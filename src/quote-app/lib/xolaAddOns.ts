/**
 * Maps Xola add-on names to their prices.
 * Used to parse add-ons from the booking notes field
 * (set by the xola-booking-webhook edge function).
 */

export interface ParsedAddOn {
  name: string;
  unitPrice: number;
  quantity: number;
}

// Xola add-on name → price lookup
// Names should match what Xola sends in "Items Add Ons Configuration Name"
export const ADDON_PRICE_MAP: Record<string, number> = {
  // Disco cruise add-ons
  "combined bride/groom sparkle package": 175,
  "combined sparkle package": 175,
  "sparkle together package": 150,
  "bride sparkle package": 100,
  "bride super sparkle package": 100,
  "groom manly sparkle package": 100,
  "groom sparkle package": 100,
  "groom super sparkle package": 100,
  "super sparkle package": 100,
  "super sparkle disco package": 0,
  "super sparkle package inclusions": 0,
  "free sparkle package": 0,
  "mimosa party cooler": 100,
  "free mimosa party cooler": 0,
  "free mimosa cooler": 0,
  "disco ball cups": 30,
  "5 disco ball cups": 30,
  "10 disco ball cups": 60,

  // Private cruise add-ons — size-specific variants
  "ultimate disco package + pre-party setup (14 people)": 250,
  "ultimate disco package + pre-party setup (25 people)": 300,
  "ultimate disco package + pre-party setup (50 people)": 350,
  "ultimate disco package": 350,
  "free ultimate disco package": 0,
  "free ultimate disco package (14-people pre-party setup)": 0,
  "free ultimate disco package (25-people pre-party setup)": 0,
  "free ultimate disco package (50-people pre-party setup)": 0,
  "essentials package + pre-party setup (14 people)": 100,
  "essentials package + pre-party setup (25 people)": 150,
  "essentials package + pre-party setup (50 people)": 200,
  "essentials package": 200,
  "free essentials package": 0,
  "free essentials package (14-people pre-party setup)": 0,
  "free essentials package (25-people pre-party setup)": 0,
  "free essentials package (50-people pre-party setup)": 0,
  "additional 1 to 25 guests": 400,
  "additional guests": 400,
  "professional photographer": 600,
  "photographer": 600,
  "professional dj": 600,
  "dj": 600,
  "bartender": 600,
  "party-cooler setup": 150,
  "party cooler setup": 150,
  "mimosa cooler": 100,
  "lily pad float": 50,
  "lily pad": 50,
  "5 premier koozies": 20,
  "premier koozies": 20,
  "personal unicorn float": 20,
  "unicorn float": 20,
  "20-lb bags of ice": 8,
  "ice bags": 8,
  "bags of ice": 8,
  "bubble wands": 3,
  "a/v setup": 300,
  "av setup": 300,
  "a/v setup with wireless mic & projector screen": 300,

  // Free items / informational
  "disco queen package": 0,
  "party on delivery": 0,
  "party on delivery: drinks & party supplies": 0,
  "fetii ride 25% discount": 0,
  "fetii ride": 0,
  "fetii ride 25% discount all weekend": 0,
  "25% fetii ride discount": 0,
  "$50 pod voucher": 0,
  "pod voucher": 0,
  "$100 concierge package": 0,
  "concierge package": 0,
  "alcohol delivery w/your drinks stocked in a cooler": 0,
  "alcohol delivery to your airbnb/hotel": 0,
  "concierge delivery service": 0,
  "concierge delivery service - alcohol & wknd supplies delivered to your airbnb/hotel": 0,
};

// Patterns that indicate party-info fields (not purchasable add-ons)
const PARTY_INFO_PATTERNS = [
  /^(bachelorette|bachelor|birthday|corporate|family|other|wedding|anniversary|reunion|graduation|retirement|divorce|just because|celebration|holiday|prom|engagement|baby shower|bridal shower)$/i,
  /^\d{1,2}\s*[-–]\s*\d{1,2}$/,  // age ranges like "21-30"
  /^\d{1,3}\s*(years?|yrs?|yo)?\s*(old)?$/i, // "25", "25 years old"
  /^(average\s*)?age\s*[:=]?\s*\d/i, // "Average Age: 28"
  /^type\s*of\s*party/i,
  /^party\s*type/i,
];

function isPartyInfoItem(name: string): boolean {
  return PARTY_INFO_PATTERNS.some(p => p.test(name.trim()));
}

export interface PartyInfo {
  partyType: string | null;
  averageAge: string | null;
}

/**
 * Extract party-type and average-age metadata from the add-ons string.
 */
export function parsePartyInfoFromNotes(notes: string | null): PartyInfo {
  if (!notes) return { partyType: null, averageAge: null };

  const addOnsMatch = notes.match(/Add-ons?:\s*(.+?)(?:\s*\||$)/i);
  if (!addOnsMatch) return { partyType: null, averageAge: null };

  const items = addOnsMatch[1].split(",").map(s => s.trim()).filter(Boolean);

  let partyType: string | null = null;
  let averageAge: string | null = null;

  for (const item of items) {
    const lower = item.toLowerCase().trim();
    // Check for age range like "21-30"
    if (/^\d{1,2}\s*[-–]\s*\d{1,2}$/.test(lower)) {
      averageAge = item.trim();
      continue;
    }
    // Check for plain number (age)
    if (/^\d{1,3}$/.test(lower)) {
      averageAge = item.trim();
      continue;
    }
    // Check for "Average Age: 28" style
    if (/^(average\s*)?age/i.test(lower)) {
      averageAge = item.replace(/^(average\s*)?age\s*[:=]?\s*/i, "").trim() || item.trim();
      continue;
    }
    // Check for known party types
    if (/^(bachelorette|bachelor|birthday|corporate|family|wedding|anniversary|reunion|graduation|retirement|divorce|just because|celebration|holiday|prom|engagement|baby shower|bridal shower)$/i.test(lower)) {
      partyType = item.trim();
      continue;
    }
    // Check for "Type of Party: ..." style
    if (/^(type\s*of\s*party|party\s*type)/i.test(lower)) {
      partyType = item.replace(/^(type\s*of\s*party|party\s*type)\s*[:=]?\s*/i, "").trim() || item.trim();
      continue;
    }
  }

  return { partyType, averageAge };
}

/**
 * Parse the add-ons string from booking notes into structured items with prices.
 * Filters out party-info items (party type, average age).
 * The notes field format: "Xola Booking ID: xxx | Experience: yyy | Add-ons: item1, item2"
 */
export function parseAddOnsFromNotes(notes: string | null): ParsedAddOn[] {
  if (!notes) return [];

  const results: ParsedAddOn[] = [];
  const seenNames = new Set<string>();

  // Format 1: "Add-On: Name x1 @ $0" pipe-separated entries (Xola webhook format)
  const addOnEntryRegex = /Add-On:\s*(.+?)\s*(?:\||$)/gi;
  let match;
  while ((match = addOnEntryRegex.exec(notes)) !== null) {
    const raw = match[1].trim();
    // Parse "Name x1 @ $0" or "Name x2 @ $100"
    const qtyPriceMatch = raw.match(/^(.+?)\s+x(\d+)\s*@\s*\$?([\d.]+)$/i);
    if (qtyPriceMatch) {
      const name = cleanAddonName(qtyPriceMatch[1].trim());
      const quantity = parseInt(qtyPriceMatch[2]) || 1;
      const unitPrice = parseFloat(qtyPriceMatch[3]) || 0;
      const key = name.toLowerCase();
      if (!seenNames.has(key) && !isPartyInfoItem(name) && !isDiscountOrCoupon(name)) {
        seenNames.add(key);
        results.push({ name, unitPrice, quantity });
      }
    } else {
      // Fallback: treat the whole thing as a name
      const name = cleanAddonName(raw);
      const key = name.toLowerCase();
      if (!seenNames.has(key) && !isPartyInfoItem(name) && !isDiscountOrCoupon(name)) {
        seenNames.add(key);
        const price = ADDON_PRICE_MAP[key];
        results.push({ name, unitPrice: price !== undefined ? price : 0, quantity: 1 });
      }
    }
  }

  // Format 2: "Add-ons: item1, item2" comma-separated (legacy format)
  const addOnsMatch = notes.match(/(?<![Pp]aid\s)Add-ons:\s*(.+?)(?:\s*\||$)/i);
  if (addOnsMatch) {
    const xolaItems = addOnsMatch[1].trim().split(",").map(s => s.trim()).filter(Boolean);
    for (const item of xolaItems) {
      if (isPartyInfoItem(item) || isDiscountOrCoupon(item)) continue;
      const name = cleanAddonName(item);
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      const price = ADDON_PRICE_MAP[key];
      const qtyMatch = item.match(/[×x]\s*(\d+)\)?$/i);
      const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      results.push({ name, unitPrice: price !== undefined ? price : 0, quantity });
    }
  }
  
  // Format 3: "[Add-ons YYYY-MM-DD]: item1 - $X; item2 x2 - $Y" (dashboard-added format)
  const dashboardMatches = notes.matchAll(/\[Add-ons\s+[\d-]+\]:\s*(.+?)(?:\n|$)/gi);
  for (const m of dashboardMatches) {
    const entries = m[1].split(";").map(s => s.trim()).filter(Boolean);
    for (const entry of entries) {
      // Extract price from "- $80.00" at the end
      const priceMatch = entry.match(/-\s*\$([\d.]+)$/);
      const entryPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
      // Strip price suffix, then extract quantity from "x2" suffix
      const withoutPrice = entry.replace(/\s*-\s*\$[\d.]+$/, '').trim();
      const qtyMatch = withoutPrice.match(/\s+x(\d+)$/i);
      const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      const nameRaw = withoutPrice.replace(/\s+x\d+$/i, '').trim();
      const name = cleanAddonName(nameRaw);
      const key = name.toLowerCase();
      if (seenNames.has(key) || !name) continue;
      seenNames.add(key);
      // Use extracted price, divide by quantity to get unit price; fallback to price map
      const unitPrice = entryPrice > 0
        ? (quantity > 1 ? entryPrice / quantity : entryPrice)
        : (ADDON_PRICE_MAP[key] ?? 0);
      results.push({ name, unitPrice, quantity });
    }
  }

  // Format 4: "Paid Add-Ons: Name:price, Name:price" (admin-set explicit prices)
  const paidAddOnsMatch = notes.match(/Paid Add-Ons:\s*(.+?)(?:\s*\||$)/i);
  if (paidAddOnsMatch) {
    const entries = paidAddOnsMatch[1].split(",").map(s => s.trim()).filter(Boolean);
    for (const entry of entries) {
      // Parse "Name:price" format e.g. "Lily Pad Float:50.00"
      const colonPriceMatch = entry.match(/^(.+?):(\d+\.?\d*)$/);
      if (colonPriceMatch) {
        const name = cleanAddonName(colonPriceMatch[1].trim());
        const unitPrice = parseFloat(colonPriceMatch[2]) || 0;
        const key = name.toLowerCase();
        if (!seenNames.has(key) && !isPartyInfoItem(name) && !isDiscountOrCoupon(name)) {
          seenNames.add(key);
          results.push({ name, unitPrice, quantity: 1 });
        }
      }
    }
  }

  return results;
}

/** Clean Xola add-on name for display and matching */
function cleanAddonName(name: string): string {
  return name
    .replace(/^FREE\/OPTIONAL:\s*/i, '')
    .replace(/\s*\(Please Select If Interested\)/gi, '')
    .replace(/\s*\(Select If Interested\)/gi, '')
    .replace(/\s*-\s*SELECT IF INTERESTED!?/gi, '')
    .replace(/\s*\(\$[\d.,]+\s*[×x]\s*\d+\)/gi, '') // "($30.00 × 2)"
    .replace(/\s*\(\d+-Person Sprinter Van\)/gi, '')
    .trim();
}

/** Detect discount/coupon lines that should NOT be shown as add-ons */
function isDiscountOrCoupon(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return (
    /^coupon\s*\(/i.test(lower) ||
    /^pay\s*in\s*full\s*promo/i.test(lower) ||
    /^free\s*(bride|groom)\s*ticket/i.test(lower) ||
    /^change\s*guests/i.test(lower) ||
    /partial\s*refund/i.test(lower)
  );
}

/**
 * Get the add-on IDs that match already-purchased add-ons,
 * so we can mark them in the AddOnStore.
 */
export function getMatchingAddOnIds(parsedAddOns: ParsedAddOn[]): string[] {
  const NAME_TO_ID: Record<string, string> = {
    "combined bride/groom sparkle package": "sparkle-package",
    "combined sparkle package": "sparkle-package",
    "sparkle together package": "sparkle-package",
    "bride sparkle package": "sparkle-package",
    "bride super sparkle package": "sparkle-package",
    "groom manly sparkle package": "sparkle-package",
    "groom sparkle package": "sparkle-package",
    "groom super sparkle package": "sparkle-package",
    "super sparkle package": "sparkle-package",
    "free sparkle package": "sparkle-package",
    "mimosa party cooler": "mimosa-cooler",
    "free mimosa party cooler": "mimosa-cooler",
    "free mimosa cooler": "mimosa-cooler",
    "disco ball cups": "disco-ball-cups-5",
    "5 disco ball cups": "disco-ball-cups-5",
    "10 disco ball cups": "disco-ball-cups-5",
    "disco queen package": "disco-queen-pkg",
    "ultimate disco package + pre-party setup (14 people)": "ultimate-14",
    "ultimate disco package + pre-party setup (25 people)": "ultimate-25",
    "ultimate disco package + pre-party setup (50 people)": "ultimate-50",
    "ultimate disco package": "ultimate-50",
    "free ultimate disco package": "ultimate-50",
    "free ultimate disco package (14-people pre-party setup)": "ultimate-14",
    "free ultimate disco package (25-people pre-party setup)": "ultimate-25",
    "free ultimate disco package (50-people pre-party setup)": "ultimate-50",
    "essentials package + pre-party setup (14 people)": "essentials-14",
    "essentials package + pre-party setup (25 people)": "essentials-25",
    "essentials package + pre-party setup (50 people)": "essentials-50",
    "essentials package": "essentials-50",
    "free essentials package": "essentials-50",
    "free essentials package (14-people pre-party setup)": "essentials-14",
    "free essentials package (25-people pre-party setup)": "essentials-25",
    "free essentials package (50-people pre-party setup)": "essentials-50",
    "additional 1 to 25 guests": "additional-25-guests",
    "additional guests": "additional-25-guests",
    "professional photographer": "photographer",
    "photographer": "photographer",
    "professional dj": "dj",
    "dj": "dj",
    "bartender": "bartender",
    "party-cooler setup": "party-cooler-setup",
    "party cooler setup": "party-cooler-setup",
    "mimosa cooler": "mimosa-cooler-pvt",
    "lily pad float": "lily-pad",
    "lily pad": "lily-pad",
    "5 premier koozies": "premier-koozies",
    "premier koozies": "premier-koozies",
    "personal unicorn float": "unicorn-float",
    "unicorn float": "unicorn-float",
    "20-lb bags of ice": "ice-bags",
    "ice bags": "ice-bags",
    "bags of ice": "ice-bags",
    "bubble wands": "bubble-wands",
    "party on delivery": "party-on-delivery",
    "party on delivery: drinks & party supplies": "party-on-delivery",
    "fetii ride 25% discount": "fetii-ride",
    "25% fetii ride discount": "fetii-ride",
    "fetii ride": "fetii-ride",
    "$50 pod voucher": "pod-voucher",
    "pod voucher": "pod-voucher",
    "$100 concierge package": "concierge-package",
    "concierge package": "concierge-package",
    "alcohol delivery w/your drinks stocked in a cooler": "alcohol-delivery",
    "alcohol delivery to your airbnb/hotel": "alcohol-delivery",
    "concierge delivery service": "concierge-delivery",
    "concierge delivery service - alcohol & wknd supplies delivered to your airbnb/hotel": "concierge-delivery",
    "super sparkle disco package": "super-sparkle-info",
    "super sparkle package inclusions": "super-sparkle-info",
  };

  const ids: string[] = [];
  for (const addon of parsedAddOns) {
    const key = addon.name.toLowerCase();
    const id = NAME_TO_ID[key];
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Like getMatchingAddOnIds but also returns quantities.
 */
export function getMatchingAddOnQuantities(parsedAddOns: ParsedAddOn[]): { id: string; quantity: number }[] {
  const NAME_TO_ID: Record<string, string> = {
    "combined bride/groom sparkle package": "sparkle-package",
    "combined sparkle package": "sparkle-package",
    "sparkle together package": "sparkle-package",
    "bride sparkle package": "sparkle-package",
    "bride super sparkle package": "sparkle-package",
    "groom manly sparkle package": "sparkle-package",
    "groom sparkle package": "sparkle-package",
    "groom super sparkle package": "sparkle-package",
    "super sparkle package": "sparkle-package",
    "free sparkle package": "sparkle-package",
    "mimosa party cooler": "mimosa-cooler",
    "free mimosa party cooler": "mimosa-cooler",
    "free mimosa cooler": "mimosa-cooler",
    "disco ball cups": "disco-ball-cups-5",
    "5 disco ball cups": "disco-ball-cups-5",
    "10 disco ball cups": "disco-ball-cups-5",
    "disco queen package": "disco-queen-pkg",
    "ultimate disco package + pre-party setup (14 people)": "ultimate-14",
    "ultimate disco package + pre-party setup (25 people)": "ultimate-25",
    "ultimate disco package + pre-party setup (50 people)": "ultimate-50",
    "ultimate disco package": "ultimate-50",
    "free ultimate disco package": "ultimate-50",
    "free ultimate disco package (14-people pre-party setup)": "ultimate-14",
    "free ultimate disco package (25-people pre-party setup)": "ultimate-25",
    "free ultimate disco package (50-people pre-party setup)": "ultimate-50",
    "essentials package + pre-party setup (14 people)": "essentials-14",
    "essentials package + pre-party setup (25 people)": "essentials-25",
    "essentials package + pre-party setup (50 people)": "essentials-50",
    "essentials package": "essentials-50",
    "free essentials package": "essentials-50",
    "free essentials package (14-people pre-party setup)": "essentials-14",
    "free essentials package (25-people pre-party setup)": "essentials-25",
    "free essentials package (50-people pre-party setup)": "essentials-50",
    "additional 1 to 25 guests": "additional-25-guests",
    "additional guests": "additional-25-guests",
    "professional photographer": "photographer",
    "photographer": "photographer",
    "professional dj": "dj",
    "dj": "dj",
    "bartender": "bartender",
    "party-cooler setup": "party-cooler-setup",
    "party cooler setup": "party-cooler-setup",
    "mimosa cooler": "mimosa-cooler-pvt",
    "lily pad float": "lily-pad",
    "lily pad": "lily-pad",
    "5 premier koozies": "premier-koozies",
    "premier koozies": "premier-koozies",
    "personal unicorn float": "unicorn-float",
    "unicorn float": "unicorn-float",
    "20-lb bags of ice": "ice-bags",
    "ice bags": "ice-bags",
    "bags of ice": "ice-bags",
    "bubble wands": "bubble-wands",
    "party on delivery": "party-on-delivery",
    "party on delivery: drinks & party supplies": "party-on-delivery",
    "fetii ride 25% discount": "fetii-ride",
    "25% fetii ride discount": "fetii-ride",
    "fetii ride": "fetii-ride",
    "$50 pod voucher": "pod-voucher",
    "pod voucher": "pod-voucher",
    "$100 concierge package": "concierge-package",
    "concierge package": "concierge-package",
    "alcohol delivery w/your drinks stocked in a cooler": "alcohol-delivery",
    "alcohol delivery to your airbnb/hotel": "alcohol-delivery",
    "concierge delivery service": "concierge-delivery",
    "concierge delivery service - alcohol & wknd supplies delivered to your airbnb/hotel": "concierge-delivery",
    "super sparkle disco package": "super-sparkle-info",
    "super sparkle package inclusions": "super-sparkle-info",
  };

  const results: { id: string; quantity: number }[] = [];
  for (const addon of parsedAddOns) {
    const key = addon.name.toLowerCase();
    const id = NAME_TO_ID[key];
    if (id) results.push({ id, quantity: addon.quantity });
  }
  return results;
}

/**
 * Parse pricing fields from booking notes.
 * Format: "Ticket Price: 105 | Discount Amount: 50 | Tax: 78.38 | Gratuity: 202 | Service Fee: 24.47"
 */
export function parsePricingFromNotes(notes: string | null): {
  ticketPrice: number;
  discountAmount: number;
  tax: number;
  gratuity: number;
  serviceFee: number;
  adjustments: number;
  guests: number;
  ticketCount: number;
} {
  if (!notes) return { ticketPrice: 0, discountAmount: 0, tax: 0, gratuity: 0, serviceFee: 0, adjustments: 0, guests: 0, ticketCount: 0 };

  const ticketMatch = notes.match(/Ticket Price:\s*([\d,.]+)/i);
  const discountMatch = notes.match(/Discount Amount:\s*([\d,.]+)/i);
  const taxMatch = notes.match(/(?:^|\|)\s*Tax:\s*([\d.]+)/i);
  const addOnTaxMatch = notes.match(/Add-On Tax:\s*([\d.]+)/i);
  const gratuityMatch = notes.match(/Gratuity:\s*([\d.]+)/i);
  const serviceFeeMatch = notes.match(/Service Fee:\s*([\d.]+)/i);
  const adjustmentsMatch = notes.match(/Adjustments:\s*([\d.]+)/i);
  const guestsMatch = notes.match(/Guests:\s*(\d+)/i);
  const ticketCountMatch = notes.match(/Ticket Count:\s*(\d+)/i);

  // Combine Sales Tax + Add-On Tax into a single tax value
  const baseTax = taxMatch ? Number(taxMatch[1]) : 0;
  const addOnTax = addOnTaxMatch ? Number(addOnTaxMatch[1]) : 0;

  return {
    ticketPrice: ticketMatch ? Number(ticketMatch[1].replace(/,/g, '')) : 0,
    discountAmount: discountMatch ? Number(discountMatch[1].replace(/,/g, '')) : 0,
    tax: baseTax + addOnTax,
    gratuity: gratuityMatch ? Number(gratuityMatch[1]) : 0,
    serviceFee: serviceFeeMatch ? Number(serviceFeeMatch[1]) : 0,
    adjustments: adjustmentsMatch ? Number(adjustmentsMatch[1]) : 0,
    guests: guestsMatch ? parseInt(guestsMatch[1]) : 0,
    ticketCount: ticketCountMatch ? parseInt(ticketCountMatch[1]) : 0,
  };
}
