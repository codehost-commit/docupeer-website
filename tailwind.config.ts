import type { Config } from "tailwindcss";

// Warm-cream, editorial design system for DocuPeer.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        deep: {
          bg: "#f6f5f2",
          panel: "#fffdf9",
          panel2: "#f4f0e9",
          border: "#e6e0d5",
          "border-strong": "#d0c8b8",
          text: "#1a1c2b",
          "text-soft": "#3f4560",
          dim: "#6a7495",
          accent: "#356d97",
          "accent-strong": "#2f6288",
          "accent-soft": "#d4e2ee",
          warn: "#a87717",
          bad: "#b3455e",
          good: "#4f8a5f",
        },
        brand: {
          50: "#eef4f9",
          100: "#d4e2ee",
          200: "#a9c4dc",
          300: "#7fa7cb",
          400: "#548bb9",
          500: "#356d97",
          600: "#2f6288",
          700: "#26506f",
          800: "#1c3d55",
          900: "#132a3b",
        },
      },
      fontFamily: {
        // Two-font headline combo: Versailles (primary serif display) +
        // Poiret One (secondary light geometric). Headings use both.
        display: ["Versailles", "Cormorant Garamond", "Georgia", "serif"],
        poiret: ["Poiret One", "Versailles", "serif"],
        // Long-form reading surface (paper text). Cormorant is optimized for it.
        serif: [
          "Cormorant Garamond",
          "Iowan Old Style",
          "Georgia",
          "Cambria",
          "serif",
        ],
        // Default UI / body font.
        sans: [
          "Space Grotesk",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        panel:
          "0 1px 2px rgba(26,28,43,0.04), 0 8px 30px rgba(26,28,43,0.06)",
        glow: "0 0 0 1px rgba(53,109,151,0.20), 0 10px 30px rgba(53,109,151,0.14)",
      },
      maxWidth: {
        reading: "44rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 400ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
