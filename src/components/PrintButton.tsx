"use client";

import { Icon } from "@/components/ui/Icon";

/**
 * Abre el diálogo de impresión (desde ahí también se guarda en PDF).
 * Antes de imprimir cierra el panel lateral si está abierto (Escape), para
 * que el PDF muestre la página y no el panel.
 */
export function PrintButton({
  label = "Imprimir o guardar PDF",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const print = () => {
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      window.setTimeout(() => window.print(), 50);
      return;
    }
    window.print();
  };
  return (
    <button type="button" onClick={print} className={`btn-secondary print:hidden ${className ?? ""}`}>
      <Icon name="print" />
      {label}
    </button>
  );
}
