"use client";

import { useMemo } from "react";

/** The same rules the server enforces, scored for live feedback. */
export const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "8+ characters" },
  { test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p), label: "upper & lower case" },
  { test: (p: string) => /\d/.test(p), label: "a number" },
  { test: (p: string) => /[^a-zA-Z0-9]/.test(p), label: "a symbol" },
] as const;

export function passwordMeetsRules(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

const LEVELS = [
  { label: "Weak", color: "#f87171" },
  { label: "Fair", color: "#fbbf24" },
  { label: "Good", color: "#4EA8DE" },
  { label: "Strong", color: "#4ade80" },
] as const;

// Live strength bar under a password field.
export default function PasswordStrength({ password }: { password: string }) {
  const { score, level, missing } = useMemo(() => {
    const met = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
    const allMet = met === PASSWORD_RULES.length;
    const tier = allMet ? (password.length >= 12 ? 3 : 2) : met >= 2 ? 1 : 0;
    return {
      score: tier + 1,
      level: LEVELS[tier],
      missing: PASSWORD_RULES.filter((rule) => !rule.test(password)).map((r) => r.label),
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex h-1 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="flex-1 rounded-full transition-colors duration-300"
              style={{ background: i < score ? level.color : "rgba(244,241,234,0.12)" }}
            />
          ))}
        </div>
        <span className="w-12 text-right text-[11px]" style={{ color: level.color }}>
          {level.label}
        </span>
      </div>
      {missing.length > 0 ? (
        <p className="mt-1.5 text-[11.5px] text-fog">Add {missing.join(", ")}.</p>
      ) : null}
    </div>
  );
}
