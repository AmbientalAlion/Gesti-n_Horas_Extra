"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlideOver } from "./SlideOver";
import { DrawerContext, type DrawerApi, type DrawerView } from "./context";
import { groupMembers, segmentMembers } from "./select";
import {
  DIM_FILTER,
  EmployeeQuickView,
  GroupQuickView,
  SEGMENT_TEXT,
  SegmentQuickView,
} from "./views";
import type { EmployeeStatus, EmployeeWeek } from "@/lib/aggregate";

/**
 * Proveedor del panel lateral del dashboard. Cualquier componente cliente
 * dentro de él puede abrir el detalle de una persona, un grupo o una lista
 * con `useDrawer()`. Lleva un historial para poder volver dentro del panel.
 */
export function DrawerProvider({
  statuses,
  weeksByEmployee,
  hrefBase,
  roleParam,
  query,
  children,
}: {
  statuses: EmployeeStatus[];
  weeksByEmployee: Record<string, EmployeeWeek[]>;
  hrefBase: string;
  roleParam?: string;
  query?: string;
  children: React.ReactNode;
}) {
  const [stack, setStack] = useState<DrawerView[]>([]);
  // Se conserva la última vista durante la animación de salida.
  const [last, setLast] = useState<DrawerView | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const open = useCallback((v: DrawerView) => {
    setStack([v]);
    setLast(v);
  }, []);
  const push = useCallback((v: DrawerView) => {
    setStack((s) => [...s, v]);
    setLast(v);
  }, []);
  const back = useCallback(() => {
    setStack((s) => {
      const next = s.slice(0, -1);
      if (next.length) setLast(next[next.length - 1]);
      return next;
    });
  }, []);
  const close = useCallback(() => setStack([]), []);

  const fichaHref = useCallback(
    (id: string) => {
      const qs = [query, roleParam ? `rol=${roleParam}` : ""].filter(Boolean).join("&");
      return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
    },
    [hrefBase, roleParam, query]
  );

  const api: DrawerApi = useMemo(
    () => ({ open, push, close, statuses, weeksByEmployee, fichaHref }),
    [open, push, close, statuses, weeksByEmployee, fichaHref]
  );

  const current = stack[stack.length - 1] ?? last;
  const isOpen = stack.length > 0;

  // Contenido según la vista actual.
  let eyebrow = "";
  let title = "";
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (current?.kind === "employee") {
    const s = statuses.find((x) => x.id === current.id);
    eyebrow = "Persona";
    title = s ? s.name ?? s.code : "Persona";
    body = s ? (
      <EmployeeQuickView s={s} weeks={weeksByEmployee[s.id] ?? []} push={push} />
    ) : (
      <p className="text-sm text-slate-600">
        Esta persona ya no está en la vista actual.
      </p>
    );
    if (s) {
      footer = (
        <Link
          href={fichaHref(s.id)}
          onClick={close}
          className="btn-primary w-full text-sm"
        >
          Ver ficha completa
        </Link>
      );
    }
  } else if (current?.kind === "group") {
    const members = groupMembers(statuses, current.dim, current.label);
    eyebrow = DIM_FILTER[current.dim].label;
    title = current.label;
    body = <GroupQuickView dim={current.dim} members={members} push={push} />;
    const applyFilter = () => {
      const next = new URLSearchParams(params.toString());
      next.set(current.param, current.label);
      for (const c of current.clear ?? []) next.delete(c);
      startTransition(() => {
        router.push(`?${next.toString()}`, { scroll: false });
        close();
      });
    };
    footer = (
      <button
        type="button"
        onClick={applyFilter}
        disabled={isPending}
        className="btn-primary w-full text-sm"
      >
        {isPending ? "Filtrando el panel…" : `Filtrar el panel por «${current.label}»`}
      </button>
    );
  } else if (current?.kind === "segment") {
    const members = segmentMembers(statuses, current.segment);
    eyebrow = "Lista";
    title = `${SEGMENT_TEXT[current.segment].title} (${members.length})`;
    body = <SegmentQuickView segment={current.segment} members={members} push={push} />;
  }

  return (
    <DrawerContext.Provider value={api}>
      {children}
      <SlideOver
        open={isOpen}
        onClose={close}
        onBack={stack.length > 1 ? back : undefined}
        eyebrow={eyebrow}
        title={title}
        footer={footer}
      >
        {/* La key reinicia la animación de entrada al navegar dentro del panel. */}
        <div key={`${stack.length}-${current ? JSON.stringify(current) : ""}`}>{body}</div>
      </SlideOver>
    </DrawerContext.Provider>
  );
}
