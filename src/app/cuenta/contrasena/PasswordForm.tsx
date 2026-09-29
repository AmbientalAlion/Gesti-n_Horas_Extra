"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changePassword, type PasswordState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar contraseña"}
    </button>
  );
}

export function PasswordForm() {
  const [state, action] = useFormState<PasswordState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Nueva contraseña</span>
        <input
          type="password"
          name="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="field"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Mínimo 10 caracteres, con letras y al menos un número.
        </span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Repita la contraseña</span>
        <input
          type="password"
          name="confirm"
          required
          minLength={10}
          autoComplete="new-password"
          className="field"
        />
      </label>
      <p role="alert" className="min-h-5 text-sm text-status-red">
        {state.error}
      </p>
      <Submit />
    </form>
  );
}
