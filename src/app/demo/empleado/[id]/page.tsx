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
  searchParams: { rol?: string };
}) {
  const role = (["rrhh", "director", "jefe"].includes(searchParams.rol ?? "")
    ? searchParams.rol
    : "rrhh") as Role;

  const detail = demoEmployeeDetail(params.id, role);
  if (!detail) notFound();
  return (
    <EmployeeDetailView detail={detail} backHref={`/demo/dashboard?rol=${role}`} />
  );
}
