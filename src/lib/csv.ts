// Parseo y normalización del CSV biométrico.
//
// El archivo operativo trae, por empleado: ID, Rol, Área, Horas Totales
// (y opcionalmente el turno más largo para detectar horas huérfanas).
// Los encabezados se normalizan para tolerar variaciones (mayúsculas, tildes).

import Papa from "papaparse";
import type { BiometricRow } from "./types";
import { isoDate, segmentOfDate, weekInfo, type CivilDate } from "./dates";

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

/**
 * Año y semana ISO 8601 de una fecha (la semana 1 contiene el primer jueves).
 * Delegado en src/lib/dates.ts para que toda la app use el mismo calendario.
 */
export function isoWeek(date: Date): { year: number; week: number } {
  const { year, week } = isoWeekInfo(date);
  return { year, week };
}

/**
 * Año, semana y mes de imputación (mes del jueves) de una fecha civil.
 * Usa la fecha tal como viene en el archivo (día/mes/año), sin zona horaria.
 */
export function isoWeekInfo(date: Date): { year: number; week: number; month: number } {
  return weekInfo({ y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() });
}

// ---------- Formato real de horas extra (export biométrico ALIÓN) ----------
// Cada fila es un evento de hora extra ya clasificado por Concepto.

export type RecargoKey =
  | "diurna"
  | "nocturna"
  | "dom_diurna"
  | "dom_nocturna";

export interface OvertimeWeekly {
  code: string;
  name?: string;
  area?: string;
  direccion?: string;
  costCenter?: string;
  plant?: string;
  managerName?: string;
  /** Año y mes calendario del tramo. */
  year: number;
  month: number;
  /** Semana ISO del tramo. */
  week: number;
  /** Último día con eventos en el tramo (`yyyy-mm-dd`). */
  lastDate: string;
  overtimeHours: number;
  byConcepto: Record<RecargoKey, number>;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Clasifica el Concepto del archivo en una de las cuatro categorías de recargo. */
export function classifyConcepto(concepto: string): RecargoKey {
  const c = stripAccents(concepto).toLowerCase();
  const dom = c.includes("domin");
  const noct = c.includes("noct");
  if (dom && noct) return "dom_nocturna";
  if (dom) return "dom_diurna";
  if (noct) return "nocturna";
  return "diurna";
}

/** Detecta si el contenido corresponde al formato real de eventos de horas extra. */
export function isOvertimeEventsCsv(content: string): boolean {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const h = stripAccents(firstLine).toLowerCase();
  return (
    h.includes("identificacion") &&
    h.includes("concepto") &&
    h.includes("tiempo_h")
  );
}

function toNum(v: unknown): number {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

// Posiciones estables en el export (28 columnas).
const COL = {
  nombre: 0,
  identificacion: 1,
  ceco: 2,
  direccion: 3,
  concepto: 9,
  tiempoH: 12,
  idFecha: 19,
  jefe: 21,
  division: 24,
} as const;

/** Área = texto tras el primer guion del centro de costo (CeCo). */
export function areaFromCeco(ceco: string): string {
  const s = String(ceco ?? "").trim();
  const dash = s.indexOf("-");
  return (dash >= 0 ? s.slice(dash + 1) : s).trim();
}

function parseIdFecha(v: string): CivilDate | null {
  const s = String(v ?? "").trim();
  if (!/^\d{8}$/.test(s)) return null;
  const c = { y: Number(s.slice(0, 4)), m: Number(s.slice(4, 6)), d: Number(s.slice(6, 8)) };
  const back = new Date(Date.UTC(c.y, c.m - 1, c.d));
  return back.getUTCMonth() + 1 === c.m && back.getUTCDate() === c.d ? c : null;
}

/**
 * Parsea el export real de horas extra y agrega por empleado y TRAMO (semana
 * ISO dentro del mes calendario), con el desglose por recargo. Cada evento va
 * al tramo de su fecha, así que una semana que cruza de mes se parte exacta.
 */
export function parseOvertimeEventsCsv(content: string): {
  rows: OvertimeWeekly[];
  errors: string[];
} {
  const errors: string[] = [];
  const result = Papa.parse<string[]>(content, {
    header: false,
    delimiter: ";",
    skipEmptyLines: true,
  });

  const data = result.data.slice(1); // saltar encabezado
  const map = new Map<string, OvertimeWeekly>();

  data.forEach((cols, i) => {
    if (!Array.isArray(cols) || cols.length < 20) return;
    const code = String(cols[COL.identificacion] ?? "").trim();
    if (!code) return;
    const date = parseIdFecha(cols[COL.idFecha]);
    if (!date) {
      errors.push(`Fila ${i + 2}: fecha inválida (${cols[COL.idFecha]}).`);
      return;
    }
    const hours = toNum(cols[COL.tiempoH]);
    if (hours <= 0) return;

    const seg = segmentOfDate(date);
    const { year, month, week } = seg;
    const day = isoDate(date);
    const key = `${code}|${year}|${month}|${week}`;
    let rec = map.get(key);
    if (!rec) {
      const ceco = String(cols[COL.ceco] ?? "").trim();
      rec = {
        code,
        name: String(cols[COL.nombre] ?? "").trim() || undefined,
        area: areaFromCeco(ceco) || undefined,
        direccion: String(cols[COL.direccion] ?? "").trim() || undefined,
        costCenter: ceco || undefined,
        plant: String(cols[COL.division] ?? "").trim() || undefined,
        managerName: String(cols[COL.jefe] ?? "").trim() || undefined,
        year,
        month,
        week,
        lastDate: day,
        overtimeHours: 0,
        byConcepto: { diurna: 0, nocturna: 0, dom_diurna: 0, dom_nocturna: 0 },
      };
      map.set(key, rec);
    }
    if (day > rec.lastDate) rec.lastDate = day;
    rec.overtimeHours = round2Local(rec.overtimeHours + hours);
    const k = classifyConcepto(String(cols[COL.concepto] ?? ""));
    rec.byConcepto[k] = round2Local(rec.byConcepto[k] + hours);
  });

  return { rows: [...map.values()], errors };
}

function round2Local(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
