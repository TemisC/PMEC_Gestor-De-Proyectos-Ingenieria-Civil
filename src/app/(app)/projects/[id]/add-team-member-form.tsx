"use client";

import { useState } from "react";
import { addTeamMember } from "@/app/(app)/projects/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";

type Candidate = { id: string; name: string };

// Picker unificado de equipo (feedback del gestor, 2026-08-13): un único
// desplegable con internos y externos diferenciados, más la opción de
// escribir un colaborador externo nuevo — reemplaza los dos flujos
// separados que había antes.
export function AddTeamMemberForm({
  projectId,
  availableUsers,
  availableCollaborators,
}: {
  projectId: string;
  availableUsers: Candidate[];
  availableCollaborators: Candidate[];
}) {
  const [selection, setSelection] = useState("");
  const isNewExternal = selection === "new-external";
  const isExternal = selection.startsWith("external:") || isNewExternal;

  return (
    <ActionForm action={addTeamMember} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Agregar al equipo</label>
        <select
          name="selection"
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
        >
          <option value="">— Elegir —</option>
          {availableUsers.length > 0 && (
            <optgroup label="Interno">
              {availableUsers.map((u) => (
                <option key={u.id} value={`internal:${u.id}`}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Externo">
            {availableCollaborators.map((c) => (
              <option key={c.id} value={`external:${c.id}`}>
                {c.name}
              </option>
            ))}
            <option value="new-external">+ Colaborador externo nuevo…</option>
          </optgroup>
        </select>
      </div>

      {isNewExternal && (
        <>
          <Field label="Nombre" name="newCollaboratorName" required />
          <Field label="Empresa" name="newCollaboratorCompany" />
          <Field label="Contacto" name="newCollaboratorContact" />
        </>
      )}
      {isExternal && (
        <>
          <Field label="Acordado" name="agreementAmount" type="number" step="0.01" />
          <Field label="URL acuerdo" name="agreementUrl" />
        </>
      )}

      <SubmitButton>Agregar</SubmitButton>
    </ActionForm>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
      />
    </div>
  );
}
