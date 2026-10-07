import { Suspense } from "react";
import { DemoNav } from "@/components/DemoNav";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* DemoNav lee ?rol= (useSearchParams). El respaldo reserva el mismo
          espacio para que nada salte al hidratar. */}
      <Suspense
        fallback={
          <>
            <div aria-hidden className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block" />
            <div aria-hidden className="h-14 border-b border-line bg-surface lg:hidden" />
          </>
        }
      >
        <DemoNav />
      </Suspense>
      <main
        id="contenido"
        tabIndex={-1}
        className="min-w-0 flex-1 overflow-x-clip pb-[calc(4rem+env(safe-area-inset-bottom))] focus:outline-none lg:pb-0"
      >
        {/* En el teléfono el aviso va como chip «Demo» en la barra superior. */}
        <p
          role="note"
          className="hidden h-8 items-center justify-center gap-2 bg-brand-900 px-4 text-caption text-white print:hidden lg:flex"
        >
          <span className="rounded-chip bg-white/15 px-1.5 font-bold uppercase tracking-[0.02em]">
            Modo demostración
          </span>
          <span>Datos de ejemplo; los cambios no se guardan. Use «Ver como» para cambiar de rol.</span>
        </p>
        <div data-vt="page" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
