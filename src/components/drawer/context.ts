"use client";

import { createContext, useContext } from "react";
import type { EmployeeStatus, EmployeeWeek } from "@/lib/aggregate";

/** Dimensiones por las que se puede abrir un grupo en el panel. */
export type GroupDim = "area" | "planta" | "direccion" | "jefe";

/** Listas predefinidas (KPI, estados del semáforo, alertas). */
export type Segment =
  | "all"
  | "red"
  | "yellow"
  | "green"
  | "atRisk"
  | "errors"
  | "weeklyHigh";

export type DrawerView =
  | { kind: "employee"; id: string }
  | {
      kind: "group";
      dim: GroupDim;
      label: string;
      /** Parámetros para «Filtrar el panel por …» (drill-down). */
      param: string;
      clear?: string[];
    }
  | { kind: "segment"; segment: Segment };

export interface DrawerApi {
  /** Abre el panel con una vista nueva (reinicia el historial). */
  open: (v: DrawerView) => void;
  /** Navega dentro del panel (permite «← Volver»). */
  push: (v: DrawerView) => void;
  close: () => void;
  statuses: EmployeeStatus[];
  weeksByEmployee: Record<string, EmployeeWeek[]>;
  /** Enlace a la ficha completa, conservando filtros y rol. */
  fichaHref: (id: string) => string;
}

export const DrawerContext = createContext<DrawerApi | null>(null);

/** Devuelve la API del panel, o null si el componente está fuera del panel. */
export function useDrawer(): DrawerApi | null {
  return useContext(DrawerContext);
}
