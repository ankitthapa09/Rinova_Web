"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import MagneticButton from "@/components/landing/MagneticButton";
import { useAuth } from "@/lib/useAuth";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const LINKS = [
  { label: "Fleet", href: "/#fleet" },
  { label: "Washing", href: "#washing" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[80] transition-[background-color,border-color,padding] duration-500 ease-expo ${
        scrolled
          ? "border-b border-line bg-night/85 py-4 backdrop-blur-sm"
          : "border-b border-transparent bg-transparent py-6"
      }`}
    >
      <nav className="mx-auto flex w-full max-w-wrap items-center justify-between px-6">
        {/* Wordmark */}
        <Link href="/" className="font-serif text-xl tracking-[0.08em] text-cream">
          RINOVA
        </Link>

        {/* Center links */}
        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="nav-link text-[13px] font-medium text-cream/70 hover:text-cream">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA / avatar */}
        <div className="hidden items-center gap-7 lg:flex">
          {loading ? null : user ? (
            <Link
              href="/dashboard"
              title={`${user.name} — dashboard`}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent text-[13px] font-medium text-night transition-shadow duration-300 hover:shadow-glow"
            >
              {user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(user.name)
              )}
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link text-[13px] font-medium text-cream/70 hover:text-cream">
                Sign In
              </Link>
              <MagneticButton href="/signup" className="!px-6 !py-2.5 !text-[13px]">
                Join Now
              </MagneticButton>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="p-2 text-cream lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Full-screen mobile overlay */}
      <div
        className={`fixed inset-0 top-0 z-[-1] flex flex-col justify-between bg-night px-6 pb-10 pt-28 transition-opacity duration-500 ease-expo lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <ul className="flex flex-col gap-2">
          {LINKS.map((link, i) => (
            <li key={link.href} className="overflow-hidden">
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block font-serif text-5xl leading-[1.15] text-cream transition-[transform,opacity] duration-700 ease-expo ${
                  open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                }`}
                style={{ transitionDelay: open ? `${120 + i * 80}ms` : "0ms" }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div
          className={`flex flex-col gap-4 transition-[transform,opacity] delay-500 duration-700 ease-expo ${
            open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          {user ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-3 rounded-full bg-accent px-8 py-4 text-sm font-medium text-night"
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-night/15 text-[11px]">
                {user.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(user.name)
                )}
              </span>
              My Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-cream/25 px-8 py-4 text-sm font-medium text-cream"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-4 text-sm font-medium text-night"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
