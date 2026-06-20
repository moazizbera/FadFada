import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0E0D10",
        bone: "#F7F3EC",
        gold: "#C9A86A",
        dusk: "#8B7BB8",
        terracotta: "#D4724A",
        sage: "#5C7C6B",
        line: "rgba(247,243,236,0.12)",
      },
      fontFamily: {
        arserif: ["var(--font-naskh)", "serif"],
        enserif: ["var(--font-cormorant)", "serif"],
        arsans: ["var(--font-plex-arabic)", "sans-serif"],
        ensans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
      },
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        "breathe-fast": "breathe 1.55s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
