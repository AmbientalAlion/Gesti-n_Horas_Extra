import clsx from "clsx";

// Bloque de marca ALIÓN con área de reserva y marcas de respaldo Molins + Corona.
// El logotipo oficial no se recrea: se deja el espacio reservado indicado.

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const nameSize =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div className={clsx("select-none", className)}>
      {/* Área de reserva: el logotipo oficial de ALIÓN va en este espacio. */}
      <div
        className={clsx("font-bold tracking-tight text-brand", nameSize)}
        title="Espacio reservado para el logotipo oficial de ALIÓN"
      >
        ALIÓN
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-dark/70">
        Una marca: Molins + Corona
      </div>
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
