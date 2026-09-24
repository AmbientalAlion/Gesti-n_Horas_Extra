"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { Role } from "@/lib/types";
import type { PendingAuth } from "@/lib/data";
import { BrandMark, Claim } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

const ROLES: { key: Role; label: string }[] = [
  { key: "rrhh", label: "RRHH" },
  { key: "director", label: "Director" },
  { key: "jefe", label: "Jefe" },
];

// Solicitudes pendientes de ejemplo para la campanita (solo vistas de aprobador).
const DEMO_PENDING: PendingAuth[] = [
  { id: "d1", employeeName: "Carlos Gómez", area: "PRODUCCIÓN RIONEGRO", hours: 3, dayDate: null, week: 25, requestedAt: "" },
  { id: "d2", employeeName: "Diana Torres", area: "CALIDAD RIONEGRO", hours: 5, dayDate: null, week: 25, requestedAt: "" },
];

const LINKS = [
  { href: "/demo/dashboard", label: "Dashboard" },
  { href: "/demo/upload", label: "Cargar CSV" },
  { href: "/demo/export", label: "Exportar" },
  { href: "/demo/autorizaciones", label: "Autorizaciones" },
  { href: "/demo/revisiones", label: "Revisiones" },
  { href: "/demo/admin", label: "Usuarios" },
];

export function DemoNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const role = (params.get("rol") as Role) || "rrhh";
  const withRole = (href: string) => `${href}?rol=${role}`;
  const canApprove = role === "rrhh" || role === "director";

  return (
    <aside className="sticky top-0 z-40 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white print:hidden lg:h-screen lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 px-4 py-2.5 lg:px-5 lg:py-5">
        <div className="flex items-center justify-between gap-2 lg:items-start">
          <BrandMark size="md" />
          {canApprove && (
            <NotificationBell
              items={DEMO_PENDING}
              href={`/demo/autorizaciones?rol=${role}`}
            />
          )}
        </div>
        <div className="mt-2 hidden text-xs text-slate-500 lg:block">
          Control de Horas Extras
        </div>
        <Claim className="mt-1 hidden text-[11px] lg:block" />
      </div>

      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0 lg:space-y-1 lg:overflow-visible lg:p-3">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={withRole(link.href)}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-2 lg:py-4">
        <div className="hidden px-2 text-xs font-medium uppercase tracking-wide text-slate-500 lg:block">
          Ver como
        </div>
        {/* En teléfono, los roles van como fila de chips desplazable. */}
        <div className="flex gap-2 overflow-x-auto lg:mt-2 lg:block lg:space-y-1 lg:overflow-visible">
          {ROLES.map((r) => {
            const active = role === r.key;
            const target = pathname.startsWith("/demo") ? pathname : "/demo/dashboard";
            return (
              <Link
                key={r.key}
                href={`${target}?rol=${r.key}`}
                className={clsx(
                  "inline-flex min-h-11 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition lg:flex lg:w-full",
                  active
                    ? "bg-brand-tint font-semibold text-brand-dark"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <span className="lg:hidden">Ver como </span>
                {r.label}
                {active && <span className="text-brand">●</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2 lg:block lg:px-5 lg:py-4">
        <div className="lg:mb-3"><ThemeToggle /></div>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center text-xs text-slate-500 hover:text-slate-700"
        >
          ← Salir del demo
        </Link>
      </div>
    </aside>
  );
}
