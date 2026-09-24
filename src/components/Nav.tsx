"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Role } from "@/lib/types";
import type { PendingAuth } from "@/lib/data";
import { signOut } from "@/app/login/actions";
import { BrandMark, Claim } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

interface NavProps {
  role: Role | "demo";
  pending?: PendingAuth[];
}

const ROLE_LABELS: Record<Role | "demo", string> = {
  rrhh: "Recursos Humanos",
  director: "Director General",
  jefe: "Jefe Inmediato",
  demo: "Modo demostración",
};

export function Nav({ role, pending = [] }: NavProps) {
  const pathname = usePathname();
  const isRrhh = role === "rrhh" || role === "demo";
  const canApprove = role === "rrhh" || role === "director";

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    ...(isRrhh ? [{ href: "/upload", label: "Cargar CSV" }] : []),
    { href: "/export", label: "Exportar" },
    { href: "/autorizaciones", label: "Autorizaciones" },
    ...(isRrhh ? [{ href: "/revisiones", label: "Revisiones" }] : []),
    ...(isRrhh ? [{ href: "/admin", label: "Usuarios" }] : []),
  ];

  return (
    <aside className="sticky top-0 z-40 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white print:hidden lg:h-screen lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 px-4 py-2.5 lg:px-5 lg:py-5">
        <div className="flex items-center justify-between gap-2 lg:items-start">
          <BrandMark size="md" />
          {canApprove && (
            <NotificationBell items={pending} href="/autorizaciones" />
          )}
        </div>
        {/* En teléfono el encabezado se reduce para no comerse la pantalla. */}
        <div className="mt-2 hidden text-xs text-slate-500 lg:block">
          Control de Horas Extras
        </div>
        <Claim className="mt-1 hidden text-[11px] lg:block" />
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:gap-0 lg:space-y-1 lg:overflow-visible lg:p-3">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2 lg:block lg:px-5 lg:py-4">
        <div className="lg:mb-3"><ThemeToggle /></div>
        <div className="flex items-center gap-3 lg:block">
          <div>
            <div className="hidden text-xs text-slate-500 lg:block">Rol</div>
            <div className="text-[13px] font-medium text-slate-700 lg:text-sm">
              {ROLE_LABELS[role]}
            </div>
          </div>
          {role !== "demo" && (
            <form action={signOut} className="lg:mt-3">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center text-xs text-slate-500 hover:text-slate-700"
              >
                Cerrar sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
