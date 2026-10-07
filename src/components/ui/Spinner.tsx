import clsx from "clsx";

/**
 * Indicador de espera de 16px que hereda el color del texto.
 *   <Spinner />                    // decorativo (acompáñelo de texto «Guardando…»)
 *   <Spinner className="h-5 w-5" />
 * Con movimiento reducido sigue girando, más lento (globals.css).
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={clsx("h-4 w-4 shrink-0 animate-spin [animation-duration:700ms]", className)}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
