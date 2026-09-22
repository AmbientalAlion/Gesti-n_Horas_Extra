"use client";

import { useCallback, useRef, useState } from "react";
import clsx from "clsx";

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
  errors: string[];
  preview: PreviewRow[];
  error?: string;
}

function defaultPeriod() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: now.getFullYear(), month: now.getMonth() + 1, week };
}

export function UploadForm() {
  const p = defaultPeriod();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(p.year);
  const [week, setWeek] = useState(p.week);
  const [month, setMonth] = useState(p.month);
  const [cutType, setCutType] = useState<"parcial" | "final">("final");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  async function submit() {
    if (!file) {
      setError("Selecciona un archivo CSV.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("year", String(year));
      fd.append("week", String(week));
      fd.append("month", String(month));
      fd.append("cutType", cutType);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: UploadResponse = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al procesar el archivo.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition",
          dragging
            ? "border-brand bg-brand/5"
            : "border-slate-300 bg-white hover:border-brand/60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-sm font-medium text-slate-700">
          {file ? file.name : "Arrastra el CSV biométrico aquí"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          o haz clic para seleccionar un archivo
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Año</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Mes</span>
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Semana (ISO)</span>
          <input
            type="number"
            min={1}
            max={53}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Tipo de corte</span>
          <select
            value={cutType}
            onChange={(e) => setCutType(e.target.value as "parcial" | "final")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="final">Final (lunes)</option>
            <option value="parcial">Parcial (mitad de semana)</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Procesando…" : "Procesar y validar"}
        </button>
        {error && <span className="text-sm text-status-red">{error}</span>}
      </div>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: UploadResponse }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {result.processed} registros procesados
        </span>
        <span
          className={clsx(
            "rounded-full px-3 py-1",
            result.withError > 0 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
          )}
        >
          {result.withError} con error (horas huérfanas)
        </span>
        <span
          className={clsx(
            "rounded-full px-3 py-1",
            result.persisted ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
          )}
        >
          {result.persisted
            ? "Guardado en base de datos"
            : result.demo
              ? "Solo validación (modo demo)"
              : "No persistido"}
        </span>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Advertencias del archivo:</p>
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
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Área</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 text-right font-medium">Extra</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.preview.map((r, i) => (
              <tr key={i} className={r.hasError ? "bg-amber-50" : ""}>
                <td className="px-4 py-2">{r.code}</td>
                <td className="px-4 py-2">{r.name ?? "—"}</td>
                <td className="px-4 py-2">{r.area ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.totalHours.toFixed(1)}h</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.overtimeHours.toFixed(1)}h</td>
                <td className="px-4 py-2">
                  {r.hasError ? (
                    <span className="text-xs text-amber-700" title={r.errorReason}>
                      ⚠ Congelado
                    </span>
                  ) : (
                    <span className="text-xs text-green-700">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
