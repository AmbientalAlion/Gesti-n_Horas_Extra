// Tipos, validación y textos del asistente de carga (solo interfaz: la API
// sigue siendo quien decide el formato y valida cada fila).

export interface PreviewRow {
  code: string;
  name?: string;
  area?: string;
  totalHours: number;
  overtimeHours: number;
  hasError: boolean;
  errorReason?: string;
}

export interface UploadResponse {
  processed: number;
  withError: number;
  persisted: boolean;
  demo: boolean;
  format?: "eventos" | "legacy";
  errors: string[];
  preview: PreviewRow[];
  range?: { from: string; to: string; label: string };
  estimatedSegments?: number;
  skippedReviewed?: number;
  error?: string;
}

export type DetectedFormat = "novedades" | "semanal" | "desconocido";

/** Límite práctico del cuerpo de una petición en Vercel (4,5 MB). */
export const MAX_BYTES = 4 * 1024 * 1024;

export const FORMAT_LABEL: Record<DetectedFormat, string> = {
  novedades: "Archivo de novedades",
  semanal: "Archivo semanal",
  desconocido: "Formato sin reconocer",
};

/** «48 KB», «1,2 MB». */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}

/** Revisión previa al envío: extensión y tamaño. Devuelve el mensaje o null. */
export function validateFile(file: File): string | null {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  if (!isCsv) {
    return "El archivo debe ser un CSV (.csv). Si lo tiene en Excel, use «Guardar como» y elija CSV.";
  }
  if (file.size === 0) return "El archivo está vacío. Elija otro archivo.";
  if (file.size > MAX_BYTES) {
    return `El archivo pesa ${fmtBytes(file.size)} y el máximo es 4 MB. Divídalo por semanas y cárguelo por partes.`;
  }
  return null;
}

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Pista de formato para la interfaz, leyendo solo el encabezado. Replica la
 * regla de isOvertimeEventsCsv (src/lib/csv.ts) sin traer el parser al
 * navegador; si no coincide con lo que diga el servidor, manda el servidor.
 */
export async function detectFormat(file: File): Promise<DetectedFormat> {
  let head = "";
  try {
    head = await file.slice(0, 4096).text();
  } catch {
    return "desconocido";
  }
  const first = strip(head.split(/\r?\n/, 1)[0] ?? "");
  if (first.includes("identificacion") && first.includes("concepto") && first.includes("tiempo_h")) {
    return "novedades";
  }
  const cols = first.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, "").replace(/\s+/g, "_"));
  const hasId = cols.some((c) => ["id", "employee_id", "empleado", "id_empleado", "cedula", "documento"].includes(c));
  const hasHours = cols.some((c) =>
    ["horas_totales", "total_horas", "horas", "total_hours", "horas_trabajadas"].includes(c)
  );
  return hasId && hasHours ? "semanal" : "desconocido";
}

export interface FriendlyError {
  title: string;
  body: string;
  /** Texto original para soporte (va plegado en «Detalle técnico»). */
  detail?: string;
  /** El usuario puede reintentar sin cambiar nada. */
  retry: boolean;
}

/** Mensajes que la API ya da en español y se pueden mostrar tal cual. */
const SAFE_400 = [
  "No se recibió el archivo CSV.",
  "Indique el año y la semana del archivo para el formato simple.",
  "En un corte parcial indique hasta qué día trae datos el archivo.",
];

/** Traduce el resultado HTTP a un mensaje claro, sin texto técnico a la vista. */
export function friendlyError(status: number | null, apiMessage?: string, saving = false): FriendlyError {
  if (status === null) {
    return {
      title: "No hay conexión con el servidor",
      body: "Revise su conexión a internet e inténtelo de nuevo. El archivo no se ha guardado.",
      detail: apiMessage,
      retry: true,
    };
  }
  if (status === 400 && apiMessage && SAFE_400.includes(apiMessage)) {
    return { title: "Faltan datos para procesar el archivo", body: apiMessage, retry: false };
  }
  if (status === 401 || status === 403) {
    return {
      title: "Su sesión no tiene permiso para cargar archivos",
      body: "Solo Recursos Humanos puede guardar cargas. Vuelva a iniciar sesión con su cuenta de RRHH.",
      detail: apiMessage,
      retry: false,
    };
  }
  if (status === 413) {
    return {
      title: "El archivo es demasiado grande",
      body: "El máximo es 4 MB. Divídalo por semanas y cárguelo por partes.",
      detail: apiMessage,
      retry: false,
    };
  }
  return {
    title: saving ? "No se pudo guardar la carga" : "No se pudo procesar el archivo",
    body: "Inténtelo de nuevo en unos segundos. Si vuelve a pasar, avise a soporte con el detalle técnico.",
    detail: apiMessage ?? `Código ${status}`,
    retry: true,
  };
}

/** Plural sencillo: plural(3, "persona") → «3 personas». */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? one : many}`;
}
