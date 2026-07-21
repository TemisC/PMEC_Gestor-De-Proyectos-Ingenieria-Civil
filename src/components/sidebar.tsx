import Link from "next/link";
import { Role } from "@/generated/prisma/enums";
import { DashboardIcon, LogoIcon, PlusIcon } from "@/components/ui/icons";

const roleLabel: Record<Role, string> = {
  GERENCIA: "Gerencia",
  GESTOR: "Gestor de Proyectos",
  COLABORADOR: "Colaborador",
};

// Mismo lenguaje visual que el SPA original (components/Sidebar.tsx):
// fondo bg-gray-800, ítem activo en sky-500, angosta en mobile (icon-only,
// w-16) y completa en desktop (md:w-64). Server component — sin estado de
// "vista activa" propio porque hoy solo hay una sección persistente
// (Dashboard); se agrega si suman más secciones (Etapa post-MVP).
export function Sidebar({
  userLabel,
  role,
  logoutAction,
}: {
  userLabel: string;
  role: Role;
  logoutAction: () => Promise<void>;
}) {
  return (
    <aside className="fixed top-0 left-0 h-full w-16 md:w-64 bg-gray-800 text-white flex flex-col z-10 shadow-lg">
      <div className="flex items-center justify-center md:justify-start md:px-4 h-20 border-b border-gray-700">
        <LogoIcon className="h-8 w-8 text-sky-400" />
        <span className="ml-3 text-xl font-bold hidden md:inline">PMEC</span>
      </div>

      <nav className="flex-1 mt-6">
        <Link
          href="/dashboard"
          className="flex items-center w-full px-4 py-3 text-sm font-medium bg-sky-500 text-white"
        >
          <DashboardIcon className="h-6 w-6" />
          <span className="ml-4 hidden md:inline">Dashboard</span>
        </Link>
        {role === Role.GESTOR && (
          <Link
            href="/projects/new"
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <PlusIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Nuevo proyecto</span>
          </Link>
        )}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <p className="hidden text-xs text-gray-400 md:block">{userLabel}</p>
        <p className="mb-3 hidden text-[10px] uppercase tracking-wider text-sky-400 md:block">
          {roleLabel[role]}
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
