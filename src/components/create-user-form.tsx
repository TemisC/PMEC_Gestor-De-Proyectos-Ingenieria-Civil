"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "@/app/(app)/users/actions";
import type { ActionResult } from "@/app/(app)/users/actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createUser, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs text-gray-400">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs text-gray-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="role" className="text-xs text-gray-400">
            Rol
          </label>
          <select
            id="role"
            name="role"
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
          >
            <option value="GESTOR">Gestor de Proyectos</option>
            <option value="COLABORADOR">Colaborador</option>
            <option value="GERENCIA">Gerencia</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs text-gray-400">
            Contraseña inicial
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="mínimo 8 caracteres"
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="defaultHourlyRate" className="text-xs text-gray-400">
            Tarifa hora por defecto (opcional)
          </label>
          <input
            id="defaultHourlyRate"
            name="defaultHourlyRate"
            type="number"
            step="0.01"
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-green-900/30 px-3 py-2 text-sm text-green-400">
          Guardado correctamente.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Crear usuario"}
      </button>
    </form>
  );
}
