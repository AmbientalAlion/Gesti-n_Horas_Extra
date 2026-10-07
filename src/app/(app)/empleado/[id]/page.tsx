import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeDetailView } from "@/components/EmployeeDetail";
import { getEmployeeDetail } from "@/lib/data";
import { monthLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: Record<string, string | undefined>;
};

function monthOf(searchParams: Props["searchParams"]) {
  const mes = Number(searchParams.mes);
  const anio = Number(searchParams.anio);
  return mes >= 1 && mes <= 12 && anio >= 2000 && anio <= 2100 ? { year: anio, month: mes } : undefined;
}

// Una sola consulta por petición, aunque la usen el título y la página.
const load = cache((id: string, year?: number, month?: number) =>
  getEmployeeDetail(id, year && month ? { year, month } : undefined)
);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const m = monthOf(searchParams);
  const detail = await load(params.id, m?.year, m?.month);
  if (!detail) return { title: "Persona no encontrada" };
  const name = detail.employee.name ?? detail.employee.code;
  return { title: `${name} · ${monthLabel(detail.period.year, detail.period.month)}` };
}

export default async function EmpleadoPage({ params, searchParams }: Props) {
  const m = monthOf(searchParams);
  const detail = await load(params.id, m?.year, m?.month);
  if (!detail) notFound();

  // Vuelve al panel conservando los filtros y el mes con los que se llegó.
  const qs = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <EmployeeDetailView
      detail={detail}
      backHref={qs ? `/dashboard?${qs}` : "/dashboard"}
    />
  );
}
