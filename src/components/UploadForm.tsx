"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { isoDate, todayInPlant } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/toast";
import { PendingIcon } from "@/components/StatusBadge";
import { Steps } from "@/components/rrhh/Steps";
import { Collapse } from "@/components/rrhh/Collapse";
import { Dropzone } from "@/components/rrhh/upload/Dropzone";
import { PeriodFields, weekOf, type CutType } from "@/components/rrhh/upload/PeriodFields";
import {
  ExpectedColumns,
  PreviewStep,
  UnrecognizedFile,
} from "@/components/rrhh/upload/PreviewStep";
import {
  detectFormat,
  friendlyError,
  plural,
  validateFile,
  type DetectedFormat,
  type FriendlyError,
  type UploadResponse,
} from "@/components/rrhh/upload/uploadModel";

type Step = 0 | 1 | 2;
const STEPS = ["Archivo", "Vista previa", "Resultado"];

/**
 * Carga del biométrico como asistente de 3 pasos:
 *   1. Archivo: zona de arrastre, detección del formato y, si es el archivo
 *      semanal, su periodo.
 *   2. Vista previa: la API valida con demo=true (no escribe nada) y aquí se
 *      ve lo que se va a guardar.
 *   3. Resultado: segundo envío, ya sin demo, y resumen de lo guardado.
 * En el demo el paso 3 solo cierra la validación (no hay guardado).
 */
export function UploadForm({
  demo = false,
  exampleHref = "/ejemplo_biometrico.csv",
  dashboardHref = demo ? "/demo/dashboard" : "/dashboard",
  reviewHref = demo ? "/demo/revisiones" : "/revisiones",
}: {
  demo?: boolean;
  exampleHref?: string;
  dashboardHref?: string;
  reviewHref?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const userMoved = useRef(false);

  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<DetectedFormat | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [weekDay, setWeekDay] = useState(() => isoDate(todayInPlant()));
  const [cutType, setCutType] = useState<CutType>("final");
  const [until, setUntil] = useState(() => isoDate(todayInPlant()));
  const [busy, setBusy] = useState<null | "validate" | "save">(null);
  const [preview, setPreview] = useState<UploadResponse | null>(null);
  const [saved, setSaved] = useState<UploadResponse | null>(null);
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  const [live, setLive] = useState("");

  const week = weekOf(weekDay);
  const needsPeriod = format !== "novedades";

  // Al cambiar de paso, el foco va al título del paso (no en la carga inicial).
  useEffect(() => {
    if (!userMoved.current) return;
    const h = panelRef.current?.querySelector<HTMLElement>("[data-step-title]");
    h?.focus({ preventScroll: true });
    const top = panelRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) {
      panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [step]);

  function goTo(next: Step) {
    userMoved.current = true;
    setDir(next >= step ? "fwd" : "back");
    setStep(next);
  }

  async function pick(f: File) {
    const err = validateFile(f);
    setPreview(null);
    setSaved(null);
    setFailure(null);
    if (err) {
      setFile(null);
      setFormat(null);
      setFileError(err);
      setErrorKey((k) => k + 1);
      // Devuelve el foco a la zona para elegir otro archivo.
      window.setTimeout(() => document.getElementById(inputId)?.focus(), 0);
      return;
    }
    setFileError(null);
    setFile(f);
    setFormat(null);
    const fmt = await detectFormat(f);
    setFormat(fmt);
  }

  function clearFile() {
    setFile(null);
    setFormat(null);
    setFileError(null);
    setPreview(null);
    setFailure(null);
    window.setTimeout(() => document.getElementById(inputId)?.focus(), 0);
  }

  function formData(validateOnly: boolean) {
    const fd = new FormData();
    if (file) fd.append("file", file);
    if (week) {
      fd.append("year", String(week.isoYear));
      fd.append("week", String(week.week));
    }
    fd.append("cutType", cutType);
    if (cutType === "parcial") fd.append("until", until);
    if (validateOnly) fd.append("demo", "true");
    return fd;
  }

  async function post(validateOnly: boolean): Promise<UploadResponse | null> {
    let res: Response;
    try {
      res = await fetch("/api/upload", { method: "POST", body: formData(validateOnly) });
    } catch (e) {
      setFailure(friendlyError(null, e instanceof Error ? e.message : undefined));
      return null;
    }
    const data = (await res.json().catch(() => null)) as UploadResponse | null;
    if (!res.ok || !data) {
      setFailure(friendlyError(res.status, data?.error ?? (data ? undefined : res.statusText), !validateOnly));
      return null;
    }
    return data;
  }

  async function validate() {
    if (!file) {
      setFileError("Elija un archivo CSV para continuar.");
      setErrorKey((k) => k + 1);
      document.getElementById(inputId)?.focus();
      return;
    }
    if (needsPeriod && !week) {
      setFailure({ title: "Falta el periodo", body: "Escriba un día válido de la semana del archivo.", retry: false });
      return;
    }
    setBusy("validate");
    setFailure(null);
    const data = await post(true);
    setBusy(null);
    if (!data) return;
    setPreview(data);
    setLive(
      data.processed === 0
        ? "No se reconoció el formato del archivo."
        : `Vista previa lista: ${plural(data.preview.length, "persona")}, ${plural(data.withError, "congelado", "congelados")}.`
    );
    goTo(1);
  }

  async function save() {
    if (!preview) return;
    if (demo) {
      setSaved(preview);
      setLive("Validación terminada. En el demo no se guardan datos.");
      toast.info("Validación terminada (demo)", { description: "En la demostración no se guardan datos." });
      goTo(2);
      return;
    }
    setBusy("save");
    setFailure(null);
    const data = await post(false);
    setBusy(null);
    if (!data) {
      toast.error("No se pudo guardar la carga", { description: "El detalle está en el paso de vista previa." });
      return;
    }
    setSaved(data);
    if (data.persisted) {
      const n = data.preview.length;
      setLive(`Carga guardada: ${plural(n, "persona")}.`);
      toast.success("Carga guardada", {
        description: `${plural(data.processed, "registro")}${data.range ? ` · ${data.range.label}` : ""}`,
      });
      router.refresh();
    }
    goTo(2);
  }

  function restart() {
    setPreview(null);
    setSaved(null);
    setFailure(null);
    setFile(null);
    setFormat(null);
    setFileError(null);
    goTo(0);
  }

  const unrecognized = preview !== null && preview.processed === 0;
  const enter = dir === "fwd" ? "animate-slide-in-right" : "animate-slide-in-left";

  return (
    <div className="space-y-5">
      <Steps steps={STEPS} current={step} failed={step === 1 && unrecognized} label="Pasos de la carga" />
      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>

      <div ref={panelRef} className="scroll-mt-24">
        {/* ---------------- Paso 1: archivo ---------------- */}
        {step === 0 && (
          <section key="s0" className={clsx("card space-y-5", userMoved.current && enter)} aria-labelledby={`${inputId}-t0`}>
            <div>
              <h2 id={`${inputId}-t0`} data-step-title tabIndex={-1} className="text-title text-heading outline-none">
                Elija el archivo del biométrico
              </h2>
              <p className="mt-1 text-small text-ink-2">
                Archivo de novedades o archivo semanal, en CSV. Nada se guarda hasta que usted confirme en
                la vista previa.
              </p>
            </div>

            <Dropzone
              inputId={inputId}
              file={file}
              format={format}
              error={fileError}
              errorKey={errorKey}
              busy={busy !== null}
              onPick={pick}
              onClear={clearFile}
            />

            <Collapse open={!!file && format !== null && needsPeriod}>
              <div className="panel">
                <PeriodFields
                  weekDay={weekDay}
                  onWeekDay={setWeekDay}
                  cutType={cutType}
                  onCutType={setCutType}
                  until={until}
                  onUntil={setUntil}
                  disabled={busy !== null}
                />
              </div>
            </Collapse>
            <Collapse open={format === "novedades"}>
              <p className="flex items-start gap-2 rounded-control border border-brand-200/70 bg-primary-soft px-3 py-2 text-small text-heading">
                <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0" />
                No hace falta indicar el periodo: el archivo de novedades trae la fecha de cada evento.
              </p>
            </Collapse>
            <Collapse open={format === "desconocido"}>
              <p className="flex items-start gap-2 rounded-control border border-risk-border bg-risk-soft px-3 py-2 text-small text-risk">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                No reconocemos las columnas del encabezado. Puede validarlo igual y ver qué falta.
              </p>
            </Collapse>

            {failure && <FailureCard failure={failure} onRetry={failure.retry ? validate : undefined} />}

            <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <details className="group text-small">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-chip py-1 font-medium text-link hover:text-link-hover [&::-webkit-details-marker]:hidden">
                  <Icon name="chevron-right" className="h-4 w-4 transition-transform duration-fast group-open:rotate-90" />
                  ¿Qué columnas debe traer el archivo?
                </summary>
                <div className="mt-3 animate-fade-in">
                  <ExpectedColumns exampleHref={exampleHref} />
                </div>
              </details>
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={validate}
                disabled={!file || busy !== null}
                aria-busy={busy === "validate" || undefined}
              >
                {busy === "validate" ? <Spinner /> : null}
                {busy === "validate" ? "Validando…" : "Validar archivo"}
                {busy !== "validate" && <Icon name="arrow-right" className="h-4 w-4" />}
              </button>
            </div>
          </section>
        )}

        {/* ---------------- Paso 2: vista previa ---------------- */}
        {step === 1 && preview && (
          <section key="s1" className={clsx("card space-y-5", enter)} aria-labelledby={`${inputId}-t1`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id={`${inputId}-t1`} data-step-title tabIndex={-1} className="text-title text-heading outline-none">
                  {unrecognized
                    ? "El archivo no se pudo leer"
                    : demo
                      ? "Vista previa (el demo no guarda datos)"
                      : "Vista previa: todavía no se ha guardado nada"}
                </h2>
                {file && (
                  <p className="mt-1 truncate text-small text-muted" title={file.name}>
                    {file.name}
                  </p>
                )}
              </div>
            </div>

            {unrecognized ? (
              <UnrecognizedFile errors={preview.errors} exampleHref={exampleHref} onRetry={restart} />
            ) : (
              <PreviewStep result={preview} demo={demo} />
            )}

            {failure && <FailureCard failure={failure} onRetry={failure.retry ? save : undefined} />}

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
              <button type="button" className="btn-secondary" onClick={() => goTo(0)} disabled={busy !== null}>
                <Icon name="arrow-left" className="h-4 w-4" />
                Volver
              </button>
              {!unrecognized && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={save}
                  disabled={busy !== null}
                  aria-busy={busy === "save" || undefined}
                >
                  {busy === "save" ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
                  {busy === "save"
                    ? "Guardando…"
                    : demo
                      ? "Terminar validación"
                      : `Guardar ${plural(preview.processed, "registro")}`}
                </button>
              )}
            </div>
          </section>
        )}

        {/* ---------------- Paso 3: resultado ---------------- */}
        {step === 2 && saved && (
          <section key="s2" className={clsx("card", enter)} aria-labelledby={`${inputId}-t2`}>
            <ResultStep
              titleId={`${inputId}-t2`}
              result={saved}
              demo={demo}
              dashboardHref={dashboardHref}
              reviewHref={reviewHref}
              onRestart={restart}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function FailureCard({ failure, onRetry }: { failure: FriendlyError; onRetry?: () => void }) {
  return (
    <div role="alert" className="animate-fade-in rounded-control border border-l-4 border-over-border border-l-over-solid bg-over-soft p-4 text-small text-over">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="alert" className="h-4 w-4" />
        {failure.title}
      </p>
      <p className="mt-1">{failure.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {onRetry && (
          <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
            Reintentar
          </button>
        )}
        {failure.detail && (
          <details className="text-caption">
            <summary className="cursor-pointer font-medium">Detalle técnico</summary>
            <p className="mt-1 break-words font-mono text-ink-2">{failure.detail}</p>
          </details>
        )}
      </div>
    </div>
  );
}

function ResultStep({
  titleId,
  result,
  demo,
  dashboardHref,
  reviewHref,
  onRestart,
}: {
  titleId: string;
  result: UploadResponse;
  demo: boolean;
  dashboardHref: string;
  reviewHref: string;
  onRestart: () => void;
}) {
  const ok = result.persisted || demo;
  const people = result.preview.length;
  const skipped = result.skippedReviewed ?? 0;
  return (
    <div className="flex flex-col items-center py-4 text-center sm:py-6">
      <span
        className={clsx(
          "grid h-16 w-16 animate-scale-in place-items-center rounded-full border",
          ok ? "border-ok-border bg-ok-soft text-ok" : "border-risk-border bg-risk-soft text-risk"
        )}
      >
        {ok ? (
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden focusable="false">
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              className="animate-draw-line [animation-delay:120ms] [animation-duration:400ms]"
            />
          </svg>
        ) : (
          <Icon name="alert" className="h-8 w-8" />
        )}
      </span>
      <h2 id={titleId} data-step-title tabIndex={-1} className="mt-4 text-h1 text-heading outline-none">
        {result.persisted ? "Carga guardada" : demo ? "Validación terminada" : "La carga no se guardó"}
      </h2>
      <p className="mt-2 max-w-prose text-body text-ink-2">
        {plural(people, "persona")} · {plural(result.processed, "registro")}
        {result.range ? ` · ${result.range.label}` : ""}
      </p>
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {demo && <li className="chip-brand">En la demostración no se guardan datos</li>}
        {result.withError > 0 && (
          <li className="chip-pending">
            <PendingIcon className="h-3 w-3" />
            {plural(result.withError, "congelado por revisar", "congelados por revisar")}
          </li>
        )}
        {skipped > 0 && (
          <li className="chip">
            {plural(skipped, "registro ya revisado no se modificó", "registros ya revisados no se modificaron")}
          </li>
        )}
        {result.errors.length > 0 && (
          <li className="chip-risk">{plural(result.errors.length, "fila omitida", "filas omitidas")}</li>
        )}
        {(result.estimatedSegments ?? 0) > 0 && <li className="chip-info">Reparto por días (estimado)</li>}
      </ul>
      {!ok && (
        <p className="mt-3 max-w-prose text-small text-ink-2">
          El servidor validó el archivo pero no tiene base de datos configurada para guardarlo.
        </p>
      )}
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Link href={dashboardHref} className="btn-primary">
          Ver panel
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
        {result.withError > 0 && (
          <Link href={reviewHref} className="btn-secondary">
            <PendingIcon className="h-3.5 w-3.5" />
            Revisar {plural(result.withError, "congelado", "congelados")}
          </Link>
        )}
        <button type="button" className="btn-ghost" onClick={onRestart}>
          <Icon name="upload" className="h-4 w-4" />
          Cargar otro archivo
        </button>
      </div>
    </div>
  );
}
