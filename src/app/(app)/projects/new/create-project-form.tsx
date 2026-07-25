"use client";

import { useActionState } from "react";
import { createProject } from "@/app/(app)/projects/actions";
import type { ActionResult } from "@/app/(app)/projects/actions";

interface CreateProjectFormProps {
  clients: { id: string; name: string }[];
}

export function CreateProjectForm({ clients }: CreateProjectFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createProject, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-xs font-medium text-gray-400">
          Nombre del proyecto
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-md border border-gray-700 bg-gray-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </div>

      {clients.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="clientId" className="text-xs font-medium text-gray-400">
            Cliente existente
          </label>
          <select
            id="clientId"
            name="clientId"
            className="rounded-md border border-gray-700 bg-gray-900/60 px-3 py-2 text-sm text-white"
          >
            <option value="">— Ninguno —</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="newClientName" className="text-xs font-medium text-gray-400">
          O cliente nuevo (si no está en la lista de arriba)
        </label>
        <input
          id="newClientName"
          name="newClientName"
          placeholder="Nombre del cliente"
          className="rounded-md border border-gray-700 bg-gray-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear proyecto"}
      </button>
    </form>
  );
}
