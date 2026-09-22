import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Horas Extras · ALION",
  description:
    "Auditoría, control y predicción de horas extras del personal de planta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
