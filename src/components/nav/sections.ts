import type { IconName } from "@/components/ui/Icon";
import type { Role } from "@/lib/types";

/**
 * Secciones de la aplicación, en un solo sitio para la barra lateral
 * (escritorio), la barra inferior (móvil) y el título de la barra superior.
 *
 * Regla de roles: Recursos Humanos ve Cargar, Revisiones, Exportar y Usuarios;
 * director y jefe solo ven el panel.
 */
export interface NavSection {
  /** Ruta sin prefijo («/dashboard»). */
  path: string;
  /** Etiqueta completa (barra lateral y título móvil). */
  label: string;
  /** Etiqueta corta para la barra inferior (12px, cinco pestañas en 390px). */
  short: string;
  icon: IconName;
  rrhhOnly: boolean;
}

export const SECTIONS: NavSection[] = [
  { path: "/dashboard", label: "Panel", short: "Panel", icon: "dashboard", rrhhOnly: false },
  { path: "/upload", label: "Cargar archivo", short: "Cargar", icon: "upload", rrhhOnly: true },
  { path: "/revisiones", label: "Registros por revisar", short: "Revisar", icon: "review", rrhhOnly: true },
  { path: "/export", label: "Exportar a nómina", short: "Nómina", icon: "export", rrhhOnly: true },
  { path: "/admin", label: "Usuarios y accesos", short: "Usuarios", icon: "users", rrhhOnly: true },
];

export const ROLE_LABELS: Record<Role | "demo", string> = {
  rrhh: "Recursos Humanos",
  director: "Director",
  jefe: "Jefe Inmediato",
  demo: "Modo demostración",
};

export function sectionsFor(isRrhh: boolean): NavSection[] {
  return SECTIONS.filter((s) => isRrhh || !s.rrhhOnly);
}

/** Quita el prefijo («/demo») para comparar con las rutas de SECTIONS. */
function strip(pathname: string, base: string) {
  return base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
}

/**
 * Índice de la sección activa. La ficha de una persona (/empleado/…) cuenta
 * como «Panel», que es de donde se llega. -1 si ninguna aplica (p. ej. la
 * página de contraseña).
 */
export function activeIndex(sections: NavSection[], pathname: string, base = ""): number {
  const p = strip(pathname, base);
  const target = p.startsWith("/empleado") ? "/dashboard" : p;
  return sections.findIndex((s) => target === s.path || target.startsWith(s.path + "/"));
}

/** Título corto de la barra superior móvil. */
export function sectionTitle(sections: NavSection[], pathname: string, base = ""): string {
  const p = strip(pathname, base);
  if (p.startsWith("/empleado")) return "Ficha de la persona";
  if (p.startsWith("/cuenta")) return "Mi cuenta";
  const i = activeIndex(sections, pathname, base);
  return i >= 0 ? sections[i].label : "Control de Horas Extras";
}
