import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma/enums";
import { ImportViewer } from "./import-viewer";

export default async function ImportProjectPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.GESTOR) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Importar proyecto desde JSON</h1>
        <p className="mt-1 text-sm text-gray-400">
          Cargá un archivo de backup del SPA (<span className="font-mono text-xs text-gray-300">vicent_pm_backup_*.json</span>) o
          un export de PMEC para previsualizar los datos antes de guardarlos.
        </p>
      </div>
      <ImportViewer />
    </div>
  );
}
