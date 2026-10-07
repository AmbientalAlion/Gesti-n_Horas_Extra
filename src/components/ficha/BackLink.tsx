"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Icon } from "../ui/Icon";
import { FICHA_FROM_KEY } from "../drawer/context";

/** ¿Se llegó a esta ficha desde el panel al que apunta «Volver»? */
function cameFromPanel(href: string): boolean {
  const raw = sessionStorage.getItem(FICHA_FROM_KEY);
  if (!raw || window.history.length < 2) return false;
  const { from, ficha } = JSON.parse(raw) as { from?: string; ficha?: string };
  if (!from || ficha !== window.location.pathname) return false;
  return new URL(from, window.location.origin).pathname === new URL(href, window.location.origin).pathname;
}

/**
 * «Volver al panel». Si se llegó a la ficha desde el panel (el panel lateral
 * guarda de dónde), vuelve con el historial: el navegador restaura el scroll
 * y la tabla conserva su búsqueda y su filtro. Si no, es un enlace normal.
 */
export function BackLink({
  href,
  label = "Volver al panel",
  compact = false,
  className,
}: {
  href: string;
  label?: string;
  /** Solo icono (barra compacta). */
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        try {
          if (cameFromPanel(href)) {
            e.preventDefault();
            sessionStorage.removeItem(FICHA_FROM_KEY);
            router.back();
          }
        } catch {
          /* sin almacenamiento: enlace normal */
        }
      }}
      className={clsx(
        "group inline-flex min-h-11 items-center gap-1.5 rounded-control text-ui font-semibold text-link transition-colors duration-fast hover:text-link-hover",
        compact ? "w-11 justify-center hover:bg-primary-soft" : "-ml-2 px-2 hover:bg-primary-soft",
        className
      )}
    >
      <Icon
        name="arrow-left"
        className="h-4 w-4 shrink-0 transition-transform duration-fast ease-enter group-hover:-translate-x-0.5"
      />
      {!compact && <span>{label}</span>}
    </Link>
  );
}
