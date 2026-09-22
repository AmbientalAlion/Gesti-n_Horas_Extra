// Parseo y normalización del CSV biométrico.
//
// El archivo operativo trae, por empleado: ID, Rol, Área, Horas Totales
// (y opcionalmente el turno más largo para detectar horas huérfanas).
// Los encabezados se normalizan para tolerar variaciones (mayúsculas, tildes).

import Papa from "papaparse";
import type { BiometricRow } from "./types";

export interface ParsedCsv {
  rows: BiometricRow[];
  errors: string[];
}

/** Normaliza un encabezado: minúsculas, sin tildes ni espacios extra. */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
}

// Alias aceptados para cada campo de destino.
const FIELD_ALIASES: Record<keyof BiometricRow, string[]> = {
  employeeId: ["id", "employee_id", "empleado", "id_empleado", "cedula", "documento"],
  name: ["nombre", "name", "empleado_nombre", "nombre_empleado"],
  role: ["rol", "role", "cargo"],
  area: ["area", "departamento", "seccion"],
  totalHours: ["horas_totales", "total_horas", "horas", "total_hours", "horas_trabajadas"],
  maxShiftHours: ["turno_maximo", "max_turno", "turno_mas_largo", "max_shift", "horas_turno"],
};

function mapHeaders(headers: string[]): Partial<Record<keyof BiometricRow, string>> {
  const normalized = headers.map(normalizeHeader);
  const map: Partial<Record<keyof BiometricRow, string>> = {};

  (Object.keys(FIELD_ALIASES) as (keyof BiometricRow)[]).forEach((field) => {
    const aliases = FIELD_ALIASES[field];
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) map[field] = headers[idx];
  });

  return map;
}

function toNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  // Acepta coma o punto como separador decimal.
  const cleaned = String(value).replace(",", ".").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parsea el contenido de un CSV biométrico a filas normalizadas.
 * Devuelve las filas válidas y los errores encontrados (fila a fila).
 */
export function parseBiometricCsv(content: string): ParsedCsv {
  const errors: string[] = [];
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    result.errors.forEach((e) =>
      errors.push(`Fila ${e.row ?? "?"}: ${e.message}`)
    );
  }

  const headers = result.meta.fields ?? [];
  const headerMap = mapHeaders(headers);

  if (!headerMap.employeeId) {
    errors.push(
      "No se encontró la columna de identificación del empleado (ID/Cédula/Documento)."
    );
  }
  if (!headerMap.totalHours) {
    errors.push("No se encontró la columna de Horas Totales.");
  }

  const rows: BiometricRow[] = [];
  if (headerMap.employeeId && headerMap.totalHours) {
    result.data.forEach((raw, i) => {
      const employeeId = raw[headerMap.employeeId!]?.trim();
      const totalHours = toNumber(raw[headerMap.totalHours!]);

      if (!employeeId) {
        errors.push(`Fila ${i + 2}: falta el ID del empleado.`);
        return;
      }
      if (totalHours == null) {
        errors.push(`Fila ${i + 2}: horas totales inválidas para ${employeeId}.`);
        return;
      }

      rows.push({
        employeeId,
        name: headerMap.name ? raw[headerMap.name]?.trim() : undefined,
        role: headerMap.role ? raw[headerMap.role]?.trim() : undefined,
        area: headerMap.area ? raw[headerMap.area]?.trim() : undefined,
        totalHours,
        maxShiftHours: headerMap.maxShiftHours
          ? toNumber(raw[headerMap.maxShiftHours])
          : undefined,
      });
    });
  }

  return { rows, errors };
}

/** Genera el contenido CSV limpio para exportar a nómina. */
export function buildPayrollCsv(
  rows: Array<{
    employeeId: string;
    name?: string;
    area?: string;
    year: number;
    month: number;
    week: number;
    overtimeHours: number;
    status: string;
  }>
): string {
  const header = [
    "ID_Empleado",
    "Nombre",
    "Area",
    "Anio",
    "Mes",
    "Semana",
    "Horas_Extra",
    "Estado",
  ];
  const lines = rows.map((r) =>
    [
      r.employeeId,
      r.name ?? "",
      r.area ?? "",
      r.year,
      r.month,
      r.week,
      r.overtimeHours,
      r.status,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Calcula año y semana ISO 8601 a partir de una fecha.
 * La semana 1 es la que contiene el primer jueves del año.
 */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // lunes=1..domingo=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}
