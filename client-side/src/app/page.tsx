import SmoothScroll from "@/components/landing/SmoothScroll";
import Cursor from "@/components/landing/Cursor";
import Hero from "@/components/landing/Hero";
import Marquee from "@/components/landing/Marquee";
import Services from "@/components/landing/Services";
import Fleet from "@/components/landing/Fleet";
import WashPricing from "@/components/landing/WashPricing";
import DarkInterlude from "@/components/landing/DarkInterlude";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import FinalCta from "@/components/landing/FinalCta";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Cursor />
      <Hero />
      <Marquee />
      <Services />
      <Fleet />
      <WashPricing />
      <DarkInterlude />
      <HowItWorks />
      <Testimonials />
      <FinalCta />
    </>
  );
}
