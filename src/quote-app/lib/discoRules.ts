/**
 * ATX Disco Cruise Business Rules
 * SINGLE SOURCE OF TRUTH - DO NOT DUPLICATE
 */

import { getDay, getMonth } from "date-fns";

export interface DiscoSlotValidation {
  isValid: boolean;
  reason?: string;
}

/**
 * Check if a date is within disco cruise season (March 1 - October 31)
 */
export const isDiscoSeason = (date: Date): boolean => {
  const month = getMonth(date); // 0 = January, 11 = December
  // March = 2, October = 9
  return month >= 2 && month <= 9;
};

/**
 * Check if a day is a disco cruise day (Friday or Saturday)
 */
export const isDiscoCruiseDay = (date: Date): boolean => {
  const day = getDay(date); // 0 = Sunday, 6 = Saturday
  return day === 5 || day === 6; // Friday or Saturday
};

/**
 * Validate if a date/time is eligible for disco cruise
 */
export const validateDiscoSlot = (
  date: Date,
  boatName: string,
  experienceType: string
): DiscoSlotValidation => {
  // Must be disco cruise experience type
  if (experienceType !== 'disco_cruise') {
    return { isValid: false, reason: 'Not a disco cruise slot' };
  }

  // Must be on Clever Girl
  if (!boatName || !boatName.toLowerCase().includes('clever girl')) {
    return { isValid: false, reason: 'Disco cruises only available on Clever Girl' };
  }

  // Must be Friday or Saturday
  if (!isDiscoCruiseDay(date)) {
    return { isValid: false, reason: 'Disco cruises only available Friday-Saturday' };
  }

  // Must be in season (March-October)
  if (!isDiscoSeason(date)) {
    const month = getMonth(date);
    if (month === 10 || month === 0 || month === 1) {
      return { isValid: false, reason: 'Disco cruise season: March 1 - October 31' };
    }
    return { isValid: false, reason: 'Disco cruises not available in this month' };
  }

  return { isValid: true };
};

/**
 * Check if party type is eligible for disco cruise
 */
export const isDiscoEligiblePartyType = (partyType: string): boolean => {
  const normalized = partyType.toLowerCase().replace(/[^a-z]/g, '');
  return [
    'bachelorparty',
    'bachelor',
    'bacheloretteparty', 
    'bachelorette',
    'combinedbachparty',
    'combinedbach',
    'bach'
  ].includes(normalized);
};

/**
 * Get the next available disco cruise date from a given date
 */
export const getNextDiscoDate = (fromDate: Date): Date | null => {
  const maxLookAhead = 180; // 6 months
  let current = new Date(fromDate);
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < maxLookAhead; i++) {
    current.setDate(current.getDate() + 1);
    
    if (isDiscoSeason(current) && isDiscoCruiseDay(current)) {
      return current;
    }
  }

  return null;
};

/**
 * Disco cruise constants
 */
export const DISCO_CONSTANTS = {
  BOAT_NAME: 'Clever Girl',
  MAX_TICKETS: 100,
  /** Single-ticket pricing by time slot */
  SLOT_PRICING: {
    FRIDAY_12_4: 95,
    SATURDAY_11_3: 105,
    SATURDAY_330_730: 85,
  },
  /** Optional add-ons (flat fee per group, not per person) */
  ADD_ONS: {
    MIMOSA_COOLER: { name: 'Mimosa Party Cooler', price: 100 },
    BRIDE_SPARKLE: { name: 'Bride Sparkle Package', price: 100 },
    GROOM_MANLY_SPARKLE: { name: 'Groom Manly Sparkle Package', price: 100 },
    SPARKLE_TOGETHER: { name: 'Sparkle Together Package', price: 150 },
  },
  SCHEDULE: {
    FRIDAY: [
      { start: '12:00', end: '16:00', duration: 4 }
    ],
    SATURDAY: [
      { start: '11:00', end: '15:00', duration: 4 },
      { start: '15:30', end: '19:30', duration: 4 }
    ]
  }
} as const;

/**
 * Get disco cruise ticket price based on day/time
 */
export const getDiscoSlotPrice = (dayOfWeek: string, startTime: string): number => {
  const day = dayOfWeek.toLowerCase();
  if (day === 'friday') return DISCO_CONSTANTS.SLOT_PRICING.FRIDAY_12_4;
  if (day === 'saturday' && startTime.includes('11')) return DISCO_CONSTANTS.SLOT_PRICING.SATURDAY_11_3;
  if (day === 'saturday' && (startTime.includes('3:30') || startTime.includes('15:30'))) return DISCO_CONSTANTS.SLOT_PRICING.SATURDAY_330_730;
  if (day === 'sunday' && startTime.includes('11')) return 105; // Holiday weekend pricing
  return 95; // default fallback
};
