import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* Neo-brutalist palette */
        paper: "#f5f2e9",
        surface: "#fbfaf4",
        black: "#111111",
        muted: "#77756d",
        lime: "#c6f83e",
        "lime-bright": "#d2ff4a",
        
        /* Legacy base colors - kept for compatibility */
        base: {
          50: "#eef6ff",
          100: "#d9ecff",
          400: "#4f9bff",
          500: "#0052ff",
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
        display: ["Georgia", "Times New Roman", "serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["Courier New", "Courier", "monospace"],
      },
      backdropBlur: { xs: "2px", md: "8px" },
      boxShadow: {
        brutal: "4px 4px 0 #111111",
        "brutal-md": "3px 3px 0 #111111",
        "brutal-sm": "2px 2px 0 #111111",
        glass: "0 8px 32px rgba(0,0,0,0.35)",
        glow: "0 0 40px rgba(0,82,255,0.25)",
      },
      borderRadius: {
        brutal: "12px",
        "brutal-md": "9px",
        "brutal-sm": "6px",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      borderWidth: {
        brutal: "2px",
      },
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
