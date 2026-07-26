"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

/**
 * Underline input with a floating label, the label rests inside the field
 * and lifts up when focused or filled, while an orange rule draws across
 * the baseline, the auth-page equivalent of the nav-link underline.
 */
export default function FloatingInput({ id, label, error, type = "text", ...rest }: FloatingInputProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && show ? "text" : type;

  return (
    <div data-auth-item>
      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          placeholder=" "
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`peer w-full border-b bg-transparent py-3 pr-10 text-[15px] text-cream outline-none transition-colors duration-300 focus-visible:outline-none ${
            error ? "border-accent" : "border-cream/15"
          }`}
          {...rest}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-0 top-3 text-[15px] text-fog transition-all duration-300 ease-expo peer-focus:-top-3.5 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.18em] peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.18em]"
        >
          {label}
        </label>
        {/* Focus rule draws left to right over the resting border */}
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-500 ease-expo peer-focus:scale-x-100"
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-fog transition-colors hover:text-cream"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-xs text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
