import type { EmployeeStatus } from "@/lib/aggregate";
import type { GroupDim, Segment } from "./context";

const PICK: Record<GroupDim, (s: EmployeeStatus) => string | undefined> = {
  area: (s) => s.area,
  planta: (s) => s.plant,
  direccion: (s) => s.direccion,
  jefe: (s) => s.managerName,
};

/** Personas que pertenecen a un grupo (área, planta, dirección o jefe). */
export function groupMembers(
  statuses: EmployeeStatus[],
  dim: GroupDim,
  label: string
): EmployeeStatus[] {
  const unassigned = label === "Sin asignar" || label === "Sin área";
  return statuses
    .filter((s) => {
      const v = PICK[dim](s);
      return v ? v === label : unassigned;
    })
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);
}

/** Personas de una lista predefinida (KPI, estado o alerta). */
export function segmentMembers(
  statuses: EmployeeStatus[],
  seg: Segment
): EmployeeStatus[] {
  const by = (f: (s: EmployeeStatus) => boolean) => statuses.filter(f);
  switch (seg) {
    case "red":
      return by((s) => s.level === "red").sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);
    case "yellow":
      return by((s) => s.level === "yellow").sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);
    case "green":
      return by((s) => s.level === "green").sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);
    case "atRisk":
      return by((s) => s.level !== "red" && s.willExceedMonthly).sort(
        (a, b) => b.projectedMonthlyOvertime - a.projectedMonthlyOvertime
      );
    case "errors":
      return by((s) => s.hasError);
    case "weeklyHigh":
      return by((s) => s.weeklyHigh).sort((a, b) => b.weeklyOvertime - a.weeklyOvertime);
    default:
      return [...statuses].sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);
  }
}
