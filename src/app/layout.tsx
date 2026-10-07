import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Mulish } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";
import { NavProgress } from "@/components/ui/NavProgress";
import "./globals.css";

// Mulish es variable (200–1000): un solo archivo trae 400, 500, 600 y 700.
const mulish = Mulish({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Control de Horas Extras · ALIÓN",
    template: "%s · Horas Extras ALIÓN",
  },
  description:
    "Auditoría, control y predicción de horas extras del personal de planta.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EBF7F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1524" },
  ],
};

// Antes de pintar: tema guardado (o el del sistema). Evita el destello claro.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d)r.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO" className={mulish.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink">
        <a
          href="#contenido"
          className="sr-only rounded-control bg-brand-900 px-4 py-3 text-sm font-semibold text-white shadow-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[90]"
        >
          Saltar al contenido
        </a>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
