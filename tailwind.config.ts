import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial ALIÓN (Manual de marca v3, jun 2024).
        brand: {
          DEFAULT: "#0098BA", // Azul ALIÓN (color protagonista)
          dark: "#003865", // Azul Oscuro ALIÓN (titulares/hover)
          light: "#58BCD2", // Azul ALIÓN 60%
          tint: "#EBF7F9", // Azul ALIÓN 7% (fondos suaves)
        },
        accent: "#FF8400", // Naranja ALIÓN
        // Semáforo (colores funcionales para señalización).
        status: {
          green: "#16a34a",
          yellow: "#FF8400", // Naranja ALIÓN (preventivo)
          red: "#dc2626",
        },
      },
      fontFamily: {
        sans: ['"Mulish"', '"Muli"', "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
