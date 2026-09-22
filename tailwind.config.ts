import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta corporativa ALION (ajustable a manual de marca)
        brand: {
          DEFAULT: "#0B4F6C",
          dark: "#062f41",
          light: "#3a7f9c",
        },
        accent: "#F26522",
        // Semáforo
        status: {
          green: "#16a34a",
          yellow: "#d97706",
          red: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
