import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "green" | "yellow" | "red";
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900",
  green: "text-status-green",
  yellow: "text-status-yellow",
  red: "text-status-red",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="card flex flex-col">
      <p className="text-xs leading-snug text-slate-500 sm:text-sm">{label}</p>
      <p className={clsx("mt-1 text-2xl font-semibold leading-tight sm:text-3xl", TONES[tone])}>
        {value}
      </p>
      {hint && <p className="mt-auto pt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
