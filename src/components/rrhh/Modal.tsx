"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Diálogo modal sobre el <dialog> nativo (showModal): capa superior, foco
 * atrapado y cierre con Esc sin código propio.
 *
 *   <Modal open={open} onClose={() => setOpen(false)} title="Borrar rol">
 *     …contenido…
 *   </Modal>
 *
 * - Entra con scale-in (240ms); en el teléfono se ancla abajo como hoja y
 *   sube con fade-up. Sale con un fundido de 160ms y luego se cierra.
 * - Con movimiento reducido solo se funde (las distancias valen 0).
 * - `onClose(reason)`: "esc" | "backdrop" | "button". Quien lo usa decide si
 *   cierra (p. ej. pedir confirmación si no se copiaron los datos).
 */
export type CloseReason = "esc" | "backdrop" | "button";

export function Modal({
  open,
  onClose,
  title,
  description,
  tone = "default",
  icon,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: (reason: CloseReason) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "default" | "danger" | "success";
  icon?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(open);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setClosing(false);
      setMounted(true);
      if (!d.open) {
        if (typeof d.showModal === "function") d.showModal();
        else d.setAttribute("open", "");
      }
      return;
    }
    if (!d.open) return;
    // Salida corta; si la animación no corre, se cierra igual a los 160ms.
    setClosing(true);
    const t = window.setTimeout(() => {
      d.close();
      setClosing(false);
      setMounted(false);
    }, 160);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      data-closing={closing || undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose("esc");
      }}
      onClick={(e) => {
        // Un clic fuera del panel cae en el propio <dialog> (su ::backdrop).
        if (e.target === e.currentTarget) onClose("backdrop");
      }}
      className={clsx(
        "m-auto w-[calc(100%-2rem)] max-w-md overflow-visible rounded-card border border-line bg-surface p-0 text-ink shadow-3",
        "backdrop:bg-brand-900/45 backdrop:backdrop-blur-[2px] open:animate-scale-in open:backdrop:animate-fade-in",
        "data-[closing]:!animate-[fade-in_var(--dur-fast)_var(--ease-exit)_reverse_forwards] data-[closing]:backdrop:!animate-[fade-in_var(--dur-fast)_var(--ease-exit)_reverse_forwards]",
        // Teléfono: hoja anclada abajo, a todo el ancho.
        "max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:open:animate-fade-up",
        className
      )}
    >
      {/* El contenido solo se monta abierto: los formularios internos se reinician. */}
      {(open || mounted) && (
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <div className="flex items-start gap-3">
            {icon && (
              <span
                className={clsx(
                  "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border",
                  tone === "danger" && "border-over-border bg-over-soft text-over",
                  tone === "success" && "border-ok-border bg-ok-soft text-ok",
                  tone === "default" && "border-brand-200/70 bg-primary-soft text-heading"
                )}
              >
                {icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-title text-heading">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1.5 text-small text-ink-2">
                  {description}
                </div>
              )}
            </div>
          </div>
          {children && <div className="mt-4">{children}</div>}
          {footer && (
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}
