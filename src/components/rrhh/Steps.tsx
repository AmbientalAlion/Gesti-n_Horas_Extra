import clsx from "clsx";

/**
 * Indicador de pasos de un asistente.
 *
 *   <Steps steps={["Archivo", "Vista previa", "Resultado"]} current={1} />
 *
 * - Desde sm: círculos de 28px unidos por un conector de 2px que se rellena
 *   (scaleX 0→1, 320ms). Paso hecho: check que se dibuja; activo: relleno
 *   primario con aria-current="step"; pendiente: contorno.
 * - En el teléfono: «Paso 2 de 3 · Vista previa» y una barra de 4px.
 * - `failed`: el paso activo terminó en error (anillo rojo, sin check).
 */
export function Steps({
  steps,
  current,
  failed = false,
  label = "Pasos",
  className,
}: {
  steps: string[];
  current: number;
  failed?: boolean;
  label?: string;
  className?: string;
}) {
  const total = steps.length;
  const pct = ((Math.min(current, total - 1) + 1) / total) * 100;
  return (
    <nav aria-label={label} className={className}>
      {/* Teléfono */}
      <div className="sm:hidden">
        <p className="text-small text-ink-2">
          <span className="font-semibold text-heading">
            Paso {current + 1} de {total}
          </span>{" "}
          · {steps[current]}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <div
            className={clsx(
              "h-full rounded-full transition-[width] duration-slow ease-enter",
              failed ? "bg-over-solid" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Desde sm */}
      <ol className="hidden items-center sm:flex">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s}
              className={clsx("flex items-center", i < total - 1 && "flex-1")}
              aria-current={active ? "step" : undefined}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={clsx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-caption font-bold tabular-nums transition-[background-color,border-color,color,box-shadow] duration-base ease-enter",
                    done && "border-primary bg-primary-soft text-heading",
                    active && !failed && "border-primary bg-primary text-on-primary shadow-[0_0_0_4px_rgb(var(--c-primary)/0.15)]",
                    active && failed && "border-over-solid bg-over-soft text-over shadow-[0_0_0_4px_rgb(var(--c-over-solid)/0.15)]",
                    !done && !active && "border-line-strong bg-surface text-ink-2"
                  )}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden focusable="false">
                      <path
                        d="m5 12.5 4.5 4.5L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={1}
                        className="animate-draw-line [animation-duration:var(--dur-slow)]"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={clsx(
                    "whitespace-nowrap text-ui transition-colors duration-base",
                    active ? "font-semibold text-heading" : done ? "text-ink-2" : "text-muted"
                  )}
                >
                  {s}
                  <span className="sr-only">{done ? " (hecho)" : active ? " (actual)" : " (pendiente)"}</span>
                </span>
              </span>
              {i < total - 1 && (
                <span className="relative mx-3 h-0.5 min-w-6 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                  <span
                    className={clsx(
                      "absolute inset-0 origin-left bg-primary transition-transform duration-slow ease-enter",
                      done ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
