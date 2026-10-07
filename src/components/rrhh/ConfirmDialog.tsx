"use client";

import { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "./Modal";

/**
 * Confirmación propia (reemplaza window.confirm).
 *
 *   const { confirm, dialog } = useConfirm();
 *   …
 *   if (await confirm({ title: "¿Borrar el rol «X»?", confirmLabel: "Borrar rol", tone: "danger" })) {
 *     form.requestSubmit();
 *   }
 *   return <>{…}{dialog}</>;
 *
 * «Cancelar» lleva el foco al abrir (acción segura por defecto). Esc o un clic
 * fuera equivalen a cancelar. La acción se nombra en el botón («Borrar rol»,
 * «Descartar registro»), nunca «Aceptar».
 */
export interface ConfirmOptions {
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

export function useConfirm() {
  const [req, setReq] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    resolver.current?.(false);
    setReq(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = useCallback((v: boolean) => {
    setOpen(false);
    const r = resolver.current;
    resolver.current = null;
    r?.(v);
  }, []);

  const danger = req?.tone === "danger";
  const dialog = (
    <Modal
      open={open}
      onClose={() => finish(false)}
      title={req?.title ?? ""}
      description={req?.body}
      tone={danger ? "danger" : "default"}
      icon={<Icon name={danger ? "alert" : "info"} className="h-5 w-5" />}
      footer={
        <>
          {/* autoFocus: la opción segura recibe el foco al abrir. */}
          <button type="button" autoFocus className="btn-secondary" onClick={() => finish(false)}>
            {req?.cancelLabel ?? "Cancelar"}
          </button>
          <button
            type="button"
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={() => finish(true)}
          >
            {req?.confirmLabel ?? "Confirmar"}
          </button>
        </>
      }
    />
  );

  return { confirm, dialog };
}
