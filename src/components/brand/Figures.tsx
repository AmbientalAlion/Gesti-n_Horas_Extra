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

const AZUL = "#0098BA";

export function Triangulo({ className, color = AZUL, style }: FigProps) {
  // El triángulo puede girarse por su eje vertical.
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <polygon points="50,8 92,92 8,92" fill={color} />
    </svg>
  );
}

export function Circulo({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <circle cx="50" cy="50" r="42" fill={color} />
    </svg>
  );
}

export function SemiCirculo({ className, color = AZUL, style }: FigProps) {
  // El círculo se puede segmentar en cualquier punto.
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <path d="M8 50 a42 42 0 0 1 84 0 Z" fill={color} />
    </svg>
  );
}

export function Ele({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <path d="M22 10 h20 v58 h36 v22 H22 Z" fill={color} />
    </svg>
  );
}

export function Linea({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <rect x="10" y="44" width="80" height="12" rx="6" fill={color} />
    </svg>
  );
}

export function Cuadrado({ className, color = AZUL, style }: FigProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <rect x="14" y="14" width="72" height="72" rx="4" fill={color} />
    </svg>
  );
}

/**
 * Composición decorativa: hasta 3 figuras que no se tocan, azul sobre blanco,
 * con una posible en color secundario. Pensada como fondo sutil de cabeceras.
 */
export function FigureCluster({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <Triangulo
        className="absolute h-24 w-24 opacity-10"
        style={{ top: "-1rem", right: "6rem", transform: "rotate(12deg)" }}
      />
      <Circulo
        className="absolute h-16 w-16 opacity-10"
        style={{ bottom: "-1.5rem", right: "1.5rem" }}
      />
      <Linea
        className="absolute h-10 w-32 opacity-10"
        color="#00CBBF"
        style={{ top: "2.5rem", right: "12rem" }}
      />
    </div>
  );
}
