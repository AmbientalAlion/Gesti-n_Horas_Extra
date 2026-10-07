import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import type { UploadEntry } from "./history";

/** «Últimas cargas»: evita subir dos veces el mismo periodo. */
export function RecentUploads({ entries }: { entries: UploadEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <Reveal as="section" className="card" aria-labelledby="ultimas-cargas">
      <h2 id="ultimas-cargas" className="text-title text-heading">
        Últimas cargas
      </h2>
      <p className="mt-0.5 text-small text-ink-2">Revise que el periodo no se haya cargado ya.</p>
      <ul className="mt-3 divide-y divide-line">
        {entries.map((u) => (
          <li key={u.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3 sm:flex-nowrap sm:items-center">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary-soft text-heading">
              <Icon name="upload" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-ui font-semibold text-ink" title={u.fileName}>
                {u.fileName}
              </p>
              <p className="text-small text-muted">
                {u.when}
                {u.who ? ` · ${u.who}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-[3.25rem] sm:pl-0">
              <span className="chip">Semana {u.period}</span>
              {u.cutType === "parcial" && <span className="chip-info">Corte parcial</span>}
              <span className="chip tabular-nums">{u.rows.toLocaleString("es-CO")} filas</span>
              {u.frozen > 0 && (
                <span className="chip-pending tabular-nums">
                  {u.frozen} congelado{u.frozen === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
