"use client";

import { useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PendingIcon } from "@/components/StatusBadge";
import { fmtH } from "@/lib/overtime";
import { plural, type UploadResponse } from "./uploadModel";

const MAX_ROWS = 100;

export const EXPECTED_COLUMNS = ["ID", "Rol", "Área", "Horas Totales", "Turno Máximo (opcional)"];

export function MiniStat({
  label,
  value,
  decimals = 0,
  suffix,
  tone = "default",
  icon,
  index = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  tone?: "default" | "pending" | "risk" | "ok";
  icon?: React.ReactNode;
  index?: number;
}) {
  const active = tone !== "default" && value > 0;
  return (
    <div
      className={clsx(
        "reveal relative overflow-hidden rounded-control border p-3 sm:p-4",
        active && tone === "pending" && "border-pending-border bg-pending-soft",
        active && tone === "risk" && "border-risk-border bg-risk-soft",
        active && tone === "ok" && "border-ok-border bg-ok-soft",
        !active && "border-line bg-surface-2"
      )}
      style={{ "--i": index } as React.CSSProperties}
    >
      <p
        className={clsx(
          "flex items-center gap-1.5 text-caption",
          active && tone === "pending" ? "text-pending" : active && tone === "risk" ? "text-risk" : active && tone === "ok" ? "text-ok" : "text-ink-2"
        )}
      >
        {icon}
        {label}
      </p>
      <p
        className={clsx(
          "mt-1 text-[1.5rem] font-bold leading-tight tabular-nums",
          active && tone === "pending" ? "text-pending" : active && tone === "risk" ? "text-risk" : active && tone === "ok" ? "text-ok" : "text-heading"
        )}
      >
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </p>
    </div>
  );
}

/** Problemas del archivo: 5 a la vista, el resto con «Ver todas». */
export function IssueList({ errors, tone = "risk" }: { errors: string[]; tone?: "risk" | "over" }) {
  const [all, setAll] = useState(false);
  const shown = all ? errors : errors.slice(0, 5);
  return (
    <div>
      <ul className="space-y-1">
        {shown.map((e, i) => (
          <li key={i} className={clsx("flex items-start gap-2", i >= 5 && "animate-fade-in")}>
            <span
              aria-hidden
              className={clsx("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", tone === "risk" ? "bg-risk-solid" : "bg-over-solid")}
            />
            <span>{e}</span>
          </li>
        ))}
      </ul>
      {errors.length > 5 && (
        <button type="button" className="link mt-2 text-small" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? "Ver menos" : `Ver todas (${errors.length})`}
        </button>
      )}
    </div>
  );
}

export function ExpectedColumns({ exampleHref }: { exampleHref?: string }) {
  return (
    <div className="text-small text-ink-2">
      <p className="font-semibold text-ink">Columnas esperadas del archivo semanal</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXPECTED_COLUMNS.map((c) => (
          <code key={c} className="chip font-mono">
            {c}
          </code>
        ))}
      </div>
      <p className="mt-2">
        El archivo de novedades de nómina (una fila por recargo) se reconoce solo y no necesita
        periodo.
      </p>
      {exampleHref && (
        <a href={exampleHref} download className="link mt-2 inline-flex items-center gap-1.5">
          <Icon name="download" className="h-4 w-4" />
          Descargar CSV de ejemplo
        </a>
      )}
    </div>
  );
}

/** Paso 2: lo que se va a escribir, antes de guardar nada. */
export function PreviewStep({
  result,
  demo,
}: {
  result: UploadResponse;
  demo: boolean;
}) {
  const eventos = result.format === "eventos";
  const people = result.preview.length;
  const hours = result.preview.reduce((a, r) => a + (r.overtimeHours || 0), 0);
  const rows = result.preview.slice(0, MAX_ROWS);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <span className="chip-brand">{eventos ? "Archivo de novedades" : "Archivo semanal"}</span>
        {result.range && <span className="chip">Datos {result.range.label}</span>}
        {(result.estimatedSegments ?? 0) > 0 && (
          <span className="chip-info">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            Cruza de mes: reparto por días (estimado)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Personas" value={people} index={0} />
        <MiniStat label="Horas extra" value={hours} decimals={1} suffix="h" index={1} />
        <MiniStat
          label={eventos ? "Congelados (no aplica)" : "Congelados por revisar"}
          value={result.withError}
          tone="pending"
          icon={<PendingIcon className="h-3 w-3" />}
          index={2}
        />
        <MiniStat
          label="Filas con problemas"
          value={result.errors.length}
          tone="risk"
          icon={<Icon name="alert" className="h-3.5 w-3.5" />}
          index={3}
        />
      </div>

      {result.errors.length > 0 && (
        <div className="reveal rounded-control border border-risk-border bg-risk-soft p-4 text-small text-risk" style={{ "--i": 4 } as React.CSSProperties}>
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <Icon name="alert" className="h-4 w-4" />
            {plural(result.errors.length, "fila con problemas", "filas con problemas")} · se omitirán al guardar
          </p>
          <IssueList errors={result.errors} />
        </div>
      )}

      {result.withError > 0 && !eventos && (
        <p className="reveal flex items-start gap-2 rounded-control border border-pending-border bg-pending-soft px-3 py-2 text-small text-pending" style={{ "--i": 5 } as React.CSSProperties}>
          <PendingIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {plural(result.withError, "registro queda congelado", "registros quedan congelados")} por
            turnos de más de 16 horas: no suman al acumulado hasta que se revisen
            {demo ? "." : " en «Registros por revisar»."}
          </span>
        </p>
      )}

      <div className="reveal overflow-hidden rounded-card border border-line" style={{ "--i": 5 } as React.CSSProperties}>
        <div
          className="table-scroll"
          role="region"
          aria-label="Vista previa de la carga"
          tabIndex={0}
        >
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="th">ID</th>
                <th scope="col" className="th">Nombre</th>
                <th scope="col" className="th">Área</th>
                {!eventos && <th scope="col" className="th-num">Total</th>}
                <th scope="col" className="th-num">Extra</th>
                {!eventos && <th scope="col" className="th">Estado</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={`${r.code}-${i}`} className={r.hasError ? "bg-pending-soft" : undefined}>
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-ink-2">{r.code}</td>
                  <td className="px-4 py-2 text-ink">{r.name ?? "—"}</td>
                  <td className="px-4 py-2 text-ink-2">{r.area ?? "—"}</td>
                  {!eventos && <td className="px-4 py-2 text-right tabular-nums">{fmtH(r.totalHours)}</td>}
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-ink">{fmtH(r.overtimeHours)}</td>
                  {!eventos && (
                    <td className="whitespace-nowrap px-4 py-2">
                      {r.hasError ? (
                        <span className="chip-pending" title={r.errorReason}>
                          <PendingIcon className="h-3 w-3" />
                          Por revisar
                        </span>
                      ) : (
                        <span className="chip-ok">
                          <Icon name="check" className="h-3 w-3" />
                          Listo
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.preview.length > MAX_ROWS && (
          <p className="border-t border-line bg-surface-2 px-4 py-2 text-small text-muted">
            Se muestran {MAX_ROWS} de {result.preview.length.toLocaleString("es-CO")} personas; al guardar se
            incluyen todas.
          </p>
        )}
      </div>
    </div>
  );
}

/** El archivo no trae columnas reconocibles: no hay nada que guardar. */
export function UnrecognizedFile({
  errors,
  exampleHref,
  onRetry,
}: {
  errors: string[];
  exampleHref?: string;
  onRetry: () => void;
}) {
  return (
    <div className="animate-fade-up rounded-card border border-l-4 border-over-border border-l-over-solid bg-over-soft p-4 sm:p-5">
      <p className="flex items-center gap-2 text-title text-over">
        <Icon name="alert" className="h-5 w-5" />
        No reconocimos el formato del archivo
      </p>
      <div className="mt-2 text-small text-over">
        {errors.length > 0 ? <IssueList errors={errors} tone="over" /> : <p>El archivo no trae filas con datos.</p>}
      </div>
      <div className="mt-4 rounded-control bg-surface p-3">
        <ExpectedColumns exampleHref={exampleHref} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={onRetry}>
          <Icon name="upload" className="h-4 w-4" />
          Elegir otro archivo
        </button>
      </div>
    </div>
  );
}
