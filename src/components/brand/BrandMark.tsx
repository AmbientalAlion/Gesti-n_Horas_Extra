import clsx from "clsx";

// Logotipo oficial de ALIÓN (Molins + Corona). Versión original sobre fondo
// claro y versión blanca sobre azul en modo oscuro. No se recrea ni altera el
// logo; se respeta un área de reserva alrededor.
//
// Rendimiento: se sirven copias de 480px (≈6 KB y ≈4 KB) en lugar de los
// originales de 2448px. La variante oscura es un fondo CSS
// (.dark .brand-logo-dark en globals.css): solo se descarga con el tema oscuro.

const HEIGHTS: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16",
};

const ALT = "ALIÓN — Molins + Corona";

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const h = HEIGHTS[size];
  return (
    <div className={clsx("select-none", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-alion-480.png"
        alt={ALT}
        width={480}
        height={198}
        decoding="async"
        className={clsx(h, "w-auto object-contain object-left dark:hidden")}
      />
      <span
        role="img"
        aria-label={ALT}
        className={clsx(
          h,
          "brand-logo-dark hidden aspect-[480/198] rounded-md bg-contain bg-left bg-no-repeat dark:block"
        )}
      />
    </div>
  );
}

export function Claim({ className }: { className?: string }) {
  // Claim oficial: "Siempre firme" (firme en bold).
  return (
    <span className={clsx("text-heading", className)}>
      Siempre <span className="font-bold">firme</span>
    </span>
  );
}
