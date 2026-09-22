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

const DOT: Record<SemaphoreLevel, string> = {
  green: "bg-status-green",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
};

export function StatusBadge({ level }: { level: SemaphoreLevel }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[level]
      )}
    >
      <span className={clsx("h-2 w-2 rounded-full", DOT[level])} aria-hidden />
      {LABELS[level]}
    </span>
  );
}
