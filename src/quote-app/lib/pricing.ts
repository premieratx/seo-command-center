import { addDays, format, getDay, parse } from "date-fns";

export interface PricingParams {
  date: Date;
  guestCount: number;
  duration: number;
  boatCapacity: number;
}

export interface PricingResult {
  hourlyRate: number;
  additionalCrewFee: number;
  subtotal: number;
  xolaFee: number;
  tax: number;
  gratuity: number;
  total: number;
}

/**
 * Get base hourly rate without crew fees
 * Returns the base rate for the guest count TIER, not including optional crew upgrades
 */
export const getBaseHourlyRate = (date: Date, guestCount: number): number => {
  const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Date-specific price overrides (flat rate for 4-hour cruise, converted to hourly)
  const DATE_OVERRIDES: Record<string, Record<string, number>> = {
    '2026-05-24': { '14': 350, '30': 375 }, // May 24: Day Tripper $1,400, Meeseeks/Irony $1,500 (per 4hr)
    '2026-05-25': { '14': 250, '30': 275, '75': 300 }, // May 25 Memorial Day: Day Tripper $1,000, Meeseeks/Irony $1,100, Clever Girl $1,200 (per 4hr)
  };
  
  if (DATE_OVERRIDES[dateStr]) {
    if (guestCount <= 14 && DATE_OVERRIDES[dateStr]['14']) {
      return DATE_OVERRIDES[dateStr]['14'];
    }
    if (guestCount <= 30 && DATE_OVERRIDES[dateStr]['30']) {
      return DATE_OVERRIDES[dateStr]['30'];
    }
    if (guestCount > 30 && DATE_OVERRIDES[dateStr]['75']) {
      return DATE_OVERRIDES[dateStr]['75'];
    }
  }
  
  let baseHourlyRate = 0;

  // Determine which guest tier this falls into (1-14, 15-30, 31-75)
  // Crew fees for 26-30 and 51-75 are added separately, not in base rate
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Monday-Thursday
    if (guestCount <= 14) {
      baseHourlyRate = 200;
    } else if (guestCount <= 30) {
      // 15-30 all use same base (crew fee added separately for 26-30)
      baseHourlyRate = 225;
    } else {
      // 31-75 all use same base (crew fee added separately for 51-75)
      baseHourlyRate = 250;
    }
  } else if (dayOfWeek === 5) {
    // Friday
    if (guestCount <= 14) {
      baseHourlyRate = 225;
    } else if (guestCount <= 30) {
      baseHourlyRate = 250;
    } else {
      // 31-75 base rate (crew fee added separately for 51-75)
      baseHourlyRate = 275;
    }
  } else if (dayOfWeek === 6) {
    // Saturday
    if (guestCount <= 14) {
      baseHourlyRate = 350;
    } else if (guestCount <= 30) {
      baseHourlyRate = 375;
    } else {
      // 31-75 base rate (crew fee added separately for 51-75)
      baseHourlyRate = 400;
    }
  } else {
    // Sunday
    if (guestCount <= 14) {
      baseHourlyRate = 250;
    } else if (guestCount <= 30) {
      baseHourlyRate = 275;
    } else {
      baseHourlyRate = 300;
    }
  }

  return baseHourlyRate;
};

/**
 * Calculate pricing with optional crew fee and discount
 * @param params.crewFeePerHour - Optional crew fee (0, 50, or 100) - NOT calculated automatically
 * @param params.discount - Optional discount amount to subtract from subtotal before calculating gratuity and Xola fee
 */
export const calculatePricing = (params: PricingParams & { crewFeePerHour?: number; discount?: number }): PricingResult => {
  const { date, guestCount, duration, crewFeePerHour = 0, discount = 0 } = params;
  
  const baseHourlyRate = getBaseHourlyRate(date, guestCount);
  const crewFeeTotal = crewFeePerHour * duration;
  
  // Subtotal includes base rate + crew fee (before discount)
  const subtotal = (baseHourlyRate * duration) + crewFeeTotal;
  
  // Apply discount to get discounted subtotal (for gratuity and Xola fee calculation)
  const discountedSubtotal = Math.max(0, subtotal - discount);
  
  // Gratuity is calculated on discounted subtotal
  const gratuity = discountedSubtotal * 0.20;
  
  // Xola fee is calculated on discounted subtotal + gratuity
  const xolaFee = (discountedSubtotal + gratuity) * 0.03;
  
  // Tax is on the original subtotal (per standard tax rules)
  const tax = subtotal * 0.0825;
  
  // Total uses discounted subtotal
  const total = discountedSubtotal + xolaFee + tax + gratuity;

  return {
    hourlyRate: baseHourlyRate,
    additionalCrewFee: crewFeeTotal,
    subtotal: discountedSubtotal, // Return the discounted subtotal for display
    xolaFee,
    tax,
    gratuity,
    total
  };
};

export const getRecommendedBoat = (guestCount: number): string => {
  if (guestCount <= 14) return "Day Tripper";
  if (guestCount <= 30) return "Meeseeks/The Irony";
  return "Clever Girl";
};

export const getPackagePrice = (guestCount: number, packageType: 'essentials' | 'ultimate'): number => {
  if (guestCount <= 14) {
    return packageType === 'essentials' ? 100 : 250;
  } else if (guestCount <= 30) {
    return packageType === 'essentials' ? 150 : 300;
  } else {
    return packageType === 'essentials' ? 200 : 350;
  }
};
