"use client";

import { useId, useMemo } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { Collapse } from "../Collapse";
import { MONTHS, formatWeekLabel, parseIsoDate, weekInfo } from "@/lib/dates";
import { splitWeek } from "@/lib/ingest";

export type CutType = "parcial" | "final";

/** Semana ISO a partir de cualquier día (yyyy-mm-dd). */
export function weekOf(day: string) {
  const c = parseIsoDate(day);
  if (!c) return null;
  const w = weekInfo(c);
  return { isoYear: w.year, week: w.week, label: formatWeekLabel(w.year, w.week) };
}

/**
 * Periodo del archivo semanal: un día de la semana y el tipo de corte (dos
 * tarjetas de opción). Avisa antes de enviar si la semana cruza de mes.
 */
export function PeriodFields({
  weekDay,
  onWeekDay,
  cutType,
  onCutType,
  until,
  onUntil,
  disabled,
}: {
  weekDay: string;
  onWeekDay: (v: string) => void;
  cutType: CutType;
  onCutType: (v: CutType) => void;
  until: string;
  onUntil: (v: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const week = useMemo(() => weekOf(weekDay), [weekDay]);
  const months = useMemo(() => {
    if (!week) return [];
    try {
      return splitWeek(week.isoYear, week.week, cutType === "parcial" ? until : undefined).map(
        (s) => MONTHS[s.month - 1]
      );
    } catch {
      return [];
    }
  }, [week, cutType, until]);

  const option = (value: CutType, title: string, text: string) => (
    <label
      className={clsx(
        "relative flex cursor-pointer items-start gap-3 rounded-control border-2 bg-surface p-3 transition-[border-color,background-color,box-shadow] duration-fast ease-enter",
        "has-[:focus-visible]:shadow-[0_0_0_4px_rgb(var(--c-focus)/0.25)]",
        cutType === value ? "border-primary bg-primary-soft" : "border-line hover:border-primary/50"
      )}
    >
      <input
        type="radio"
        name={`${id}-cut`}
        value={value}
        checked={cutType === value}
        onChange={() => onCutType(value)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span>
        <span className="block text-ui font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-small text-ink-2">{text}</span>
      </span>
    </label>
  );

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-title text-heading">Periodo del archivo semanal</legend>
      <p className="-mt-2 text-small text-ink-2">
        El archivo semanal no trae fechas: indique a qué semana corresponde.
      </p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,16rem)_1fr]">
        <div>
          <label htmlFor={`${id}-day`} className="label-field">
            Un día de la semana del archivo
          </label>
          <input
            id={`${id}-day`}
            type="date"
            value={weekDay}
            onChange={(e) => onWeekDay(e.target.value)}
            aria-invalid={!week || undefined}
            aria-describedby={`${id}-week`}
            className="field"
          />
          <p id={`${id}-week`} className={clsx("mt-1.5 text-small", week ? "text-ink-2" : "text-over")}>
            {week ? (
              <>
                Semana del <strong className="font-semibold text-ink">{week.label}</strong>
              </>
            ) : (
              "Escriba una fecha válida."
            )}
          </p>
        </div>
        <div role="radiogroup" aria-label="Tipo de corte" className="grid gap-3 sm:grid-cols-2">
          {option("final", "Semana completa", "El archivo trae de lunes a domingo.")}
          {option("parcial", "Corte parcial", "Trae datos solo hasta cierto día.")}
        </div>
      </div>

      <Collapse open={cutType === "parcial"}>
        <div className="max-w-[16rem]">
          <label htmlFor={`${id}-until`} className="label-field">
            Datos hasta el día
          </label>
          <input
            id={`${id}-until`}
            type="date"
            value={until}
            onChange={(e) => onUntil(e.target.value)}
            className="field"
            required={cutType === "parcial"}
          />
        </div>
      </Collapse>

      <Collapse open={months.length > 1}>
        <p className="flex items-start gap-2 rounded-control border border-info-border bg-info-soft px-3 py-2 text-small text-info">
          <Icon name="calendar" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Esta semana cruza de mes: las horas se repartirán por días entre{" "}
            <strong>{months[0]}</strong> y <strong>{months[1]}</strong> y quedarán marcadas como
            «estimado».
          </span>
        </p>
      </Collapse>
    </fieldset>
  );
}
