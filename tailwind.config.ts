import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shadcn semantic roles mapped to Replicate Editorial tokens.
        // Values are HSL triplets (see globals.css) so `dark:` works via `.dark`.
        border: "hsl(var(--border) / 0.12)",
        input: "hsl(var(--input) / 0.12)",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Editorial tokens (exposed as named utilities).
        canvas: "hsl(var(--canvas))",
        bone: "hsl(var(--bone) / <alpha-value>)",
        "surface-card": "hsl(var(--surface-card))",
        "surface-dark": "hsl(var(--surface-dark))",
        "surface-deep": "hsl(var(--surface-deep))",
        ink: "hsl(var(--ink))",
        body: "hsl(var(--body))",
        charcoal: "hsl(var(--charcoal))",
        ash: "hsl(var(--ash))",
        "ash-light": "hsl(var(--ash-light))",
        brand: "hsl(var(--brand) / <alpha-value>)",
        "brand-pressed": "hsl(var(--brand-pressed))",
        success: "hsl(var(--success))",
      },
      borderRadius: {
        sm: "0.5rem",
        md: "0.625rem",
        lg: "1rem",
        xl: "1rem",
        "2xl": "1rem",
      },
      fontFamily: {
        sans: ["var(--font-arabic)", "system-ui", "sans-serif"],
        display: ["var(--font-arabic)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
