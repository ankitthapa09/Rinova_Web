import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const SERVICES = [
  { label: "Vehicle Rentals", href: "#fleet" },
  { label: "Professional Washing", href: "#washing" },
  { label: "Wash Pricing", href: "#pricing" },
  { label: "Book Online", href: "#contact" },
];

const COMPANY = [
  { label: "About", href: "#about" },
  { label: "Testimonials", href: "#about" },
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#070708] text-cream/60">
      <div className="mx-auto w-full max-w-wrap px-6 pb-10 pt-20 md:pt-28">
        <div className="grid grid-cols-1 gap-12 border-b border-cream/10 pb-16 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="mb-5 font-serif text-2xl tracking-[0.08em] text-cream">RINOVA</p>
            <p className="mb-8 max-w-xs text-sm leading-relaxed">
              Premium vehicle rentals and professional washing, together under one roof in
              Kathmandu.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 text-cream/50 transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden>
                  <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h2V2h-3a5 5 0 0 0-5 5v1z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 text-cream/50 transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                <svg
                  className="h-4 w-4 fill-none stroke-current"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="X (Twitter)"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 text-cream/50 transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden>
                  <path d="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.5 22H3.3l7.3-8.3L1 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-cream/40">
              Services
            </h3>
            <ul className="space-y-4">
              {SERVICES.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors duration-300 hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-cream/40">
              Company
            </h3>
            <ul className="space-y-4">
              {COMPANY.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors duration-300 hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-cream/40">
              Contact
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cream/40" />
                <span>Ring Road, Kathmandu, Nepal</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-cream/40" />
                <a href="tel:+97714444444" className="transition-colors hover:text-accent">
                  +977 01-4444444
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-cream/40" />
                <a href="mailto:hello@rinova.com.np" className="transition-colors hover:text-accent">
                  hello@rinova.com.np
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 shrink-0 text-cream/40" />
                <span>Open daily 6 AM – 9 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-8 text-xs text-cream/40 md:flex-row">
          <p>© 2025 Rinova. All rights reserved.</p>
          <p>Made in Nepal 🇳🇵</p>
        </div>
      </div>

      {/* Oversized cropped wordmark */}
      <div aria-hidden className="relative h-[16vw] max-h-56 select-none overflow-hidden">
        <p className="absolute inset-x-0 top-0 text-center font-serif text-[22vw] leading-[0.72] tracking-[0.02em] text-cream/[0.05]">
          RINOVA
        </p>
      </div>
    </footer>
  );
}
