"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import clsx from "clsx";
import {
  assignRole,
  createUser,
  deleteRole,
  resetPassword,
  saveRole,
  type ActionState,
} from "./actions";

export interface RoleOption {
  id: string;
  name: string;
  level: "rrhh" | "director" | "jefe";
  description: string | null;
  scopeAll: boolean;
  system: boolean;
  scopes: { dim: "direccion" | "planta" | "area"; value: string }[];
  users: number;
}

export interface ScopeCatalog {
  direccion: string[];
  planta: string[];
  area: string[];
}

export const LEVEL_TEXT: Record<RoleOption["level"], string> = {
  rrhh: "Administración (RRHH)",
  director: "Consulta según alcance",
  jefe: "Consulta de su equipo directo",
};

function Submit({ label, pending: pendingLabel, variant = "primary" }: { label: string; pending: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(variant === "primary" ? "btn-primary" : "btn-secondary", "text-sm")}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state.error && !state.message) return <span role="status" aria-live="polite" />;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={clsx("text-sm", state.error ? "text-over" : "text-ok")}
    >
      {state.error ?? state.message}
    </p>
  );
}

/** Contraseña temporal: se muestra una sola vez para entregarla a la persona. */
function TempPassword({ state }: { state: ActionState }) {
  const [copied, setCopied] = useState(false);
  if (!state.tempPassword) return null;
  const text = `Correo: ${state.email}\nContraseña temporal: ${state.tempPassword}\nEntrar en: ${typeof window !== "undefined" ? window.location.origin : ""}/login`;
  return (
    <div className="rounded-lg border border-ok-border bg-ok-soft p-3 text-sm text-ok">
      <p className="font-medium">Entregue estos datos a la persona (solo se muestran ahora):</p>
      <p className="mt-1">
        Correo: <strong>{state.email}</strong>
      </p>
      <p>
        Contraseña temporal:{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-base tracking-wide">{state.tempPassword}</code>
      </p>
      <p className="mt-1 text-xs">Al entrar por primera vez deberá crear su propia contraseña.</p>
      <button
        type="button"
        className="btn-secondary mt-2 text-sm"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {});
        }}
      >
        {copied ? "Copiado" : "Copiar datos de acceso"}
      </button>
    </div>
  );
}

export function CreateUserForm({ roles, enabled }: { roles: RoleOption[]; enabled: boolean }) {
  const [state, action] = useFormState<ActionState, FormData>(createUser, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Correo</span>
          <input name="email" type="email" required autoComplete="off" placeholder="nombre@alion.com.co" className="field" disabled={!enabled} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Nombre completo</span>
          <input name="fullName" required autoComplete="off" className="field" disabled={!enabled} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Rol</span>
          <select name="roleId" required defaultValue="" className="field" disabled={!enabled}>
            <option value="" disabled>
              Elija un rol…
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {enabled ? (
          <Submit label="Crear usuario" pending="Creando…" />
        ) : (
          <button type="button" className="btn-primary text-sm" disabled>
            Crear usuario
          </button>
        )}
        <Feedback state={state} />
      </div>
      <TempPassword state={state} />
    </form>
  );
}

export function AssignRoleForm({
  userId,
  currentRoleId,
  roles,
  label,
}: {
  userId: string;
  currentRoleId: string | null;
  roles: RoleOption[];
  label: string;
}) {
  const [state, action] = useFormState<ActionState, FormData>(assignRole, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={userId} />
      <label className="sr-only" htmlFor={`rol-${userId}`}>
        Rol de {label}
      </label>
      <select id={`rol-${userId}`} name="roleId" defaultValue={currentRoleId ?? ""} className="field sm:w-56">
        <option value="">Sin rol (sin acceso)</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <Submit label="Guardar" pending="Guardando…" variant="secondary" />
      <Feedback state={state} />
    </form>
  );
}

export function ResetPasswordForm({ userId, email, enabled }: { userId: string; email: string; enabled: boolean }) {
  const [state, action] = useFormState<ActionState, FormData>(resetPassword, {});
  if (!enabled) return null;
  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={(e) => {
        if (!confirm(`¿Generar una contraseña temporal nueva para ${email}? La actual dejará de funcionar.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <input type="hidden" name="email" value={email} />
      <Submit label="Restablecer contraseña" pending="Generando…" variant="secondary" />
      <Feedback state={state} />
      <TempPassword state={state} />
    </form>
  );
}

const DIM_LABEL: Record<keyof ScopeCatalog, string> = {
  direccion: "Direcciones",
  planta: "Plantas",
  area: "Áreas",
};

/** Crear o editar un rol con su nivel y alcance. */
export function RoleForm({
  role,
  catalog,
  onDone,
}: {
  role?: RoleOption;
  catalog: ScopeCatalog;
  onDone?: () => void;
}) {
  const [state, action] = useFormState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveRole(prev, fd);
    if (r.ok && onDone) onDone();
    return r;
  }, {});
  const [level, setLevel] = useState<RoleOption["level"]>(role?.level ?? "director");
  const [scopeAll, setScopeAll] = useState(role?.scopeAll ?? false);
  const has = (dim: keyof ScopeCatalog, v: string) =>
    !!role?.scopes.some((s) => s.dim === dim && s.value === v);
  const lockedLevel = role?.system && role.level === "rrhh";

  return (
    <form action={action} className="space-y-4">
      {role && <input type="hidden" name="id" value={role.id} />}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Nombre del rol</span>
          <input
            name="name"
            required
            defaultValue={role?.name}
            placeholder="Director Industrial"
            className="field"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Qué puede hacer</span>
          <select
            name="level"
            value={level}
            onChange={(e) => setLevel(e.target.value as RoleOption["level"])}
            className="field"
            disabled={lockedLevel}
          >
            <option value="director">{LEVEL_TEXT.director}</option>
            <option value="jefe">{LEVEL_TEXT.jefe}</option>
            <option value="rrhh">{LEVEL_TEXT.rrhh}</option>
          </select>
          {lockedLevel && <input type="hidden" name="level" value="rrhh" />}
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-2">Descripción (opcional)</span>
        <input name="description" defaultValue={role?.description ?? ""} className="field" />
      </label>

      {level === "director" && (
        <fieldset className="rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-medium text-heading">Qué puede ver</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="scopeAll"
              checked={scopeAll}
              onChange={(e) => setScopeAll(e.target.checked)}
            />
            Toda la organización
          </label>
          {!scopeAll && (
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {(Object.keys(DIM_LABEL) as (keyof ScopeCatalog)[]).map((dim) => (
                <div key={dim}>
                  <p className="mb-1 text-[13px] font-semibold text-ink-2">{DIM_LABEL[dim]}</p>
                  {catalog[dim].length === 0 ? (
                    <p className="text-xs text-muted">Sin datos cargados.</p>
                  ) : (
                    <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                      {catalog[dim].map((v) => (
                        <label key={v} className="flex items-start gap-2 text-[13px] text-ink-2">
                          <input type="checkbox" name={dim} value={v} defaultChecked={has(dim, v)} className="mt-0.5" />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Verá a las personas que estén en cualquiera de las direcciones, plantas o áreas
            marcadas, y a quienes lo tengan como jefe inmediato.
          </p>
        </fieldset>
      )}
      {level === "jefe" && (
        <p className="text-xs text-ink-2">
          Verá solo a las personas que lo tengan como jefe inmediato (sección «Empleados y su
          jefe inmediato»).
        </p>
      )}
      {level === "rrhh" && (
        <p className="text-xs text-ink-2">
          Ve toda la organización y puede cargar archivos, revisar registros, exportar a nómina
          y administrar usuarios y roles.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Submit label={role ? "Guardar cambios" : "Crear rol"} pending="Guardando…" />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RoleCard({ role, catalog }: { role: RoleOption; catalog: ScopeCatalog }) {
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useFormState<ActionState, FormData>(deleteRole, {});
  const scopeText =
    role.level === "rrhh"
      ? "Toda la organización"
      : role.level === "jefe"
        ? "Su equipo directo"
        : role.scopeAll
          ? "Toda la organización"
          : (["direccion", "planta", "area"] as const)
              .map((dim) => {
                const vals = role.scopes.filter((s) => s.dim === dim).map((s) => s.value);
                return vals.length ? `${DIM_LABEL[dim]}: ${vals.join(", ")}` : "";
              })
              .filter(Boolean)
              .join(" · ") || "Nada asignado";

  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-heading">
            {role.name}
            {role.system && <span className="ml-2 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-normal text-ink-2">base</span>}
          </p>
          <p className="text-[13px] text-ink-2">{LEVEL_TEXT[role.level]}</p>
          <p className="mt-1 text-[13px] text-ink-2">
            <span className="text-muted">Ve:</span> {scopeText}
          </p>
          {role.description && <p className="mt-1 text-xs text-muted">{role.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-heading">
            {role.users} usuario{role.users === 1 ? "" : "s"}
          </span>
          <button type="button" className="btn-secondary text-sm" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cerrar" : "Editar"}
          </button>
          {!role.system && (
            <form
              action={delAction}
              onSubmit={(e) => {
                if (!confirm(`¿Borrar el rol «${role.name}»?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={role.id} />
              <Submit label="Borrar" pending="Borrando…" variant="secondary" />
            </form>
          )}
        </div>
      </div>
      <Feedback state={delState} />
      {editing && (
        <div className="mt-4 border-t border-line pt-4">
          <RoleForm role={role} catalog={catalog} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
