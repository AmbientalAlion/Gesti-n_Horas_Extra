"use client";

import { forwardRef, useId, useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";

/**
 * Campo de contraseña con botón «Mostrar» (44×44, aria-pressed) y aviso de
 * Bloq Mayús. Acepta las props de un <input>.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { describedBy?: string }
>(function PasswordInput({ className, describedBy, onKeyDown, onKeyUp, onBlur, ...rest }, ref) {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const capsId = useId();
  const readCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCaps(e.getModifierState("CapsLock"));
  };
  const described = [describedBy, caps ? capsId : null].filter(Boolean).join(" ") || undefined;

  return (
    <>
      <span className="relative block">
        <input
          ref={ref}
          {...rest}
          type={shown ? "text" : "password"}
          aria-describedby={described}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            readCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            readCaps(e);
            onKeyUp?.(e);
          }}
          onBlur={(e) => {
            setCaps(false);
            onBlur?.(e);
          }}
          className={clsx("field pr-12", className)}
        />
        <button
          type="button"
          aria-pressed={shown}
          aria-label="Mostrar contraseña"
          title={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShown((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-control text-muted transition-colors duration-fast hover:text-heading"
        >
          <span className="relative grid h-5 w-5 place-items-center">
            <Icon
              name="eye"
              className={clsx(
                "absolute h-5 w-5 transition-[opacity,transform] duration-fast ease-enter",
                shown ? "scale-75 opacity-0" : "opacity-100"
              )}
            />
            <Icon
              name="eye-off"
              className={clsx(
                "absolute h-5 w-5 transition-[opacity,transform] duration-fast ease-enter",
                shown ? "opacity-100" : "scale-75 opacity-0"
              )}
            />
          </span>
        </button>
      </span>
      {caps && (
        <span id={capsId} className="mt-1.5 flex animate-fade-in items-center gap-1.5 text-caption text-risk">
          <Icon name="alert" className="h-3.5 w-3.5" />
          Bloq Mayús está activado.
        </span>
      )}
    </>
  );
});
