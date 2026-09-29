import clsx from "clsx";
import type { SemaphoreLevel } from "@/lib/types";

const LABELS: Record<SemaphoreLevel, string> = {
  green: "Normal",
  yellow: "Preventivo",
  red: "Crítico",
};

const STYLES: Record<SemaphoreLevel, string> = {
  green: "bg-green-100 text-green-800 ring-green-600/20",
  yellow: "bg-amber-100 text-amber-800 ring-amber-600/20",
  red: "bg-red-100 text-red-800 ring-red-600/20",
};

/**
 * Cada estado tiene su propia forma además del color (círculo, triángulo,
 * rombo), para que no dependa solo del color.
 */
export function LevelIcon({
  level,
  className,
}: {
  level: SemaphoreLevel;
  className?: string;
}) {
  const cls = clsx("h-2.5 w-2.5 shrink-0", className);
  if (level === "red") {
    return (
      <svg viewBox="0 0 10 10" className={cls} aria-hidden>
        <path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="currentColor" />
      </svg>
    );
  }
  if (level === "yellow") {
    return (
      <svg viewBox="0 0 10 10" className={cls} aria-hidden>
        <path d="M5 0.8 9.6 9.2H0.4Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 10 10" className={cls} aria-hidden>
      <circle cx="5" cy="5" r="4.2" fill="currentColor" />
    </svg>
  );
}

/** Icono de «por revisar» (reloj): registros congelados sin resolver. */
export function PendingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={clsx("h-3 w-3 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.6V8l2.3 1.6" />
    </svg>
  );
}

/**
 * Estado del semáforo. Con `pending`, añade el aviso «Por revisar»: la
 * persona tiene registros congelados y su estado puede cambiar al resolverlos.
 */
export function StatusBadge({
  level,
  pending = 0,
}: {
  level: SemaphoreLevel;
  pending?: number;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
          STYLES[level]
        )}
      >
        <LevelIcon level={level} />
        {LABELS[level]}
      </span>
      {pending > 0 && (
        <span
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-inset ring-violet-600/20"
          title={`${pending} registro${pending > 1 ? "s" : ""} congelado${pending > 1 ? "s" : ""} por revisar: el estado puede cambiar al resolverlo${pending > 1 ? "s" : ""}.`}
        >
          <PendingIcon />
          Por revisar
        </span>
      )}
    </span>
  );
}
