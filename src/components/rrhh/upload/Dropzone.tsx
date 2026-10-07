"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { FORMAT_LABEL, fmtBytes, type DetectedFormat } from "./uploadModel";

const FORMAT_CHIP: Record<DetectedFormat, string> = {
  novedades: "chip-brand",
  semanal: "chip-info",
  desconocido: "chip-risk",
};

/**
 * Zona de archivo del asistente de carga.
 * - Sin archivo: zona de arrastre (en táctil, «Toque para elegir…»). Al
 *   arrastrar encima crece 1%, el borde pasa a continuo y el icono sube 4px.
 * - Con archivo: ficha con nombre, tamaño y formato detectado, con «Cambiar»
 *   y «Quitar». También acepta soltar otro archivo encima.
 * - Error: borde rojo, mensaje dentro de la zona (role=alert) y una sacudida
 *   corta (sin ella con movimiento reducido).
 * - `busy`: barra de progreso en el borde inferior mientras se valida.
 */
export function Dropzone({
  inputId,
  file,
  format,
  error,
  errorKey,
  busy,
  onPick,
  onClear,
}: {
  inputId: string;
  file: File | null;
  format: DetectedFormat | null;
  error: string | null;
  /** Cambia en cada error nuevo para repetir la sacudida. */
  errorKey: number;
  busy: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const errId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const dragProps = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onPick(f);
    },
  };

  const input = (
    <input
      id={inputId}
      type="file"
      accept=".csv,text/csv"
      className="sr-only"
      disabled={busy}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errId : hintId}
      onChange={(e) => {
        const f = e.target.files?.[0];
        // Se vacía para poder volver a elegir el mismo archivo.
        e.target.value = "";
        if (f) onPick(f);
      }}
    />
  );

  const progress = busy && (
    <span
      aria-hidden
      className="absolute inset-x-0 bottom-0 h-[3px] animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent_0%,rgb(var(--c-primary))_50%,transparent_100%)] opacity-90"
    />
  );

  if (file) {
    return (
      <div
        {...dragProps}
        key={`${file.name}-${file.size}`}
        className={clsx(
          "relative flex animate-scale-in flex-wrap items-center gap-3 overflow-hidden rounded-card border bg-surface p-4 shadow-1 transition-[border-color,background-color,transform] duration-fast ease-enter sm:flex-nowrap",
          dragging ? "scale-[1.01] border-primary bg-primary-soft" : "border-line"
        )}
      >
        {input}
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-primary-soft text-brand dark:text-brand-300">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
            <path d="M14 3v5h5" />
            <path
              d="m9 14.5 2 2 4-4"
              pathLength={1}
              strokeDasharray={1}
              className="animate-draw-line [animation-delay:120ms] [animation-duration:var(--dur-slow)]"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-ui font-semibold text-ink" title={file.name}>
            {file.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-small text-muted">
            <span className="tabular-nums">{fmtBytes(file.size)}</span>
            {format ? (
              <span className={clsx(FORMAT_CHIP[format], "animate-fade-in")}>{FORMAT_LABEL[format]}</span>
            ) : (
              <span className="chip">Leyendo encabezado…</span>
            )}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <label
            htmlFor={inputId}
            className={clsx("btn-secondary btn-sm flex-1 cursor-pointer sm:flex-none", busy && "pointer-events-none opacity-60")}
          >
            Cambiar
          </label>
          <button type="button" className="btn-ghost btn-sm flex-1 sm:flex-none" onClick={onClear} disabled={busy}>
            Quitar
          </button>
        </div>
        {progress}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        {...dragProps}
        key={errorKey}
        className={clsx(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-card border-2 px-6 py-10 text-center transition-[border-color,background-color,transform,box-shadow] duration-fast ease-enter focus-within:border-solid focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgb(var(--c-focus)/0.25)] sm:py-12",
          error && "animate-shake",
          dragging
            ? "scale-[1.01] border-solid border-primary bg-primary-soft"
            : error
              ? "border-dashed border-over-solid bg-over-soft/50"
              : "border-dashed border-line-strong bg-surface hover:border-primary/60 hover:bg-primary-soft/50"
        )}
      >
        {input}
        <span
          className={clsx(
            "grid h-14 w-14 place-items-center rounded-full transition-[transform,background-color,color] duration-fast ease-enter",
            dragging ? "-translate-y-1 bg-primary text-on-primary" : error ? "bg-surface text-over" : "bg-primary-soft text-brand group-hover:-translate-y-0.5 dark:text-brand-300"
          )}
        >
          <Icon name="upload" className="h-8 w-8" />
        </span>
        <span className="mt-3 text-ui font-semibold text-ink">
          {dragging ? (
            "Suelte el archivo aquí"
          ) : (
            <>
              <span className="[@media(hover:none)]:hidden">Arrastre aquí el archivo del biométrico</span>
              <span className="hidden [@media(hover:none)]:inline">Toque para elegir el archivo CSV</span>
            </>
          )}
        </span>
        <span id={hintId} className="mt-1 text-small text-muted">
          <span className="[@media(hover:none)]:hidden">o pulse para elegirlo · </span>CSV de hasta 4 MB
        </span>
        {error && (
          <span
            id={errId}
            role="alert"
            className="mt-4 flex max-w-md animate-fade-in items-start gap-2 rounded-control border border-over-border bg-surface px-3 py-2 text-left text-small text-over"
          >
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </span>
        )}
      </label>
    </div>
  );
}
