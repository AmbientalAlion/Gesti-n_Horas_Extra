import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Control de Horas Extras · ALIÓN",
  description:
    "Auditoría, control y predicción de horas extras del personal de planta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={mulish.className}>
      <body>{children}</body>
    </html>
  );
}
