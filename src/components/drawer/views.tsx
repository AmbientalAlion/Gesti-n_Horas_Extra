"use client";

import clsx from "clsx";
import { StatusBadge } from "../StatusBadge";
import { BudgetBar } from "../BudgetBar";
import { RULES } from "@/lib/overtime";
import type { EmployeeStatus, EmployeeWeek } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";
import type { DrawerView, GroupDim, Segment } from "./context";

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
    title: "Críticos",
    desc: "Superaron las 48 horas extra del mes. No se les deben asignar más horas extra en este periodo.",
  },
  yellow: {
    title: "Preventivos",
    desc: "Llegaron a 40 horas extra en el mes o su proyección de cierre pasaría de 48. Revise antes de asignarles más turnos.",
  },
  green: {
    title: "Operación normal",
    desc: "Menos de 40 horas extra en el mes y su proyección cierra dentro del límite.",
  },
  atRisk: {
    title: "En riesgo de excederse",
    desc: "Todavía no pasan de 48h, pero al ritmo actual cerrarían el mes por encima del límite.",
  },
  errors: {
    title: "Registros por revisar",
    desc: "Turnos de más de 16 horas sin marcación de salida. Están congelados y no suman al acumulado hasta que Recursos Humanos los resuelva.",
  },
  weeklyHigh: {
    title: "Semanas por encima de 12h",
    desc: "Es informativo: pasar de 12 horas extra en una semana está permitido. El límite que cuenta es el mensual.",
  },
};

/* ---------------------------------------------------------------- */

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red" | "yellow";
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
        <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", DOT[s.level])} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">
            {s.name ?? s.code}
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
    { level: "yellow", label: "Preventivo", count: members.filter((m) => m.level === "yellow").length },
    { level: "red", label: "Crítico", count: members.filter((m) => m.level === "red").length },
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

export function EmployeeQuickView({
  s,
  weeks,
  push,
}: {
  s: EmployeeStatus;
  weeks: EmployeeWeek[];
  push: (v: DrawerView) => void;
}) {
  const maxWeek = Math.max(RULES.WEEKLY_OVERTIME_LIMIT, ...weeks.map((w) => w.overtime), 1);
  const chips: { dim: GroupDim; value?: string }[] = [
    { dim: "area", value: s.area },
    { dim: "direccion", value: s.direccion },
    { dim: "planta", value: s.plant },
    { dim: "jefe", value: s.managerName },
  ];

  return (
    <div className="space-y-5 motion-safe:animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge level={s.level} />
        <span className="text-[13px] text-slate-600">
          ID {s.code}
          {s.roleTitle ? ` · ${s.roleTitle}` : ""}
        </span>
      </div>

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

      <section className="rounded-xl border border-brand/30 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-brand-dark">
          Horas extra disponibles este mes
        </p>
        <BudgetBar
          used={s.monthlyOvertime}
          limit={RULES.MONTHLY_OVERTIME_LIMIT}
          warning={RULES.MONTHLY_OVERTIME_WARNING}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Extra esta semana"
          value={`${s.weeklyOvertime.toFixed(1)}h${s.weeklyHigh ? " · alta" : ""}`}
        />
        <Stat
          label="Proyección de cierre"
          value={`≈${s.projectedMonthlyOvertime.toFixed(0)}h`}
          tone={s.willExceedMonthly ? "red" : undefined}
        />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-brand-dark">
          ¿Cuándo hizo esas horas?
        </h3>
        {weeks.length === 0 ? (
          <p className="text-sm text-slate-600">Sin registros cargados este mes.</p>
        ) : (
          <ul className="space-y-2">
            {weeks.map((w) => (
              <li key={w.week} className="flex items-center gap-3 text-sm">
                <span className="w-14 shrink-0 text-slate-600">Sem {w.week}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={clsx(
                      "block h-full origin-left rounded-full motion-safe:animate-grow-x",
                      w.hasError ? "bg-amber-400" : "bg-brand"
                    )}
                    style={{ width: `${w.hasError ? 100 : Math.max(3, (w.overtime / maxWeek) * 100)}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums text-slate-800">
                  {w.hasError ? (
                    <span className="text-xs font-medium text-amber-700">congelado</span>
                  ) : (
                    `${w.overtime.toFixed(1)}h`
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Pasar de {RULES.WEEKLY_OVERTIME_LIMIT}h en una semana está permitido; el límite
          que cuenta es el mensual.
        </p>
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
  const risk = members.filter((m) => m.level !== "red" && m.willExceedMonthly).length;
  const consumption = n > 0 ? (total / (n * RULES.MONTHLY_OVERTIME_LIMIT)) * 100 : 0;

  return (
    <div className="space-y-5 motion-safe:animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Personas" value={String(n)} />
        <Stat label="Horas extra del mes" value={`${total.toFixed(0)}h`} />
        <Stat label="Críticos" value={String(red)} tone={red > 0 ? "red" : undefined} />
        <Stat label="En riesgo" value={String(risk)} tone={risk > 0 ? "yellow" : undefined} />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-brand-dark">Estado del grupo</h3>
        <Distribution members={members} />
        <p className="mt-2 text-xs text-slate-600">
          Consumo del límite legal del grupo ≈ {consumption.toFixed(0)}% · promedio{" "}
          {n > 0 ? (total / n).toFixed(1) : "0"}h por persona
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
                value={`${m.monthlyOvertime.toFixed(1)}h`}
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
    segment === "atRisk"
      ? `≈${m.projectedMonthlyOvertime.toFixed(0)}h`
      : segment === "weeklyHigh"
        ? `${m.weeklyOvertime.toFixed(1)}h/sem`
        : `${m.monthlyOvertime.toFixed(1)}h`;

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
