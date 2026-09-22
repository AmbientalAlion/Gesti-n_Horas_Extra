import { UploadForm } from "@/components/UploadForm";
import { RULES } from "@/lib/overtime";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Módulo de carga</h1>
        <p className="text-sm text-slate-500">
          Sube el CSV biométrico (corte parcial o final). El sistema valida
          errores y actualiza los registros de la semana (upsert).
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Columnas esperadas</p>
        <p className="mt-1">
          <code>ID</code>, <code>Rol</code>, <code>Área</code>,{" "}
          <code>Horas Totales</code> y (opcional) <code>Turno Máximo</code> para
          detectar horas huérfanas (turnos &gt; {RULES.ORPHAN_SHIFT_HOURS}h).
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
