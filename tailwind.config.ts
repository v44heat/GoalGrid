import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        turf: {
          950: "#07140e",
          900: "#0b1d14",
          800: "#102a1d",
          700: "#173a28",
          600: "#21503a",
        },
        chalk: {
          DEFAULT: "#eef3ea",
          dim: "#a9b8ac",
          faint: "#6f8476",
        },
        grass: {
          DEFAULT: "#3fdc7f",
          dark: "#27a85d",
        },
        gold: "#f2c14e",
        card: "#e5484d",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(63,220,127,0.25), 0 8px 30px -12px rgba(63,220,127,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
