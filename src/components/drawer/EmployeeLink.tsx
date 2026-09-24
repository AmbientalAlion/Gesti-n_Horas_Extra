"use client";

import Link from "next/link";
import { useDrawer } from "./context";

/**
 * Nombre de una persona que abre su detalle en el panel lateral. Sigue siendo
 * un enlace real a la ficha: Ctrl/⌘ + clic o clic central la abren aparte.
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
      className={className}
      onClick={(e) => {
        if (!drawer || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        drawer.open({ kind: "employee", id });
      }}
    >
      {children}
    </Link>
  );
}
