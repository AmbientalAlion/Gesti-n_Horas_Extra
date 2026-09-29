"use client";

import clsx from "clsx";
import { LEVEL_LABELS, LevelIcon, PendingIcon, StatusBadge } from "../StatusBadge";
import { CumulativeChart } from "../charts/CumulativeChart";
import { fmtH, RULES } from "@/lib/overtime";
import type { EmployeeStatus, SegmentPoint } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";
import type { DrawerView, GroupDim, Segment } from "./context";

const TEXT: Record<SemaphoreLevel, string> = {
  green: "text-status-green",
  yellow: "text-status-yellow",
  red: "text-status-red",
};

const LEVEL_LABEL = LEVEL_LABELS;

const DOT: Record<SemaphoreLevel, string> = {
  green: "bg-status-green",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
};

/** Parámetro de URL y dependientes a limpiar para cada dimensión. */
export const DIM_FILTER: Record<GroupDim, { param: string; clear: string[]; label: string }> = {
  area: { param: "area", clear: ["ceco"], label: "Área" },
  planta: { param: "planta", clear: ["direccion", "area", "ceco", "jefe"], label: "Planta" },
  direccion: { param: "direccion", clear: ["area", "ceco", "jefe"], label: "Dirección" },
  jefe: { param: "jefe", clear: [], label: "Jefe" },
};

export const groupView = (dim: GroupDim, label: string): DrawerView => ({
  kind: "group",
  dim,
  label,
  param: DIM_FILTER[dim].param,
  clear: DIM_FILTER[dim].clear,
});

export const SEGMENT_TEXT: Record<Segment, { title: string; desc: string }> = {
  all: {
    title: "Todas las personas de la vista",
    desc: "Ordenadas de mayor a menor por horas extra del mes. Toque una persona para ver su detalle.",
  },
  red: {
    title: "Excedieron 48h",
    desc: "Superaron las 48 horas extra del mes, el límite que no puede pasarse.",
  },
  yellow: {
    title: "En riesgo",
    desc: "Su acumulado va por encima de la meta a la fecha (12h por semana, proporcional en semanas parciales), o a su ritmo cerrarían el mes por encima de 48h.",
  },
  green: {
    title: "Normal",
    desc: "Van dentro de la meta a la fecha y su proyección cierra en 48h o menos.",
  },
  errors: {
    title: "Registros por revisar",
    desc: "Turnos de más de 16 horas sin marcación de salida. Están congelados y no suman al acumulado hasta que Recursos Humanos los resuelva.",
  },
  weeklyHigh: {
    title: "Semanas de más de 12h",
    desc: "Personas con al menos una semana de más de 12 horas extra este mes. Es informativo: está permitido. El límite que cuenta es el mensual.",
  },
};

/* ---------------------------------------------------------------- */

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "red" | "yellow";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs leading-snug text-slate-600">{label}</p>
      <p
        className={clsx(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tone === "red"
            ? "text-status-red"
            : tone === "yellow"
              ? "text-status-yellow"
              : "text-brand-dark"
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

/** Fila de persona dentro del panel (abre su detalle). */
export function PersonRow({
  s,
  value,
  onClick,
  showArea = true,
}: {
  s: EmployeeStatus;
  value: string;
  onClick: () => void;
  showArea?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-brand-tint"
      >
        <LevelIcon level={s.level} className={TEXT[s.level]} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-slate-900">
              {s.name ?? s.code}
            </span>
            <span className="sr-only">({LEVEL_LABEL[s.level]})</span>
            {s.hasError && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-violet-700"
                title="Tiene registros congelados por revisar"
              >
                <PendingIcon className="h-2.5 w-2.5" />
                por revisar
              </span>
            )}
          </span>
          {showArea && (
            <span className="block truncate text-xs text-slate-600">
              {[s.area, s.managerName].filter(Boolean).join(" · ") || "—"}
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-dark">
          {value}
        </span>
        <span
          className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          ›
        </span>
      </button>
    </li>
  );
}

/** Barra apilada verde/naranja/rojo con la distribución del semáforo. */
function Distribution({ members }: { members: EmployeeStatus[] }) {
  const n = members.length || 1;
  const parts: { level: SemaphoreLevel; label: string; count: number }[] = [
    { level: "green", label: "Normal", count: members.filter((m) => m.level === "green").length },
    { level: "yellow", label: "En riesgo", count: members.filter((m) => m.level === "yellow").length },
    { level: "red", label: "Excedido", count: members.filter((m) => m.level === "red").length },
  ];
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {parts.map((p) =>
          p.count > 0 ? (
            <div
              key={p.level}
              className={clsx("h-full origin-left motion-safe:animate-grow-x", DOT[p.level])}
              style={{ width: `${(p.count / n) * 100}%` }}
              title={`${p.label}: ${p.count}`}
            />
          ) : null
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {parts.map((p) => (
          <li key={p.level} className="flex items-center gap-1.5">
            <span className={clsx("h-2 w-2 rounded-full", DOT[p.level])} aria-hidden />
            {p.label}: <strong className="tabular-nums text-slate-800">{p.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Datos del mes que necesita el gráfico del panel. */
export interface DrawerPeriod {
  daysInMonth: number;
  cutoffDay: number;
  /** «Junio 2026». */
  monthLabel: string;
  /** «21 de junio», o null sin datos. */
  cutoffLabel: string | null;
  closed: boolean;
}

/** Frase del estado de una persona. */
export function statusLine(s: EmployeeStatus, p: DrawerPeriod): string {
  const at = p.cutoffLabel ? ` al ${p.cutoffLabel}` : "";
  if (s.level === "red") return `Superó el límite de ${RULES.MONTHLY_OVERTIME_LIMIT}h: lleva ${fmtH(s.monthlyOvertime)}`;
  if (s.risk === "meta") return `${fmtH(s.overTarget)} por encima de la meta${at}`;
  if (s.risk === "proyeccion") return `Dentro de la meta, pero a este ritmo cerraría en ${fmtH(s.projectedMonthlyOvertime)}`;
  return p.closed ? "Cerró el mes dentro del límite" : `Dentro de la meta${at}`;
}

export function EmployeeQuickView({
  s,
  segments,
  period,
  push,
}: {
  s: EmployeeStatus;
  segments: SegmentPoint[];
  period: DrawerPeriod;
  push: (v: DrawerView) => void;
}) {
  const chips: { dim: GroupDim; value?: string }[] = [
    { dim: "area", value: s.area },
    { dim: "direccion", value: s.direccion },
    { dim: "planta", value: s.plant },
    { dim: "jefe", value: s.managerName },
  ];
  const withData = segments.filter((x) => !x.future);

  return (
    <div className="space-y-5 motion-safe:animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge level={s.level} pending={s.pendingReviewCount} />
        <span className="text-[13px] text-slate-600">
          ID {s.code}
          {s.roleTitle ? ` · ${s.roleTitle}` : ""}
        </span>
      </div>
      <p className={clsx("text-sm font-medium", TEXT[s.level])}>{statusLine(s, period)}</p>

      {/* Contexto organizacional: cada dato abre su grupo. */}
      <div className="flex flex-wrap gap-2">
        {chips
          .filter((c) => c.value)
          .map((c) => (
            <button
              key={c.dim}
              type="button"
              onClick={() => push(groupView(c.dim, c.value!))}
              className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full bg-brand-tint px-3 py-1 text-xs text-brand-dark transition hover:bg-brand/20"
              title={`Ver a todas las personas de ${c.value}`}
            >
              <span className="text-slate-600">{DIM_FILTER[c.dim].label}:</span>
              <strong className="truncate font-semibold">{c.value}</strong>
            </button>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={`Acumulado${period.cutoffLabel ? ` al ${period.cutoffLabel}` : ""}`}
          value={fmtH(s.monthlyOvertime)}
          hint={`Meta a esa fecha: ${fmtH(s.target)}`}
          tone={s.level === "red" ? "red" : s.risk === "meta" ? "yellow" : undefined}
        />
        <Stat
          label={period.closed ? "Cierre del mes" : "Proyección de cierre"}
          value={`${period.closed ? "" : "≈"}${fmtH(s.projectedMonthlyOvertime)}`}
          hint={period.closed ? undefined : s.projectionReliable ? "a su ritmo diario" : "pocos datos: no decide"}
          tone={!period.closed && s.willExceedMonthly ? "yellow" : undefined}
        />
      </div>

      {s.pendingReviewCount > 0 && (
        <p className="rounded-md bg-violet-50 px-2 py-1.5 text-xs text-violet-800">
          Con {s.pendingReviewCount} registro{s.pendingReviewCount > 1 ? "s" : ""} por
          revisar, el mes quedaría entre {fmtH(s.monthlyOvertime)} y{" "}
          {fmtH(s.potentialMonthlyOvertime)} según se resuelva
          {s.pendingReviewCount > 1 ? "n" : ""}.
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="mb-1 text-sm font-semibold text-brand-dark">Acumulado frente a la meta</h3>
        <CumulativeChart
          segments={segments}
          daysInMonth={period.daysInMonth}
          cutoffDay={period.cutoffDay}
          monthLabel={period.monthLabel}
        />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-brand-dark">¿Cuándo hizo esas horas?</h3>
        {withData.length === 0 ? (
          <p className="text-sm text-slate-600">Sin datos cargados este mes.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {withData.map((w) => (
              <li key={w.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="min-w-[6.5rem] text-slate-700">{w.short}</span>
                {w.pending ? (
                  <span className="rounded-md border border-dashed border-violet-300 bg-violet-50 px-2 py-0.5 text-xs text-violet-800">
                    congelado{w.grossHours ? ` · ${w.grossHours.toFixed(0)}h brutas` : ""} sin validar
                  </span>
                ) : w.discarded && w.hours === 0 ? (
                  <span className="rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-600">
                    descartado · no suma
                  </span>
                ) : (
                  <span className="font-semibold tabular-nums text-slate-800">{fmtH(w.hours)}</span>
                )}
                <span className="text-xs text-slate-500">meta {fmtH(w.segmentTarget)}</span>
                {w.weekHigh && (
                  <span
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
                    title={w.weekShared ? "Semana completa, compartida con otro mes" : undefined}
                  >
                    Semana &gt; {RULES.WEEKLY_OVERTIME_LIMIT}h ({fmtH(w.weekHours)})
                  </span>
                )}
                {w.estimated && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">estimado</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {s.reasons.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-brand-dark">
            Por qué está en este estado
          </h3>
          <ul className="space-y-1.5">
            {s.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700">
                <span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT[s.level])} aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function GroupQuickView({
  dim,
  members,
  push,
}: {
  dim: GroupDim;
  members: EmployeeStatus[];
  push: (v: DrawerView) => void;
}) {
  const total = members.reduce((a, m) => a + m.monthlyOvertime, 0);
  const n = members.length;
  const red = members.filter((m) => m.level === "red").length;
  const risk = members.filter((m) => m.level === "yellow").length;

  return (
    <div className="space-y-5 motion-safe:animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Personas" value={String(n)} />
        <Stat label="Horas extra del mes" value={fmtH(total)} />
        <Stat label="Excedieron 48h" value={String(red)} tone={red > 0 ? "red" : undefined} />
        <Stat label="En riesgo" value={String(risk)} tone={risk > 0 ? "yellow" : undefined} />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-brand-dark">Estado del grupo</h3>
        <Distribution members={members} />
        <p className="mt-2 text-xs text-slate-600">
          Promedio {fmtH(n > 0 ? total / n : 0)} por persona
        </p>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-brand-dark">
          Personas ({n})
        </h3>
        {n === 0 ? (
          <p className="text-sm text-slate-600">Sin personas en este grupo.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-slate-100">
            {members.map((m) => (
              <PersonRow
                key={m.id}
                s={m}
                value={fmtH(m.monthlyOvertime)}
                showArea={dim !== "area"}
                onClick={() => push({ kind: "employee", id: m.id })}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function SegmentQuickView({
  segment,
  members,
  push,
}: {
  segment: Segment;
  members: EmployeeStatus[];
  push: (v: DrawerView) => void;
}) {
  const valueOf = (m: EmployeeStatus) =>
    segment === "yellow"
      ? m.risk === "meta"
        ? `+${fmtH(m.overTarget)} meta`
        : `≈${fmtH(m.projectedMonthlyOvertime)} cierre`
      : segment === "weeklyHigh"
        ? `${m.highWeeksMonth} sem. >${RULES.WEEKLY_OVERTIME_LIMIT}h`
        : fmtH(m.monthlyOvertime);

  return (
    <div className="space-y-4 motion-safe:animate-fade-in">
      <p className="text-sm leading-relaxed text-slate-600">{SEGMENT_TEXT[segment].desc}</p>
      {members.length === 0 ? (
        <div className="rounded-lg border border-slate-200 p-4 text-center">
          <p className="text-sm font-medium text-brand-dark">Nadie en esta lista</p>
          <p className="mt-1 text-sm text-slate-600">
            Con los filtros actuales no hay personas en esta condición.
          </p>
        </div>
      ) : (
        <ul className="-mx-2 divide-y divide-slate-100">
          {members.map((m) => (
            <PersonRow
              key={m.id}
              s={m}
              value={valueOf(m)}
              onClick={() => push({ kind: "employee", id: m.id })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
