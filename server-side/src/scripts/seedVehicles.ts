import { connectDatabase, disconnectDatabase } from '@/config/db';
import { logger } from '@/config/logger';
import { Vehicle, type IVehicle } from '@/models/vehicle.model';

 
 // Run with:  npm run seed:vehicles
 
type SeedVehicle = Omit<IVehicle, 'createdAt' | 'updatedAt' | 'isAvailable' | 'featured'> & {
  featured?: boolean;
};

const FLEET: SeedVehicle[] = [
  {
    slug: 'city-scooter',
    name: 'City Scooter',
    category: 'bike',
    tagline: 'The daily Kathmandu weaver',
    pricePerDay: 800,
    specs: { seats: 2, transmission: 'Automatic', fuel: 'Petrol', topSpeed: '85 km/h' },
    imageUrl: '/vehicles/city-scooter.png',
    modelUrl: '/models/scooter.glb',
    modelLength: 2.4,
    description:
      'Light, nimble, and easy on fuel — the fastest way through Ring Road traffic and tight gallis alike.',
  },
  {
    slug: 'honda-cb750',
    name: 'Honda CB750',
    category: 'bike',
    tagline: 'The original superbike, 1970 spirit',
    pricePerDay: 3200,
    specs: { seats: 2, transmission: 'Manual', fuel: 'Petrol', topSpeed: '200 km/h' },
    imageUrl: '/vehicles/honda-cb750.png',
    modelUrl: '/models/honda_cb750.glb',
    modelLength: 2.6,
    featured: true,
    description:
      'A classic inline-four with presence. For riders who want the highway to Pokhara to feel like an occasion.',
  },
  {
    slug: 'azure-convertible',
    name: 'Azure Convertible',
    category: 'car',
    tagline: 'Top down, valley views',
    pricePerDay: 2200,
    specs: { seats: 4, transmission: 'Automatic', fuel: 'Petrol', topSpeed: '180 km/h' },
    imageUrl: '/vehicles/blue-convertible.png',
    modelUrl: '/models/car.glb',
    modelLength: 3.9,
    description:
      'The one from our showroom floor — a comfortable open-top cruiser for city errands and weekend escapes.',
  },
  {
    slug: 'lamborghini-gallardo',
    name: 'Lamborghini Gallardo Spyder',
    category: 'car',
    tagline: 'LP560-4. Enough said.',
    pricePerDay: 25000,
    specs: { seats: 2, transmission: 'Automatic', fuel: 'Petrol', topSpeed: '324 km/h' },
    imageUrl: '/vehicles/lamborghini-gallardo.png',
    modelUrl: '/models/lamborghini_gallardo.glb',
    modelLength: 4.3,
    featured: true,
    description:
      'A 5.2L V10 with the roof off. Our crown jewel — driven rarely, washed obsessively, rented by the brave.',
  },
  {
    slug: 'trail-suv',
    name: 'Trail SUV',
    category: 'suv',
    tagline: 'Built for the hills',
    pricePerDay: 3500,
    specs: { seats: 7, transmission: 'Manual', fuel: 'Diesel', topSpeed: '160 km/h' },
    imageUrl: '/vehicles/trail-suv.png',
    modelUrl: '/models/suv.glb',
    modelLength: 3.9,
    description:
      'High clearance and seven seats — the default answer for Mustang roads, monsoon potholes, and family trips.',
  },
  {
    slug: 'family-van',
    name: 'Family Van',
    category: 'van',
    tagline: 'Group journeys, sorted',
    pricePerDay: 5000,
    specs: { seats: 8, transmission: 'Manual', fuel: 'Diesel', topSpeed: '140 km/h' },
    imageUrl: '/vehicles/family-van.png',
    modelUrl: '/models/van.glb',
    modelLength: 4.1,
    description:
      "Room for the whole crew and the luggage they swore they wouldn't bring. Airport runs to week-long tours.",
  },
  {
    slug: 'tour-bus',
    name: 'Tour Bus',
    category: 'bus',
    tagline: 'Events & full-scale tours',
    pricePerDay: 9000,
    specs: { seats: 25, transmission: 'Manual', fuel: 'Diesel', topSpeed: '120 km/h' },
    imageUrl: '/vehicles/tour-bus.png',
    modelUrl: '/models/bus.glb',
    modelLength: 5.2,
    description:
      'For weddings, office outings, and trekking groups — one vehicle, everyone together, driver included.',
  },
];

async function seedVehicles(): Promise<void> {
  await connectDatabase();

  try {
    let created = 0;
    let updated = 0;

    for (const vehicle of FLEET) {
      // Upsert by slug — the stable identity. runValidators keeps the model's
      // rules (regex, enums, ranges) in force on updates too.
      const res = await Vehicle.updateOne(
        { slug: vehicle.slug },
        { $set: vehicle },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true },
      ).exec();

      if (res.upsertedCount > 0) created += 1;
      else if (res.modifiedCount > 0) updated += 1;
    }

    logger.info(
      `Fleet seeded: ${created} created, ${updated} updated, ${FLEET.length} total in catalog`,
    );
  } finally {
    await disconnectDatabase();
  }
}

seedVehicles().catch((err) => {
  logger.error('Vehicle seed failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
