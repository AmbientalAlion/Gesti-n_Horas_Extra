import clsx from "clsx";
import type { EmployeeDetail as Detail, HistoryEntry } from "@/lib/aggregate";
import { fmtH, RULES } from "@/lib/overtime";
import { monthLabel } from "@/lib/dates";
import { LEVEL_LABELS, LEVEL_SOLID, LEVEL_TEXT, LevelIcon, PendingIcon, StatusBadge } from "./StatusBadge";
import { PrintButton } from "./PrintButton";
import { FigureCluster } from "./brand/Figures";
import { CumulativeChart } from "./charts/CumulativeChart";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { Icon } from "./ui/Icon";
import { BackLink } from "./ficha/BackLink";
import { FichaStickyBar } from "./ficha/FichaStickyBar";

/** Color del acumulado frente a la meta de su tramo (y al límite del mes). */
function accCls(acc: number, target: number): string {
  if (acc > RULES.MONTHLY_OVERTIME_LIMIT) return "font-semibold text-over";
  if (Math.round(acc * 10) > Math.round(target * 10)) return "font-semibold text-risk";
  return "text-ink-2";
}

const PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "da", "do", "van", "von"]);

/** «Carlos Gómez» → «CG»; sin nombre, los dos primeros caracteres del ID. */
export function initialsOf(name: string | undefined, code: string): string {
  const words = (name ?? "")
    .split(/\s+/)
    .filter((w) => w && !PARTICLES.has(w.toLowerCase()));
  if (words.length === 0) return code.slice(0, 2).toUpperCase();
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : words[0][1] ?? "";
  return `${first}${last}`.toUpperCase();
}

/** Agrupa el historial por mes, conservando el orden (más reciente primero). */
function byMonth(history: HistoryEntry[]) {
  const groups: { key: string; year: number; month: number; entries: HistoryEntry[] }[] = [];
  for (const h of history) {
    const key = `${h.year}-${h.month}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, year: h.year, month: h.month, entries: [] };
      groups.push(g);
    }
    g.entries.push(h);
  }
  return groups;
}

export function EmployeeDetailView({
  detail,
  backHref,
}: {
  detail: Detail;
  backHref: string;
}) {
  const d = detail;
  const p = d.period;
  const month = monthLabel(p.year, p.month);
  const closed = p.status === "cerrado";
  const name = d.employee.name ?? d.employee.code;
  const initials = initialsOf(d.employee.name, d.employee.code);
  const at = p.cutoffLabel ? ` al ${p.cutoffLabel}` : "";
  const statusLine =
    d.level === "red"
      ? `Superó el límite de ${RULES.MONTHLY_OVERTIME_LIMIT}h del mes`
      : d.risk === "meta"
        ? `${fmtH(d.overTarget)} por encima de la meta${at}`
        : d.risk === "proyeccion"
          ? `Dentro de la meta, pero a este ritmo cerraría en ${fmtH(d.projectedMonthlyOvertime)}`
          : closed
            ? "Cerró el mes dentro del límite"
            : `Dentro de la meta${at}`;
  const accTone = d.level === "red" ? "red" : d.risk === "meta" ? "yellow" : undefined;
  const projTone =
    !closed && d.projectedMonthlyOvertime > RULES.MONTHLY_OVERTIME_LIMIT ? "yellow" : undefined;

  const meta: { label: string; value?: string }[] = [
    { label: "Dirección", value: d.employee.direccion },
    { label: "Área", value: d.employee.area ?? "—" },
    { label: "Planta", value: d.employee.plant },
    { label: "Centro de costo", value: d.employee.costCenter },
    { label: "Jefe o supervisor", value: d.employee.managerName ?? "Sin asignar" },
  ];
  const reasonsShown = d.reasons.slice(0, 3);
  const reasonsMore = d.reasons.slice(3);
  const groups = byMonth(d.history);

  return (
    <div className="space-y-5 sm:space-y-6">
      <FichaStickyBar
        targetId="ficha-cabecera"
        name={name}
        initials={initials}
        level={d.level}
        pending={d.frozenCount}
        summary={`${fmtH(d.monthlyOvertime)} · meta ${fmtH(d.target)}`}
        backHref={backHref}
      />

      <div className="flex items-center justify-between gap-3 print:hidden">
        <BackLink href={backHref} />
        <PrintButton label="Exportar ficha a PDF" />
      </div>

      {/* Cabecera / identidad */}
      <header
        id="ficha-cabecera"
        className="reveal relative overflow-hidden rounded-hero border border-line bg-surface px-4 py-5 shadow-1 sm:px-6 sm:py-6"
      >
        <FigureCluster variant="ficha" />
        <div className="relative flex items-start gap-3 pr-10 sm:gap-4 sm:pr-[30%]">
          <span
            aria-hidden
            className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-title font-bold text-heading ring-1 ring-inset ring-brand-200/70 motion-safe:animate-scale-in sm:h-16 sm:w-16 sm:text-[1.25rem] dark:ring-brand-300/30"
          >
            {initials}
            <span
              className={clsx(
                "print-exact absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface text-white",
                LEVEL_SOLID[d.level]
              )}
            >
              <LevelIcon level={d.level} className="h-2 w-2" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-link">
              Ficha de la persona · {month}
            </p>
            <h1 className="mt-0.5 text-h1 text-heading">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusBadge level={d.level} pending={d.frozenCount} />
              <span className="text-small text-ink-2">
                {d.employee.roleTitle ?? "Cargo sin registrar"} · ID {d.employee.code}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-small text-muted">
              <Icon name="calendar" className="h-3.5 w-3.5" />
              {p.cutoffLabel ? `Datos hasta el ${p.cutoffLabel}` : "Sin datos cargados en el mes"}
            </p>
          </div>
        </div>
        <dl className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-5">
          {meta
            .filter((m) => m.value)
            .map((m) => (
              <div key={m.label} className="min-w-0">
                <dt className="text-caption font-normal text-muted">{m.label}</dt>
                <dd className="truncate text-small font-semibold text-ink" title={m.value}>
                  {m.value}
                </dd>
              </div>
            ))}
        </dl>
      </header>

      {/* Estado del mes y cifras clave */}
      <section
        aria-labelledby="estado-mes"
        className="reveal-stagger grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
      >
        {/* Estado a la izquierda (alto de dos filas); las dos cifras, apiladas a la derecha. */}
        <div className="card relative col-span-2 overflow-hidden md:col-span-1 md:row-span-2">
          <span aria-hidden className={clsx("print-exact absolute inset-x-0 top-0 h-[3px]", LEVEL_SOLID[d.level])} />
          <h2 id="estado-mes" className="text-small font-medium text-ink-2">
            Estado del mes
          </h2>
          <p className={clsx("mt-1 flex items-center gap-2 text-[1.625rem] font-bold leading-tight", LEVEL_TEXT[d.level])}>
            <LevelIcon level={d.level} className="h-4 w-4" />
            {LEVEL_LABELS[d.level]}
          </p>
          <p className="mt-1 text-ui text-ink">{statusLine}</p>
          {d.frozenCount > 0 && (
            <p className="mt-3 flex items-start gap-1.5 rounded-control border border-pending-border bg-pending-soft px-2.5 py-2 text-small text-pending">
              <PendingIcon className="mt-0.5" />
              <span>
                {d.frozenCount} registro{d.frozenCount > 1 ? "s" : ""} por revisar: el mes
                quedaría entre {fmtH(d.monthlyOvertime)} y {fmtH(d.potentialMonthlyOvertime)}.
              </span>
            </p>
          )}
          {d.reasons.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <h3 className="text-caption font-semibold text-ink-2">Por qué está en este estado</h3>
              <ul className="mt-1.5 space-y-1.5">
                {reasonsShown.map((r, i) => (
                  <li key={i} className="flex gap-2 text-small leading-snug text-ink-2">
                    <LevelIcon level={d.level} className={clsx("mt-1", LEVEL_TEXT[d.level])} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              {reasonsMore.length > 0 && (
                <details className="group mt-1.5">
                  <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-small font-semibold text-link [&::-webkit-details-marker]:hidden">
                    Ver todos ({d.reasons.length})
                    <Icon name="chevron-down" className="h-3.5 w-3.5 transition-transform duration-fast group-open:rotate-180" />
                  </summary>
                  <ul className="mt-1 space-y-1.5">
                    {reasonsMore.map((r, i) => (
                      <li key={i} className="flex gap-2 text-small leading-snug text-ink-2">
                        <LevelIcon level={d.level} className={clsx("mt-1", LEVEL_TEXT[d.level])} />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        <Metric
          label={`Acumulado${at}`}
          value={d.monthlyOvertime}
          hint={`Meta a esa fecha: ${fmtH(d.target)} · límite del mes ${RULES.MONTHLY_OVERTIME_LIMIT}h`}
          tone={accTone}
        />
        <Metric
          label={closed ? "Cierre del mes" : "Proyección de cierre"}
          value={d.projectedMonthlyOvertime}
          prefix={closed ? "" : "≈ "}
          hint={
            closed
              ? "Mes cerrado"
              : d.projectionReliable
                ? "Al ritmo diario que lleva"
                : "Estimación con pocos datos: no cambia el estado"
          }
          tone={projTone}
        />
      </section>

      {/* Curva acumulado vs meta */}
      <section className="card reveal" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="curva">
        <h2 id="curva" className="text-title text-heading">
          Acumulado frente a la meta · {month}
        </h2>
        <p className="mb-3 mt-0.5 text-small text-ink-2">
          La meta suma 12h por cada semana completa, la parte proporcional en las semanas
          parciales, y se detiene en {RULES.MONTHLY_OVERTIME_LIMIT}h.
        </p>
        <CumulativeChart
          segments={d.segments}
          daysInMonth={p.daysInMonth}
          cutoffDay={p.cutoffDay}
          monthLabel={month}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Semanas de más de 12h */}
        <section className="card" aria-labelledby="semanas-altas">
          <h2 id="semanas-altas" className="flex items-center gap-2 text-ui font-semibold text-heading">
            <Icon name="info" className="h-4 w-4 text-info" />
            Semanas de más de {RULES.WEEKLY_OVERTIME_LIMIT}h
            <span className="font-normal text-muted">(lunes a domingo)</span>
          </h2>
          {d.highWeeks.length === 0 ? (
            <p className="mt-2 text-small text-ink-2">Ninguna en este mes.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {d.highWeeks.map((w) => (
                <li
                  key={`${w.isoYear}-${w.week}`}
                  className="chip-info py-1 text-small"
                  title={w.shared ? "Semana compartida con otro mes" : undefined}
                >
                  {w.label}: <strong className="tabular-nums">{fmtH(w.hours)}</strong>
                  {w.shared && (
                    <span className="text-caption font-normal">
                      · compartida{w.counted ? "" : ", cuenta en el otro mes"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-caption font-normal text-muted">
            Es una alerta informativa: no cambia el estado del mes.
          </p>
        </section>

        {/* Cifras del mes */}
        <section className="card" aria-labelledby="cifras">
          <h2 id="cifras" className="text-ui font-semibold text-heading">
            Lo que lleva del mes
          </h2>
          <dl className="mt-3 grid grid-cols-3 divide-x divide-line">
            <Figure
              label="Horas base"
              value={d.baseHoursMonth != null ? fmtH(d.baseHoursMonth) : "—"}
              hint={d.baseHoursMonth == null ? "no vienen en el archivo" : undefined}
            />
            <Figure
              label="Total trabajado"
              value={d.totalHoursMonth != null ? fmtH(d.totalHoursMonth) : "—"}
              hint={d.totalHoursMonth == null ? "no viene en el archivo" : undefined}
            />
            {d.areaRankPosition && d.areaRankTotal ? (
              <Figure
                label="Posición en su área"
                value={`#${d.areaRankPosition} de ${d.areaRankTotal}`}
                hint="por horas extra"
              />
            ) : (
              <Figure label="Tramos con horas extra" value={String(d.segmentsWithOvertime)} />
            )}
          </dl>
        </section>
      </div>

      {/* Recargos del mes (formato de novedades) */}
      {d.recargos && (
        <section className="card" aria-labelledby="recargos">
          <h2 id="recargos" className="text-ui font-semibold text-heading">
            Recargos del mes
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Figure className="" label="Extra diurna" value={fmtH(d.recargos.diurna)} />
            <Figure className="" label="Extra nocturna" value={fmtH(d.recargos.nocturna)} />
            <Figure className="" label="Dominical diurna" value={fmtH(d.recargos.dom_diurna)} />
            <Figure className="" label="Dominical nocturna" value={fmtH(d.recargos.dom_nocturna)} />
          </dl>
          <p className="mt-3 text-caption font-normal text-muted">
            Clasificación según el archivo de novedades.
          </p>
        </section>
      )}

      {/* Historial por tramo, agrupado por mes */}
      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 text-title text-heading">
          ¿Cuándo hizo esas horas?
        </h2>
        {groups.length === 0 ? (
          <div className="card flex flex-col items-center py-8 text-center">
            <Icon name="calendar" className="h-8 w-8 text-brand dark:text-brand-300" />
            <p className="mt-2 text-ui font-semibold text-heading">Sin registros cargados</p>
            <p className="mt-1 text-small text-ink-2">
              Cuando Recursos Humanos cargue el archivo del biométrico, aquí aparecerá cada tramo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const isPeriod = g.year === p.year && g.month === p.month;
              const label = `${monthLabel(g.year, g.month)}${isPeriod && !closed ? " · mes en curso" : ""}`;
              const pendingN = g.entries.filter((h) => h.hasError && !h.reviewStatus).length;
              const body = <HistoryMonth entries={g.entries} label={monthLabel(g.year, g.month)} periodYear={p.year} />;
              return isPeriod ? (
                <div key={g.key} className="card overflow-hidden p-0">
                  <MonthHeading label={label} count={g.entries.length} pending={pendingN} />
                  {body}
                </div>
              ) : (
                <details key={g.key} className="card group overflow-hidden p-0">
                  <summary className="flex cursor-pointer list-none items-center gap-2 transition-colors duration-fast hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                    <MonthHeading label={label} count={g.entries.length} pending={pendingN} as="span" />
                    <Icon
                      name="chevron-down"
                      className="mr-4 h-4 w-4 shrink-0 text-muted transition-transform duration-base ease-move group-open:rotate-180"
                    />
                  </summary>
                  <div className="border-t border-line motion-safe:group-open:animate-fade-in">{body}</div>
                </details>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-caption font-normal text-muted">
          El color del acumulado compara con la meta a esa fecha: naranja por encima, rojo por
          encima de {RULES.MONTHLY_OVERTIME_LIMIT}h. «—»: el archivo de novedades solo trae horas
          extra, no horas totales.
        </p>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- */

const METRIC_BAR = { red: "bg-over-solid", yellow: "bg-risk-solid", green: "bg-ok-solid" } as const;

/** Cifra clave: cuenta hasta su valor; barra y color solo cuando es alerta. */
function Metric({
  label,
  value,
  prefix = "",
  hint,
  tone,
}: {
  label: string;
  value: number;
  prefix?: string;
  hint?: string;
  tone?: Detail["level"];
}) {
  return (
    <div className="card relative flex flex-col overflow-hidden">
      <span
        aria-hidden
        className={clsx("print-exact absolute inset-x-0 top-0 h-[3px]", tone ? METRIC_BAR[tone] : "bg-brand-200 dark:bg-brand-300/40")}
      />
      <p className="flex items-center gap-1.5 text-small text-ink-2">
        {tone && <LevelIcon level={tone} className={LEVEL_TEXT[tone]} />}
        {label}
      </p>
      <p className={clsx("mt-1 whitespace-nowrap text-display tabular-nums", tone ? LEVEL_TEXT[tone] : "text-heading")}>
        <AnimatedNumber value={value} decimals={1} suffix="h" prefix={prefix} />
      </p>
      {hint && <p className="mt-auto pt-1 text-caption font-normal text-muted">{hint}</p>}
    </div>
  );
}

/** Dato secundario dentro de una tarjeta de lista (dl). */
function Figure({
  label,
  value,
  hint,
  className = "px-3 first:pl-0 last:pr-0",
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={clsx("min-w-0", className)}>
      <dt className="text-caption font-normal text-ink-2">{label}</dt>
      <dd className="mt-0.5 truncate text-[1.125rem] font-bold tabular-nums text-heading">{value}</dd>
      {hint && <dd className="text-caption font-normal text-muted">{hint}</dd>}
    </div>
  );
}

function MonthHeading({
  label,
  count,
  pending,
  as = "h3",
}: {
  label: string;
  count: number;
  pending: number;
  as?: "h3" | "span";
}) {
  const Tag = as;
  return (
    <div className="flex min-h-12 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
      <Tag className="text-ui font-semibold text-heading">{label}</Tag>
      <span className="text-small text-muted">
        {count} tramo{count === 1 ? "" : "s"}
      </span>
      {pending > 0 && (
        <span className="chip-pending">
          <PendingIcon /> {pending} por revisar
        </span>
      )}
    </div>
  );
}

function RecordChip({ h }: { h: HistoryEntry }) {
  if (h.hasError && !h.reviewStatus) {
    return (
      <span className="chip-pending" title={h.errorReason}>
        <PendingIcon /> Por revisar
      </span>
    );
  }
  if (h.reviewStatus === "descartado") {
    return (
      <span className="chip" title={h.errorReason}>
        Descartado
      </span>
    );
  }
  if (h.reviewStatus === "corregido") {
    return (
      <span className="chip-ok">
        <Icon name="check" className="h-3 w-3" /> Corregido
      </span>
    );
  }
  return (
    <span className="chip-ok">
      <Icon name="check" className="h-3 w-3" /> Validado
    </span>
  );
}

const EstimatedChip = () => (
  <span
    className="chip ml-2 align-middle"
    title="Semana que cruza de mes sin detalle por día: horas repartidas por días"
  >
    estimado
  </span>
);

/** Tramos de un mes: tarjetas en el teléfono, tabla desde 640px. */
function HistoryMonth({
  entries,
  label,
  periodYear,
}: {
  entries: HistoryEntry[];
  label: string;
  periodYear: number;
}) {
  const frozen = (h: HistoryEntry) => h.hasError && !h.reviewStatus;
  return (
    <>
      <ul className="divide-y divide-line border-t border-line sm:hidden print:hidden">
        {entries.map((h) => (
          <li
            key={h.key}
            className={clsx(
              "px-4 py-3",
              frozen(h) && "bg-pending-soft/60 shadow-[inset_3px_0_0_rgb(var(--c-pending-solid))]"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-ui text-ink">
                {h.label}
                {h.year !== periodYear && <span className="text-muted"> {h.year}</span>}
                {h.estimated && <EstimatedChip />}
              </p>
              <RecordChip h={h} />
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <dt className="text-caption font-normal text-muted">Extra</dt>
                <dd className="text-ui tabular-nums text-ink">
                  {h.hasError ? <span className="text-small text-muted">sin validar</span> : fmtH(h.overtimeHours)}
                </dd>
              </div>
              <div>
                <dt className="text-caption font-normal text-muted">Acumulado</dt>
                <dd className={clsx("text-ui tabular-nums", accCls(h.monthToDate, h.targetToDate))}>
                  {fmtH(h.monthToDate)}
                </dd>
              </div>
              <div>
                <dt className="text-caption font-normal text-muted">Meta a esa fecha</dt>
                <dd className="text-ui tabular-nums text-ink-2">{fmtH(h.targetToDate)}</dd>
              </div>
            </dl>
            <p className="mt-1 text-caption font-normal text-muted">
              Total trabajado: {h.totalHours != null ? fmtH(h.totalHours) : "—"}
            </p>
          </li>
        ))}
      </ul>

      <div
        className="table-scroll hidden sm:block print:block"
        role="region"
        aria-label={`Historial por tramo · ${label}`}
        tabIndex={0}
      >
        <table className="min-w-full text-sm">
          <thead className="bg-surface-2">
            <tr className="border-b border-line">
              <th scope="col" className="th">Periodo</th>
              <th scope="col" className="th-num">Extra</th>
              <th scope="col" className="th-num">Acumulado del mes</th>
              <th scope="col" className="th-num">Meta a esa fecha</th>
              <th scope="col" className="th-num">Total</th>
              <th scope="col" className="th">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((h) => (
              <tr
                key={h.key}
                className={clsx(
                  "transition-colors duration-fast hover:bg-surface-2",
                  frozen(h) && "bg-pending-soft/60 shadow-[inset_3px_0_0_rgb(var(--c-pending-solid))] hover:bg-pending-soft"
                )}
              >
                <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-left font-normal text-ink">
                  {h.label}
                  {h.year !== periodYear && <span className="text-muted"> {h.year}</span>}
                  {h.estimated && <EstimatedChip />}
                </th>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-ink-2">
                  {h.hasError ? <span className="text-small text-muted">sin validar</span> : fmtH(h.overtimeHours)}
                </td>
                <td className={clsx("whitespace-nowrap px-4 py-2.5 text-right tabular-nums", accCls(h.monthToDate, h.targetToDate))}>
                  {fmtH(h.monthToDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-ink-2">
                  {fmtH(h.targetToDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-ink-2">
                  {h.totalHours != null ? fmtH(h.totalHours) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <RecordChip h={h} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
