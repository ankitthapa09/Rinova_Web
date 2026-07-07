import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: "#0B0B0D",
        surface: "#15141A",
        cream: "#F4F1EA",
        fog: "#8F8A7E",
        line: "#26242B",
        accent: "#FF5C1A",
        ember: "#FFB38A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      boxShadow: {
        lift: "0 24px 48px rgba(0, 0, 0, 0.5)",
        glow: "0 0 60px rgba(255, 92, 26, 0.18)",
      },
      maxWidth: {
        wrap: "1280px",
      },
    },
  },
  plugins: [],
};
export default config;
