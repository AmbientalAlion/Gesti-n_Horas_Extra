"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { EmployeeStatus } from "@/lib/aggregate";
import { fmtH } from "@/lib/overtime";
import { useDrawer } from "./drawer/context";
import { LEVEL_LABELS, LEVEL_TEXT, LevelIcon, PendingIcon } from "./StatusBadge";
import { TABLE_SEARCH_EVENT } from "./FilterableEmployeeTable";
import { Icon } from "./ui/Icon";
import { startNavProgress } from "./ui/NavProgress";
import { prefersReducedMotion } from "./ui/useReducedMotion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const MAX_RESULTS = 8;

/* ---- Coincidencias sin tildes, con resaltado ---- */

/** Minúsculas y sin tildes, con el índice original de cada carácter. */
function fold(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const f = s[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    for (let j = 0; j < f.length; j++) {
      text += f[j];
      map.push(i);
    }
  }
  return { text, map };
}
const norm = (s: string) => fold(s).text;

/** Resalta la primera coincidencia de `term` (ya normalizado) en `text`. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const f = fold(text);
  const at = f.text.indexOf(term);
  if (at < 0) return <>{text}</>;
  const start = f.map[at];
  const end = f.map[at + term.length - 1] + 1;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-[3px] bg-primary/15 px-px font-bold text-inherit dark:bg-primary/25">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

/** Coincide si alguna palabra empieza por el término (o lo contiene). */
function scoreText(value: string | undefined, term: string, starts: number, word: number, contains: number) {
  if (!value) return 0;
  const v = norm(value);
  if (v.startsWith(term)) return starts;
  if (v.split(/[\s\-·/,.]+/).some((w) => w.startsWith(term))) return word;
  return v.includes(term) ? contains : 0;
}

type Field = "name" | "code" | "area" | "direccion" | "plant" | "managerName";

/** Puntaje: ID exacto > nombre que empieza > palabra del nombre > resto. */
function score(r: EmployeeStatus, term: string): { score: number; field: Field | null } {
  if (norm(r.code) === term) return { score: 100, field: "code" };
  const cands: [Field, number][] = [
    ["name", scoreText(r.name, term, 80, 70, 40)],
    ["code", scoreText(r.code, term, 60, 60, 35)],
    ["area", scoreText(r.area, term, 30, 28, 18)],
    ["managerName", scoreText(r.managerName, term, 26, 24, 15)],
    ["direccion", scoreText(r.direccion, term, 22, 20, 12)],
    ["plant", scoreText(r.plant, term, 22, 20, 12)],
  ];
  let best: [Field | null, number] = [null, 0];
  for (const c of cands) if (c[1] > best[1]) best = c;
  return { score: best[1], field: best[0] };
}

/**
 * Buscador rápido de empleados (combobox ARIA con lista). Busca sin tildes
 * por nombre, ID, área, dirección, planta o jefe; resalta la coincidencia y
 * abre el detalle en el panel (o la ficha, fuera del dashboard).
 *
 * Teclado: «/» o Ctrl/⌘ + K enfocan; ↑ ↓ Inicio Fin recorren; Intro abre;
 * Esc cierra la lista y, con la lista cerrada, borra el texto.
 */
export function EmployeeSearch({
  rows,
  hrefBase,
  roleParam,
  query,
}: {
  rows: EmployeeStatus[];
  hrefBase: string;
  roleParam?: string;
  /** Filtros vigentes, para volver al panel tal como estaba. */
  query?: string;
}) {
  const drawer = useDrawer();
  const router = useRouter();
  const data = drawer?.statuses ?? rows;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Al volver del panel el foco regresa al campo: no se reabre la lista.
  const quietFocus = useRef(false);
  const uid = useId();
  const listId = `${uid}-lista`;
  const optId = (id: string) => `${uid}-op-${id}`;

  const term = norm(q.trim());
  const results = useMemo(() => {
    if (!term) return [];
    return data
      .map((r) => ({ r, ...score(r, term) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.r.monthlyOvertime - a.r.monthlyOvertime)
      .slice(0, MAX_RESULTS);
  }, [data, term]);

  const visible = open && !!term;
  const expanded = visible && results.length > 0;

  // Mantiene montada la capa mientras sale (100ms).
  const [present, setPresent] = useState(false);
  useEffect(() => {
    if (visible) {
      setPresent(true);
      return;
    }
    const el = popRef.current;
    if (!el || !present || prefersReducedMotion() || typeof el.animate !== "function") {
      setPresent(false);
      return;
    }
    const anim = el.animate(
      [{ opacity: 1 }, { opacity: 0, transform: "translateY(-4px)" }],
      { duration: 100, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
    );
    anim.onfinish = () => {
      // Se oculta antes de soltar la animación, para que no destelle.
      el.hidden = true;
      anim.cancel();
      setPresent(false);
    };
    return () => anim.cancel();
    // present solo se lee como punto de partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => setActive(0), [term]);
  useEffect(() => {
    if (!open) setActive(0);
  }, [open]);

  // La opción activa siempre a la vista.
  useIsoLayoutEffect(() => {
    if (!expanded) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, expanded]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Atajos «/» y Ctrl/⌘ + K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));
      const isK = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!isK && !isSlash) return;
      const input = inputRef.current;
      if (!input || input.closest("[inert]")) return;
      e.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const link = (id: string) => {
    if (drawer) return drawer.fichaHref(id);
    const qs = [query, roleParam ? `rol=${roleParam}` : ""].filter(Boolean).join("&");
    return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
  };

  const choose = (r: EmployeeStatus) => {
    setOpen(false);
    quietFocus.current = true;
    if (drawer) {
      drawer.open({ kind: "employee", id: r.id }, inputRef.current);
    } else {
      startNavProgress();
      router.push(link(r.id));
    }
  };

  const searchInTable = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(TABLE_SEARCH_EVENT, { detail: q.trim() }));
  };

  // En el teléfono, al enfocar se sube el campo bajo la barra superior para
  // que la lista quepa en pantalla.
  const liftOnPhone = () => {
    const input = inputRef.current;
    if (!input || !window.matchMedia("(max-width: 639.98px)").matches) return;
    if (input.getBoundingClientRect().top > 96) {
      input.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = results.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else if (n) setActive((a) => (a + 1) % n);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else if (n) setActive((a) => (a - 1 + n) % n);
        break;
      case "Home":
      case "End":
        if (expanded) {
          e.preventDefault();
          setActive(e.key === "Home" ? 0 : n - 1);
        }
        break;
      case "Enter":
        if (expanded && results[active]) {
          e.preventDefault();
          choose(results[active].r);
        } else if (visible && n === 0 && drawer) {
          e.preventDefault();
          searchInTable();
        }
        break;
      case "Escape":
        if (visible) {
          e.preventDefault();
          setOpen(false);
        } else if (q) {
          e.preventDefault();
          setQ("");
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const announce = !term
    ? ""
    : results.length === 0
      ? `Sin coincidencias para ${q.trim()}`
      : `${results.length} resultado${results.length === 1 ? "" : "s"}${
          results.length === MAX_RESULTS ? " o más" : ""
        }. Use las flechas para recorrerlos.`;

  return (
    <div ref={ref} className="relative print:hidden">
      <div className="relative">
        <Icon
          name="search"
          className={clsx(
            "pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-fast",
            focused ? "text-link" : "text-muted"
          )}
        />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            if (quietFocus.current) {
              quietFocus.current = false;
              return;
            }
            setOpen(true);
            liftOnPhone();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder="Buscar persona por nombre, ID, área, dirección, planta o jefe"
          className="field min-h-12 rounded-card pl-11 pr-12 text-body shadow-1 sm:min-h-11 sm:pr-16"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-label="Buscar persona"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-expanded={expanded}
          aria-activedescendant={expanded && results[active] ? optId(results[active].r.id) : undefined}
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            aria-label="Borrar búsqueda"
            className="absolute right-0.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:bg-surface-3 hover:text-ink motion-safe:animate-scale-in"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        ) : (
          !focused && (
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-caption text-muted sm:block"
              title="Atajo: / o Ctrl + K"
            >
              /
            </kbd>
          )
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {visible ? announce : ""}
      </span>

      <div
        ref={popRef}
        hidden={!visible && !present}
        className="absolute inset-x-0 z-30 mt-1.5 origin-top overflow-hidden rounded-card border border-line bg-surface shadow-3 motion-safe:animate-scale-in"
      >
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Personas que coinciden"
          hidden={results.length === 0}
          className="max-h-[min(22rem,calc(100dvh-11rem))] overflow-y-auto overscroll-contain py-1"
        >
          {results.map(({ r, field }, i) => {
            const meta = [r.area, r.direccion, r.plant].filter(Boolean) as string[];
            return (
              <li
                key={r.id}
                id={optId(r.id)}
                role="option"
                aria-selected={i === active}
                className="motion-safe:animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 20, 140)}ms` }}
              >
                <Link
                  href={link(r.id)}
                  prefetch={false}
                  tabIndex={-1}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    choose(r);
                  }}
                  onPointerMove={() => i !== active && setActive(i)}
                  className={clsx(
                    "relative flex min-h-14 items-center gap-3 px-4 py-2 transition-colors duration-instant",
                    i === active ? "bg-primary-soft" : "hover:bg-surface-2"
                  )}
                >
                  {i === active && (
                    <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <LevelIcon level={r.level} className={clsx("h-3 w-3", LEVEL_TEXT[r.level])} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-ui text-ink">
                        <Highlight text={r.name ?? r.code} term={field === "name" ? term : ""} />
                      </span>
                      <span className="sr-only">
                        , {LEVEL_LABELS[r.level]}
                        {r.hasError ? ", con registros por revisar" : ""}
                      </span>
                      {r.hasError && (
                        <PendingIcon className="h-3 w-3 text-pending" />
                      )}
                    </span>
                    <span className="block truncate text-caption font-normal text-muted">
                      {field === "code" ? (
                        <>
                          ID <Highlight text={r.code} term={term} />
                          {meta.length ? ` · ${meta[0]}` : ""}
                        </>
                      ) : field === "managerName" && r.managerName ? (
                        <>
                          Jefe: <Highlight text={r.managerName} term={term} />
                          {r.area ? ` · ${r.area}` : ""}
                        </>
                      ) : (
                        <>
                          {meta.map((m, k) => (
                            <span key={k}>
                              {k > 0 && " · "}
                              <Highlight
                                text={m}
                                term={
                                  (field === "area" && m === r.area) ||
                                  (field === "direccion" && m === r.direccion) ||
                                  (field === "plant" && m === r.plant)
                                    ? term
                                    : ""
                                }
                              />
                            </span>
                          ))}
                          {meta.length === 0 && "—"}
                        </>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={clsx("block text-ui tabular-nums", r.level === "green" ? "text-heading" : LEVEL_TEXT[r.level])}>
                      {fmtH(r.monthlyOvertime)}
                    </span>
                    <span className="block text-caption font-normal text-muted">en el mes</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {term && results.length === 0 && (
          <div className="flex flex-col items-center gap-1 px-4 py-5 text-center">
            <Icon name="search" className="h-6 w-6 text-muted" />
            <p className="text-ui font-semibold text-heading">Sin coincidencias para «{q.trim()}»</p>
            <p className="text-small text-ink-2">Pruebe con el apellido o el ID.</p>
            {drawer && (
              <button type="button" onClick={searchInTable} className="btn btn-secondary btn-sm mt-2">
                Buscar en la tabla
              </button>
            )}
          </div>
        )}

        {results.length > 0 && (
          <p className="hidden border-t border-line bg-surface-2 px-4 py-1.5 text-caption font-normal text-muted sm:block">
            ↑ ↓ para moverse · Intro para abrir · Esc para cerrar
          </p>
        )}
      </div>
    </div>
  );
}
