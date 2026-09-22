"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { Role } from "@/lib/types";
import { BrandMark, Claim } from "@/components/brand/BrandMark";

const ROLES: { key: Role; label: string }[] = [
  { key: "rrhh", label: "RRHH" },
  { key: "director", label: "Director" },
  { key: "jefe", label: "Jefe" },
];

const LINKS = [
  { href: "/demo/dashboard", label: "Dashboard" },
  { href: "/demo/upload", label: "Cargar CSV" },
  { href: "/demo/export", label: "Exportar" },
];

export function DemoNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const role = (params.get("rol") as Role) || "rrhh";
  const withRole = (href: string) => `${href}?rol=${role}`;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <BrandMark size="md" />
        <div className="mt-2 text-xs text-slate-500">Control de Horas Extras</div>
        <Claim className="mt-1 block text-[11px]" />
      </div>

      <nav className="space-y-1 p-3">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={withRole(link.href)}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm font-medium transition",
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
        <Link href="/login" className="text-xs text-slate-400 hover:text-slate-700">
          ← Salir del demo
        </Link>
      </div>
    </aside>
  );
}
