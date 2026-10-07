import type { Config } from "tailwindcss";

/**
 * Tokens de diseño ALIÓN.
 *
 * Los colores semánticos viven en variables CSS (globals.css) como canales RGB
 * («0 152 186»), así cambian solos con el tema (.dark) y admiten alfa:
 * `bg-surface/80`, `border-primary/40`.
 *
 * Reglas rápidas:
 * - #0098BA (brand / brand-500) solo para rellenos, iconos, barras y texto
 *   de 24px o más. Texto de enlace: `text-link`. Botón: `bg-primary`.
 * - El color del estado nunca va solo: siempre forma (LevelIcon) + texto.
 * - Texto de estado en `text-{ok|risk|over|pending|info}` (AA); rellenos en
 *   `bg-{estado}-solid`; fondos en `bg-{estado}-soft`; bordes en
 *   `border-{estado}-border`.
 */
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const state = (name: string) => ({
  DEFAULT: v(`${name}-fg`),
  fg: v(`${name}-fg`),
  solid: v(`${name}-solid`),
  soft: v(`${name}-soft`),
  border: v(`${name}-border`),
});

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  future: {
    // Los :hover solo aplican con puntero que puede «pasar por encima»: en
    // pantallas táctiles no se quedan pegados después de tocar.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // ---- Superficies ----
        canvas: v("bg"),
        bg: v("bg"),
        surface: {
          DEFAULT: v("surface"),
          2: v("surface-2"),
          3: v("surface-3"),
        },
        // ---- Texto ----
        ink: { DEFAULT: v("ink"), 2: v("ink-2") },
        muted: v("muted"),
        heading: v("heading"),
        // ---- Líneas ----
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        // ---- Acción ----
        primary: {
          DEFAULT: v("primary"),
          hover: v("primary-hover"),
          active: v("primary-active"),
          soft: v("primary-soft"),
        },
        "on-primary": v("on-primary"),
        link: { DEFAULT: v("link"), hover: v("link-hover") },
        focus: v("focus"),
        // ---- Estados (AA) ----
        ok: state("ok"),
        risk: state("risk"),
        over: state("over"),
        pending: state("pending"),
        info: state("info"),
        // ---- Gráficos ----
        chart: {
          grid: v("chart-grid"),
          axis: v("chart-axis"),
          label: v("chart-label"),
          "label-strong": v("chart-label-strong"),
          meta: v("chart-meta"),
          limit: v("chart-limit"),
          track: v("chart-track"),
          1: v("chart-1"),
          2: v("chart-2"),
        },
        // Paleta oficial ALIÓN (Manual de marca v3, jun 2024) con escala tonal
        // accesible. Valores fijos (no cambian con el tema).
        brand: {
          DEFAULT: "#0098BA", // Azul ALIÓN (relleno, iconos, barras)
          50: "#EBF7F9", // Azul 7%
          100: "#D6EFF5",
          200: "#91D2E1", // Azul 40%
          300: "#58BCD2", // Azul 60%
          400: "#2AAAC6",
          500: "#0098BA", // Azul ALIÓN
          600: "#007A96", // blanco encima 4,97:1
          700: "#006E87", // texto sobre blanco 5,87:1
          800: "#005F78",
          900: "#003865", // Azul Oscuro ALIÓN
          dark: "#003865",
          light: "#58BCD2",
          tint: "#EBF7F9",
        },
        accent: "#FF8400", // Naranja ALIÓN (solo relleno)
        // Alias heredados: apuntan a los rellenos de estado.
        status: {
          green: v("ok-solid"),
          yellow: v("risk-solid"),
          red: v("over-solid"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Muli", "Arial", "sans-serif"],
      },
      // Escala tipográfica: [tamaño, {interlineado, peso, tracking}].
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
        small: ["0.8125rem", { lineHeight: "1.125rem" }],
        ui: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "500" }],
        body: ["0.9375rem", { lineHeight: "1.5rem" }],
        title: ["1.0625rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        h1: [
          "clamp(1.5rem, 1.2rem + 1vw, 1.875rem)",
          { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" },
        ],
        display: [
          "clamp(1.75rem, 1.4rem + 1.4vw, 2.25rem)",
          { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.01em" },
        ],
      },
      borderRadius: {
        chip: "6px",
        control: "10px",
        card: "14px",
        hero: "20px",
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
        sm: "var(--shadow-1)",
        md: "var(--shadow-2)",
        lg: "var(--shadow-3)",
        xl: "var(--shadow-3)",
      },
      // ---- Movimiento (valores en globals.css :root) ----
      transitionDuration: {
        instant: "var(--dur-instant)",
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
        chart: "var(--dur-chart)",
      },
      transitionTimingFunction: {
        enter: "var(--ease-enter)",
        exit: "var(--ease-exit)",
        move: "var(--ease-move)",
        pop: "var(--ease-pop)",
      },
      transitionDelay: {
        stagger: "var(--stagger)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(var(--dist-md))" },
          "100%": { opacity: "1", transform: "none" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(var(--scale-from))" },
          "100%": { opacity: "1", transform: "none" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(var(--dist-lg))" },
          "100%": { opacity: "1", transform: "none" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(calc(var(--dist-lg) * -1))" },
          "100%": { opacity: "1", transform: "none" },
        },
        // Para <path pathLength="1" strokeDasharray="1">.
        "draw-line": {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "grow-y": {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        // Figuras de marca: entran hacia su transform propio (inline).
        "fig-in": {
          "0%": { opacity: "0", transform: "translateY(12px) rotate(-6deg)" },
        },
        shake: {
          "0%, 100%": { transform: "none" },
          "20%, 60%": { transform: "translateX(calc(var(--dist-sm) * -1))" },
          "40%, 80%": { transform: "translateX(var(--dist-sm))" },
        },
      },
      // Fill-mode «backwards»: respeta el 0% durante el retraso y suelta el
      // estilo al terminar (no anula hover ni deja transforms vivos).
      animation: {
        "fade-up": "fade-up var(--dur-enter) var(--ease-enter) backwards",
        "fade-in": "fade-in var(--dur-base) var(--ease-enter) backwards",
        "scale-in": "scale-in var(--dur-base) var(--ease-enter) backwards",
        "slide-in-right": "slide-in-right var(--dur-slow) var(--ease-enter) backwards",
        "slide-in-left": "slide-in-left var(--dur-slow) var(--ease-enter) backwards",
        "draw-line": "draw-line var(--dur-chart) var(--ease-enter) backwards",
        "grow-x": "grow-x var(--dur-grow) var(--ease-enter) backwards",
        "grow-y": "grow-y var(--dur-grow) var(--ease-enter) backwards",
        shimmer: "shimmer 1.4s linear infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "fig-in": "fig-in 700ms var(--ease-enter) backwards",
        shake: "shake 300ms var(--ease-move) backwards",
        // Alias heredado (antes 450ms «both»).
        "fade-in-up": "fade-up var(--dur-enter) var(--ease-enter) backwards",
      },
    },
  },
  plugins: [],
};

export default config;
