import { notFound } from "next/navigation";
import { EmployeeDetailView } from "@/components/EmployeeDetail";
import { getEmployeeDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EmpleadoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | undefined>;
}) {
  const detail = await getEmployeeDetail(params.id);
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
