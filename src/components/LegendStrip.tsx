"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { useDrawer } from "./drawer/context";
import { LevelIcon } from "./StatusBadge";

const TONE = { green: "text-status-green", yellow: "text-status-yellow", red: "text-status-red" } as const;

const STATES = [
  {
    seg: "green" as const,
    level: "green" as const,
    t: "Normal",
    d: "Va dentro de la meta a la fecha y, a su ritmo, cierra el mes en 48h o menos.",
  },
  {
    seg: "yellow" as const,
    level: "yellow" as const,
    t: "En riesgo",
    d: "Su acumulado supera la meta a la fecha (12h por semana, proporcional en semanas parciales), o a su ritmo cerraría el mes por encima de 48h.",
  },
  {
    seg: "red" as const,
    level: "red" as const,
    t: "Excedido",
    d: "Superó las 48 horas extra del mes.",
  },
];

/**
 * Cómo leer el panel, en una sola franja: la regla que manda siempre a la
 * vista, los estados como accesos directos a su lista y el detalle desplegable.
 */
export function LegendStrip({ counts }: { counts: Record<"green" | "yellow" | "red", number> }) {
  const drawer = useDrawer();
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !open);
  }, [open]);

  return (
    <section className="rounded-xl border border-brand/20 bg-brand-tint px-4 py-3 motion-safe:animate-fade-in-up sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 text-sm leading-snug text-slate-700">
          <strong className="text-brand-dark">Límite: 48h extra al mes.</strong>{" "}
          <span className="text-slate-600">
            La meta avanza 12h por semana (proporcional en semanas parciales). Pasar de 12h
            en una semana genera una alerta informativa.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATES.map((s) => (
            <button
              key={s.seg}
              type="button"
              onClick={() => drawer?.open({ kind: "segment", segment: s.seg })}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-white hover:shadow-sm"
              title={`Ver a las personas en estado ${s.t.toLowerCase()}`}
            >
              <LevelIcon level={s.level} className={TONE[s.level]} />
              {s.t}
              <span className="tabular-nums text-slate-500">{counts[s.seg]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={id}
            className="inline-flex min-h-9 items-center px-2 text-xs font-semibold text-brand-dark underline underline-offset-2 hover:no-underline"
          >
            {open ? "Ocultar" : "¿Qué significa cada estado?"}
          </button>
        </div>
      </div>

      <div
        id={id}
        ref={ref}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <dl className="grid gap-3 pt-3 sm:grid-cols-3">
            {STATES.map((s) => (
              <div key={s.t} className="rounded-lg bg-white/70 p-3">
                <dt className="flex items-center gap-2 text-[13px] font-semibold text-brand-dark">
                  <LevelIcon level={s.level} className={TONE[s.level]} />
                  {s.t}
                </dt>
                <dd className="mt-1 text-[13px] leading-snug text-slate-600">{s.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
