interface SplitCharsProps {
  text: string;
  className?: string;
}

/**
 * Splits text into per-character spans for cascade reveals. Characters are
 * grouped into non-breaking word spans so lines only wrap between words.
 * Wrap groups of these in a `.split-line` (overflow hidden) container and
 * give that container an aria-label, the chars themselves are decorative.
 */
export default function SplitChars({ text, className = "" }: SplitCharsProps) {
  const words = text.split(" ").filter((w) => w.length > 0);
  return (
    <>
      {words.map((word, wi) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {word.split("").map((ch, i) => (
            <span key={i} className={`split-char ${className}`}>
              {ch}
            </span>
          ))}
          {wi < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </>
  );
}
