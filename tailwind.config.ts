import type { Config } from "tailwindcss";

/**
 * Tailwind v4 reads theme tokens from `src/app/globals.css` via `@theme inline`.
 * This file mirrors the cyberpunk palette for IDE autocomplete and tooling.
 */
const config: Config = {
  theme: {
    extend: {
      colors: {
        background: "#05070D",
        foreground: "#00FFFF",
        "neon-cyan": "#00FFFF",
        "neon-magenta": "#FF00FF",
        "neon-orange": "#FF4500",
        border: "#FF00FF",
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "ui-sans-serif", "sans-serif"],
      },
      animation: {
        "fade-out-up": "fade-out-up 1s ease-out forwards",
      },
      keyframes: {
        "fade-out-up": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "70%": { opacity: "0.85" },
          "100%": { opacity: "0", transform: "translateY(-52px) scale(1.15)" },
        },
      },
    },
  },
};

export default config;
