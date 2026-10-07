"use client";

import Link from "next/link";
import clsx from "clsx";
import { useDrawer, type Segment } from "@/components/drawer/context";
import { LevelIcon, PendingIcon } from "@/components/StatusBadge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Icon } from "@/components/ui/Icon";
import { LegendStrip } from "@/components/LegendStrip";
import { StatusRing } from "./StatusRing";
import { fmtH, RULES } from "@/lib/overtime";
import type { SemaphoreLevel } from "@/lib/types";

export interface HeroNotice {
  tone: "pending" | "risk" | "over" | "info";
  text: string;
  /** Enlace (p. ej. a la bandeja de revisiones) o persona que se abre en el panel. */
  action?: { label: string; href: string } | { label: string; employeeId: string };
}

export interface HeroPeriod {
  monthLabel: string;
  /** «mes cerrado», «el mes aún no empieza», «sin datos cargados»… */
  note?: string;
  cutoffDay: number;
  cutoffLabel: string | null;
  daysInMonth: number;
  /** Meta acumulada a la fecha de corte (horas). */
  target: number;
  /** Último día de cada tramo del mes (marcas en la barra de avance). */
  ticks: number[];
}

const STATES: {
  level: SemaphoreLevel;
  segment: Segment;
  label: string;
  icon: string;
}[] = [
  { level: "red", segment: "red", label: "Excedido", icon: "text-over-solid" },
  { level: "yellow", segment: "yellow", label: "En riesgo", icon: "text-risk-solid" },
  { level: "green", segment: "green", label: "Normal", icon: "text-ok-solid" },
];

const NOTICE = {
  pending: "border-pending-border bg-pending-soft text-pending",
  risk: "border-risk-border bg-risk-soft text-risk",
  over: "border-over-border bg-over-soft text-over",
  info: "border-info-border bg-info-soft text-info",
} as const;

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/** Frase principal: la respuesta en 5 segundos, sin repetir los conteos. */
function headline(
  c: Record<"red" | "yellow" | "green", number>,
  noData: boolean
): { level: SemaphoreLevel | null; text: string } {
  const total = c.red + c.yellow + c.green;
  if (total === 0) return { level: null, text: "No hay personas en esta vista." };
  if (noData) return { level: null, text: "Aún no hay datos cargados para este mes." };
  if (c.red > 0)
    return {
      level: "red",
      text: `Hay personas por encima del límite de ${RULES.MONTHLY_OVERTIME_LIMIT}h del mes.`,
    };
  if (c.yellow > 0)
    return {
      level: "yellow",
      text: `Nadie superó ${RULES.MONTHLY_OVERTIME_LIMIT}h, pero hay personas en riesgo.`,
    };
  return { level: "green", text: "Todas las personas van dentro de la meta del mes." };
}

/**
 * Encabezado «Estado del mes»: quién mira (rol), qué mes y hasta qué fecha,
 * la meta a esa fecha y el semáforo de la vista. Cada estado abre a la
 * derecha la lista de personas.
 */
export function MonthHero({
  roleTag,
  scopeLabel,
  focus,
  period,
  counts,
  riskByTarget,
  riskByProjection,
  notice,
  toolbar,
}: {
  roleTag: string;
  scopeLabel: string;
  focus: string;
  period: HeroPeriod;
  counts: Record<"red" | "yellow" | "green", number>;
  riskByTarget: number;
  riskByProjection: number;
  notice?: HeroNotice | null;
  toolbar?: React.ReactNode;
}) {
  const drawer = useDrawer();
  const total = counts.red + counts.yellow + counts.green;
  const noData = period.cutoffDay === 0;
  const head = headline(counts, noData);
  const pct = period.daysInMonth > 0 ? (period.cutoffDay / period.daysInMonth) * 100 : 0;

  const ringLabel = `Semáforo de la vista: ${counts.red} ${plural(counts.red, "excedido", "excedidos")}, ${counts.yellow} en riesgo y ${counts.green} ${plural(counts.green, "normal", "normales")}, de ${total} ${plural(total, "persona", "personas")}.`;

  return (
    <header className="reveal card overflow-hidden rounded-hero p-0 sm:p-0">
      <div className="grid lg:grid-cols-12">
        {/* Columna principal: contexto y respuesta */}
        <div className="min-w-0 space-y-4 p-4 sm:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="chip-brand font-semibold">{roleTag}</span>
              <h1 className="mt-2 text-h1 text-heading">Panel de control</h1>
              <p className="mt-0.5 text-small text-ink-2">
                {scopeLabel} · <span className="font-semibold text-ink">{period.monthLabel}</span>
                {period.note ? ` · ${period.note}` : ""}
              </p>
            </div>
            {toolbar && (
              <div className="flex flex-wrap items-center gap-2 print:hidden">{toolbar}</div>
            )}
          </div>

          <div>
            <p className="flex items-start gap-2 text-title text-ink">
              {head.level && (
                <LevelIcon
                  level={head.level}
                  className={clsx(
                    "mt-1.5 h-3.5 w-3.5",
                    STATES.find((s) => s.level === head.level)?.icon
                  )}
                />
              )}
              <span>{head.text}</span>
            </p>
            <p className="mt-1 line-clamp-2 max-w-[65ch] text-small text-ink-2 sm:line-clamp-none">
              {focus}
            </p>
          </div>

          {!noData && (
            <div>
              <div className="flex items-baseline justify-between gap-2 text-caption text-muted">
                <span>Avance del mes</span>
                <span className="tabular-nums">
                  Día {period.cutoffDay} de {period.daysInMonth}
                </span>
              </div>
              <div
                className="print-exact relative mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3"
                aria-hidden
              >
                <div
                  className="absolute inset-y-0 left-0 origin-left rounded-full bg-primary transition-[width] duration-slow ease-enter motion-safe:animate-grow-x"
                  style={{ width: `${pct}%` }}
                />
                {period.ticks
                  .filter((d) => d < period.daysInMonth)
                  .map((d) => (
                    <span
                      key={d}
                      className="absolute inset-y-0 w-0.5 bg-surface"
                      style={{ left: `${(d / period.daysInMonth) * 100}%` }}
                    />
                  ))}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <div className="min-w-0">
                  <dt className="text-caption text-muted">Datos hasta</dt>
                  <dd className="truncate text-ui font-semibold text-ink">
                    {period.cutoffLabel ?? "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-caption text-muted">Meta a la fecha</dt>
                  <dd className="text-ui font-semibold tabular-nums text-ink">
                    {fmtH(period.target)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-caption text-muted">Límite del mes</dt>
                  <dd className="text-ui font-semibold tabular-nums text-ink">
                    {RULES.MONTHLY_OVERTIME_LIMIT}h
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Semáforo de la vista */}
        <section
          aria-labelledby="semaforo-titulo"
          className="border-t border-line bg-surface-2 p-4 sm:p-6 lg:col-span-5 lg:border-l lg:border-t-0"
        >
          <h2 id="semaforo-titulo" className="text-small font-semibold text-ink-2">
            Semáforo de la vista
          </h2>
          <div className="mt-3 flex items-center gap-4 sm:gap-6">
            <StatusRing counts={counts} label={ringLabel} size={116} stroke={12}>
              <span className="text-display leading-none tabular-nums text-ink" aria-hidden>
                <AnimatedNumber value={total} />
              </span>
              <span className="mt-1 text-caption text-muted" aria-hidden>
                {plural(total, "persona", "personas")}
              </span>
            </StatusRing>
            <ul className="min-w-0 flex-1 space-y-1">
              {STATES.map((s) => {
                const n = counts[s.level];
                const sub =
                  s.level === "yellow" && n > 0
                    ? [
                        riskByTarget ? `${riskByTarget} sobre la meta` : "",
                        riskByProjection ? `${riskByProjection} por proyección` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "";
                return (
                  <li key={s.level}>
                    <button
                      type="button"
                      onClick={() => drawer?.open({ kind: "segment", segment: s.segment })}
                      className="group -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 rounded-control px-2 py-1.5 text-left transition-colors duration-fast hover:bg-surface active:bg-surface-3"
                    >
                      <LevelIcon level={s.level} className={clsx("h-3 w-3", s.icon)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-ui text-ink">{s.label}</span>
                        {sub && <span className="block truncate text-caption font-normal text-muted">{sub}</span>}
                      </span>
                      <span className="text-title font-bold tabular-nums text-ink">
                        <AnimatedNumber value={n} />
                      </span>
                      <Icon
                        name="chevron-right"
                        className="h-4 w-4 shrink-0 text-muted transition-transform duration-fast ease-enter group-hover:translate-x-0.5 print:hidden"
                      />
                      <span className="sr-only">: ver la lista</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {notice && (
            <div
              className={clsx(
                "mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border px-3 py-2.5",
                NOTICE[notice.tone]
              )}
            >
              {notice.tone === "pending" ? (
                <PendingIcon className="h-4 w-4" />
              ) : notice.tone === "info" ? (
                <Icon name="info" className="h-4 w-4 shrink-0" />
              ) : (
                <Icon name="alert" className="h-4 w-4 shrink-0" />
              )}
              <p className="min-w-0 flex-1 text-small font-medium">{notice.text}</p>
              {notice.action &&
                ("href" in notice.action ? (
                  <Link href={notice.action.href} className="btn-secondary btn-sm print:hidden">
                    {notice.action.label}
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      notice.action &&
                      "employeeId" in notice.action &&
                      drawer?.open({ kind: "employee", id: notice.action.employeeId })
                    }
                    className="btn-secondary btn-sm print:hidden"
                  >
                    {notice.action.label}
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </button>
                ))}
            </div>
          )}
        </section>
      </div>

      <LegendStrip className="border-t border-line px-4 py-2 sm:px-6" />
    </header>
  );
}
