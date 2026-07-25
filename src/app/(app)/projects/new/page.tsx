import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import { CreateProjectForm } from "./create-project-form";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.GESTOR) {
    // Solo el Gestor crea proyectos (sección 0.1 del plan) — defensa en
    // profundidad, la Server Action vuelve a chequear esto igual.
    redirect("/dashboard");
  }

  // Clientes: catálogo global (sección 2 del plan) — se ofrece elegir uno
  // existente o escribir el nombre de uno nuevo, nunca duplicado por
  // Gestor.
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Nuevo proyecto</h1>
      <Card>
        <CreateProjectForm clients={clients} />
      </Card>
    </div>
  );
}
