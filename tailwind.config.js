/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["Outfit", "system-ui", "sans-serif"],
        figtree: ["Figtree", "system-ui", "sans-serif"],
      },
      colors: {
        // exact design tokens (override Tailwind defaults so pasted classes render true)
        amber: { 400: "#F2A922", 500: "#E28D13", 600: "#C77A0F" },
        green: { 500: "#4CAF50", 700: "#2E7D32", 800: "#256428" },
        red: { 400: "#F87171", 500: "#EF4444", 600: "#D32F2F" },
        emerald: { 500: "#10B981" },
        rose: { 500: "#F0435C" },
        purple: { 300: "#C4A0E0", 600: "#7B1FA2", 800: "#7B1FA2" },
        blue: { 400: "#60A5FA" },
        pink: { 400: "#F472B6" },
        zinc: { 400: "#8A8A9C", 600: "#4A4A5C" },
        slate: { 400: "#94A3B8", 950: "#090D1A" },
        gray: { 100: "#F3F4F6", 200: "#E5E7EB", 900: "#0D111E", 950: "#090D1A" },
        neutral: { 900: "#141419" },
      },
    },
  },
  plugins: [],
};
