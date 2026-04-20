import type { Config } from "tailwindcss";

export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem",
        md: ".375rem",
        sm: ".1875rem",
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        /* ── Design System Colors ─────────────────────────────── */
        ds: {
          accent: "var(--ds-accent)",
          "accent-hover": "var(--ds-accent-hover)",
          "accent-muted": "var(--ds-accent-muted)",
          "accent-strong": "var(--ds-accent-strong)",
          positive: "var(--ds-kpi-positive)",
          warning: "var(--ds-kpi-warning)",
          negative: "var(--ds-kpi-negative)",
        },
      },
      backgroundColor: {
        "ds-primary": "var(--ds-bg-primary)",
        "ds-secondary": "var(--ds-bg-secondary)",
        "ds-elevated": "var(--ds-bg-elevated)",
        "ds-inset": "var(--ds-bg-inset)",
      },
      textColor: {
        "ds-primary": "var(--ds-text-primary)",
        "ds-secondary": "var(--ds-text-secondary)",
        "ds-tertiary": "var(--ds-text-tertiary)",
      },
      borderColor: {
        "ds-subtle": "var(--ds-border-subtle)",
        "ds-default": "var(--ds-border-default)",
        "ds-strong": "var(--ds-border-strong)",
      },
      boxShadow: {
        "ds-card": "var(--ds-shadow-card)",
        "ds-elevated": "var(--ds-shadow-elevated)",
        "ds-hover": "var(--ds-shadow-hover)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
