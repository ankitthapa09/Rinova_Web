const PHRASE = "Vehicle Rental · Professional Washing · Kathmandu · ";

/** Infinite serif-italic ticker between sections. */
export default function Marquee() {
  const strip = PHRASE.repeat(4);
  return (
    <div aria-hidden className="overflow-hidden border-y border-line bg-night py-5">
      <div className="marquee-track">
        <span className="whitespace-nowrap pr-2 font-serif text-xl italic tracking-wide text-cream/50 md:text-2xl">
          {strip}
        </span>
        <span className="whitespace-nowrap pr-2 font-serif text-xl italic tracking-wide text-cream/50 md:text-2xl">
          {strip}
        </span>
      </div>
    </div>
  );
}
