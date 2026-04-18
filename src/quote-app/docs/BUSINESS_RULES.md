# Premier Party Cruises - Business Rules

## CRITICAL: DO NOT MODIFY WITHOUT OWNER APPROVAL

---

## BOAT FLEET & CAPACITY

### Day Tripper
- **Capacity**: 1-14 guests
- **Usage**: Private cruises only

### Meeseeks / The Irony
- **Capacity**: 15-30 guests each (interchangeable)
- **Extra Crew**: Required for 26-30 guests (+$50/hr)
- **Usage**: Private cruises only

### Clever Girl
- **Capacity**: 31-75 guests
- **Extra Crew**: Required for 51-75 guests (+$100/hr)
- **Usage**: Private cruises AND ATX Disco Cruise

---

## ATX DISCO CRUISE RULES

### Schedule
- **Friday**: 12:00 PM - 4:00 PM (4 hours)
- **Saturday**: 
  - 11:00 AM - 3:00 PM (4 hours)
  - 3:30 PM - 7:30 PM (4 hours)

### Season
- **Active**: March 1 through October 31
- **Closed**: November, December, January, February

### Boat & Capacity
- **Boat**: Clever Girl ONLY
- **Tickets**: 100 available per time slot
- **Booking Model**: Per-person tickets (multiple groups share the boat)

### Eligibility
- **ONLY for**: Bachelor Party, Bachelorette Party, Combined Bach Party
- **NOT available**: For other party types

### Packages (Per Person)
1. **Basic Bach**: $85/person
   - Giant 25-ft Inflatable Unicorn Float
   - DJ & Live Music
   - Pro Photographer & Free Photos
   - 3 Giant Lily Pad Floats
   - Shared Community Coolers w/Ice
   - BYOB

2. **Disco Queen**: $95/person
   - Everything in Basic Bach
   - Private Cooler w/Ice & Reserved Spot
   - Disco Ball Cup & Bubble Gun
   - Direct-to-Boat Alcohol Delivery
   - 25% Discount on Transportation
   - $50-$100 Voucher for Airbnb Delivery

3. **Super Sparkle Platinum**: $105/person
   - Everything in Disco Queen
   - Personal Unicorn Float
   - Mimosa Setup w/Champagne Flutes
   - $100 Voucher for Airbnb Concierge
   - Towel Service & SPF-50 Sunscreen

---

## PRIVATE CRUISE PRICING

### Hourly Rates by Day & Guest Count

**Monday - Thursday:**
- 1-14 guests: $200/hr
- 15-25 guests: $250/hr
- 26-30 guests: $250/hr + $50/hr crew fee
- 31-50 guests: $300/hr
- 51-75 guests: $300/hr + $100/hr crew fee

**Friday:**
- 1-14 guests: $225/hr
- 15-25 guests: $250/hr
- 26-30 guests: $250/hr + $50/hr crew fee
- 31-50 guests: $300/hr
- 51-75 guests: $300/hr + $100/hr crew fee

**Saturday:**
- 1-14 guests: $350/hr
- 15-25 guests: $375/hr
- 26-30 guests: $375/hr + $50/hr crew fee
- 31-50 guests: $400/hr
- 51-75 guests: $400/hr + $100/hr crew fee

**Sunday:**
- 1-14 guests: $225/hr
- 15-25 guests: $250/hr
- 26-30 guests: $250/hr + $50/hr crew fee
- 31-50 guests: $300/hr
- 51-75 guests: $300/hr + $100/hr crew fee

### Private Cruise Package Add-Ons

**Essentials Package:**
- 1-14 guests: +$100
- 15-30 guests: +$150
- 31-75 guests: +$200

**Ultimate Disco Party Package:**
- 1-14 guests: +$250
- 15-30 guests: +$300
- 31-75 guests: +$350

**Professional Services Add-Ons:**
(NOT available for bachelor/bachelorette/combined bach parties)
- Professional DJ: +$600 per party (max 1)
- Professional Photographer: +$600 per party (max 1)
- Bartender Service: +$600 per party (max 1)

**Equipment & Extras Add-Ons:**
(NOT available for bachelor/bachelorette/combined bach parties)
- Lily Pad (6'x20' Giant Float): +$50 each (max 3)
- A/V Package (projector, screen, installation & setup, wireless microphone): +$300 per party (max 1)

**Tax & Gratuity Notes:**
- Sales tax (8.25%), Xola fee (3%), and gratuity (20%) apply to: base rate, crew fees, packages, lily pads, and A/V package
- Sales tax (8.25%) and Xola fee (3%) apply to: DJ, photographer, and bartender services
- Gratuity (20%) does NOT apply to: DJ, photographer, and bartender services

### Duration Options
- **Mon-Thu**: 3 or 4 hours (flexible start times 9 AM - 6 PM)
- **Fri-Sun**: Fixed 4-hour time slots only

---

## BOOKING LOGIC

### Private Cruises
- **Exclusive**: One booking per boat per time slot
- **Conflict Check**: 30-minute buffer after each cruise
- **Capacity**: Entire boat is reserved for one group
- **When booked**: Slot status → "booked", capacity_available → 0

### Disco Cruises
- **Shared**: Multiple groups book the same time slot
- **Capacity**: Up to 100 tickets total per slot
- **Per-Person**: Each booking purchases X tickets
- **When booked**: Subtract ticket count from capacity_available
- **Sold Out**: When capacity_available reaches 0

---

## PAYMENT RULES

### Tax & Gratuity
- **Sales Tax**: 8.25% (applied to subtotal after discount)
- **Gratuity**: 20% (always on original subtotal, before discount)

### Deposit Rules (Central Time)
- **14+ days before event**: 25% deposit, balance due 14 days before
- **Less than 14 days**: 50% deposit, balance due 3 days after booking

### Discount Codes
- Applied to subtotal only (before tax/gratuity)
- Tax calculated on discounted subtotal
- Gratuity calculated on original subtotal

---

## XOLA TICKET PRICE INTERPRETATION (CRITICAL)

### Rule: Experience Type Determines ticketPrice Meaning

- **Disco Cruise** (`disco_cruise` / `disco`): `ticketPrice` = **per-person rate**
  - Subtotal = `ticketPrice × headcount`
  - Display: "Per Person $X × N guests"

- **Private Cruise** (`private_cruise` / all others): `ticketPrice` = **flat cruise rate** (total base)
  - Subtotal = `ticketPrice` (do NOT multiply by headcount)
  - Display: "Cruise Rate $X"

### Authoritative Amount
- `booking.amount` from Xola is ALWAYS the authoritative total (includes packages, add-ons, crew fees, tax, gratuity, fees)
- The ticketPrice-based breakdown is for **display purposes only**
- Differences between computed breakdown and `booking.amount` are expected due to package upgrades, crew fees, and add-ons baked into the Xola total

### Where This Rule Applies
- `src/pages/CustomerDashboard.tsx` — Payment Breakdown display
- `src/pages/DynamicDashboard.tsx` — Dynamic dashboard display
- `supabase/functions/xola-booking-webhook/index.ts` — Webhook note building
- `supabase/functions/bulk-import-xola-bookings/index.ts` — CSV import

---

## AVAILABILITY FILTERING

### For Quote Builders:
1. Check date is valid
2. Filter by party type eligibility (disco = bach parties only)
3. Filter by boat capacity based on guest count:
   - 1-14 → Day Tripper
   - 15-30 → Meeseeks/Irony
   - 31-75 → Clever Girl
4. Check time slot conflicts for private cruises
5. For disco: Check date is Fri/Sat + March-October + Clever Girl + tickets available

---

## CODE REFERENCES

### Single Source of Truth:
- **Boat Selection**: `src/lib/boatSelection.ts`
- **Pricing Logic**: `src/lib/pricing.ts`
- **Disco Packages**: `src/components/quote-builder/DiscoCruiseSelector.tsx`
- **Private Packages**: `src/components/quote-builder/PrivateCruiseSelector.tsx`

### Pages Using These Rules:
- `src/pages/Index.tsx` (Main quote builder)
- `src/pages/QuoteWidget.tsx` (Embeddable widget)
- `src/pages/OnlineBooking.tsx` (Direct booking widget)

---

## IMPORTANT NOTES

1. **Never show disco cruises** to non-bach party types
2. **Never show disco slots** outside March-October
3. **Never show disco slots** on days other than Fri/Sat
4. **Always verify capacity** before showing availability
5. **Private bookings** lock the entire boat - check for conflicts
6. **Disco bookings** are additive - decrement tickets properly

---

*Last Updated: Based on conversation 2025-01-17*
