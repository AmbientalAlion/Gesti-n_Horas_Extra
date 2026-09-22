"use client";

export function PrintButton({ label = "Exportar a PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-secondary print:hidden"
    >
      🖨 {label}
    </button>
  );
}
