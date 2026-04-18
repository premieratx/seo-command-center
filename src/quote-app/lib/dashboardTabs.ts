// Registry of all available tabs that can be added to dynamic dashboards

export interface TabDefinition {
  id: string;
  label: string;
  icon: string; // lucide icon name
  source: 'inn_cahoots' | 'customer' | 'lead';
  category: string;
  description: string;
  activeColor: string; // tailwind active bg class
  textColor: string; // tailwind text class
}

export const AVAILABLE_TABS: TabDefinition[] = [
  // Inn Cahoots tabs
  {
    id: 'ic_reservation',
    label: 'Reservation',
    icon: 'Key',
    source: 'inn_cahoots',
    category: 'Accommodations',
    description: 'Suite photos, suite details, and payment breakdown',
    activeColor: 'data-[state=active]:bg-amber-600',
    textColor: 'text-amber-300',
  },
  {
    id: 'ic_concierge',
    label: 'Concierge Services',
    icon: 'ShoppingCart',
    source: 'inn_cahoots',
    category: 'Services',
    description: 'Interactive concierge service selector with cart',
    activeColor: 'data-[state=active]:bg-emerald-600',
    textColor: 'text-emerald-300',
  },
  {
    id: 'ic_transport',
    label: 'Transport',
    icon: 'Car',
    source: 'inn_cahoots',
    category: 'Logistics',
    description: 'Fetii group rides, private van & party bus fleet, and marina directions',
    activeColor: 'data-[state=active]:bg-amber-600',
    textColor: 'text-amber-300',
  },
  {
    id: 'ic_alcohol',
    label: 'Alcohol & Concierge',
    icon: 'Wine',
    source: 'inn_cahoots',
    category: 'Services',
    description: 'Party on Delivery partner info with suite + boat delivery',
    activeColor: 'data-[state=active]:bg-purple-600',
    textColor: 'text-purple-300',
  },
  {
    id: 'ic_map',
    label: 'Map & Info',
    icon: 'Compass',
    source: 'inn_cahoots',
    category: 'Info',
    description: 'Inn Cahoots location map, directions, and house rules',
    activeColor: 'data-[state=active]:bg-amber-600',
    textColor: 'text-amber-300',
  },
  {
    id: 'ic_boats',
    label: '⛵ Boat Rentals',
    icon: 'Anchor',
    source: 'inn_cahoots',
    category: 'Activities',
    description: 'Premier Party Cruises boat galleries, quote builder, and Xola booking',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },

  // Customer Dashboard tabs
  {
    id: 'cd_reservation',
    label: 'Reservation',
    icon: 'FileText',
    source: 'customer',
    category: 'Booking',
    description: 'Booking details and payment breakdown for confirmed bookings',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'cd_addons',
    label: 'Add-Ons',
    icon: 'ShoppingCart',
    source: 'customer',
    category: 'Services',
    description: 'Add-on store with Stripe "Add to Invoice" flow',
    activeColor: 'data-[state=active]:bg-emerald-600',
    textColor: 'text-emerald-300',
  },
  {
    id: 'cd_photos',
    label: 'Photos',
    icon: 'Camera',
    source: 'customer',
    category: 'Media',
    description: 'Boat-specific photo gallery and experience photos',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'cd_transport',
    label: 'Transport',
    icon: 'Car',
    source: 'customer',
    category: 'Logistics',
    description: 'Fetii group rides, private van & party bus fleet, and marina directions',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'cd_stays',
    label: 'Places to Stay',
    icon: 'Home',
    source: 'customer',
    category: 'Accommodations',
    description: 'Inn Cahoots suite listings for cruise customers',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'cd_waiver',
    label: 'Waiver',
    icon: 'FileText',
    source: 'customer',
    category: 'Documents',
    description: 'Waiver progress tracker with shareable signing link',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'cd_alcohol',
    label: 'Alcohol & Concierge',
    icon: 'Wine',
    source: 'customer',
    category: 'Services',
    description: 'Party on Delivery boat + Airbnb delivery service',
    activeColor: 'data-[state=active]:bg-purple-600',
    textColor: 'text-purple-300',
  },
  {
    id: 'cd_map',
    label: 'Map & Rules',
    icon: 'Compass',
    source: 'customer',
    category: 'Info',
    description: 'Anderson Mill Marina map, directions, and boat rules',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'cd_pay',
    label: 'Pay Balance',
    icon: 'CreditCard',
    source: 'customer',
    category: 'Payments',
    description: 'Balance payment form for remaining amounts',
    activeColor: 'data-[state=active]:bg-emerald-600',
    textColor: 'text-emerald-300',
  },

  // Lead Dashboard tabs
  {
    id: 'ld_quote',
    label: 'Quote Builder',
    icon: 'FileText',
    source: 'lead',
    category: 'Sales',
    description: 'Embedded quote-v2 builder for lead conversion',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'ld_booking',
    label: 'Book Now',
    icon: 'Anchor',
    source: 'lead',
    category: 'Sales',
    description: 'Xola booking widget for direct booking',
    activeColor: 'data-[state=active]:bg-emerald-600',
    textColor: 'text-emerald-300',
  },
  {
    id: 'ld_photos',
    label: 'Photos',
    icon: 'Camera',
    source: 'lead',
    category: 'Media',
    description: 'Full fleet photo gallery for prospects',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'ld_transport',
    label: 'Transport',
    icon: 'Car',
    source: 'lead',
    category: 'Logistics',
    description: 'Fetii group rides, private van & party bus fleet, and marina directions',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
  {
    id: 'ld_alcohol',
    label: 'Alcohol & Concierge',
    icon: 'Wine',
    source: 'lead',
    category: 'Services',
    description: 'Party on Delivery info for prospects',
    activeColor: 'data-[state=active]:bg-purple-600',
    textColor: 'text-purple-300',
  },
  {
    id: 'ld_map',
    label: 'Map & Rules',
    icon: 'Compass',
    source: 'lead',
    category: 'Info',
    description: 'Marina map, directions, and boat rules',
    activeColor: 'data-[state=active]:bg-sky-600',
    textColor: 'text-sky-300',
  },
];

export const DASHBOARD_TYPES = [
  { value: 'boat_rental', label: 'Boat Rental' },
  { value: 'accommodations', label: 'Accommodations' },
  { value: 'combo', label: 'Accommodations + Boat Rental' },
  { value: 'transport_partner', label: 'Transportation Partner' },
  { value: 'lead_funnel', label: 'Lead Funnel' },
  { value: 'general', label: 'General / Other' },
];

export function getTabsBySource(source: TabDefinition['source']) {
  return AVAILABLE_TABS.filter(t => t.source === source);
}

export function getTabById(id: string) {
  return AVAILABLE_TABS.find(t => t.id === id);
}
