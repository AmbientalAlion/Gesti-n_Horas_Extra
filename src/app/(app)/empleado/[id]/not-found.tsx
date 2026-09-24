import Link from "next/link";

export default function EmpleadoNoEncontrado() {
  return (
    <div className="card mx-auto max-w-lg space-y-4 text-center">
      <h1 className="text-lg font-semibold text-brand-dark">
        No encontramos a esta persona
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        El empleado no existe, fue dado de baja o no pertenece a su equipo.
        Búsquelo desde el panel con el buscador por nombre, identificación o área.
      </p>
      <Link href="/dashboard" className="btn-primary inline-block text-sm">
        Volver al panel
      </Link>
    </div>
  );
}
