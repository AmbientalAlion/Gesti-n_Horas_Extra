import { UploadForm } from "@/components/UploadForm";
import { RULES } from "@/lib/overtime";

export const dynamic = "force-dynamic";

export default function DemoUpload() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">Módulo de carga</h1>
        <p className="text-sm text-slate-500">
          Sube un CSV biométrico (corte parcial o final). En el demo solo se
          <strong> valida</strong> el archivo y se detectan errores; no se
          guardan datos.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-brand-dark">Columnas esperadas</p>
        <p className="mt-1">
          <code>ID</code>, <code>Rol</code>, <code>Área</code>,{" "}
          <code>Horas Totales</code> y (opcional) <code>Turno Máximo</code> para
          detectar horas huérfanas (turnos &gt; {RULES.ORPHAN_SHIFT_HOURS}h).
        </p>
        <a
          href="/ejemplo_biometrico.csv"
          download
          className="mt-2 inline-block font-medium text-brand hover:text-brand-dark"
        >
          ↓ Descargar CSV de ejemplo
        </a>
      </div>

      <UploadForm demo />
    </div>
  );
}
