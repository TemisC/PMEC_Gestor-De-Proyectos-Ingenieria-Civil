"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// Mismo contrato que las Server Actions ya migradas (users/actions.ts,
// projects/actions.ts: createProject/logTimeEntry) — devolver { error }/
// { ok } en vez de throw, para que la UI muestre feedback prolijo en vez
// de la pantalla de error genérica de Next.js.
export type ActionResult = { error?: string; ok?: boolean } | null;

type ActionFn = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

// Envuelve useActionState y muestra error/éxito debajo de los campos.
// SubmitButton/DeleteButton (abajo) usan useFormStatus() para el estado
// "pending" sin necesidad de pasarlo por props.
export function ActionForm({
  action,
  children,
  className,
  successMessage = "Guardado.",
}: {
  action: ActionFn;
  children: ReactNode;
  className?: string;
  successMessage?: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p className="w-full rounded-md bg-red-900/30 px-2 py-1 text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="w-full rounded-md bg-green-900/30 px-2 py-1 text-xs text-green-400">
          {successMessage}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({ children, small }: { children: ReactNode; small?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        small
          ? "rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {pending ? "Guardando..." : children}
    </button>
  );
}

export function DeleteButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Eliminando..." : children}
    </button>
  );
}
