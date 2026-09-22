import { DashboardView } from "@/components/DashboardView";
import { demoDashboard } from "@/lib/demo";
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
  searchParams: { rol?: string };
}) {
  const role = (["rrhh", "director", "jefe"].includes(searchParams.rol ?? "")
    ? searchParams.rol
    : "rrhh") as Role;

  const { statuses, summary, charts, period } = demoDashboard(role);

  return (
    <DashboardView
      statuses={statuses}
      summary={summary}
      charts={charts}
      period={period}
      scopeLabel={ROLE_LABEL[role]}
      hrefBase="/demo/empleado"
      roleParam={role}
    />
  );
}
