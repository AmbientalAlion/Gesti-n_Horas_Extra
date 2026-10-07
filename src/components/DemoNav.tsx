"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { Role } from "@/lib/types";
import { Claim } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/ui/Icon";
import { AppChrome } from "@/components/nav/AppChrome";
import { Popover, POPOVER_ITEM } from "@/components/nav/Popover";
import { SECTIONS, sectionsFor } from "@/components/nav/sections";

const ROLES: { key: Role; label: string; long: string }[] = [
  { key: "rrhh", label: "RRHH", long: "Recursos Humanos" },
  { key: "director", label: "Director", long: "Director" },
  { key: "jefe", label: "Jefe", long: "Jefe inmediato" },
];

/**
 * Navegación de la demo: la misma estructura que la app, más el selector
 * «Ver como» (cambia el rol con ?rol=). En escritorio es un control
 * segmentado con una pastilla que se desliza; en el teléfono, un chip
 * «Demo · RRHH» en la barra superior que abre la lista de roles.
 */
export function DemoNav() {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const raw = params?.get("rol");
  const role: Role = ROLES.some((r) => r.key === raw) ? (raw as Role) : "rrhh";
  const sections = sectionsFor(role === "rrhh");
  const [menuOpen, setMenuOpen] = useState(false);
  // Rol elegido, marcado al instante mientras llega la página.
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  useEffect(() => setPendingRole(null), [raw]);
  const shownRole = pendingRole ?? role;

  /** Al cambiar a un rol sin acceso a la sección actual, vuelve al panel. */
  const roleHref = (r: Role) => {
    const section = SECTIONS.find((s) => pathname.startsWith(`/demo${s.path}`));
    const keep = pathname.startsWith("/demo") && !(section?.rrhhOnly && r !== "rrhh");
    return `${keep ? pathname : "/demo/dashboard"}?rol=${r}`;
  };

  const index = Math.max(0, ROLES.findIndex((r) => r.key === shownRole));
  const current = ROLES.find((r) => r.key === role)!;

  const exit = (
    <Link href="/login" prefetch={false} className={POPOVER_ITEM}>
      <Icon name="arrow-left" className="h-5 w-5 text-muted" />
      Salir de la demostración
    </Link>
  );

  return (
    <AppChrome
      base="/demo"
      sections={sections}
      query={`?rol=${role}`}
      pinTopBar={menuOpen}
      sidebarExtra={
        <div className="mt-5 border-t border-line px-1 pt-4">
          <p id="ver-como" className="px-2 text-caption font-semibold uppercase tracking-[0.02em] text-muted">
            Ver como
          </p>
          <div
            role="group"
            aria-labelledby="ver-como"
            className="relative mt-2 grid grid-cols-3 rounded-control bg-surface-3 p-1"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-[8px] bg-surface shadow-1 transition-transform duration-base ease-move motion-reduce:transition-none"
              style={{ width: "calc((100% - 0.5rem) / 3)", transform: `translateX(${index * 100}%)` }}
            />
            {ROLES.map((r) => {
              const on = r.key === shownRole;
              return (
                <Link
                  key={r.key}
                  href={roleHref(r.key)}
                  onClick={() => setPendingRole(r.key)}
                  aria-current={r.key === role ? "true" : undefined}
                  title={`Ver como ${r.long}`}
                  className={clsx(
                    "relative flex h-9 items-center justify-center rounded-[8px] text-small transition-colors duration-fast",
                    on ? "font-semibold text-heading" : "font-medium text-ink-2 hover:text-ink"
                  )}
                >
                  {r.label}
                </Link>
              );
            })}
          </div>
          <p className="mt-2 px-2 text-caption text-muted">
            Cada rol ve sus propias secciones y su alcance.
          </p>
        </div>
      }
      sidebarFooter={
        <div className="space-y-1">
          <ThemeToggle className="w-full justify-start px-3" />
          {exit}
          <Claim className="block px-3 pt-2 text-caption" />
        </div>
      }
      mobileActions={
        <>
          <Popover
            title="Ver como"
            onOpenChange={setMenuOpen}
            buttonClassName="group inline-flex min-h-11 items-center rounded-full px-0.5"
            button={
              <span className="chip-brand gap-1.5 py-1 pl-1 pr-2 text-small font-semibold transition-colors duration-fast group-hover:border-primary/50 group-aria-expanded:border-primary/60">
                <span className="rounded-chip bg-brand-900 px-1.5 text-[11px] font-bold uppercase leading-4 tracking-[0.02em] text-white">
                  Demo
                </span>
                <span>{current.label}</span>
                <Icon
                  name="chevron-down"
                  className="h-4 w-4 transition-transform duration-base ease-move group-aria-expanded:rotate-180"
                />
              </span>
            }
          >
            <ul className="space-y-0.5">
              {ROLES.map((r) => {
                const on = r.key === role;
                return (
                  <li key={r.key}>
                    <Link
                      href={roleHref(r.key)}
                      onClick={() => setPendingRole(r.key)}
                      aria-current={on ? "true" : undefined}
                      className={clsx(POPOVER_ITEM, on && "bg-primary-soft font-semibold text-heading")}
                    >
                      <span className="flex-1">{r.long}</span>
                      {on && <Icon name="check" className="h-5 w-5 text-primary" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="px-3 py-2 text-small text-muted">
              Modo demostración: datos de ejemplo, los cambios no se guardan.
            </p>
            <div className="border-t border-line pt-1">{exit}</div>
          </Popover>
          <ThemeToggle compact />
        </>
      }
    />
  );
}
