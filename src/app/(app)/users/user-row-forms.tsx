"use client";

import { useActionState } from "react";
import { updateUser, toggleUserActive, deleteUser } from "./actions";
import type { ActionResult } from "./actions";
import { TrashIcon } from "@/components/ui/icons";

// ─── EditUserForm ────────────────────────────────────────────────────────────

interface EditUserFormProps {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialRole: string;
  initialRate: number | null;
  isSelf: boolean;
}

export function EditUserForm({
  userId,
  initialName,
  initialEmail,
  initialRole,
  initialRate,
  isSelf: _isSelf,
}: EditUserFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateUser, null);

  return (
    <div className="flex flex-col gap-2">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Nombre</label>
          <input
            name="name"
            defaultValue={initialName}
            required
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={initialEmail}
            required
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Rol</label>
          <select
            name="role"
            defaultValue={initialRole}
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
          >
            <option value="GESTOR">Gestor de Proyectos</option>
            <option value="COLABORADOR">Colaborador</option>
            <option value="GERENCIA">Gerencia</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Tarifa/h</label>
          <input
            name="defaultHourlyRate"
            type="number"
            step="0.01"
            defaultValue={initialRate ?? ""}
            className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {state?.error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
    </div>
  );
}

// ─── ToggleUserButton ─────────────────────────────────────────────────────────

interface ToggleUserButtonProps {
  userId: string;
  active: boolean;
  isSelf: boolean;
}

export function ToggleUserButton({ userId, active, isSelf }: ToggleUserButtonProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(toggleUserActive, null);

  if (isSelf) return null;

  return (
    <div className="flex flex-col gap-1">
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="active" value={active ? "false" : "true"} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-gray-400 hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Guardando..." : active ? "Desactivar" : "Reactivar"}
        </button>
      </form>
      {state?.error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
    </div>
  );
}

// ─── DeleteUserButton ─────────────────────────────────────────────────────────

interface DeleteUserButtonProps {
  userId: string;
  canDelete: boolean;
  countLabel: string;
}

export function DeleteUserButton({ userId, canDelete, countLabel }: DeleteUserButtonProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(deleteUser, null);

  if (!canDelete) {
    return countLabel ? (
      <span className="text-xs text-gray-600">{countLabel}</span>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-1">
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={pending}
          title="Eliminar usuario"
          className="rounded p-0.5 text-gray-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </form>
      {state?.error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
    </div>
  );
}
