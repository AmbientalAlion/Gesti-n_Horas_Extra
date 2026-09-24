import clsx from "clsx";

/**
 * Barra de consumo de un límite (semanal/mensual) de horas extra.
 * Verde < aviso, amarillo cerca del límite, rojo si lo supera.
 */
export function BudgetBar({
  used,
  limit,
  warning,
  unit = "h",
}: {
  used: number;
  limit: number;
  warning: number;
  unit?: string;
}) {
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
            <span className="text-xs text-slate-500">
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
      <div className="mt-1 text-xs text-slate-500">
        {used.toFixed(1)}
        {unit} usadas · {((used / limit) * 100).toFixed(0)}% del límite
      </div>
    </div>
  );
}
