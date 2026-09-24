import { Suspense } from "react";
import { DemoNav } from "@/components/DemoNav";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Suspense fallback={<div className="w-full border-b border-slate-200 bg-white lg:w-60 lg:border-b-0 lg:border-r" />}>
        <DemoNav />
      </Suspense>
      <main className="flex-1 overflow-x-hidden">
        <div className="bg-brand px-4 py-2 text-center text-xs font-medium text-white print:hidden">
          MODO DEMOSTRACIÓN
          <span className="hidden sm:inline">
            {" "}
            · datos de ejemplo · use el selector «Ver como» para cambiar de rol
          </span>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
