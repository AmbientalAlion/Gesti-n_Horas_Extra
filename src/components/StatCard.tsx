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
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={clsx("mt-1 text-3xl font-semibold", TONES[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
