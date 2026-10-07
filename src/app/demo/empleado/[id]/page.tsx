import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeDetailView } from "@/components/EmployeeDetail";
import { demoEmployeeDetail } from "@/lib/demo";
import { monthLabel } from "@/lib/dates";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: Record<string, string | undefined>;
};

const roleOf = (searchParams: Props["searchParams"]) =>
  (["rrhh", "director", "jefe"].includes(searchParams.rol ?? "") ? searchParams.rol : "rrhh") as Role;

export function generateMetadata({ params, searchParams }: Props): Metadata {
  const detail = demoEmployeeDetail(params.id, roleOf(searchParams));
  if (!detail) return { title: "Persona no encontrada" };
  const name = detail.employee.name ?? detail.employee.code;
  return { title: `${name} · ${monthLabel(detail.period.year, detail.period.month)} (demo)` };
}

export default function DemoEmpleadoPage({ params, searchParams }: Props) {
  const role = roleOf(searchParams);

  const detail = demoEmployeeDetail(params.id, role);
  if (!detail) notFound();

  // Conserva los filtros con los que se llegó (y el rol de la demostración).
  const qs = new URLSearchParams(
    Object.entries({ ...searchParams, rol: role }).filter(([, v]) => v) as [
      string,
      string,
    ][]
  ).toString();

  return (
    <EmployeeDetailView detail={detail} backHref={`/demo/dashboard?${qs}`} />
  );
}
