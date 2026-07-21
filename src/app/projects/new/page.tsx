import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma/enums";
import { createProject } from "@/app/projects/actions";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.GESTOR) {
    // Solo el Gestor crea proyectos (sección 0.1 del plan) — defensa en
    // profundidad, la Server Action vuelve a chequear esto igual.
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Nuevo proyecto</h1>
      <form action={createProject} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Nombre del proyecto
          </label>
          <input
            id="name"
            name="name"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="client" className="text-sm font-medium">
            Cliente (opcional por ahora)
          </label>
          <input
            id="client"
            name="client"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Crear proyecto
        </button>
      </form>
    </main>
  );
}
