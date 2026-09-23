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
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-start justify-between gap-2">
          <BrandMark size="md" />
          {canApprove && (
            <NotificationBell
              items={DEMO_PENDING}
              href={`/demo/autorizaciones?rol=${role}`}
            />
          )}
        </div>
        <div className="mt-2 text-xs text-slate-500">Control de Horas Extras</div>
        <Claim className="mt-1 block text-[11px]" />
      </div>

      <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:gap-0 lg:space-y-1 lg:overflow-visible">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={withRole(link.href)}
              className={clsx(
                "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <div className="px-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Ver como
        </div>
        <div className="mt-2 space-y-1">
          {ROLES.map((r) => {
            const active = role === r.key;
            const target = pathname.startsWith("/demo") ? pathname : "/demo/dashboard";
            return (
              <Link
                key={r.key}
                href={`${target}?rol=${r.key}`}
                className={clsx(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-brand-tint font-semibold text-brand-dark"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {r.label}
                {active && <span className="text-brand">●</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 px-5 py-4">
        <div className="mb-3"><ThemeToggle /></div>
        <Link href="/login" className="text-xs text-slate-400 hover:text-slate-700">
          ← Salir del demo
        </Link>
      </div>
    </aside>
  );
}
