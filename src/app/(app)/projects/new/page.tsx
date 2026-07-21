import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma/enums";
import { createProject } from "@/app/(app)/projects/actions";
import { Card } from "@/components/ui/card";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.GESTOR) {
    // Solo el Gestor crea proyectos (sección 0.1 del plan) — defensa en
    // profundidad, la Server Action vuelve a chequear esto igual.
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Nuevo proyecto</h1>
      <Card>
        <form action={createProject} className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-1">
            <label htmlFor="client" className="text-xs font-medium text-gray-400">
              Cliente (opcional por ahora)
            </label>
            <input
              id="client"
              name="client"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
          >
            Crear proyecto
          </button>
        </form>
      </Card>
    </div>
  );
}
