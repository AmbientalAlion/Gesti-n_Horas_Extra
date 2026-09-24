import { notFound } from "next/navigation";
import { EmployeeDetailView } from "@/components/EmployeeDetail";
import { demoEmployeeDetail } from "@/lib/demo";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function DemoEmpleadoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | undefined>;
}) {
  const role = (["rrhh", "director", "jefe"].includes(searchParams.rol ?? "")
    ? searchParams.rol
    : "rrhh") as Role;

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
