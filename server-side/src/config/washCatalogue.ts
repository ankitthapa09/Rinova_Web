import { VEHICLE_CATEGORIES, type VehicleCategory } from '@/models/vehicle.model';

/**
 * The wash shop's fixed menu. This is deliberately code, not a database
 * collection: prices and slots change once in a blue moon, and keeping them
 * here means the server can price an order without a lookup — and the browser
 * can never talk us into a cheaper number.
 */

export const WASH_PACKAGE_IDS = ['basic', 'deep', 'detail'] as const;
export type WashPackageId = (typeof WASH_PACKAGE_IDS)[number];

export interface WashPackage {
  id: WashPackageId;
  name: string;
  duration: string;
  /** Price in NPR, per vehicle size — a bus takes far more foam than a bike */
  prices: Record<VehicleCategory, number>;
  features: string[];
  popular?: boolean;
}

export const WASH_PACKAGES: readonly WashPackage[] = [
  {
    id: 'basic',
    name: 'Basic Wash',
    duration: '20–30 min',
    prices: { bike: 150, car: 300, suv: 400, van: 500, bus: 900 },
    features: [
      'Exterior foam wash',
      'Hand-dry finish',
      'Tyre & rim shine',
      'Quick interior dust-off',
    ],
  },
  {
    id: 'deep',
    name: 'Deep Clean',
    duration: '60–90 min',
    prices: { bike: 400, car: 800, suv: 1000, van: 1200, bus: 2000 },
    features: [
      'Everything in Basic',
      'Interior vacuum & shampoo',
      'Engine bay rinse',
      'Spray wax protection',
      'Glass & mirror detail',
    ],
    popular: true,
  },
  {
    id: 'detail',
    name: 'Full Detail',
    duration: '3–4 hrs',
    prices: { bike: 1200, car: 2500, suv: 3000, van: 3500, bus: 6000 },
    features: [
      'Everything in Deep Clean',
      'Clay bar & swirl polish',
      'Leather & dash treatment',
      'Paint sealant shield',
      'Before / after photos',
    ],
  },
] as const;

/** Arrival times we accept, 24h. A wash is booked into a slot, not a range. */
export const WASH_SLOTS = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'] as const;
export type WashSlot = (typeof WASH_SLOTS)[number];

/** Cars we can physically wash at the same time. One confirmed order = one bay. */
export const WASH_BAYS_PER_SLOT = 3;

/** How far ahead the calendar opens. */
export const WASH_MAX_DAYS_AHEAD = 60;

/** The five sizes we price for — same list the fleet uses. */
export const WASH_VEHICLE_TYPES = VEHICLE_CATEGORIES;

export function findWashPackage(id: WashPackageId): WashPackage | undefined {
  return WASH_PACKAGES.find((pkg) => pkg.id === id);
}

/** The authoritative price for a package + vehicle size. */
export function washPriceFor(id: WashPackageId, vehicleType: VehicleCategory): number | undefined {
  return findWashPackage(id)?.prices[vehicleType];
}
