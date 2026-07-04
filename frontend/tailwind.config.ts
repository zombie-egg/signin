import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F9F9F7",
        ink: "#111111",
        divider: "#E5E5E0",
        editorial: "#CC0000",
        neutral: {
          100: "#F9F9F7",
          200: "#F2F2EE",
          300: "#E5E5E0",
          400: "#C9C9C0",
          500: "#8E8E86",
          600: "#4A4A44",
          700: "#111111",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        body: ["Lora", "Georgia", "serif"],
        ui: ["Inter", "Arial", "sans-serif"],
        mono: ['"JetBrains Mono"', "Menlo", "monospace"],
      },
      boxShadow: {
        hard: "4px 4px 0px 0px #111111",
      },
      borderRadius: {
        none: "0px",
      },
      transitionTimingFunction: {
        newsprint: "ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
