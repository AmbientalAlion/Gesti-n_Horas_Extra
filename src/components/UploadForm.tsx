"use client";

import { useCallback, useId, useMemo, useState } from "react";
import clsx from "clsx";
import {
  formatWeekLabel,
  isoDate,
  parseIsoDate,
  todayInPlant,
  weekInfo,
} from "@/lib/dates";

interface PreviewRow {
  code: string;
  name?: string;
  area?: string;
  totalHours: number;
  overtimeHours: number;
  hasError: boolean;
  errorReason?: string;
}

interface UploadResponse {
  processed: number;
  withError: number;
  persisted: boolean;
  demo: boolean;
  format?: "eventos" | "legacy";
  errors: string[];
  preview: PreviewRow[];
  range?: { from: string; to: string; label: string };
  estimatedSegments?: number;
  skippedReviewed?: number;
  error?: string;
}

const fmt = (n: number) => `${n.toFixed(1).replace(".", ",")}h`;

export function UploadForm({ demo = false }: { demo?: boolean }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  // Cualquier día de la semana del archivo (formato semanal).
  const [weekDay, setWeekDay] = useState(isoDate(todayInPlant()));
  const [cutType, setCutType] = useState<"parcial" | "final">("final");
  const [until, setUntil] = useState(isoDate(todayInPlant()));
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const week = useMemo(() => {
    const c = parseIsoDate(weekDay);
    if (!c) return null;
    const w = weekInfo(c);
    return { isoYear: w.year, week: w.week, label: formatWeekLabel(w.year, w.week) };
  }, [weekDay]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  async function submit() {
    if (!file) {
      setError("Seleccione un archivo CSV.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (week) {
        fd.append("year", String(week.isoYear));
        fd.append("week", String(week.week));
      }
      fd.append("cutType", cutType);
      if (cutType === "parcial") fd.append("until", until);
      if (demo) fd.append("demo", "true");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: UploadResponse = await res.json();
      if (!res.ok) setError(data.error ?? "No se pudo procesar el archivo.");
      else setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* La zona es la etiqueta del campo: se abre con clic, Enter o Espacio. */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30",
          dragging ? "border-brand bg-brand/5" : "border-slate-300 bg-white hover:border-brand/60"
        )}
      >
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-sm font-medium text-slate-700">
          {file ? file.name : "Arrastre aquí el archivo del biométrico"}
        </span>
        <span className="mt-1 text-xs text-slate-500">o pulse para seleccionarlo</span>
      </label>

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-brand-dark">
          Solo para el archivo semanal (ID, Rol, Área, Horas Totales)
        </legend>
        <p className="mb-3 text-xs text-slate-600">
          El archivo de novedades trae la fecha de cada evento y no necesita estos datos.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Un día de la semana del archivo</span>
            <input
              type="date"
              value={weekDay}
              onChange={(e) => setWeekDay(e.target.value)}
              className="w-full rounded-lg border border-slate-400 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-slate-600">
              {week ? `Semana del ${week.label}` : "Fecha no válida"}
            </span>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Tipo de corte</span>
            <select
              value={cutType}
              onChange={(e) => setCutType(e.target.value as "parcial" | "final")}
              className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2"
            >
              <option value="final">Semana completa</option>
              <option value="parcial">Corte parcial</option>
            </select>
          </label>
          {cutType === "parcial" && (
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Datos hasta el día</span>
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="w-full rounded-lg border border-slate-400 px-3 py-2"
              />
            </label>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Si la semana cruza de mes, sus horas se reparten por días entre los dos meses y
          quedan marcadas como «estimado».
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Procesando…" : demo ? "Validar archivo" : "Procesar y guardar"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-status-red">
          {error}
        </p>
      </div>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: UploadResponse }) {
  const eventos = result.format === "eventos";
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {result.processed} registros procesados
        </span>
        {result.range && (
          <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">
            Datos {result.range.label}
          </span>
        )}
        {eventos ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            Formato de novedades: no trae turnos, no se revisan horas huérfanas
          </span>
        ) : (
          <span
            className={clsx(
              "rounded-full px-3 py-1",
              result.withError > 0 ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"
            )}
          >
            {result.withError} congelado{result.withError === 1 ? "" : "s"} por horas huérfanas
          </span>
        )}
        {(result.estimatedSegments ?? 0) > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
            Semana que cruza de mes: horas repartidas por días (estimado)
          </span>
        )}
        {(result.skippedReviewed ?? 0) > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {result.skippedReviewed} registro{result.skippedReviewed === 1 ? "" : "s"} ya revisado
            {result.skippedReviewed === 1 ? "" : "s"}: no se modificaron
          </span>
        )}
        <span
          className={clsx(
            "rounded-full px-3 py-1",
            result.persisted ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"
          )}
        >
          {result.persisted
            ? "Guardado"
            : result.demo
              ? "Solo validación (demostración)"
              : "No guardado"}
        </span>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Filas con problemas ({result.errors.length}):</p>
          <ul className="mt-1 list-inside list-disc">
            {result.errors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {result.errors.length > 10 && <li>… y {result.errors.length - 10} más</li>}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">ID</th>
              <th scope="col" className="px-4 py-2 font-medium">Nombre</th>
              <th scope="col" className="px-4 py-2 font-medium">Área</th>
              {!eventos && <th scope="col" className="px-4 py-2 text-right font-medium">Total</th>}
              <th scope="col" className="px-4 py-2 text-right font-medium">Extra</th>
              {!eventos && <th scope="col" className="px-4 py-2 font-medium">Estado</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.preview.map((r, i) => (
              <tr key={i} className={r.hasError ? "bg-violet-50" : ""}>
                <td className="px-4 py-2">{r.code}</td>
                <td className="px-4 py-2">{r.name ?? "—"}</td>
                <td className="px-4 py-2">{r.area ?? "—"}</td>
                {!eventos && <td className="px-4 py-2 text-right tabular-nums">{fmt(r.totalHours)}</td>}
                <td className="px-4 py-2 text-right tabular-nums">{fmt(r.overtimeHours)}</td>
                {!eventos && (
                  <td className="px-4 py-2">
                    {r.hasError ? (
                      <span className="text-xs font-medium text-violet-700" title={r.errorReason}>
                        Congelado · por revisar
                      </span>
                    ) : (
                      <span className="text-xs text-green-700">OK</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
