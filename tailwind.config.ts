import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111d22",
          900: "#17282d",
          850: "#1d3238",
          800: "#294147",
          700: "#3a5659",
        },
        mist: {
          100: "#e7efec",
          200: "#d2e1dc",
          300: "#b5c9c1",
          400: "#92aaa2",
          500: "#718d85",
        },
        accent: {
          300: "#c0d7cc",
          400: "#8eb4a7",
          500: "#5d9183",
          600: "#46766b",
        },
        mint: {
          300: "#b7d1c5",
          400: "#77aa98",
          500: "#4f8b79",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(142,180,167,0.28), 0 18px 50px -20px rgba(79,139,121,0.38)",
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
