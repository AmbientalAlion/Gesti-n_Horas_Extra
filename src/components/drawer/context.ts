"use client";

import { createContext, useContext } from "react";
import type { EmployeeStatus, SegmentPoint } from "@/lib/aggregate";
import type { DrawerPeriod } from "./views";

/** Dimensiones por las que se puede abrir un grupo en el panel. */
export type GroupDim = "area" | "planta" | "direccion" | "jefe";

/** Listas predefinidas (KPI, estados del semáforo, alertas). */
export type Segment =
  | "all"
  | "red"
  | "yellow"
  | "green"
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
  /**
   * Abre el panel con una vista nueva (reinicia el historial). `opener` es el
   * elemento que recibe el foco al cerrar; si se omite, se usa el que tenía
   * el foco (o el enlace de la fila de esa persona, si el foco estaba en body).
   */
  open: (v: DrawerView, opener?: HTMLElement | null) => void;
  /** Navega dentro del panel (permite «← Volver»). */
  push: (v: DrawerView) => void;
  close: () => void;
  /** Persona abierta ahora en el panel (para marcar su fila), o null. */
  activeEmployeeId: string | null;
  statuses: EmployeeStatus[];
  segmentsByEmployee: Record<string, SegmentPoint[]>;
  period: DrawerPeriod;
  /** Enlace a la ficha completa, conservando filtros y rol. */
  fichaHref: (id: string) => string;
}

/**
 * sessionStorage: desde qué URL del panel se abrió una ficha
 * ({ from, ficha }); «Volver» en la ficha la usa para volver con el historial.
 */
export const FICHA_FROM_KEY = "horas:ficha-desde";

export const DrawerContext = createContext<DrawerApi | null>(null);

/** Devuelve la API del panel, o null si el componente está fuera del panel. */
export function useDrawer(): DrawerApi | null {
  return useContext(DrawerContext);
}
