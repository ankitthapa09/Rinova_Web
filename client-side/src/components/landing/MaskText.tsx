import type { ElementType, ReactNode } from "react";

interface MaskTextProps {
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  /** When true the group is skipped by useReveal and animated by its owner (hero). */
  loadTriggered?: boolean;
}

/**
 * Headline whose lines each live in an overflow-hidden wrapper so GSAP can
 * slide them up from 115%, the signature scroll-mask reveal.
 */
export default function MaskText({ lines, as: Tag = "h2", className, loadTriggered }: MaskTextProps) {
  return (
    <Tag className={className} data-mask-group="" {...(loadTriggered ? { "data-mask-load": "" } : {})}>
      {lines.map((line, i) => (
        <span key={i} className="mask-line">
          <span className="mask-line-inner">{line}</span>
        </span>
      ))}
    </Tag>
  );
}
