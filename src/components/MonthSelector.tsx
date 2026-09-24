"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function MonthSelector({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    startTransition(() => router.push(`?${next.toString()}`, { scroll: false }));
  };

  const years = [year - 1, year, year + 1];

  return (
    <div className="flex items-center gap-2 print:hidden" aria-busy={isPending}>
      <select
        value={month}
        onChange={(e) => setParam("mes", e.target.value)}
        disabled={isPending}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
        aria-label="Mes"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => setParam("anio", e.target.value)}
        disabled={isPending}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
        aria-label="Año"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
