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
      // Movimiento sobrio: entradas suaves y barras que crecen. Se anulan con
      // prefers-reduced-motion (ver globals.css).
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 450ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "fade-in": "fade-in 250ms ease-out both",
        "grow-x": "grow-x 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
