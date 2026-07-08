

export type VehicleCategory = "bike" | "car" | "suv" | "van" | "bus";

export interface Vehicle {
  slug: string;
  name: string;
  category: VehicleCategory;
  tagline: string;
  pricePerDay: number;
  specs: {
    seats?: number;
    transmission?: "Manual" | "Automatic";
    fuel: string;
    topSpeed?: string;
  };
  imageUrl: string;
  modelUrl: string;
  /** Normalized world length for the shared 3D loader */
  modelLength: number;
  featured?: boolean;
  description: string;
}

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  bike: "Bikes",
  car: "Cars",
  suv: "SUVs & Jeeps",
  van: "Vans",
  bus: "Buses",
};

export function formatNpr(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

// Mock catalog 

const MOCK_VEHICLES: Vehicle[] = [
  {
    slug: "city-scooter",
    name: "City Scooter",
    category: "bike",
    tagline: "The daily Kathmandu weaver",
    pricePerDay: 800,
    specs: { seats: 2, transmission: "Automatic", fuel: "Petrol", topSpeed: "85 km/h" },
    imageUrl: "/vehicles/city-scooter.png",
    modelUrl: "/models/scooter.glb",
    modelLength: 2.4,
    description:
      "Light, nimble, and easy on fuel — the fastest way through Ring Road traffic and tight gallis alike.",
  },
  {
    slug: "honda-cb750",
    name: "Honda CB750",
    category: "bike",
    tagline: "The original superbike, 1970 spirit",
    pricePerDay: 3200,
    specs: { seats: 2, transmission: "Manual", fuel: "Petrol", topSpeed: "200 km/h" },
    imageUrl: "/vehicles/honda-cb750.png",
    modelUrl: "/models/honda_cb750.glb",
    modelLength: 2.6,
    featured: true,
    description:
      "A classic inline-four with presence. For riders who want the highway to Pokhara to feel like an occasion.",
  },
  {
    slug: "azure-convertible",
    name: "Azure Convertible",
    category: "car",
    tagline: "Top down, valley views",
    pricePerDay: 2200,
    specs: { seats: 4, transmission: "Automatic", fuel: "Petrol", topSpeed: "180 km/h" },
    imageUrl: "/vehicles/blue-convertible.png",
    modelUrl: "/models/car.glb",
    modelLength: 3.9,
    description:
      "The one from our showroom floor — a comfortable open-top cruiser for city errands and weekend escapes.",
  },
  {
    slug: "lamborghini-gallardo",
    name: "Lamborghini Gallardo Spyder",
    category: "car",
    tagline: "LP560-4. Enough said.",
    pricePerDay: 25000,
    specs: { seats: 2, transmission: "Automatic", fuel: "Petrol", topSpeed: "324 km/h" },
    imageUrl: "/vehicles/lamborghini-gallardo.png",
    modelUrl: "/models/lamborghini_gallardo.glb",
    modelLength: 4.3,
    featured: true,
    description:
      "A 5.2L V10 with the roof off. Our crown jewel — driven rarely, washed obsessively, rented by the brave.",
  },
  {
    slug: "trail-suv",
    name: "Trail SUV",
    category: "suv",
    tagline: "Built for the hills",
    pricePerDay: 3500,
    specs: { seats: 7, transmission: "Manual", fuel: "Diesel", topSpeed: "160 km/h" },
    imageUrl: "/vehicles/trail-suv.png",
    modelUrl: "/models/suv.glb",
    modelLength: 3.9,
    description:
      "High clearance and seven seats — the default answer for Mustang roads, monsoon potholes, and family trips.",
  },
  {
    slug: "family-van",
    name: "Family Van",
    category: "van",
    tagline: "Group journeys, sorted",
    pricePerDay: 5000,
    specs: { seats: 8, transmission: "Manual", fuel: "Diesel", topSpeed: "140 km/h" },
    imageUrl: "/vehicles/family-van.png",
    modelUrl: "/models/van.glb",
    modelLength: 4.1,
    description:
      "Room for the whole crew and the luggage they swore they wouldn't bring. Airport runs to week-long tours.",
  },
  {
    slug: "tour-bus",
    name: "Tour Bus",
    category: "bus",
    tagline: "Events & full-scale tours",
    pricePerDay: 9000,
    specs: { seats: 25, transmission: "Manual", fuel: "Diesel", topSpeed: "120 km/h" },
    imageUrl: "/vehicles/tour-bus.png",
    modelUrl: "/models/bus.glb",
    modelLength: 5.2,
    description:
      "For weddings, office outings, and trekking groups — one vehicle, everyone together, driver included.",
  },
];


function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const vehicleApi = {
  
  async list(category?: VehicleCategory): Promise<Vehicle[]> {
    await delay(350);
    return category ? MOCK_VEHICLES.filter((v) => v.category === category) : [...MOCK_VEHICLES];
  },

  
  async get(slug: string): Promise<Vehicle | null> {
    await delay(250);
    return MOCK_VEHICLES.find((v) => v.slug === slug) ?? null;
  },
};
