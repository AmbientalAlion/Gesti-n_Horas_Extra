import { UploadForm } from "@/components/UploadForm";
import { PageHeader } from "@/components/PageHeader";
import { RULES } from "@/lib/overtime";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargar horas del biométrico"
        subtitle="Cargue el archivo semanal del biométrico. El sistema valida los errores y actualiza los registros de la semana; si vuelve a cargar la misma semana, se reemplazan los datos anteriores."
      />

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Columnas esperadas</p>
        <p className="mt-1">
          <code>ID</code>, <code>Rol</code>, <code>Área</code>,{" "}
          <code>Horas Totales</code> y (opcional) <code>Turno Máximo</code> para
          detectar horas huérfanas (turnos de más de {RULES.ORPHAN_SHIFT_HOURS}h).
        </p>
        <p className="mt-2">
          También se acepta el archivo de novedades de nómina, con una fila por
          recargo; el sistema lo reconoce solo.
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
