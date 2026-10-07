import clsx from "clsx";
import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Esqueletos de carga de cada ruta (los usan los loading.tsx de la app y de
 * la demo). Copian la estructura y las alturas de la página real para que
 * al llegar el contenido nada salte. Aparecen con 150ms de retraso
 * (SkeletonGroup): si el servidor responde rápido no hay destello.
 */

/** Cabecera de página (PageHeader): título, subtítulo y acción a la derecha. */
function HeaderSkeleton({
  eyebrow = false,
  action = true,
  lines = 2,
}: {
  eyebrow?: boolean;
  action?: boolean;
  lines?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-hero border border-line bg-surface px-4 py-5 shadow-1 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          {eyebrow && <Skeleton className="h-5 w-32" rounded="full" />}
          <Skeleton className="h-8 w-3/5 max-w-xs" />
          <SkeletonText lines={lines} className="max-w-[60ch] pt-1" />
        </div>
        {action && <Skeleton className="h-10 w-full shrink-0 sm:w-44" />}
      </div>
    </div>
  );
}

function TableSkeleton({
  rows = 6,
  cols = 5,
  caption = true,
}: {
  rows?: number;
  cols?: number;
  caption?: boolean;
}) {
  return (
    <div className="card overflow-hidden p-0">
      {caption && (
        <div className="px-4 py-3">
          <Skeleton className="h-4 w-48" rounded="chip" />
        </div>
      )}
      <div className="flex gap-4 bg-surface-2 px-4 py-2.5">
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton
            key={c}
            className={clsx("h-3", c === 1 ? "flex-[2]" : "flex-1", c > 2 && "hidden sm:block")}
            rounded="chip"
          />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton
                key={c}
                className={clsx(
                  "h-3.5",
                  c === 1 ? "flex-[2]" : "flex-1",
                  c > 2 && "hidden sm:block",
                  (r + c) % 3 === 0 && "opacity-70"
                )}
                rounded="chip"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cabecera de una tarjeta plegable (CollapsibleCard / Centro de alertas). */
function AccordionSkeleton() {
  return (
    <div className="card flex min-h-16 items-center gap-3">
      <Skeleton className="h-5 w-5 shrink-0" rounded="chip" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48 max-w-full" rounded="chip" />
        <Skeleton className="h-3 w-72 max-w-full" rounded="chip" />
      </div>
    </div>
  );
}

function ChartCardSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="rounded-control border border-line p-4">
      <Skeleton className="mb-4 h-4 w-40" rounded="chip" />
      {bars ? (
        <div className="space-y-4">
          {[100, 78, 52, 30, 14].map((w) => (
            <div key={w} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32" rounded="chip" />
                <Skeleton className="h-3 w-10" rounded="chip" />
              </div>
              <div style={{ width: `${w}%` }}>
                <Skeleton className="h-2" rounded="full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Skeleton className="h-[200px]" />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Cargando el panel…" className="space-y-6">
      <HeaderSkeleton eyebrow lines={3} />
      {/* Franja de leyenda */}
      <Skeleton className="h-[120px] sm:h-[65px]" rounded="card" />
      {/* Buscador */}
      <Skeleton className="h-11" />
      {/* Filtros */}
      <div className="card space-y-3">
        <Skeleton className="h-3.5 w-3/4 max-w-md" rounded="chip" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" rounded="chip" />
              <Skeleton className="h-11" />
            </div>
          ))}
        </div>
      </div>
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} className="min-h-[140px]" />
        ))}
      </div>
      {/* Centro de alertas y gráficos */}
      <AccordionSkeleton />
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 shrink-0" rounded="chip" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-44" rounded="chip" />
            <Skeleton className="h-3 w-72 max-w-full" rounded="chip" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-control border border-line p-4">
            <Skeleton className="mb-4 h-4 w-40" rounded="chip" />
            <div className="flex items-center gap-6">
              <Skeleton className="h-32 w-32 shrink-0" rounded="full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-3.5" rounded="chip" />
                <Skeleton className="h-3.5" rounded="chip" />
                <Skeleton className="h-3.5" rounded="chip" />
              </div>
            </div>
          </div>
          <ChartCardSkeleton />
          <ChartCardSkeleton bars />
          <ChartCardSkeleton bars />
        </div>
      </div>
    </SkeletonGroup>
  );
}

export function FichaSkeleton() {
  return (
    <SkeletonGroup label="Cargando la ficha de la persona…" className="space-y-6">
      <div className="flex h-11 items-center">
        <Skeleton className="h-4 w-36" rounded="chip" />
      </div>
      <div className="rounded-hero border border-line bg-surface px-6 py-5 shadow-1">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-60 max-w-full" />
          <Skeleton className="h-6 w-24" rounded="full" />
        </div>
        <Skeleton className="mt-2 h-3.5 w-72 max-w-full" rounded="chip" />
        <div className="mt-3 flex flex-wrap gap-2">
          {[6, 7, 5, 8, 6].map((w, i) => (
            <div key={i} style={{ width: `${w}rem` }}>
              <Skeleton className="h-6" rounded="full" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonCard key={i} className="min-h-[134px]" />
        ))}
      </div>
      <div className="card">
        <Skeleton className="h-5 w-56" rounded="chip" />
        <Skeleton className="mt-2 h-3.5 w-80 max-w-full" rounded="chip" />
        {/* Área del gráfico con líneas de eje tenues */}
        <div className="relative mt-4 h-[260px] sm:h-[320px]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-line"
              style={{ top: `${i * 30 + 5}%` }}
            />
          ))}
          <Skeleton className="absolute inset-x-0 bottom-0 h-px" rounded="chip" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

export function UploadSkeleton() {
  return (
    <SkeletonGroup label="Cargando Cargar archivo…" className="space-y-6">
      <HeaderSkeleton action={false} lines={3} />
      <div className="rounded-control border border-line bg-surface px-4 py-3">
        <Skeleton className="h-4 w-40" rounded="chip" />
        <SkeletonText lines={2} className="mt-2" />
      </div>
      <div className="card space-y-4">
        <Skeleton className="h-4 w-56" rounded="chip" />
        <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-line">
          <Skeleton className="h-10 w-10" rounded="full" />
          <Skeleton className="h-3.5 w-56 max-w-[80%]" rounded="chip" />
        </div>
        <Skeleton className="h-11 w-full sm:w-44" />
      </div>
    </SkeletonGroup>
  );
}

export function ExportSkeleton() {
  return (
    <SkeletonGroup label="Cargando Exportar a nómina…" className="space-y-6">
      <HeaderSkeleton lines={3} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonCard key={i} className="min-h-[134px]" />
        ))}
      </div>
      <div className="card space-y-4">
        <SkeletonText lines={2} className="max-w-2xl" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11 w-48" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
      <TableSkeleton rows={6} cols={6} />
    </SkeletonGroup>
  );
}

export function RevisionesSkeleton() {
  return (
    <SkeletonGroup label="Cargando Registros por revisar…" className="space-y-6">
      <HeaderSkeleton action={false} lines={3} />
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" rounded="chip" />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" rounded="chip" />
              <Skeleton className="h-3 w-64 max-w-full" rounded="chip" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 2 }, (_, j) => (
                <div key={j} className="space-y-2 rounded-control border border-line p-3">
                  <Skeleton className="h-3 w-28" rounded="chip" />
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <TableSkeleton rows={4} cols={3} caption={false} />
    </SkeletonGroup>
  );
}

export function AdminSkeleton() {
  return (
    <SkeletonGroup label="Cargando Usuarios y accesos…" className="space-y-6">
      <HeaderSkeleton action={false} lines={3} />
      <div className="card space-y-3">
        <Skeleton className="h-5 w-40" rounded="chip" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </div>
      <TableSkeleton rows={6} cols={5} />
      <AccordionSkeleton />
      <AccordionSkeleton />
    </SkeletonGroup>
  );
}
