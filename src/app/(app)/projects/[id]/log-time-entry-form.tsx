"use client";

import { useActionState, useEffect, useRef } from "react";
import { logTimeEntry } from "@/app/(app)/projects/actions";
import type { ActionResult } from "@/app/(app)/projects/actions";

interface LogTimeEntryFormProps {
  projectId: string;
}

export function LogTimeEntryForm({ projectId }: LogTimeEntryFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(logTimeEntry, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date" className="text-xs text-gray-400">
            Fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div className="flex w-24 flex-col gap-1">
          <label htmlFor="hours" className="text-xs text-gray-400">
            Horas
          </label>
          <input
            id="hours"
            name="hours"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            required
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-xs text-gray-400">
          Descripción (opcional)
        </label>
        <input
          id="description"
          name="description"
          className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Cargando..." : "Cargar"}
      </button>
    </form>
  );
}
