"use client";

import Link from "next/link";
import { useDrawer } from "./context";

/**
 * Nombre de una persona que abre su detalle en el panel lateral. Sigue siendo
 * un enlace real a la ficha: Ctrl/⌘ + clic o clic central la abren aparte.
 * Sin prefetch: tocarlo abre el panel, no navega (el panel precarga la ficha
 * de la persona abierta).
 */
export function EmployeeLink({
  id,
  href,
  className,
  children,
}: {
  id: string;
  /** Ficha completa (respaldo si no hay panel). */
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const drawer = useDrawer();
  const target = href ?? drawer?.fichaHref(id) ?? "#";

  return (
    <Link
      href={target}
      prefetch={false}
      className={className}
      onClick={(e) => {
        if (!drawer || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        // La fila no debe volver a abrir el panel (el clic burbujea hasta ella).
        e.stopPropagation();
        drawer.open({ kind: "employee", id }, e.currentTarget);
      }}
    >
      {children}
    </Link>
  );
}
