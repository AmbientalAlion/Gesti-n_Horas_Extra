import { DashboardView } from "@/components/DashboardView";
import { PrintButton } from "@/components/PrintButton";
import { demoDashboard } from "@/lib/demo";
import type { Filters } from "@/lib/aggregate";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<Role, string> = {
  rrhh: "Recursos Humanos — planta completa",
  director: "Director General — planta completa",
  jefe: "Jefe Inmediato — solo su equipo",
};

export default function DemoDashboard({
  searchParams,
}: {
  searchParams: { rol?: string; planta?: string; area?: string; jefe?: string };
}) {
  const role = (["rrhh", "director", "jefe"].includes(searchParams.rol ?? "")
    ? searchParams.rol
    : "rrhh") as Role;

  const filters: Filters = {
    plant: searchParams.planta || undefined,
    area: searchParams.area || undefined,
    manager: searchParams.jefe || undefined,
  };

  const { statuses, summary, charts, period, filterOptions } = demoDashboard(
    role,
    filters
  );

  return (
    <DashboardView
      statuses={statuses}
      summary={summary}
      charts={charts}
      period={period}
      scopeLabel={ROLE_LABEL[role]}
      hrefBase="/demo/empleado"
      roleParam={role}
      filterOptions={filterOptions}
      filters={filters}
      toolbar={<PrintButton />}
    />
  );
}
