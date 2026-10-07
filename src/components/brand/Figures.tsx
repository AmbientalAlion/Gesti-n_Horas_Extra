// Sistema de figuras geométricas ALIÓN (Manual de marca v3).
// Cinco figuras derivadas de las letras del logo: triángulo, "L", línea,
// círculo y cuadrado. Reglas: 1 a 3 por composición, sin tocarse, azul sobre
// blanco (una sola puede ir en color secundario). Solo triángulo y círculo se
// pueden girar/segmentar.

interface FigProps {
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}

// Por defecto, Azul ALIÓN en claro y Azul 60% en oscuro (vía currentColor).
const AZUL = "currentColor";
/** Verde Claro ALIÓN: la única figura que puede ir en color secundario. */
export const SECUNDARIO = "#00CBBF";
const cls = (c?: string) => `text-brand dark:text-brand-300 ${c ?? ""}`;

export function Triangulo({ className, color = AZUL, style }: FigProps) {
  // El triángulo puede girarse por su eje vertical.
  return (
    <svg viewBox="0 0 100 100" className={cls(className)} style={style} aria-hidden focusable="false">
      <polygon points="50,8 92,92 8,92" fill={color} />
    </svg>
  );
}

export function Circulo({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={cls(className)} style={style} aria-hidden focusable="false">
      <circle cx="50" cy="50" r="42" fill={color} />
    </svg>
  );
}

export function SemiCirculo({ className, color = AZUL, style }: FigProps) {
  // El círculo se puede segmentar en cualquier punto.
  return (
    <svg viewBox="0 0 100 100" className={cls(className)} style={style} aria-hidden focusable="false">
      <path d="M8 50 a42 42 0 0 1 84 0 Z" fill={color} />
    </svg>
  );
}

export function Ele({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={cls(className)} style={style} aria-hidden focusable="false">
      <path d="M22 10 h20 v58 h36 v22 H22 Z" fill={color} />
    </svg>
  );
}

export function Linea({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={cls(className)} style={style} aria-hidden focusable="false">
      <rect x="10" y="44" width="80" height="12" rx="6" fill={color} />
    </svg>
  );
}

export function Cuadrado({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={cls(className)} style={style} aria-hidden focusable="false">
      <rect x="14" y="14" width="72" height="72" rx="4" fill={color} />
    </svg>
  );
}

type ClusterVariant = "page" | "dashboard" | "ficha";

const FIG = "absolute motion-safe:animate-fig-in";

/**
 * Composición decorativa de cabecera: 1 a 3 figuras que no se tocan, en azul
 * (una puede ir en secundario). Vive en una zona reservada a la derecha
 * (38% del ancho, desvanecida hacia el texto con mask-image) para no cruzar
 * nunca el título. En teléfono queda solo un semicírculo en la esquina.
 *
 *   <FigureCluster />                     // cabecera de página
 *   <FigureCluster variant="dashboard" /> // panel de control
 *   <FigureCluster variant="ficha" />     // ficha de la persona
 *
 * El contenedor padre debe ser `relative overflow-hidden`, y el contenido
 * debe ir en un bloque `relative` para quedar por encima.
 */
export function FigureCluster({
  variant = "page",
  className = "",
}: {
  variant?: ClusterVariant;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden print:hidden ${className}`}
      aria-hidden
    >
      {/* Teléfono: una sola figura, fuera del texto. */}
      <SemiCirculo
        className="absolute -bottom-6 -right-5 h-20 w-20 rotate-[200deg] opacity-[0.12] sm:hidden dark:opacity-[0.16]"
      />
      <div className="absolute inset-y-0 right-0 hidden w-[38%] [mask-image:linear-gradient(to_left,#000_55%,transparent)] sm:block">
        {variant === "dashboard" ? (
          <>
            <SemiCirculo
              className={`${FIG} -bottom-10 right-[8%] h-36 w-36 opacity-10 dark:opacity-[0.14]`}
              style={{ transform: "rotate(-18deg)" }}
            />
            <Triangulo
              className={`${FIG} right-[46%] top-3 h-14 w-14 opacity-10 [animation-delay:80ms] dark:opacity-[0.14]`}
              style={{ transform: "rotate(14deg)" }}
            />
            <Linea
              className={`${FIG} right-[4%] top-4 h-8 w-24 opacity-[0.14] [animation-delay:160ms] dark:opacity-[0.2]`}
              color={SECUNDARIO}
            />
          </>
        ) : variant === "ficha" ? (
          <>
            <Circulo
              className={`${FIG} -right-6 -top-8 h-32 w-32 opacity-10 dark:opacity-[0.14]`}
            />
            <Linea
              className={`${FIG} bottom-4 right-[42%] h-8 w-24 opacity-[0.14] [animation-delay:80ms] dark:opacity-[0.2]`}
              color={SECUNDARIO}
            />
          </>
        ) : (
          <>
            <Triangulo
              className={`${FIG} -top-4 right-[30%] h-24 w-24 opacity-10 dark:opacity-[0.14]`}
              style={{ transform: "rotate(12deg)" }}
            />
            <Circulo
              className={`${FIG} -bottom-6 right-[4%] h-16 w-16 opacity-10 [animation-delay:80ms] dark:opacity-[0.14]`}
            />
            <Linea
              className={`${FIG} right-[58%] top-10 h-8 w-24 opacity-[0.14] [animation-delay:160ms] dark:opacity-[0.2]`}
              color={SECUNDARIO}
            />
          </>
        )}
      </div>
    </div>
  );
}
