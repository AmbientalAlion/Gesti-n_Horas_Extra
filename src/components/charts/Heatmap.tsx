"use client";

import { useRef } from "react";
import clsx from "clsx";
import type { HeatmapData } from "@/lib/aggregate";
import { useDrawer } from "../drawer/context";
import { groupView } from "../drawer/views";
import { useChartTooltip } from "./ChartTooltip";
import { EASE, fmt, useChartEntrance } from "./chart-utils";

// Mapa de calor área × tramo. El valor es horas extra POR PERSONA del área en
// ese tramo, comparado con la meta del tramo (12h por semana completa,
// proporcional en los parciales). Así un área grande no se ve más «caliente»
// solo por tener más gente.
//
// Escala discreta de 5 pasos anclada en la meta (variables --c-heat-0..4,
// con su color de texto comprobado en claro y en oscuro):
//   0  menos de ½ de la meta · 1  ½ a ¾ · 2  ¾ hasta la meta   (azules)
//   3  sobre la meta ▲       · 4  1,25× o más ▲                (naranjas)
// Lo que supera la meta lleva además el triángulo: no depende del tono.
// Celda sin horas: vacía, con borde punteado y «—».

export const HEAT_STEPS = [
  { min: 0, label: "menos de ½" },
  { min: 0.5, label: "½ a ¾" },
  { min: 0.75, label: "¾ a la meta" },
  { min: 1, label: "sobre la meta", over: true },
  { min: 1.25, label: "1,25× o más", over: true },
] as const;

export function heatStep(ratio: number): number {
  if (ratio > 1.25 - 1e-9) return 4;
  if (ratio > 1 + 1e-9) return 3;
  if (ratio >= 0.75) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

export const heatCellStyle = (s: number): React.CSSProperties => ({
  backgroundColor: `rgb(var(--c-heat-${s}))`,
  color: s >= 3 ? "rgb(var(--c-heat-ink-warm))" : "rgb(var(--c-heat-ink-cool))",
});

export function UpTriangle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={clsx("h-2 w-2 shrink-0", className)} aria-hidden focusable="false">
      <path d="M5 1 9.5 9H0.5Z" fill="currentColor" />
    </svg>
  );
}

export function Heatmap({ data }: { data: HeatmapData }) {
  const drawer = useDrawer();
  const openArea = (area: string) => drawer?.open(groupView("area", area));
  const tableRef = useRef<HTMLTableElement>(null);
  const tip = useChartTooltip();

  // Cascada corta en diagonal: (fila + columna) × 20 ms, tope 150 ms.
  useChartEntrance(tableRef, (root) =>
    Array.from(root.querySelectorAll<HTMLElement>("[data-cell]")).map((el) => {
      const [r, c] = (el.dataset.cell ?? "0,0").split(",").map(Number);
      return el.animate(
        [
          { opacity: 0, transform: "scale(0.92)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 240, delay: Math.min((r + c) * 20, 150), easing: EASE.enter, fill: "backwards" }
      );
    })
  );

  if (data.areas.length === 0 || data.segments.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-2">Sin horas extra en el periodo.</p>;
  }

  return (
    <div>
      <div className="table-scroll -mx-1 px-1 pb-1 [contain:inline-size]">
        <table ref={tableRef} className="w-full border-separate" style={{ borderSpacing: 3 }}>
          <caption className="sr-only">
            Horas extra por persona, por área y tramo del mes, frente a la meta del tramo
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-[1] bg-surface p-1 text-left text-caption font-semibold text-ink-2"
              >
                Área
              </th>
              {data.segments.map((s) => (
                <th
                  key={s.key}
                  scope="col"
                  className="whitespace-nowrap p-1 text-center text-small font-semibold text-ink-2"
                >
                  {s.short}
                  <span className="block text-[11px] font-medium text-muted">meta {fmt(s.segmentTarget)}h</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.areas.map((area, r) => {
              const people = data.headcount[area] ?? 0;
              return (
                <tr key={area}>
                  <th scope="row" className="sticky left-0 z-[1] bg-surface p-0 pr-2 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => openArea(area)}
                      className="group block min-h-11 w-full max-w-[11rem] rounded-chip px-1.5 py-1 text-left transition duration-fast hover:bg-primary-soft sm:max-w-[16rem]"
                      aria-label={`${area}, ${people} ${people === 1 ? "persona" : "personas"}. Ver el detalle`}
                    >
                      <span className="block truncate text-small font-medium text-ink-2 group-hover:text-heading">
                        {area}
                      </span>
                      <span className="block text-caption font-normal text-muted">
                        {people} pers.
                      </span>
                    </button>
                  </th>
                  {data.segments.map((s, c) => {
                    const v = data.values[area]?.[s.key] ?? 0;
                    const ratio = s.segmentTarget > 0 ? v / s.segmentTarget : 0;
                    const st = heatStep(ratio);
                    const over = v > 0 && ratio > 1 + 1e-9;
                    const empty = v <= 0;
                    const lines = [
                      empty ? "Sin horas extra" : `${fmt(v)}h por persona`,
                      `Meta del tramo ${fmt(s.segmentTarget)}h`,
                      ...(over ? ["Sobre la meta"] : []),
                      `${people} ${people === 1 ? "persona" : "personas"}`,
                    ];
                    const t = tip.bind(`${area}|${s.key}`, {
                      title: `${area} · ${s.label}`,
                      lines,
                      tone: over ? "risk" : "default",
                    });
                    return (
                      <td key={s.key} className="p-0">
                        <button
                          type="button"
                          onClick={() => {
                            tip.hide();
                            openArea(area);
                          }}
                          data-cell={`${r},${c}`}
                          className={clsx(
                            "flex h-11 w-full min-w-[3rem] items-center justify-center gap-1 rounded-chip text-xs font-semibold tabular-nums print-exact transition-shadow duration-fast hover:shadow-[0_0_0_2px_rgb(var(--c-primary))] sm:h-10",
                            empty && "border border-dashed border-line"
                          )}
                          style={empty ? { color: "rgb(var(--c-muted))" } : heatCellStyle(st)}
                          aria-label={`${area}, ${s.label}: ${lines.join(", ")}`}
                          {...t}
                        >
                          <span aria-hidden>{empty ? "—" : fmt(v)}</span>
                          {over && <UpTriangle />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-ink-2">
        <span className="w-full sm:w-auto">Horas por persona frente a la meta del tramo:</span>
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
          <span className="h-3.5 w-6 rounded-[3px] border border-dashed border-line-strong" aria-hidden />
          sin horas
        </span>
      </div>
      {tip.node}
    </div>
  );
}
