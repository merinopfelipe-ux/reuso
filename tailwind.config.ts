import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Open Sans'", "sans-serif"],
        seravek: ["seravek", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        brand: "var(--color-brand)",
        "brand-hover": "var(--color-brand-hover)",
        "brand-light": "var(--color-brand-light)",
        success: "var(--color-success)",
        error: "var(--color-error)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
        pistacho: "var(--color-pistacho)",
        menta: "var(--color-menta)",
        nogal: "var(--color-nogal)",
        rosa: "var(--color-rosa)",
      },
      backgroundColor: {
        primary: "var(--bg-primary)",
        secondary: "var(--bg-secondary)",
        card: "var(--bg-card)",
        sidebar: "var(--bg-sidebar)",
        hover: "var(--bg-hover)",
        input: "var(--bg-input)",
        active: "var(--bg-active)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        placeholder: "var(--text-placeholder)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        light: "var(--border-light)",
        divider: "var(--divider)",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
      borderRadius: {
        card: "12px",
        btn: "10px",
        input: "8px",
        badge: "100px",
      },
      transitionDuration: {
        hover: "200ms",
        sidebar: "300ms",
        theme: "300ms",
      },
    },
  },
  plugins: [],
};
export default config;
