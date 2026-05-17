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
    },
  },
};

export default config;
