"use client";

import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Icon } from "./ui/Icon";
import { Spinner } from "./ui/Spinner";
import { useNavigateSearch } from "./dashboard/DashboardNav";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type YM = { year: number; month: number };
const idx = (v: YM) => v.year * 12 + (v.month - 1);
const fromIdx = (i: number): YM => ({ year: Math.floor(i / 12), month: (i % 12) + 1 });
const label = (v: YM) => `${MONTHS[v.month - 1]} ${v.year}`;

/**
 * Selector de mes en forma de stepper: «‹ junio 2026 ›».
 *
 * - Flechas de 44/40px con nombre completo («Mes anterior: mayo 2026»).
 * - Con `max`, no deja ir a meses futuros (las flechas quedan aria-disabled,
 *   sin perder el foco, y esos meses aparecen deshabilitados en el select).
 * - No se deshabilita mientras carga: muestra un spinner y conserva el foco.
 * - Dentro del panel usa la transición compartida (la región de datos se
 *   atenúa); fuera de él, la suya propia.
 */
export function MonthSelector({
  year,
  month,
  max,
}: {
  year: number;
  month: number;
  /** Último mes elegible (normalmente, el mes en curso). */
  max?: YM;
}) {
  const params = useSearchParams();
  const { isPending, navigate } = useNavigateSearch();
  const cur: YM = { year, month };
  const maxIdx = max ? idx(max) : Infinity;

  const go = (v: YM) => {
    const i = Math.min(idx(v), maxIdx);
    const t = fromIdx(i);
    if (i === idx(cur)) return;
    const next = new URLSearchParams(params.toString());
    next.set("mes", String(t.month));
    next.set("anio", String(t.year));
    navigate(next.toString());
  };

  const prev = fromIdx(idx(cur) - 1);
  const nextM = fromIdx(idx(cur) + 1);
  const canNext = idx(nextM) <= maxIdx;

  const lastYear = max ? Math.max(max.year, year) : year + 1;
  const years: number[] = [];
  for (let y = Math.min(year, lastYear) - 2; y <= lastYear; y++) years.push(y);

  const arrow =
    "btn-icon inline-flex items-center justify-center rounded-control text-ink-2 transition-colors duration-fast hover:bg-primary-soft hover:text-heading active:bg-surface-3 aria-disabled:cursor-not-allowed aria-disabled:text-line-strong aria-disabled:hover:bg-transparent";
  const sel =
    "min-h-11 cursor-pointer appearance-none rounded-chip bg-transparent px-1.5 text-ui font-semibold text-ink transition-colors duration-fast hover:bg-primary-soft focus-visible:bg-primary-soft sm:min-h-10";

  return (
    <div
      role="group"
      aria-label="Mes del panel"
      aria-busy={isPending || undefined}
      className="inline-flex items-center rounded-control border border-line-strong bg-surface print:hidden"
    >
      <button
        type="button"
        className={arrow}
        onClick={() => go(prev)}
        aria-label={`Mes anterior: ${label(prev)}`}
        title={`Mes anterior: ${label(prev)}`}
      >
        <Icon name="chevron-left" className="h-4 w-4" strokeWidth={2.25} />
      </button>

      <label className="sr-only" htmlFor="selector-mes">
        Mes
      </label>
      <select
        id="selector-mes"
        value={month}
        onChange={(e) => go({ year, month: Number(e.target.value) })}
        className={clsx(sel, "capitalize")}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1} disabled={idx({ year, month: i + 1 }) > maxIdx}>
            {m}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="selector-anio">
        Año
      </label>
      <select
        id="selector-anio"
        value={year}
        onChange={(e) => go({ year: Number(e.target.value), month })}
        className={clsx(sel, "tabular-nums")}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={arrow}
        onClick={() => canNext && go(nextM)}
        aria-disabled={!canNext || undefined}
        aria-label={canNext ? `Mes siguiente: ${label(nextM)}` : "Mes siguiente: aún no disponible"}
        title={canNext ? `Mes siguiente: ${label(nextM)}` : "Ese mes aún no empieza"}
      >
        {isPending ? (
          <Spinner className="h-4 w-4 text-link" />
        ) : (
          <Icon name="chevron-right" className="h-4 w-4" strokeWidth={2.25} />
        )}
      </button>
    </div>
  );
}
