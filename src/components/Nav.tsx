"use client";

import { useState } from "react";
import type { Role } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { Claim } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/ui/Icon";
import { AppChrome } from "@/components/nav/AppChrome";
import { Popover, POPOVER_ITEM } from "@/components/nav/Popover";
import { ROLE_LABELS, sectionsFor } from "@/components/nav/sections";

interface NavProps {
  role: Role | "demo";
  /** Nombre del rol de acceso (p. ej. «Director Industrial»). */
  roleName?: string;
  /** Correo de la sesión, para el menú de cuenta. */
  email?: string;
}

/**
 * Navegación de la app autenticada. Recursos Humanos (y el modo sin
 * Supabase) ve Panel, Cargar, Revisiones, Exportar y Usuarios; director y
 * jefe solo el panel, así que en el teléfono no llevan barra inferior.
 */
export function Nav({ role, roleName, email }: NavProps) {
  const isRrhh = role === "rrhh" || role === "demo";
  const sections = sectionsFor(isRrhh);
  const roleLabel = roleName ?? ROLE_LABELS[role];
  const canManageAccount = role !== "demo";
  const [menuOpen, setMenuOpen] = useState(false);

  const accountItems = canManageAccount && (
    <>
      <a href="/cuenta/contrasena" className={POPOVER_ITEM}>
        <Icon name="key" className="h-5 w-5 text-muted" />
        Cambiar contraseña
      </a>
      <form action={signOut}>
        <button type="submit" className={POPOVER_ITEM}>
          <Icon name="logout" className="h-5 w-5 text-muted" />
          Cerrar sesión
        </button>
      </form>
    </>
  );

  return (
    <AppChrome
      base=""
      sections={sections}
      pinTopBar={menuOpen}
      sidebarFooter={
        <div className="space-y-1">
          <div className="px-3 pb-2">
            <p className="text-caption text-muted">Sesión</p>
            <span className="chip-brand mt-1 max-w-full font-semibold">
              <span className="truncate">{roleLabel}</span>
            </span>
            {email && <p className="mt-1 truncate text-small text-muted" title={email}>{email}</p>}
          </div>
          <ThemeToggle className="w-full justify-start px-3" />
          {accountItems}
          <Claim className="block px-3 pt-2 text-caption" />
        </div>
      }
      mobileActions={
        <>
          <ThemeToggle compact />
          <Popover
            title="Cuenta"
            buttonLabel="Cuenta"
            onOpenChange={setMenuOpen}
            buttonClassName="btn-ghost btn-icon"
            button={
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-caption font-bold text-heading ring-1 ring-brand-200/70"
              >
                {initials(roleLabel)}
              </span>
            }
          >
            <div className="px-3 pb-2">
              <p className="text-ui font-semibold text-ink">{roleLabel}</p>
              {email && <p className="truncate text-small text-muted">{email}</p>}
            </div>
            {accountItems && <div className="border-t border-line pt-1">{accountItems}</div>}
          </Popover>
        </>
      }
    />
  );
}

function initials(label: string) {
  const words = label.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : label.slice(0, 2);
  return letters.toUpperCase();
}
