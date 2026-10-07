"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { LevelIcon, PendingIcon } from "./StatusBadge";
import { Icon } from "./ui/Icon";
import { RULES } from "@/lib/overtime";

const STATES = [
  {
    key: "green",
    icon: <LevelIcon level="green" className="h-3 w-3 text-ok-solid" />,
    t: "Normal",
    d: `Va dentro de la meta a la fecha y, a su ritmo, cierra el mes en ${RULES.MONTHLY_OVERTIME_LIMIT}h o menos.`,
  },
  {
    key: "yellow",
    icon: <LevelIcon level="yellow" className="h-3 w-3 text-risk-solid" />,
    t: "En riesgo",
    d: `Su acumulado supera la meta a la fecha (${RULES.WEEKLY_OVERTIME_LIMIT}h por semana, proporcional en semanas parciales), o a su ritmo cerraría el mes por encima de ${RULES.MONTHLY_OVERTIME_LIMIT}h.`,
  },
  {
    key: "red",
    icon: <LevelIcon level="red" className="h-3 w-3 text-over-solid" />,
    t: "Excedido",
    d: `Superó las ${RULES.MONTHLY_OVERTIME_LIMIT} horas extra del mes.`,
  },
  {
    key: "pending",
    icon: <PendingIcon className="h-3.5 w-3.5 text-pending" />,
    t: "Por revisar",
    d: `Tiene un turno de más de ${RULES.ORPHAN_SHIFT_HOURS}h sin marcación de salida: queda congelado y no suma hasta que Recursos Humanos lo revise.`,
  },
  {
    key: "week",
    icon: <Icon name="calendar" className="h-3.5 w-3.5 text-info" />,
    t: `Semana > ${RULES.WEEKLY_OVERTIME_LIMIT}h`,
    d: `Alerta informativa: pasó de ${RULES.WEEKLY_OVERTIME_LIMIT}h extra en una semana (lunes a domingo). Por sí sola no cambia el estado.`,
  },
];

/**
 * Leyenda compacta: la regla que manda en una línea y, bajo demanda, qué
 * significa cada estado. Los conteos viven en el semáforo del encabezado
 * (una sola fuente por dato); `counts` se acepta por compatibilidad.
 */
export function LegendStrip({
  className,
}: {
  counts?: Record<"green" | "yellow" | "red", number>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !open);
  }, [open]);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-small text-ink-2">
          <strong className="font-semibold text-heading">
            Límite: {RULES.MONTHLY_OVERTIME_LIMIT}h extra al mes.
          </strong>{" "}
          La meta sube {RULES.WEEKLY_OVERTIME_LIMIT}h por semana completa, proporcional en
          semanas parciales.
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-small font-semibold text-link transition-colors duration-fast hover:bg-primary-soft hover:text-link-hover sm:min-h-9"
        >
          {open ? "Ocultar la explicación" : "¿Qué significa cada estado?"}
          <Icon
            name="chevron-down"
            className={clsx(
              "h-4 w-4 transition-transform duration-base ease-move",
              open && "rotate-180"
            )}
          />
        </button>
      </div>

      <div
        id={id}
        ref={ref}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows] print:hidden",
          open
            ? "grid-rows-[1fr] duration-[280ms] ease-enter"
            : "grid-rows-[0fr] duration-[220ms] ease-exit"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <dl
            className={clsx(
              "grid gap-2 pt-3 transition-[opacity,transform] sm:grid-cols-2 lg:grid-cols-5",
              open
                ? "translate-y-0 opacity-100 delay-[60ms] duration-[200ms] ease-enter"
                : "-translate-y-1 opacity-0 duration-[120ms] ease-exit"
            )}
          >
            {STATES.map((s) => (
              <div key={s.key} className="rounded-control bg-surface-2 p-3">
                <dt className="flex items-center gap-2 text-small font-semibold text-heading">
                  {s.icon}
                  {s.t}
                </dt>
                <dd className="mt-1 text-small text-ink-2">{s.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
