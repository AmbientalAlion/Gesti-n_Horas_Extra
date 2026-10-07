"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { startNavProgress } from "@/components/ui/NavProgress";

/**
 * Una sola transición para todo el panel: filtros, mes y cualquier control
 * que cambie la URL. Mientras llega la respuesta, la región de datos se
 * atenúa (con 150ms de retraso, para que no parpadee en respuestas rápidas)
 * y queda aria-busy. Los controles NO se deshabilitan: así el foco se queda
 * donde estaba y, si se encadenan cambios, gana el último.
 */
interface DashboardNavApi {
  isPending: boolean;
  /** Navega a `?query` sin mover el scroll. */
  navigate: (search: string) => void;
}

const Ctx = createContext<DashboardNavApi | null>(null);

/** true si `search` ya es la URL actual (no navegar: la barra no terminaría). */
function isCurrent(search: string): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(search).toString() ===
    new URLSearchParams(window.location.search).toString()
  );
}

/** API compartida, o null fuera del panel (p. ej. en Exportar). */
export function useDashboardNav(): DashboardNavApi | null {
  return useContext(Ctx);
}

/**
 * Para controles que también se usan fuera del panel: usa la transición
 * compartida si existe y, si no, una propia.
 */
export function useNavigateSearch(): DashboardNavApi {
  const shared = useContext(Ctx);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (shared) return shared;
  return {
    isPending,
    navigate: (search) => {
      if (isCurrent(search)) return;
      startNavProgress();
      startTransition(() => router.push(`?${search}`, { scroll: false }));
    },
  };
}

export function DashboardNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const api: DashboardNavApi = {
    isPending,
    navigate: (search) => {
      if (isCurrent(search)) return;
      startNavProgress();
      startTransition(() => router.push(`?${search}`, { scroll: false }));
    },
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/**
 * Región de resultados (KPIs, alertas, gráficos y tabla). Mientras se
 * actualiza: aria-busy, opacidad .55 y un aviso único para el lector de
 * pantalla; al terminar anuncia «Panel actualizado».
 */
export function DataRegion({
  children,
  className,
  doneMessage,
}: {
  children: React.ReactNode;
  className?: string;
  /** Texto que se anuncia al terminar, p. ej. «Panel actualizado: 6 personas». */
  doneMessage: string;
}) {
  const nav = useDashboardNav();
  const pending = nav?.isPending ?? false;
  const [announce, setAnnounce] = useState("");
  const was = useRef(false);

  useEffect(() => {
    if (pending) setAnnounce("Actualizando el panel…");
    else if (was.current) setAnnounce(doneMessage);
    was.current = pending;
  }, [pending, doneMessage]);

  return (
    <div
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      className={clsx(
        "transition-[opacity,filter] duration-base ease-enter",
        pending && "pointer-events-none opacity-[.55] saturate-[.6] delay-150",
        className
      )}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {children}
    </div>
  );
}
