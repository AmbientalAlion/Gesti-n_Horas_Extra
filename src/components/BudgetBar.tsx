import clsx from "clsx";

/**
 * Barra de horas extra frente a un umbral.
 *
 * - mode="limit" (por defecto): el límite legal MENSUAL. Verde por debajo del
 *   aviso, naranja cerca, rojo si se supera; muestra lo disponible o el exceso.
 * - mode="reference": la referencia SEMANAL de 12h. Superarla está permitido,
 *   así que es neutra: sin rojo, sin la palabra «límite» y con una marca en
 *   la referencia para ubicar la cifra.
 */
export function BudgetBar({
  used,
  limit,
  warning,
  unit = "h",
  mode = "limit",
}: {
  used: number;
  limit: number;
  warning: number;
  unit?: string;
  mode?: "limit" | "reference";
}) {
  if (mode === "reference") {
    const scale = Math.max(limit * 1.5, used, 1);
    const pct = Math.min(100, (used / scale) * 100);
    const refPct = (limit / scale) * 100;
    return (
      <div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-semibold tabular-nums text-brand-dark">
            {used.toFixed(1)}
            {unit}
          </span>
          <span className="text-xs text-slate-600">
            referencia {limit}
            {unit} · se puede superar
          </span>
        </div>
        <div className="relative mt-2 h-2.5 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-light"
            style={{ width: `${pct}%` }}
          />
          <span
            className="absolute -top-1 w-0.5 rounded bg-slate-500"
            style={{ left: `${refPct}%`, height: "18px" }}
            title={`Referencia: ${limit}${unit}`}
            aria-hidden
          />
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {used > limit
            ? `${(used - limit).toFixed(1)}${unit} sobre la referencia · informativo`
            : "Informativo: el límite que cuenta es el mensual"}
        </div>
      </div>
    );
  }

  const pct = Math.min(100, (used / limit) * 100);
  const over = used > limit;
  const near = used >= warning;
  const color = over
    ? "bg-status-red"
    : near
      ? "bg-status-yellow"
      : "bg-status-green";
  const available = Math.max(0, limit - used);
  const excess = Math.max(0, used - limit);

  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        {over ? (
          <>
            <span className="text-2xl font-semibold tabular-nums text-status-red">
              +{excess.toFixed(1)}
              {unit}
            </span>
            <span className="text-xs font-medium text-status-red">
              por encima del límite de {limit}
              {unit}
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold tabular-nums text-brand-dark">
              {available.toFixed(1)}
              {unit}
            </span>
            <span className="text-xs text-slate-600">
              disponibles de {limit}
              {unit}
            </span>
          </>
        )}
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-600">
        {used.toFixed(1)}
        {unit} usadas · {((used / limit) * 100).toFixed(0)}% del límite
      </div>
    </div>
  );
}
