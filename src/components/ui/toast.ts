/**
 * Avisos breves (toasts). El <Toaster /> ya está montado en el layout raíz.
 *
 *   import { toast } from "@/components/ui/toast";
 *   toast.success("Rol guardado.");
 *   toast.error("No se pudo guardar el rol.", { description: "Revise la conexión e intente de nuevo." });
 *   toast.info("Descargando el CSV de nómina de junio 2026.");
 *   const id = toast.success("…"); toast.dismiss(id);
 *
 * - Llamar solo desde componentes cliente o handlers (no desde el servidor).
 * - Éxito e información se cierran solos a los 5s (pausa con ratón o foco);
 *   los errores quedan hasta que se cierran (WCAG 2.2.1).
 * - Máximo 3 a la vez; el más nuevo abajo.
 * - Textos en español, frases cortas, sin aludir a «horas disponibles».
 */
export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  /** ms; 0 = no se cierra solo. */
  duration: number;
}

export interface ToastOptions {
  description?: string;
  duration?: number;
}

type Listener = (items: ToastItem[]) => void;

const MAX = 3;
let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(items);
}

function push(tone: ToastTone, title: string, opts: ToastOptions = {}): number {
  const id = ++seq;
  const duration = opts.duration ?? (tone === "error" ? 0 : 5000);
  items = [...items, { id, tone, title, description: opts.description, duration }].slice(-MAX);
  emit();
  return id;
}

export const toast = {
  success: (title: string, opts?: ToastOptions) => push("success", title, opts),
  error: (title: string, opts?: ToastOptions) => push("error", title, opts),
  info: (title: string, opts?: ToastOptions) => push("info", title, opts),
  dismiss: (id: number) => {
    items = items.filter((t) => t.id !== id);
    emit();
  },
  clear: () => {
    items = [];
    emit();
  },
};

/** Uso interno del <Toaster />. */
export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  l(items);
  return () => {
    listeners.delete(l);
  };
}
