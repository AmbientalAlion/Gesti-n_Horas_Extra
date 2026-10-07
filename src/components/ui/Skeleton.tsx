import clsx from "clsx";

/**
 * Esqueletos de carga (para loading.tsx). Sin JS ni estado: sirven en
 * componentes de servidor.
 *
 *   <SkeletonGroup label="Cargando el panel…">      // role=status + aria-busy
 *     <Skeleton className="h-8 w-48" />              // bloque con brillo
 *     <SkeletonText lines={3} />                     // párrafo
 *     <SkeletonCard />                               // tarjeta KPI típica
 *   </SkeletonGroup>
 *
 * - SkeletonGroup aparece con 150ms de retraso: si el servidor responde
 *   rápido, no hay destello.
 * - Brillo (shimmer) de 1,4s; con movimiento reducido el bloque queda quieto.
 * - Copie las alturas reales del contenido para que no salte al llegar.
 */
export function Skeleton({
  className,
  rounded = "control",
}: {
  className?: string;
  rounded?: "control" | "chip" | "card" | "full";
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        "sk block",
        rounded === "full" && "!rounded-full",
        rounded === "chip" && "!rounded-chip",
        rounded === "card" && "!rounded-card",
        className
      )}
    />
  );
}

export function SkeletonText({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={clsx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={clsx("h-3.5", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")}
          rounded="chip"
        />
      ))}
    </span>
  );
}

/** Tarjeta con etiqueta, cifra y pista: la forma de StatCard/KpiCard. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx("card flex flex-col gap-3", className)}>
      <Skeleton className="h-3.5 w-2/3" rounded="chip" />
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-3 w-1/2" rounded="chip" />
    </div>
  );
}

export function SkeletonGroup({
  label = "Cargando…",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={clsx(
        "motion-safe:animate-[fade-in_200ms_ease-out_150ms_backwards]",
        className
      )}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
