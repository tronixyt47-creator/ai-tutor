import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060912",
          900: "#0a0f1e",
          850: "#0d1426",
          800: "#111a30",
          700: "#1b2745",
        },
        mist: {
          100: "#eef2ff",
          200: "#d6ddf3",
          300: "#b3bedd",
          400: "#8b97ba",
          500: "#6b779a",
        },
        accent: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        mint: {
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,0.35), 0 18px 50px -20px rgba(139,92,246,0.55)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.15" },
        },
      },
      animation: {
        rise: "rise 0.28s ease-out both",
        blink: "blink 1s steps(2, start) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
