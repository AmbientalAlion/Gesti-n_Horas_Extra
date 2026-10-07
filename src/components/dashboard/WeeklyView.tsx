"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { EmployeeStatus, SegmentPoint, SegmentTrendPoint } from "@/lib/aggregate";
import { RULES } from "@/lib/overtime";
import { useDrawer } from "../drawer/context";
import { LEVEL_LABELS, LEVEL_TEXT, LevelIcon } from "../StatusBadge";
import { Icon } from "../ui/Icon";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { HEAT_STEPS, UpTriangle, heatCellStyle, heatStep } from "../charts/Heatmap";
import { fmt } from "../charts/chart-utils";

// Vista por semanas del calendario. Cada tramo es una semana ISO (lunes a
// domingo) recortada al mes: elegir un tramo muestra quién hizo horas en esa
// semana frente a su meta; «Todo el mes» muestra la matriz persona × semana.
//
// El tramo elegido, el filtro y el orden van en la URL (tramo, tfiltro,
// torden) sin pedir nada al servidor.

const ALL = "todo";
const PAGE = 40;

type Filtro = "" | "horas" | "meta" | "semana" | "revisar";
type Orden = "horas" | "meta" | "nombre";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "horas", label: "Con horas" },
  { value: "meta", label: "Sobre la meta" },
  { value: "semana", label: `Semana > ${RULES.WEEKLY_OVERTIME_LIMIT}h` },
  { value: "revisar", label: "Por revisar" },
];
const ORDENES: { value: Orden; label: string }[] = [
  { value: "horas", label: "Más horas" },
  { value: "meta", label: "Más sobre la meta" },
  { value: "nombre", label: "Nombre (A–Z)" },
];
const isFiltro = (v: string | null): v is Filtro =>
  v === "horas" || v === "meta" || v === "semana" || v === "revisar";
const isOrden = (v: string | null): v is Orden => v === "horas" || v === "meta" || v === "nombre";

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const h = (n: number) => `${fmt(n)}h`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function writeUrl(patch: Record<string, string>) {
  try {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(patch)) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    if (url.href !== window.location.href) window.history.replaceState(null, "", url.href);
  } catch {
    /* sin historial: la vista funciona igual, solo no se recuerda */
  }
}

interface Row {
  s: EmployeeStatus;
  pts: SegmentPoint[];
  /** Punto del tramo elegido (undefined en «Todo el mes»). */
  pt?: SegmentPoint;
  hours: number;
  target: number;
  over: boolean;
  weekHigh: boolean;
  pending: boolean;
  estimated: boolean;
}

function buildRow(s: EmployeeStatus, pts: SegmentPoint[], idx: number | null): Row {
  if (idx === null) {
    const hours = pts.reduce((a, p) => a + p.hours, 0);
    // Meta acumulada del mes a la fecha (12h por semana, tope de 48h).
    const target = [...pts].reverse().find((p) => !p.future)?.target ?? 0;
    return {
      s,
      pts,
      hours,
      target,
      over: pts.some((p) => p.hours > p.segmentTarget + 1e-9),
      weekHigh: pts.some((p) => p.weekHigh),
      pending: pts.some((p) => p.pending),
      estimated: pts.some((p) => p.estimated),
    };
  }
  const pt = pts[idx];
  return {
    s,
    pts,
    pt,
    hours: pt?.hours ?? 0,
    target: pt?.segmentTarget ?? 0,
    over: !!pt && pt.hours > pt.segmentTarget + 1e-9,
    weekHigh: !!pt?.weekHigh,
    pending: !!pt?.pending,
    estimated: !!pt?.estimated,
  };
}

const matches = (r: Row, f: Filtro) =>
  f === "horas"
    ? r.hours > 0
    : f === "meta"
      ? r.over
      : f === "semana"
        ? r.weekHigh
        : f === "revisar"
          ? r.pending
          : true;

export function WeeklyView({
  statuses,
  segmentsByEmployee,
  trend,
}: {
  statuses: EmployeeStatus[];
  segmentsByEmployee: Record<string, SegmentPoint[]>;
  trend: SegmentTrendPoint[];
}) {
  const drawer = useDrawer();
  const params = useSearchParams();

  // Por defecto: la semana más reciente con datos (la que se está viviendo).
  const lastWithData = useMemo(() => {
    for (let i = trend.length - 1; i >= 0; i--) if (!trend[i].future) return trend[i].key;
    return ALL;
  }, [trend]);

  const [sel, setSel] = useState<string>(() => {
    const v = params.get("tramo");
    return v && (v === ALL || trend.some((t) => t.key === v)) ? v : lastWithData;
  });
  const [filtro, setFiltro] = useState<Filtro>(() => {
    const v = params.get("tfiltro");
    return isFiltro(v) ? v : "";
  });
  const [orden, setOrden] = useState<Orden>(() => {
    const v = params.get("torden");
    return isOrden(v) ? v : "horas";
  });
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const dq = useDeferredValue(q);

  // Si cambia el mes (otro conjunto de tramos), el tramo elegido puede no existir.
  const idx = sel === ALL ? null : trend.findIndex((t) => t.key === sel);
  const selIdx = idx === -1 ? null : idx;
  const seg = selIdx === null ? null : trend[selIdx];

  const choose = (key: string) => {
    setSel(key);
    setLimit(PAGE);
    writeUrl({ tramo: key === lastWithData ? "" : key });
  };
  const step = (dir: -1 | 1) => {
    const keys = [ALL, ...trend.map((t) => t.key)];
    const i = keys.indexOf(selIdx === null ? ALL : trend[selIdx].key);
    const next = keys[Math.min(keys.length - 1, Math.max(0, i + dir))];
    if (next) choose(next);
  };

  const rows = useMemo(
    () => statuses.map((s) => buildRow(s, segmentsByEmployee[s.id] ?? [], selIdx)),
    [statuses, segmentsByEmployee, selIdx]
  );

  const counts = useMemo(() => {
    const c: Record<Filtro, number> = { "": rows.length, horas: 0, meta: 0, semana: 0, revisar: 0 };
    for (const r of rows) for (const f of ["horas", "meta", "semana", "revisar"] as const) if (matches(r, f)) c[f]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const term = norm(dq.trim());
    const list = rows.filter(
      (r) =>
        matches(r, filtro) &&
        (!term ||
          norm(r.s.name ?? "").includes(term) ||
          norm(r.s.code).includes(term) ||
          norm(r.s.area ?? "").includes(term))
    );
    const ratio = (r: Row) => (r.target > 0 ? r.hours / r.target : r.hours > 0 ? 9 : 0);
    list.sort((a, b) =>
      orden === "nombre"
        ? (a.s.name ?? a.s.code).localeCompare(b.s.name ?? b.s.code, "es")
        : orden === "meta"
          ? ratio(b) - ratio(a) || b.hours - a.hours
          : b.hours - a.hours || (a.s.name ?? "").localeCompare(b.s.name ?? "", "es")
    );
    return list;
  }, [rows, filtro, orden, dq]);

  // Totales del tramo elegido (siempre sobre toda la vista, no sobre el filtro).
  const stats = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.hours, 0);
    const withHours = counts.horas;
    return {
      total,
      withHours,
      avg: withHours > 0 ? total / withHours : 0,
      over: counts.meta,
      weekHigh: counts.semana,
    };
  }, [rows, counts]);

  const maxWeek = Math.max(1, ...trend.map((t) => t.overtime));
  const openEmployee = (id: string, el: HTMLElement) => drawer?.open({ kind: "employee", id }, el);

  if (trend.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-2">Sin semanas en el periodo.</p>;
  }

  return (
    <div className="space-y-4">
      <WeekStrip
        trend={trend}
        sel={selIdx === null ? ALL : trend[selIdx].key}
        maxWeek={maxWeek}
        monthTotal={trend.reduce((a, t) => a + t.overtime, 0)}
        onChoose={choose}
        onStep={step}
      />

      {/* Resumen del tramo elegido. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Stat label={seg ? "Horas de la semana" : "Horas del mes"} value={stats.total} decimals={1} suffix="h" />
        <Stat
          label="Personas con horas"
          value={stats.withHours}
          hint={stats.withHours > 0 ? `Promedio ${h(stats.avg)} c/u` : `de ${rows.length} en la vista`}
        />
        <Stat
          label={seg ? `Sobre la meta (${h(seg.segmentTarget)})` : "Sobre la meta en alguna semana"}
          value={stats.over}
          tone={stats.over > 0 ? "risk" : undefined}
        />
        <Stat
          label={`Semana L–D > ${RULES.WEEKLY_OVERTIME_LIMIT}h`}
          value={stats.weekHigh}
          tone={stats.weekHigh > 0 ? "info" : undefined}
          hint="Informativo"
        />
      </div>

      {seg && (seg.partial || seg.future) && (
        <p className="flex items-start gap-2 rounded-control border border-line bg-surface-2 px-3 py-2 text-small text-ink-2">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <span>
            {seg.future
              ? "Esta semana aún no tiene datos: empieza después de la fecha de corte."
              : `Semana parcial: solo ${seg.label.match(/\((.+)\)/)?.[1] ?? "unos días"} caen en este mes, así que su meta es proporcional (${h(seg.segmentTarget)}). La alerta de ${RULES.WEEKLY_OVERTIME_LIMIT}h usa la semana completa de lunes a domingo.`}
          </span>
        </p>
      )}

      {/* Filtros. */}
      <div className="space-y-3 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <label className="sr-only" htmlFor="semana-buscar">
              Buscar por nombre, ID o área
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              id="semana-buscar"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Buscar por nombre, ID o área"
              autoComplete="off"
              className="field pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-small text-ink-2 sm:ml-auto">
            <span className="whitespace-nowrap">Ordenar</span>
            <select
              value={orden}
              onChange={(e) => {
                const v = e.target.value as Orden;
                setOrden(v);
                writeUrl({ torden: v === "horas" ? "" : v });
              }}
              className="field w-auto py-2"
            >
              {ORDENES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar personas">
          {FILTROS.map((f) => {
            const on = filtro === f.value;
            return (
              <button
                key={f.value || "todos"}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFiltro(f.value);
                  setLimit(PAGE);
                  writeUrl({ tfiltro: f.value });
                }}
                className={clsx(
                  "chip chip-interactive",
                  on && "border-primary bg-primary-soft font-semibold text-heading"
                )}
              >
                {f.label}
                <span className="tabular-nums text-muted">{counts[f.value]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-caption text-muted" aria-live="polite">
        Mostrando {Math.min(limit, visible.length)} de {visible.length}
        {visible.length !== rows.length && ` (${rows.length} en la vista)`}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-line py-8 text-center text-small text-ink-2">
          Nadie coincide con el filtro en {seg ? `la semana del ${seg.short}` : "el mes"}.
        </p>
      ) : seg ? (
        <WeekRanking
          key={seg.key}
          rows={visible.slice(0, limit)}
          segmentTarget={seg.segmentTarget}
          onOpen={openEmployee}
        />
      ) : (
        <WeekMatrix rows={visible.slice(0, limit)} trend={trend} onOpen={openEmployee} onChoose={choose} />
      )}

      {visible.length > limit && (
        <div className="text-center">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
            Mostrar {Math.min(PAGE, visible.length - limit)} más
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Selector de semanas ---------- */

function WeekStrip({
  trend,
  sel,
  maxWeek,
  monthTotal,
  onChoose,
  onStep,
}: {
  trend: SegmentTrendPoint[];
  sel: string;
  maxWeek: number;
  monthTotal: number;
  onChoose: (key: string) => void;
  onStep: (dir: -1 | 1) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // Lleva a la vista la tarjeta elegida (en móvil la tira se desplaza).
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [sel]);

  const first = sel === ALL;
  const last = sel === trend[trend.length - 1]?.key;

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-icon hidden shrink-0 self-center sm:inline-flex"
        onClick={() => onStep(-1)}
        disabled={first}
        aria-label="Semana anterior"
      >
        <Icon name="chevron-left" className="h-5 w-5" />
      </button>
      <div
        ref={scroller}
        role="group"
        aria-label="Elegir semana del calendario"
        className="table-scroll flex flex-1 snap-x gap-2 pb-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            onStep(e.key === "ArrowRight" ? 1 : -1);
            requestAnimationFrame(() =>
              scroller.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
            );
          }
        }}
      >
        <WeekCard
          active={first}
          onClick={() => onChoose(ALL)}
          title="Todo el mes"
          sub="Matriz por semana"
          hours={monthTotal}
          ratio={1}
          icon
        />
        {trend.map((t) => (
          <WeekCard
            key={t.key}
            active={sel === t.key}
            onClick={() => onChoose(t.key)}
            title={t.short}
            sub={t.future ? "Sin datos aún" : t.partial ? `Parcial · meta ${h(t.segmentTarget)}` : `Meta ${h(t.segmentTarget)} p/p`}
            hours={t.overtime}
            ratio={t.overtime / maxWeek}
            muted={t.future}
            label={t.label}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-icon hidden shrink-0 self-center sm:inline-flex"
        onClick={() => onStep(1)}
        disabled={last}
        aria-label="Semana siguiente"
      >
        <Icon name="chevron-right" className="h-5 w-5" />
      </button>
    </div>
  );
}

function WeekCard({
  active,
  onClick,
  title,
  sub,
  hours,
  ratio,
  muted,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  hours: number;
  ratio: number;
  muted?: boolean;
  icon?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={label}
      aria-label={`${label ?? title}: ${h(hours)}. ${sub}`}
      className={clsx(
        "group relative flex min-w-[8.5rem] shrink-0 snap-start flex-col gap-1 overflow-hidden rounded-card border px-3 py-2.5 text-left transition duration-fast",
        active
          ? "border-primary bg-primary-soft shadow-1"
          : "border-line bg-surface hover:border-primary/50 hover:bg-surface-2",
        muted && !active && "opacity-60"
      )}
    >
      <span className="flex items-center gap-1.5 text-small font-semibold text-heading">
        {icon && <Icon name="calendar" className="h-4 w-4 text-primary" />}
        {title}
      </span>
      <span className="text-lg font-bold tabular-nums text-ink">{muted ? "—" : h(hours)}</span>
      <span className="text-[11px] text-muted">{sub}</span>
      {/* Barra: horas del tramo frente a la semana más alta del mes. */}
      <span aria-hidden className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <span
          className={clsx(
            "block h-full origin-left rounded-full transition-transform duration-slow ease-out",
            active ? "bg-primary" : "bg-brand-300"
          )}
          style={{ transform: `scaleX(${Math.max(0, Math.min(1, ratio))})` }}
        />
      </span>
    </button>
  );
}

function Stat({
  label,
  value,
  decimals = 0,
  suffix = "",
  hint,
  tone,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  hint?: string;
  tone?: "risk" | "info";
}) {
  return (
    <div className="rounded-card border border-line bg-surface-2 px-3 py-2.5">
      <p className="text-caption text-ink-2">{label}</p>
      <p
        className={clsx(
          "mt-0.5 text-xl font-bold tabular-nums",
          tone === "risk" ? "text-risk" : tone === "info" ? "text-info" : "text-heading"
        )}
      >
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/* ---------- Una semana: ranking con barra frente a la meta ---------- */

function WeekRanking({
  rows,
  segmentTarget,
  onOpen,
}: {
  rows: Row[];
  segmentTarget: number;
  onOpen: (id: string, el: HTMLElement) => void;
}) {
  // Escala común: la meta queda en el mismo sitio en todas las filas.
  const scale = Math.max(segmentTarget * 1.5, RULES.WEEKLY_OVERTIME_LIMIT, ...rows.map((r) => r.hours), 1);
  const targetPct = (segmentTarget / scale) * 100;
  const weeklyPct = (RULES.WEEKLY_OVERTIME_LIMIT / scale) * 100;
  const showWeekly = Math.abs(weeklyPct - targetPct) > 2;

  return (
    <div>
      <div className="mb-2 hidden items-center gap-4 text-caption text-muted sm:flex">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-heading" aria-hidden /> Meta del tramo ({h(segmentTarget)})
        </span>
        {showWeekly && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0 border-l border-dashed border-info" aria-hidden /> {RULES.WEEKLY_OVERTIME_LIMIT}h por semana
          </span>
        )}
      </div>
      <ol className="divide-y divide-line overflow-hidden rounded-card border border-line">
        {rows.map((r, i) => {
          const pct = (r.hours / scale) * 100;
          const level = r.s.level;
          return (
            <li key={r.s.id}>
              <button
                type="button"
                onClick={(e) => onOpen(r.s.id, e.currentTarget)}
                className="grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-left transition-colors duration-fast hover:bg-primary-soft sm:grid-cols-[1.75rem_minmax(0,16rem)_minmax(0,1fr)_auto]"
                style={{ animationDelay: `${Math.min(i * 25, 250)}ms` }}
              >
                <span className="text-caption tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <LevelIcon level={level} className={LEVEL_TEXT[level]} />
                    <span className="truncate text-small font-semibold text-heading">{r.s.name ?? r.s.code}</span>
                  </span>
                  <span className="block truncate text-caption text-muted">
                    {r.s.area ?? "Sin área"} · {LEVEL_LABELS[level]} en el mes
                  </span>
                </span>
                <span className="col-span-3 col-start-1 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                  <span className="relative block h-3 w-full rounded-full bg-surface-3" aria-hidden>
                    <span
                      className={clsx(
                        "absolute inset-y-0 left-0 origin-left rounded-full motion-safe:animate-grow-x",
                        r.over ? "bg-risk-solid" : r.hours > 0 ? "bg-primary" : ""
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                    <span className="absolute -inset-y-1 w-0.5 bg-heading" style={{ left: `${targetPct}%` }} />
                    {showWeekly && (
                      <span
                        className="absolute -inset-y-1 w-0 border-l border-dashed border-info"
                        style={{ left: `${weeklyPct}%` }}
                      />
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {r.weekHigh && r.pt && (
                      <span className="chip-info">
                        Semana L–D {h(r.pt.weekHours)}
                        {r.pt.weekShared && " (cruza de mes)"}
                      </span>
                    )}
                    {r.pending && <span className="chip-pending">Por revisar</span>}
                    {r.estimated && <span className="chip">Estimada</span>}
                  </span>
                </span>
                <span className="col-start-3 row-start-1 text-right sm:col-start-4">
                  <span
                    className={clsx(
                      "flex items-center justify-end gap-1 text-ui font-bold tabular-nums",
                      r.over ? "text-risk" : r.hours > 0 ? "text-heading" : "text-muted"
                    )}
                  >
                    {r.hours > 0 ? h(r.hours) : "—"}
                    {r.over && <UpTriangle className="h-2.5 w-2.5" />}
                  </span>
                  {r.hours > 0 && (
                    <span className="block text-[11px] tabular-nums text-muted">
                      {r.over ? `+${h(r.hours - r.target)} sobre la meta` : `${Math.round((r.hours / Math.max(r.target, 0.01)) * 100)}% de la meta`}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- Todo el mes: matriz persona × semana ---------- */

function WeekMatrix({
  rows,
  trend,
  onOpen,
  onChoose,
}: {
  rows: Row[];
  trend: SegmentTrendPoint[];
  onOpen: (id: string, el: HTMLElement) => void;
  onChoose: (key: string) => void;
}) {
  return (
    <div>
      <div className="table-scroll -mx-1 px-1 pb-1 [contain:inline-size]">
        <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
          <caption className="sr-only">Horas extra por persona y semana del calendario frente a la meta de cada semana</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-[1] bg-surface p-1 text-left text-caption font-semibold text-ink-2">
                Persona
              </th>
              {trend.map((t) => (
                <th key={t.key} scope="col" className="p-0 text-center">
                  <button
                    type="button"
                    onClick={() => onChoose(t.key)}
                    className="w-full whitespace-nowrap rounded-chip px-1.5 py-1 text-small font-semibold text-ink-2 transition-colors duration-fast hover:bg-primary-soft hover:text-heading"
                    title={`Ver solo la semana del ${t.label}`}
                  >
                    {t.short}
                    <span className="block text-[11px] font-medium text-muted">meta {fmt(t.segmentTarget)}h</span>
                  </button>
                </th>
              ))}
              <th scope="col" className="whitespace-nowrap p-1 text-right text-small font-semibold text-ink-2">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id}>
                <th scope="row" className="sticky left-0 z-[1] bg-surface p-0 pr-2 text-left font-normal">
                  <button
                    type="button"
                    onClick={(e) => onOpen(r.s.id, e.currentTarget)}
                    className="group block min-h-10 w-full max-w-[10rem] rounded-chip px-1.5 py-1 text-left transition duration-fast hover:bg-primary-soft sm:max-w-[15rem]"
                  >
                    <span className="flex items-center gap-1.5">
                      <LevelIcon level={r.s.level} className={LEVEL_TEXT[r.s.level]} />
                      <span className="truncate text-small font-medium text-ink-2 group-hover:text-heading">
                        {r.s.name ?? r.s.code}
                      </span>
                    </span>
                    <span className="block truncate text-caption text-muted">{r.s.area ?? "Sin área"}</span>
                  </button>
                </th>
                {trend.map((t, c) => {
                  const p = r.pts[c];
                  const v = p?.hours ?? 0;
                  const ratio = p && p.segmentTarget > 0 ? v / p.segmentTarget : 0;
                  const over = v > 0 && ratio > 1 + 1e-9;
                  const empty = v <= 0;
                  const desc = [
                    `${r.s.name ?? r.s.code}, ${t.label}`,
                    empty ? (p?.future ? "sin datos aún" : "sin horas extra") : `${h(v)}`,
                    p ? `meta ${h(p.segmentTarget)}` : "",
                    over ? "sobre la meta" : "",
                    p?.weekHigh ? `semana completa ${h(p.weekHours)}, más de ${RULES.WEEKLY_OVERTIME_LIMIT}h` : "",
                    p?.pending ? "por revisar" : "",
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <td key={t.key} className="p-0">
                      <span
                        title={desc}
                        aria-label={desc}
                        className={clsx(
                          "relative flex h-10 min-w-[3.25rem] items-center justify-center gap-1 rounded-chip text-xs font-semibold tabular-nums print-exact",
                          empty && "border border-dashed border-line",
                          p?.pending && "ring-2 ring-inset ring-pending-border"
                        )}
                        style={empty ? { color: "rgb(var(--c-muted))" } : heatCellStyle(heatStep(ratio))}
                      >
                        <span aria-hidden>{empty ? "—" : fmt(v)}</span>
                        {over && <UpTriangle />}
                        {p?.weekHigh && (
                          <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-info-solid" />
                        )}
                      </span>
                    </td>
                  );
                })}
                <td className="whitespace-nowrap p-1 text-right">
                  <span className={clsx("text-small font-bold tabular-nums", LEVEL_TEXT[r.s.level])}>{h(r.hours)}</span>
                  <span className="block text-[11px] tabular-nums text-muted">meta {h(r.target)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-ink-2">
        <span className="w-full sm:w-auto">Horas frente a la meta de cada semana:</span>
        {HEAT_STEPS.map((x, i) => (
          <span key={x.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-flex h-3.5 w-6 items-center justify-center rounded-[3px] print-exact"
              style={heatCellStyle(i)}
              aria-hidden
            >
              {"over" in x && x.over && <UpTriangle className="h-1.5 w-1.5" />}
            </span>
            {x.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-info-solid" aria-hidden />
          semana L–D &gt; {RULES.WEEKLY_OVERTIME_LIMIT}h
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-6 rounded-[3px] ring-2 ring-inset ring-pending-border" aria-hidden />
          por revisar
        </span>
      </div>
    </div>
  );
}
