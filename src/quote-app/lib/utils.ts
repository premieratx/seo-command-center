import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPartyType(partyType: string): string {
  const partyTypeMap: Record<string, string> = {
    'combined_bach': 'Combined Bachelorette & Bachelor Party',
    'graduation': 'Graduation Party',
    'other': 'Any Other Occasion',
    'corporate_event': 'Corporate Event',
    'corporate': 'Corporate Event',
    'wedding_event': 'Wedding Event',
    'wedding': 'Wedding Event',
    'birthday_party': 'Birthday Party',
    'birthday': 'Birthday Party',
    'bachelor_party': 'Bachelor Party',
    'bachelor': 'Bachelor Party',
    'bachelorette_party': 'Bachelorette Party',
    'bachelorette': 'Bachelorette Party',
  };
  
  const normalized = partyType.toLowerCase().trim();
  return partyTypeMap[normalized] || partyType;
}

export function formatPackageName(name: string): string {
  // Handle common package formats
  const packageMap: Record<string, string> = {
    'disco-queen': 'Disco Queen',
    'super-sparkle': 'Super Sparkle',
    'basic': 'Basic Bach Package',
    'standard': 'Standard Private Cruise',
    'essentials': 'Standard Essentials',
    'ultimate': 'Ultimate Disco Party Package',
  };
  
  const normalized = name?.toLowerCase().trim();
  if (packageMap[normalized]) {
    return packageMap[normalized];
  }
  
  // Fallback: Convert underscores and hyphens to spaces, capitalize each word
  return name
    ?.replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || name;
}

// Format time in CST timezone as "11am", "12pm", "9:30pm", etc.
export function formatTimeCSTShort(dateIso: string): string {
  const date = new Date(dateIso);
  const hours = date.toLocaleString('en-US', { 
    hour: 'numeric', 
    hour12: true, 
    timeZone: 'America/Chicago' 
  });
  const minutes = date.toLocaleString('en-US', { 
    minute: '2-digit', 
    timeZone: 'America/Chicago' 
  });
  
  // Get hour value to check if we need minutes
  const hourNum = parseInt(date.toLocaleString('en-US', { 
    hour: 'numeric', 
    hour12: false, 
    timeZone: 'America/Chicago' 
  }));
  const minuteNum = parseInt(minutes);
  
  // If minutes are 00, just show hour + am/pm (e.g., "11am")
  // Otherwise show hour:minutes + am/pm (e.g., "9:30pm")
  const period = hours.toLowerCase().includes('am') ? 'am' : 'pm';
  const hour = hours.replace(/[^\d]/g, '');
  
  if (minuteNum === 0) {
    return `${hour}${period}`;
  } else {
    return `${hour}:${minutes}${period}`;
  }
}

// Format time in CST timezone as "10:00 AM", "2:30 PM", etc. (full format with colon)
export function formatTimeCSTFull(dateIso: string): string {
  const date = new Date(dateIso);
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Convert UTC to CST date and time
export function formatDateTimeCSTShort(dateIso: string): { date: string; time: string; full: Date } {
  const date = new Date(dateIso);
  const dateStr = date.toLocaleDateString('en-US', { 
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = dateStr.split('/');
  const formattedDate = `${year}-${month}-${day}`;
  
  return {
    date: formattedDate,
    time: formatTimeCSTShort(dateIso),
    full: new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  };
}
