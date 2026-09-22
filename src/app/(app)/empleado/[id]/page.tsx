import { notFound } from "next/navigation";
import { EmployeeDetailView } from "@/components/EmployeeDetail";
import { getEmployeeDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EmpleadoPage({
  params,
}: {
  params: { id: string };
}) {
  const detail = await getEmployeeDetail(params.id);
  if (!detail) notFound();
  return <EmployeeDetailView detail={detail} backHref="/dashboard" />;
}
