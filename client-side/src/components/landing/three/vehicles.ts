export interface VehicleDef {
  id: string;
  file: string;
  /** Normalized longest dimension in world units — buses read bigger than bikes */
  length: number;
  /** Extra yaw so every model faces the same way */
  yaw: number;
  name: string;
  watermark: string;
  tagline: string;
  price: string;
}

export const VEHICLES: VehicleDef[] = [
  {
    id: "bike",
    file: "/models/scooter.glb",
    length: 2.4,
    yaw: 0,
    name: "Bikes & Scooters",
    watermark: "BIKE",
    tagline: "Nimble city movers",
    price: "800",
  },
  {
    id: "car",
    file: "/models/car.glb",
    length: 3.9,
    yaw: 0,
    name: "Cars",
    watermark: "CAR",
    tagline: "Sedans & convertibles",
    price: "2,200",
  },
  {
    id: "suv",
    file: "/models/suv.glb",
    length: 3.9,
    yaw: 0,
    name: "SUVs & Jeeps",
    watermark: "SUV",
    tagline: "Built for the hills",
    price: "3,500",
  },
  {
    id: "van",
    file: "/models/van.glb",
    length: 4.1,
    yaw: 0,
    name: "Vans",
    watermark: "VAN",
    tagline: "Group journeys",
    price: "5,000",
  },
  {
    id: "bus",
    file: "/models/bus.glb",
    length: 5.2,
    yaw: 0,
    name: "Buses",
    watermark: "BUS",
    tagline: "Events & tours",
    price: "9,000",
  },
];
