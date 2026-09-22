"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Role } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { BrandMark, Claim } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const isRrhh = role === "rrhh" || role === "demo";

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    ...(isRrhh ? [{ href: "/upload", label: "Cargar CSV" }] : []),
    { href: "/export", label: "Exportar" },
    ...(isRrhh ? [{ href: "/revisiones", label: "Revisiones" }] : []),
    ...(isRrhh ? [{ href: "/admin", label: "Usuarios" }] : []),
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white print:hidden lg:w-60 lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 px-5 py-5">
        <BrandMark size="md" />
        <div className="mt-2 text-xs text-slate-500">Control de Horas Extras</div>
        <Claim className="mt-1 block text-[11px]" />
      </div>
      <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:gap-0 lg:space-y-1 lg:overflow-visible">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
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
        <div className="mb-3"><ThemeToggle /></div>
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
