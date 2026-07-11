import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          50: "#eef6ff",
          100: "#d9ecff",
          400: "#4f9bff",
          500: "#0052ff", // Base chain blue
          600: "#0040cc",
          900: "#001f66",
        },
        ink: {
          950: "#05070d",
          900: "#0b0e17",
          800: "#131726",
          700: "#1c2135",
        },
        glass: "rgba(255,255,255,0.06)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.35)",
        glow: "0 0 40px rgba(0,82,255,0.25)",
      },
      borderRadius: { "2xl": "1.25rem", "3xl": "1.75rem" },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: {
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
