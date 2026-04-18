/**
 * Static Fleet Schedule Generator
 * Generates hardcoded time slots without database lookups.
 * SINGLE SOURCE OF TRUTH for what the quote builder displays.
 */

import { getDay, getMonth, format, addDays } from "date-fns";

// Boat definitions
const BOATS = {
  DAY_TRIPPER: { name: "Day Tripper", capacity: 14, boat_group: null },
  MEESEEKS: { name: "Meeseeks", capacity: 25, boat_group: "25-Person Party Boats" },
  THE_IRONY: { name: "The Irony", capacity: 25, boat_group: "25-Person Party Boats" },
  CLEVER_GIRL: { name: "Clever Girl", capacity: 75, boat_group: null },
} as const;

interface StaticSlot {
  id: string;
  start_at: string;
  end_at: string;
  capacity_available: number;
  capacity_total: number;
  boat: { name: string; capacity: number; boat_group?: string | null };
  experience: { type: string };
  grouped_slot_ids?: string[];
  availability_count?: number;
}

/** Check if month is disco season (Feb=1 through Sep=8, 0-indexed: 1-8) */
function isDiscoSeason(date: Date): boolean {
  const month = getMonth(date); // 0-indexed
  return month >= 1 && month <= 8; // Feb through Sep
}

/** Build a CST/CDT ISO string for a given date + HH:MM */
function buildCSTDateTime(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  
  // Determine CDT vs CST
  const testDate = new Date(Date.UTC(y, date.getMonth(), date.getDate(), 12));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' }).formatToParts(testDate);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
  const offset = tzName.includes('CDT') ? '-05:00' : '-06:00';
  
  return `${y}-${m}-${d}T${hh}:${mm}:00${offset}`;
}

/** Generate a unique but deterministic ID for a static slot */
function makeSlotId(boatName: string, dateStr: string, startHour: number, startMin: number): string {
  return `static-${boatName.replace(/\s+/g, '-').toLowerCase()}-${dateStr}-${startHour}${String(startMin).padStart(2, '0')}`;
}

/**
 * Holiday weekend exceptions where disco cruises run on non-standard days.
 * Key format: "YYYY-MM-DD"
 */
const HOLIDAY_DISCO_DATES: Record<string, TimeWindow[]> = {
  '2026-05-24': [{ startHour: 11, startMin: 0, durationHours: 4 }], // Memorial Day weekend Sunday
};

/**
 * Blocked slots: specific boat + date + time combinations that should not appear.
 * Key format: "boatName|YYYY-MM-DD|HH:MM"
 */
const BLOCKED_SLOTS = new Set([
  'Clever Girl|2026-05-24|15:30', // Block Clever Girl 3:30-7:30 on Memorial Day weekend Sunday
]);

/**
 * Date-specific schedule overrides per boat.
 * Replaces the standard weekday/weekend windows for a specific boat on a specific date.
 * Key format: "boatName|YYYY-MM-DD"
 */
const BOAT_DATE_SCHEDULE_OVERRIDES: Record<string, TimeWindow[]> = {
  'Day Tripper|2026-05-25': [
    { startHour: 11, startMin: 0, durationHours: 4 },
    { startHour: 15, startMin: 30, durationHours: 4 },
  ], // Memorial Day Monday: only 11-3 or 3:30-7:30
  'Meeseeks|2026-05-25': [
    { startHour: 11, startMin: 0, durationHours: 4 },
    { startHour: 15, startMin: 30, durationHours: 4 },
  ], // Memorial Day Monday: only 11-3 or 3:30-7:30
  'The Irony|2026-05-25': [
    { startHour: 11, startMin: 0, durationHours: 4 },
    { startHour: 15, startMin: 30, durationHours: 4 },
  ], // Memorial Day Monday: only 11-3 or 3:30-7:30
  'Clever Girl|2026-05-25': [
    { startHour: 11, startMin: 0, durationHours: 4 },
    { startHour: 15, startMin: 30, durationHours: 4 },
  ], // Memorial Day Monday: only 11-3 or 3:30-7:30
};

/**
 * Disco-to-Private overrides: specific Saturday disco slots that should be private instead.
 * Key format: "YYYY-MM-DD|HH:MM"
 */
const DISCO_TO_PRIVATE_OVERRIDES = new Set([
  '2026-05-09|15:30', // May 9 Sat 3:30pm: Private instead of Disco
]);

function isHolidayDiscoDate(date: Date): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  return dateStr in HOLIDAY_DISCO_DATES;
}

function getHolidayDiscoWindows(date: Date): TimeWindow[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return HOLIDAY_DISCO_DATES[dateStr] || [];
}

/** Standard boat time windows */
interface TimeWindow {
  startHour: number;
  startMin: number;
  durationHours: number;
}

function getStandardBoatWindows(dayOfWeek: number): TimeWindow[] {
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Mon-Thu: flexible 3hr and 4hr slots every 30 min, 10:00 AM to last start
    const windows: TimeWindow[] = [];
    for (let h = 10; h <= 17; h++) {
      for (const m of [0, 30]) {
        const startMinutes = h * 60 + m;
        // 4-hour slots: last start at 4:30 PM (16:30) → ends 8:30 PM
        if (startMinutes <= 16 * 60 + 30) {
          windows.push({ startHour: h, startMin: m, durationHours: 4 });
        }
        // 3-hour slots: last start at 5:30 PM (17:30) → ends 8:30 PM
        if (startMinutes <= 17 * 60 + 30) {
          windows.push({ startHour: h, startMin: m, durationHours: 3 });
        }
      }
    }
    return windows;
  } else if (dayOfWeek === 5) {
    // Friday: 12-4 PM, 4:30-8:30 PM
    return [
      { startHour: 12, startMin: 0, durationHours: 4 },
      { startHour: 16, startMin: 30, durationHours: 4 },
    ];
  } else {
    // Sat (6) & Sun (0): 11-3 PM, 3:30-7:30 PM
    return [
      { startHour: 11, startMin: 0, durationHours: 4 },
      { startHour: 15, startMin: 30, durationHours: 4 },
    ];
  }
}

function generateSlotsForBoatAndDay(
  boat: typeof BOATS[keyof typeof BOATS],
  date: Date,
  windows: TimeWindow[],
  experienceType: string
): StaticSlot[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return windows
    .filter(w => {
      const key = `${boat.name}|${dateStr}|${String(w.startHour).padStart(2, '0')}:${String(w.startMin).padStart(2, '0')}`;
      return !BLOCKED_SLOTS.has(key);
    })
    .map(w => {
      const endHour = w.startHour + w.durationHours;
      const endMin = w.startMin;
      return {
        id: makeSlotId(boat.name, dateStr, w.startHour, w.startMin),
        start_at: buildCSTDateTime(date, w.startHour, w.startMin),
        end_at: buildCSTDateTime(date, endHour, endMin),
        capacity_available: boat.capacity,
        capacity_total: boat.capacity,
        boat: { name: boat.name, capacity: boat.capacity, boat_group: boat.boat_group || null },
        experience: { type: experienceType },
      };
    });
}

/**
 * Generate all static slots for a given date.
 * Returns { discoSlots, privateSlots } already filtered by guest count & party type.
 */
export function generateStaticSlots(
  selectedDate: Date,
  partyType: string,
  guestCount: number
): { discoSlots: StaticSlot[]; privateSlots: StaticSlot[]; smallerBoatSlots: any[] } {
  // Determine the date range to show (selected date + weekend)
  const dayOfWeek = selectedDate.getDay();
  const dates: Date[] = [];
  
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Weekday: show selected day + upcoming Fri/Sat/Sun
    dates.push(new Date(selectedDate));
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = addDays(selectedDate, daysUntilFriday);
    dates.push(friday);
    dates.push(addDays(friday, 1)); // Saturday
    dates.push(addDays(friday, 2)); // Sunday
  } else if (dayOfWeek === 5) {
    // Friday: show Fri/Sat/Sun
    dates.push(new Date(selectedDate));
    dates.push(addDays(selectedDate, 1));
    dates.push(addDays(selectedDate, 2));
  } else if (dayOfWeek === 6) {
    // Saturday: show Fri/Sat/Sun
    dates.push(addDays(selectedDate, -1));
    dates.push(new Date(selectedDate));
    dates.push(addDays(selectedDate, 1));
  } else {
    // Sunday: show Fri/Sat/Sun
    dates.push(addDays(selectedDate, -2));
    dates.push(addDays(selectedDate, -1));
    dates.push(new Date(selectedDate));
  }

  const allPrivateSlots: StaticSlot[] = [];
  const allDiscoSlots: StaticSlot[] = [];

  for (const date of dates) {
    const dow = date.getDay();
    const disco = isDiscoSeason(date);

    // Standard boats: Day Tripper, Meeseeks, The Irony
    const standardBoats = [BOATS.DAY_TRIPPER, BOATS.MEESEEKS, BOATS.THE_IRONY];
    const standardWindows = getStandardBoatWindows(dow);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    for (const boat of standardBoats) {
      const overrideKey = `${boat.name}|${dateStr}`;
      const windows = BOAT_DATE_SCHEDULE_OVERRIDES[overrideKey] || standardWindows;
      allPrivateSlots.push(...generateSlotsForBoatAndDay(boat, date, windows, 'private_cruise'));
    }

    // Clever Girl schedule
    const cleverGirlOverrideKey = `${BOATS.CLEVER_GIRL.name}|${dateStr}`;
    if (BOAT_DATE_SCHEDULE_OVERRIDES[cleverGirlOverrideKey]) {
      // Date-specific override takes priority over all other logic
      allPrivateSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, BOAT_DATE_SCHEDULE_OVERRIDES[cleverGirlOverrideKey], 'private_cruise'));
    } else if (disco && dow === 5) {
      // Disco season Friday: Disco 12-4, Private 4:30-8:30
      allDiscoSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, [
        { startHour: 12, startMin: 0, durationHours: 4 },
      ], 'disco_cruise'));
      allPrivateSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, [
        { startHour: 16, startMin: 30, durationHours: 4 },
      ], 'private_cruise'));
    } else if (disco && dow === 6) {
      // Disco season Saturday: check for disco-to-private overrides
      const satDateStr = format(date, 'yyyy-MM-dd');
      const satDiscoWindows: TimeWindow[] = [];
      const satPrivateWindows: TimeWindow[] = [];
      for (const w of [
        { startHour: 11, startMin: 0, durationHours: 4 },
        { startHour: 15, startMin: 30, durationHours: 4 },
      ]) {
        const key = `${satDateStr}|${String(w.startHour).padStart(2, '0')}:${String(w.startMin).padStart(2, '0')}`;
        if (DISCO_TO_PRIVATE_OVERRIDES.has(key)) {
          satPrivateWindows.push(w);
        } else {
          satDiscoWindows.push(w);
        }
      }
      if (satDiscoWindows.length > 0) {
        allDiscoSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, satDiscoWindows, 'disco_cruise'));
      }
      if (satPrivateWindows.length > 0) {
        allPrivateSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, satPrivateWindows, 'private_cruise'));
      }
    } else if (isHolidayDiscoDate(date)) {
      // Holiday weekend exception: Disco + Private on special Sundays
      const holidayDisco = getHolidayDiscoWindows(date);
      allDiscoSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, holidayDisco, 'disco_cruise'));
      // Also show private cruise slots for remaining windows
      const standardWindows = getStandardBoatWindows(dow);
      const discoStartHours = new Set(holidayDisco.map(w => `${w.startHour}:${w.startMin}`));
      const remainingPrivate = standardWindows.filter(w => !discoStartHours.has(`${w.startHour}:${w.startMin}`));
      if (remainingPrivate.length > 0) {
        allPrivateSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, remainingPrivate, 'private_cruise'));
      }
    } else {
      // Off-season or Sun/Weekday: standard schedule for Clever Girl
      allPrivateSlots.push(...generateSlotsForBoatAndDay(BOATS.CLEVER_GIRL, date, getStandardBoatWindows(dow), 'private_cruise'));
    }
  }

  // Filter disco by party type eligibility
  const discoEligible = ['bachelor_party', 'bachelorette_party', 'combined_bach'].includes(partyType || '');
  const filteredDisco = discoEligible ? allDiscoSlots : [];

  // Filter private slots by guest count → appropriate boat capacity
  let filteredPrivate: StaticSlot[] = [];
  const smallerBoatSlots: any[] = [];

  if (guestCount <= 14) {
    filteredPrivate = allPrivateSlots.filter(s => s.boat.capacity <= 14);
  } else if (guestCount <= 30) {
    // Show 25-person boats, grouped by boat_group
    const eligible = allPrivateSlots.filter(s => s.boat.capacity >= 15 && s.boat.capacity <= 30);
    
    // Group by time window + boat_group
    const groups = new Map<string, StaticSlot[]>();
    eligible.forEach(slot => {
      const timeKey = `${slot.start_at}_${slot.end_at}`;
      const groupKey = slot.boat.boat_group ? `${slot.boat.boat_group}_${timeKey}` : slot.id;
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(slot);
    });

    filteredPrivate = Array.from(groups.entries()).map(([_, slots]) => {
      if (slots.length > 1) {
        const maxCap = Math.max(...slots.map(s => s.boat.capacity));
        return {
          ...slots[0],
          boat: { name: slots[0].boat.boat_group || "25-Person Party Boats", capacity: maxCap, boat_group: slots[0].boat.boat_group },
          grouped_slot_ids: slots.map(s => s.id),
          availability_count: slots.length,
        };
      }
      return slots[0];
    });

    // If no 25P slots, suggest 14P as smaller option
    if (filteredPrivate.length === 0) {
      const smaller = allPrivateSlots
        .filter(s => s.boat.capacity === 14)
        .map(s => ({ id: s.id, boat_name: s.boat.name, capacity: s.capacity_total, start_at: s.start_at, end_at: s.end_at }));
      smallerBoatSlots.push(...smaller);
    }
  } else {
    // 31+ guests → Clever Girl (75P) private slots
    filteredPrivate = allPrivateSlots.filter(s => s.boat.capacity >= guestCount);
    
    // If no large boat slots, suggest 25P as smaller option
    if (filteredPrivate.length === 0) {
      const smaller = allPrivateSlots
        .filter(s => s.boat.capacity === 25 || s.boat.capacity === 30)
        .map(s => ({ id: s.id, boat_name: s.boat.name, capacity: s.capacity_total, start_at: s.start_at, end_at: s.end_at }));
      smallerBoatSlots.push(...smaller);
    }
  }

  return {
    discoSlots: filteredDisco,
    privateSlots: filteredPrivate,
    smallerBoatSlots,
  };
}
