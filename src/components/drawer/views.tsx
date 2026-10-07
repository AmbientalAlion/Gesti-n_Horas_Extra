"use client";

import clsx from "clsx";
import {
  LEVEL_LABELS,
  LEVEL_SOLID,
  LEVEL_TEXT,
  LevelIcon,
  PendingIcon,
  StatusBadge,
} from "../StatusBadge";
import { CumulativeChart } from "../charts/CumulativeChart";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Icon } from "../ui/Icon";
import { fmtH, RULES } from "@/lib/overtime";
import type { EmployeeStatus, SegmentPoint } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";
import type { DrawerView, GroupDim, Segment } from "./context";

const TEXT = LEVEL_TEXT;
const LEVEL_LABEL = LEVEL_LABELS;

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

/** Color del acumulado frente a la meta a esa fecha y al límite del mes. */
function accCls(acc: number, target: number): string {
  if (acc > RULES.MONTHLY_OVERTIME_LIMIT) return "font-semibold text-over";
  if (Math.round(acc * 10) > Math.round(target * 10)) return "font-semibold text-risk";
  return "text-ink-2";
}

/* ---------------------------------------------------------------- */

type StatTone = SemaphoreLevel | "pending";

const STAT_BAR: Record<StatTone, string> = {
  green: "bg-ok-solid",
  yellow: "bg-risk-solid",
  red: "bg-over-solid",
  pending: "bg-pending-solid",
};
const STAT_TEXT: Record<StatTone, string> = {
  green: "text-ok",
  yellow: "text-risk",
  red: "text-over",
  pending: "text-pending",
};

/** Cifra del panel: cuenta hasta su valor y lleva la barra del estado arriba. */
function Stat({
  label,
  value,
  decimals = 1,
  suffix = "h",
  prefix = "",
  tone,
  hint,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  /** Solo cuando la cifra es una alerta (si no, va en tinta normal). */
  tone?: StatTone;
  hint?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-control border border-line bg-surface p-3">
      {tone && (
        <span aria-hidden className={clsx("print-exact absolute inset-x-0 top-0 h-[3px]", STAT_BAR[tone])} />
      )}
      <p className="flex items-center gap-1.5 text-caption text-ink-2">
        {tone && tone !== "pending" && <LevelIcon level={tone} className={STAT_TEXT[tone]} />}
        {tone === "pending" && <PendingIcon className="text-pending" />}
        {label}
      </p>
      <p className={clsx("mt-1 text-[1.375rem] font-bold leading-tight tabular-nums", tone ? STAT_TEXT[tone] : "text-heading")}>
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} prefix={prefix} />
      </p>
      {hint && <p className="mt-0.5 text-caption font-normal text-muted">{hint}</p>}
    </div>
  );
}

/** Fila de persona dentro del panel (abre su detalle). */
export function PersonRow({
  s,
  value,
  detail,
  onClick,
  showArea = true,
  index = 0,
}: {
  s: EmployeeStatus;
  value: string;
  /** Segunda línea a la derecha, p. ej. «lleva 38,0h». */
  detail?: string;
  onClick: () => void;
  showArea?: boolean;
  /** Posición en la lista, para el escalonado de entrada (máx. 150ms). */
  index?: number;
}) {
  return (
    <li className="reveal" style={{ "--i": Math.min(index, 5) } as React.CSSProperties}>
      <button
        type="button"
        onClick={onClick}
        data-drawer-key={`emp:${s.id}`}
        className="group flex min-h-14 w-full items-center gap-3 rounded-control px-2 py-2.5 text-left transition-colors duration-fast hover:bg-primary-soft active:bg-primary-soft"
      >
        <LevelIcon level={s.level} className={clsx("h-3 w-3", TEXT[s.level])} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-ui text-ink">{s.name ?? s.code}</span>
            <span className="sr-only">({LEVEL_LABEL[s.level]})</span>
            {s.hasError && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 text-caption font-semibold text-pending"
                title="Tiene registros congelados por revisar"
              >
                <PendingIcon className="h-2.5 w-2.5" />
                por revisar
              </span>
            )}
          </span>
          {showArea && (
            <span className="block truncate text-caption font-normal text-ink-2">
              {[s.area, s.managerName].filter(Boolean).join(" · ") || "—"}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className={clsx("block text-ui tabular-nums", s.level === "green" ? "text-heading" : TEXT[s.level])}>
            {value}
          </span>
          {detail && <span className="block text-caption font-normal tabular-nums text-muted">{detail}</span>}
        </span>
        <Icon
          name="chevron-right"
          className="h-4 w-4 shrink-0 text-muted transition-transform duration-fast ease-enter group-hover:translate-x-0.5"
        />
      </button>
    </li>
  );
}

/** Barra apilada verde/naranja/rojo con la distribución del semáforo. */
function Distribution({ members }: { members: EmployeeStatus[] }) {
  const n = members.length || 1;
  const parts: { level: SemaphoreLevel; count: number }[] = (["green", "yellow", "red"] as const).map(
    (level) => ({ level, count: members.filter((m) => m.level === level).length })
  );
  return (
    <div>
      <div
        className="print-exact flex h-3 w-full overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={parts.map((p) => `${LEVEL_LABEL[p.level]}: ${p.count}`).join(", ")}
      >
        {/* El contenedor redondeado recorta; el que crece es el interior. */}
        <div className="flex h-full w-full origin-left motion-safe:animate-grow-x">
          {parts.map((p) =>
            p.count > 0 ? (
              <div
                key={p.level}
                className={clsx(
                  "print-exact h-full transition-[width] duration-slow ease-move [&+&]:border-l-2 [&+&]:border-surface",
                  LEVEL_SOLID[p.level]
                )}
                style={{ width: `${(p.count / n) * 100}%` }}
                title={`${LEVEL_LABEL[p.level]}: ${p.count}`}
              />
            ) : null
          )}
        </div>
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-2">
        {parts.map((p) => (
          <li key={p.level} className="flex items-center gap-1.5">
            <LevelIcon level={p.level} className={TEXT[p.level]} />
            {LEVEL_LABEL[p.level]}: <strong className="tabular-nums text-ink">{p.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lista vacía con una ilustración sencilla (figuras de marca). */
function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line px-4 py-6 text-center">
      <svg viewBox="0 0 96 64" className="h-14 w-20 text-brand dark:text-brand-300" aria-hidden focusable="false">
        <circle cx="34" cy="34" r="22" fill="currentColor" opacity="0.12" />
        <path d="M62 14 84 52H40Z" fill="currentColor" opacity="0.18" />
        <circle cx="46" cy="30" r="11" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="m54 38 9 9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <p className="mt-2 text-ui font-semibold text-heading">{title}</p>
      <p className="mt-1 max-w-[36ch] text-small text-ink-2">{text}</p>
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
  const accTone: StatTone | undefined =
    s.level === "red" ? "red" : s.risk === "meta" ? "yellow" : undefined;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge level={s.level} pending={s.pendingReviewCount} />
          <span className="text-small text-ink-2">
            ID {s.code}
            {s.roleTitle ? ` · ${s.roleTitle}` : ""}
          </span>
        </div>
        <p className={clsx("text-ui", TEXT[s.level])}>{statusLine(s, period)}</p>
      </div>

      {/* Contexto organizacional: cada dato abre su grupo. */}
      <div className="flex flex-wrap gap-2">
        {chips
          .filter((c) => c.value)
          .map((c) => (
            <button
              key={c.dim}
              type="button"
              data-drawer-key={`grp:${c.dim}`}
              onClick={() => push(groupView(c.dim, c.value!))}
              className="chip-brand chip-interactive group"
              title={`Ver a todas las personas de ${c.value}`}
            >
              <span className="text-ink-2">{DIM_FILTER[c.dim].label}:</span>
              <strong className="min-w-0 truncate font-semibold">{c.value}</strong>
              <Icon
                name="chevron-right"
                className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-fast group-hover:translate-x-0.5"
              />
            </button>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={`Acumulado${period.cutoffLabel ? ` al ${period.cutoffLabel}` : ""}`}
          value={s.monthlyOvertime}
          hint={`Meta a esa fecha: ${fmtH(s.target)}`}
          tone={accTone}
        />
        <Stat
          label={period.closed ? "Cierre del mes" : "Proyección de cierre"}
          value={s.projectedMonthlyOvertime}
          prefix={period.closed ? "" : "≈"}
          hint={period.closed ? undefined : s.projectionReliable ? "a su ritmo diario" : "pocos datos: no decide"}
          tone={!period.closed && s.willExceedMonthly ? "yellow" : undefined}
        />
      </div>

      {s.pendingReviewCount > 0 && (
        <p className="flex items-start gap-2 rounded-control border border-pending-border bg-pending-soft px-3 py-2 text-small text-pending">
          <PendingIcon className="mt-0.5 h-3.5 w-3.5" />
          <span>
            Con {s.pendingReviewCount} registro{s.pendingReviewCount > 1 ? "s" : ""} por
            revisar, el mes quedaría entre {fmtH(s.monthlyOvertime)} y{" "}
            {fmtH(s.potentialMonthlyOvertime)} según se resuelva
            {s.pendingReviewCount > 1 ? "n" : ""}.
          </span>
        </p>
      )}

      {s.reasons.length > 0 && (
        <section aria-labelledby={`motivos-${s.id}`}>
          <h3 id={`motivos-${s.id}`} className="mb-1.5 text-ui font-semibold text-heading">
            Por qué está en este estado
          </h3>
          <ul className="space-y-1.5">
            {s.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-small leading-snug text-ink-2">
                <LevelIcon level={s.level} className={clsx("mt-1", TEXT[s.level])} />
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-card border border-line bg-surface p-3">
        <h3 className="mb-1 text-ui font-semibold text-heading">Acumulado frente a la meta</h3>
        <CumulativeChart
          segments={segments}
          daysInMonth={period.daysInMonth}
          cutoffDay={period.cutoffDay}
          monthLabel={period.monthLabel}
        />
      </section>

      <section>
        <h3 className="mb-1 text-ui font-semibold text-heading">¿Cuándo hizo esas horas?</h3>
        {withData.length === 0 ? (
          <p className="text-small text-ink-2">Sin datos cargados este mes.</p>
        ) : (
          <ul className="divide-y divide-line">
            {withData.map((w) => (
              <li key={w.key} className="py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-ui text-ink">{w.short}</span>
                  {w.pending ? (
                    <span className="chip-pending border-dashed">
                      <PendingIcon />
                      congelado{w.grossHours ? ` · ${w.grossHours.toFixed(0)}h brutas` : ""} sin validar
                    </span>
                  ) : w.discarded && w.hours === 0 ? (
                    <span className="chip border-dashed">descartado · no suma</span>
                  ) : (
                    <span className="text-small text-ink-2">
                      <strong className="text-ui tabular-nums text-ink">{fmtH(w.hours)}</strong> en el tramo
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-caption font-normal tabular-nums text-muted">
                  acumulado <span className={accCls(w.cumulative, w.target)}>{fmtH(w.cumulative)}</span>
                  {" · "}meta a la fecha {fmtH(w.target)}
                </p>
                {(w.weekHigh || w.estimated) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {w.weekHigh && (
                      <span
                        className="chip-info"
                        title={`Informativa: no cambia el estado${w.weekShared ? ". Semana completa, compartida con otro mes" : ""}`}
                      >
                        <Icon name="info" className="h-3 w-3" />
                        Semana &gt; {RULES.WEEKLY_OVERTIME_LIMIT}h ({fmtH(w.weekHours)})
                      </span>
                    )}
                    {w.estimated && (
                      <span className="chip" title="Semana que cruza de mes sin detalle por día: horas repartidas por días">
                        estimado
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
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
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Personas" value={n} decimals={0} suffix="" />
        <Stat
          label="Horas extra del mes"
          value={total}
          hint={`Promedio ${fmtH(n > 0 ? total / n : 0)} por persona`}
        />
        <Stat label="Excedieron 48h" value={red} decimals={0} suffix="" tone={red > 0 ? "red" : undefined} />
        <Stat label="En riesgo" value={risk} decimals={0} suffix="" tone={risk > 0 ? "yellow" : undefined} />
      </div>

      <section>
        <h3 className="mb-2 text-ui font-semibold text-heading">Estado del grupo</h3>
        <Distribution members={members} />
      </section>

      <section>
        <h3 className="mb-1 text-ui font-semibold text-heading">Personas ({n})</h3>
        {n === 0 ? (
          <EmptyState title="Sin personas en este grupo" text="Con los filtros actuales nadie pertenece a este grupo." />
        ) : (
          <ul className="-mx-2 divide-y divide-line">
            {members.map((m, i) => (
              <PersonRow
                key={m.id}
                s={m}
                index={i}
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
  // En estas listas la cifra principal no es el acumulado: se añade debajo.
  const detailOf = (m: EmployeeStatus) =>
    segment === "yellow" || segment === "weeklyHigh" ? `lleva ${fmtH(m.monthlyOvertime)}` : undefined;

  return (
    <div className="space-y-4">
      <p className="text-small leading-relaxed text-ink-2">{SEGMENT_TEXT[segment].desc}</p>
      {members.length === 0 ? (
        <EmptyState
          title="Nadie en esta lista"
          text="Con los filtros actuales no hay personas en esta condición."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {members.map((m, i) => (
            <PersonRow
              key={m.id}
              s={m}
              index={i}
              value={valueOf(m)}
              detail={detailOf(m)}
              onClick={() => push({ kind: "employee", id: m.id })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
