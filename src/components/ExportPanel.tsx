"use client";

import type { Period } from "@/lib/aggregate";

export function ExportPanel({ period }: { period: Period }) {
  const href = `/api/export?year=${period.year}&month=${period.month}&week=${period.week}`;
  return (
    <a href={href} className="btn-primary" download>
      Descargar CSV de nómina
    </a>
  );
}
