import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#304656",
          900: "#3d5668",
          850: "#496477",
          800: "#587488",
          700: "#718b9d",
        },
        mist: {
          100: "#f1f0de",
          200: "#e1e5d9",
          300: "#cad5c7",
          400: "#a6b6a8",
          500: "#8d9f86",
        },
        accent: {
          300: "#d9e3d4",
          400: "#a6b6a8",
          500: "#5d788e",
          600: "#496477",
        },
        mint: {
          300: "#d0ddc2",
          400: "#a6b6a8",
          500: "#718b70",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(166,182,168,0.3), 0 18px 50px -20px rgba(93,120,142,0.42)",
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
