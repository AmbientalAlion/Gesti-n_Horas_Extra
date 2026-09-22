import clsx from "clsx";

// Logotipo oficial de ALIÓN (Molins + Corona). Usa la versión original sobre
// fondo claro y la versión blanca sobre azul en modo oscuro. No se recrea ni
// altera el logo; se respeta un área de reserva alrededor.

const HEIGHTS: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16",
};

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
        src="/brand/logo-alion.png"
        alt="ALIÓN — Molins + Corona"
        className={clsx(h, "w-auto object-contain dark:hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-alion-dark.png"
        alt="ALIÓN — Molins + Corona"
        className={clsx(h, "hidden w-auto rounded object-contain dark:block")}
      />
    </div>
  );
}

export function Claim({ className }: { className?: string }) {
  // Claim oficial: "Siempre firme" (firme en bold).
  return (
    <span className={clsx("text-brand-dark", className)}>
      Siempre <span className="font-bold">firme</span>
    </span>
  );
}
