"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlideOver, type DrawerDirection, type DrawerPager } from "./SlideOver";
import { DrawerContext, FICHA_FROM_KEY, type DrawerApi, type DrawerView } from "./context";
import { groupMembers, segmentMembers } from "./select";
import {
  DIM_FILTER,
  EmployeeQuickView,
  GroupQuickView,
  SEGMENT_TEXT,
  SegmentQuickView,
  type DrawerPeriod,
} from "./views";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import { startNavProgress } from "../ui/NavProgress";
import { useNavigateSearch } from "../dashboard/DashboardNav";
import type { EmployeeStatus, SegmentPoint } from "@/lib/aggregate";

/** Parámetros de la tabla que viajan a la ficha y vuelven con «Volver». */
const TABLE_PARAMS = ["estado", "buscar", "revisar", "semana", "orden"];

interface Entry {
  view: DrawerView;
  /** data-drawer-key del control que abrió la vista siguiente (foco al volver). */
  focusKey?: string | null;
}

/**
 * Proveedor del panel lateral del dashboard. Cualquier componente cliente
 * dentro de él puede abrir el detalle de una persona, un grupo o una lista
 * con `useDrawer()`. Lleva un historial para poder volver dentro del panel.
 *
 * Historial del navegador: al abrir se añade una entrada (misma URL), de modo
 * que el botón Atrás o el gesto de volver del teléfono cierran el panel en
 * vez de salir del dashboard. Al cerrar con la X, Esc o el fondo, se retira
 * esa entrada. «Ver ficha completa» la reemplaza por la ficha: al volver
 * desde la ficha se llega directo al panel.
 */
export function DrawerProvider({
  statuses,
  segmentsByEmployee,
  period,
  hrefBase,
  roleParam,
  query,
  children,
}: {
  statuses: EmployeeStatus[];
  segmentsByEmployee: Record<string, SegmentPoint[]>;
  period: DrawerPeriod;
  hrefBase: string;
  roleParam?: string;
  query?: string;
  children: React.ReactNode;
}) {
  const [stack, setStack] = useState<Entry[]>([]);
  const [dir, setDir] = useState<DrawerDirection>("open");
  // Se conserva la última vista durante la animación de salida.
  const [last, setLast] = useState<DrawerView | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const nav = useNavigateSearch();

  const openerRef = useRef<HTMLElement | null>(null);
  const firstView = useRef<DrawerView | null>(null);
  const historyPushed = useRef(false);
  const afterPop = useRef<(() => void) | null>(null);

  const isOpen = stack.length > 0;

  /* ---- Historial del navegador ---- */
  useEffect(() => {
    if (!isOpen || historyPushed.current) return;
    try {
      window.history.pushState({ horasPanel: true }, "");
      historyPushed.current = true;
    } catch {
      /* sin historial: el panel funciona igual */
    }
  }, [isOpen]);

  useEffect(() => {
    const onPop = () => {
      const run = afterPop.current;
      afterPop.current = null;
      if (historyPushed.current) {
        // Atrás del navegador (o gesto): cierra el panel.
        historyPushed.current = false;
        setStack([]);
      }
      if (run) window.setTimeout(run, 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** Cierra el panel; si tenía entrada en el historial, la retira. */
  const closeThen = useCallback((then?: () => void) => {
    setStack([]);
    if (historyPushed.current) {
      historyPushed.current = false;
      afterPop.current = then ?? null;
      window.history.back();
      // Red de seguridad por si el popstate no llega.
      if (then) {
        window.setTimeout(() => {
          if (afterPop.current === then) {
            afterPop.current = null;
            then();
          }
        }, 450);
      }
    } else {
      then?.();
    }
  }, []);

  const open = useCallback((v: DrawerView, opener?: HTMLElement | null) => {
    openerRef.current = opener ?? null;
    firstView.current = v;
    setOpening(null);
    setDir("open");
    setStack([{ view: v }]);
    setLast(v);
  }, []);

  const push = useCallback((v: DrawerView) => {
    const key =
      (document.activeElement as HTMLElement | null)
        ?.closest<HTMLElement>("[data-drawer-key]")
        ?.getAttribute("data-drawer-key") ?? null;
    setDir("push");
    setStack((s) => {
      if (s.length === 0) return [{ view: v }];
      const top = { ...s[s.length - 1], focusKey: key };
      return [...s.slice(0, -1), top, { view: v }];
    });
    setLast(v);
  }, []);

  const back = useCallback(() => {
    setDir("back");
    setStack((s) => {
      const next = s.slice(0, -1);
      if (next.length) setLast(next[next.length - 1].view);
      return next;
    });
  }, []);

  /** Cambia la persona de la vista actual (anterior / siguiente de la lista). */
  const replaceTop = useCallback((v: DrawerView, d: DrawerDirection) => {
    setDir(d);
    setStack((s) => {
      if (!s.length) return s;
      const rest = s.slice(0, -1);
      // Al volver a la lista, el foco va a la persona que se estaba viendo.
      if (rest.length && v.kind === "employee") {
        rest[rest.length - 1] = { ...rest[rest.length - 1], focusKey: `emp:${v.id}` };
      }
      return [...rest, { view: v }];
    });
    setLast(v);
  }, []);

  const close = useCallback(() => closeThen(), [closeThen]);

  const fichaHref = useCallback(
    (id: string) => {
      const qs = new URLSearchParams(query ?? "");
      if (roleParam) qs.set("rol", roleParam);
      // Búsqueda, estado y orden de la tabla (viven solo en la URL del cliente).
      for (const k of TABLE_PARAMS) {
        const v = params.get(k);
        if (v) qs.set(k, v);
        else qs.delete(k);
      }
      const s = qs.toString();
      return `${hrefBase}/${id}${s ? `?${s}` : ""}`;
    },
    [hrefBase, roleParam, query, params]
  );

  const current = stack[stack.length - 1]?.view ?? last;
  const activeEmployeeId = isOpen && current?.kind === "employee" ? current.id : null;

  // La ficha de la persona abierta se precarga: «Ver ficha completa» responde al instante.
  useEffect(() => {
    if (activeEmployeeId) router.prefetch(fichaHref(activeEmployeeId));
  }, [activeEmployeeId, fichaHref, router]);

  // Si la navegación a la ficha no llega, el botón vuelve a su estado.
  useEffect(() => {
    if (!opening) return;
    const t = window.setTimeout(() => setOpening(null), 12000);
    return () => window.clearTimeout(t);
  }, [opening]);

  const api: DrawerApi = useMemo(
    () => ({ open, push, close, activeEmployeeId, statuses, segmentsByEmployee, period, fichaHref }),
    [open, push, close, activeEmployeeId, statuses, segmentsByEmployee, period, fichaHref]
  );

  /** Nombre corto de una vista (título del panel y destino de «Volver»). */
  const describe = (v: DrawerView): { eyebrow: string; title: string } => {
    if (v.kind === "employee") {
      const s = statuses.find((x) => x.id === v.id);
      return { eyebrow: "Persona", title: s ? s.name ?? s.code : "Persona" };
    }
    if (v.kind === "group") return { eyebrow: DIM_FILTER[v.dim].label, title: v.label };
    const n = segmentMembers(statuses, v.segment).length;
    return { eyebrow: "Lista", title: `${SEGMENT_TEXT[v.segment].title} (${n})` };
  };

  const membersOf = (v: DrawerView): EmployeeStatus[] | null =>
    v.kind === "group"
      ? groupMembers(statuses, v.dim, v.label)
      : v.kind === "segment"
        ? segmentMembers(statuses, v.segment)
        : null;

  // Contenido según la vista actual.
  const { eyebrow, title } = current ? describe(current) : { eyebrow: "", title: "" };
  const prevEntry = stack.length > 1 ? stack[stack.length - 2] : null;
  const backLabel = prevEntry ? describe(prevEntry.view).title : undefined;
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  let pager: DrawerPager | null = null;

  if (current?.kind === "employee") {
    const s = statuses.find((x) => x.id === current.id);
    body = s ? (
      <EmployeeQuickView
        s={s}
        segments={segmentsByEmployee[s.id] ?? []}
        period={period}
        push={push}
      />
    ) : (
      <p className="text-sm text-ink-2">Esta persona ya no está en la vista actual.</p>
    );

    // Persona abierta desde una lista o un grupo: «‹ 2 de 5 ›».
    const list = prevEntry ? membersOf(prevEntry.view) : null;
    if (list && list.length > 1) {
      const i = list.findIndex((m) => m.id === current.id);
      if (i >= 0) {
        const prev = list[i - 1];
        const next = list[i + 1];
        pager = {
          index: i,
          total: list.length,
          prevLabel: prev ? prev.name ?? prev.code : undefined,
          nextLabel: next ? next.name ?? next.code : undefined,
          onPrev: prev ? () => replaceTop({ kind: "employee", id: prev.id }, "prev") : undefined,
          onNext: next ? () => replaceTop({ kind: "employee", id: next.id }, "next") : undefined,
        };
      }
    }

    if (s) {
      const href = fichaHref(s.id);
      const busy = opening === s.id;
      footer = (
        <Link
          href={href}
          prefetch={false}
          aria-busy={busy || undefined}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            if (busy) return;
            // El panel queda abierto con «Abriendo ficha…» hasta que llega la página.
            setOpening(s.id);
            startNavProgress();
            try {
              sessionStorage.setItem(
                FICHA_FROM_KEY,
                JSON.stringify({
                  from: window.location.pathname + window.location.search,
                  ficha: new URL(href, window.location.href).pathname,
                })
              );
            } catch {
              /* sin almacenamiento: «Volver» usa el enlace */
            }
            if (historyPushed.current) {
              historyPushed.current = false;
              router.replace(href);
            } else {
              router.push(href);
            }
          }}
          className="btn btn-primary w-full"
        >
          <span className="grid">
            <span className={busy ? "invisible [grid-area:1/1]" : "[grid-area:1/1]"}>
              Ver ficha completa
            </span>
            <span
              className={busy ? "[grid-area:1/1] inline-flex items-center justify-center gap-2" : "invisible [grid-area:1/1]"}
              aria-hidden={!busy}
            >
              <Spinner /> Abriendo ficha…
            </span>
          </span>
          {!busy && <Icon name="arrow-right" className="h-4 w-4" />}
        </Link>
      );
    }
  } else if (current?.kind === "group") {
    const members = groupMembers(statuses, current.dim, current.label);
    body = <GroupQuickView dim={current.dim} members={members} push={push} />;
    const applyFilter = () => {
      const next = new URLSearchParams(params.toString());
      next.set(current.param, current.label);
      for (const c of current.clear ?? []) next.delete(c);
      // Primero se cierra (y se retira la entrada del historial), luego se filtra.
      closeThen(() => nav.navigate(next.toString()));
    };
    footer = (
      <button type="button" onClick={applyFilter} className="btn btn-primary w-full">
        <Icon name="filter" className="h-4 w-4" />
        <span className="truncate">Filtrar el panel por «{current.label}»</span>
      </button>
    );
  } else if (current?.kind === "segment") {
    const members = segmentMembers(statuses, current.segment);
    body = <SegmentQuickView segment={current.segment} members={members} push={push} />;
  }

  const fallbackFocus = () => {
    const v = firstView.current;
    if (v?.kind !== "employee") return null;
    const sel = `[data-employee-row="${CSS.escape(v.id)}"]`;
    const rows = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(
      (el) => el.getClientRects().length > 0
    );
    const row = rows[0];
    return row ? row.querySelector<HTMLElement>("a, button") ?? row : null;
  };

  const viewKey = `${stack.length}-${current ? JSON.stringify(current) : ""}`;

  return (
    <DrawerContext.Provider value={api}>
      {children}
      <SlideOver
        open={isOpen}
        onClose={close}
        onBack={stack.length > 1 ? back : undefined}
        backLabel={backLabel}
        eyebrow={eyebrow}
        title={title}
        footer={footer}
        viewKey={viewKey}
        direction={dir}
        focusKey={stack[stack.length - 1]?.focusKey}
        getOpener={() => openerRef.current}
        getFallbackFocus={fallbackFocus}
        pager={pager}
      >
        {body}
      </SlideOver>
    </DrawerContext.Provider>
  );
}
