"use client";

import type { HeatmapData } from "@/lib/aggregate";
import { useDrawer } from "../drawer/context";
import { groupView } from "../drawer/views";

// Mapa de calor área × tramo. El valor es horas extra POR PERSONA del área en
// ese tramo, comparado con la meta del tramo (12h por semana completa,
// proporcional en los parciales). Así un área grande no se ve más «caliente»
// solo por tener más gente. Escala de un solo tono (Azul ALIÓN).

function shade(ratio: number): { bg: string; fg: string } {
  if (ratio <= 0) return { bg: "#f1f5f9", fg: "#475569" };
  const t = Math.min(1, ratio / 1.5);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = lerp(0xeb, 0x00);
  const g = lerp(0xf7, 0x38);
  const b = lerp(0xf9, 0x65);
  return { bg: `rgb(${r},${g},${b})`, fg: t > 0.6 ? "#ffffff" : "#003865" };
}

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export function Heatmap({ data }: { data: HeatmapData }) {
  const drawer = useDrawer();
  const openArea = (area: string) => drawer?.open(groupView("area", area));

  if (data.areas.length === 0 || data.segments.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-600">Sin horas extra en el periodo.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
        <caption className="sr-only">
          Horas extra por persona, por área y tramo del mes, frente a la meta del tramo
        </caption>
        <thead>
          <tr>
            <th scope="col" className="p-1 text-left text-[13px] font-semibold text-slate-600">
              Área
            </th>
            {data.segments.map((s) => (
              <th
                key={s.key}
                scope="col"
                className="whitespace-nowrap p-1 text-center text-[13px] font-semibold text-slate-600"
                title={`${s.label} · meta ${fmt(s.segmentTarget)}h por persona`}
              >
                {s.short}
                <span className="block text-[11px] font-normal text-slate-500">
                  meta {fmt(s.segmentTarget)}h
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.areas.map((area) => (
            <tr key={area}>
              <th scope="row" className="p-0 pr-2 text-left font-normal">
                <button
                  type="button"
                  onClick={() => openArea(area)}
                  className="block max-w-[16rem] truncate rounded-md px-1.5 py-2 text-left text-[13px] text-slate-700 transition hover:bg-brand-tint hover:text-brand-dark"
                  title={`Ver el detalle de ${area} (${data.headcount[area] ?? 0} personas)`}
                >
                  {area}
                </button>
              </th>
              {data.segments.map((s) => {
                const v = data.values[area]?.[s.key] ?? 0;
                const ratio = s.segmentTarget > 0 ? v / s.segmentTarget : 0;
                const { bg, fg } = shade(ratio);
                const over = ratio > 1;
                return (
                  <td key={s.key} className="p-0">
                    <button
                      type="button"
                      onClick={() => openArea(area)}
                      className="flex h-10 w-full min-w-[52px] items-center justify-center gap-0.5 rounded-md text-xs font-semibold tabular-nums transition hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                      style={{ backgroundColor: bg, color: fg }}
                      title={`${area} · ${s.label}: ${fmt(v)}h por persona (meta ${fmt(s.segmentTarget)}h)`}
                    >
                      {v > 0 ? fmt(v) : ""}
                      {over && <span aria-label="sobre la meta">▲</span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span>Horas por persona frente a la meta del tramo:</span>
        {[
          { r: 0.25, t: "¼ de la meta" },
          { r: 0.5, t: "½" },
          { r: 1, t: "en la meta" },
          { r: 1.5, t: "1,5× · ▲ sobre la meta" },
        ].map((x) => {
          const { bg } = shade(x.r);
          return (
            <span key={x.t} className="inline-flex items-center gap-1">
              <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: bg }} aria-hidden />
              {x.t}
            </span>
          );
        })}
      </div>
    </div>
  );
}
