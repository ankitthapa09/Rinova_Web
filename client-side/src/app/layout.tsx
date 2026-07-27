import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import Toaster from "@/components/ui/Toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rinova, Vehicle Rentals & Washing | Kathmandu, Nepal",
  description:
    "Premium vehicle rentals and professional washing in Kathmandu, bikes, cars, SUVs, vans and buses. Rent it. Wash it. Drive on.",
  keywords: [
    "vehicle rental kathmandu",
    "car rental nepal",
    "bike rental kathmandu",
    "car wash nepal",
    "vehicle washing kathmandu",
    "rinova",
  ],
  authors: [{ name: "Rinova" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-night font-sans text-cream antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
