"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Role } from "@/lib/types";
import { signOut } from "@/app/login/actions";

interface NavProps {
  role: Role | "demo";
}

const ROLE_LABELS: Record<Role | "demo", string> = {
  rrhh: "Recursos Humanos",
  director: "Director General",
  jefe: "Jefe Inmediato",
  demo: "Modo demostración",
};

export function Nav({ role }: NavProps) {
  const pathname = usePathname();
  const canUpload = role === "rrhh" || role === "demo";

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    ...(canUpload ? [{ href: "/upload", label: "Cargar CSV" }] : []),
    { href: "/export", label: "Exportar" },
  ];

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="text-xl font-bold tracking-tight text-brand">ALIÓN</div>
        <div className="text-xs text-slate-500">Control de Horas Extras</div>
        <div className="mt-1 text-[11px] text-brand-dark">
          Siempre <span className="font-bold">firme</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm font-medium transition",
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
      <div className="border-t border-slate-200 px-5 py-4">
        <div className="text-xs text-slate-400">Rol</div>
        <div className="text-sm font-medium text-slate-700">{ROLE_LABELS[role]}</div>
        {role !== "demo" && (
          <form action={signOut} className="mt-3">
            <button type="submit" className="text-xs text-slate-400 hover:text-slate-700">
              Cerrar sesión
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
