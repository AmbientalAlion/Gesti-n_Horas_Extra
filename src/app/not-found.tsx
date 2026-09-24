import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-tint px-4">
      <div className="card w-full max-w-lg space-y-4 text-center">
        <div className="flex justify-center">
          <BrandMark size="md" />
        </div>
        <h1 className="text-lg font-semibold text-brand-dark">
          Esta página no existe
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Puede que la dirección esté mal escrita o que el enlace ya no sea
          válido. Vuelva al panel para continuar.
        </p>
        <Link href="/dashboard" className="btn-primary inline-block text-sm">
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
