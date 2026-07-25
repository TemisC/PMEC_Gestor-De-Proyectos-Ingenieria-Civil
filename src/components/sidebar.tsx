"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import {
  ClientsIcon,
  DashboardIcon,
  EconomicIcon,
  ExternalCollabIcon,
  HistoryIcon,
  LogoIcon,
  PlusIcon,
  TeamGlobalIcon,
  TeamIcon,
} from "@/components/ui/icons";

const roleLabel: Record<Role, string> = {
  GERENCIA: "Gerencia",
  GESTOR: "Gestor de Proyectos",
  COLABORADOR: "Colaborador",
};

export function Sidebar({
  userLabel,
  role,
  logoutAction,
}: {
  userLabel: string;
  role: Role;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  const navClass = (href: string, exact = false) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    return active
      ? "flex items-center w-full px-4 py-3 text-sm font-medium bg-sky-500 text-white"
      : "flex items-center w-full px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-white";
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-16 md:w-64 bg-gray-800 text-white flex flex-col z-10 shadow-lg">
      <div className="flex items-center justify-center md:justify-start md:px-4 h-20 border-b border-gray-700">
        <LogoIcon className="h-8 w-8 text-sky-400" />
        <span className="ml-3 text-xl font-bold hidden md:inline">PMEC</span>
      </div>

      <nav className="flex-1 mt-6">
        <Link href="/dashboard" className={navClass("/dashboard", true)}>
          <DashboardIcon className="h-6 w-6" />
          <span className="ml-4 hidden md:inline">Dashboard</span>
        </Link>
        {role === Role.GESTOR && (
          <Link href="/projects/new" className={navClass("/projects/new", true)}>
            <PlusIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Nuevo proyecto</span>
          </Link>
        )}
        {role === Role.GESTOR && (
          <Link href="/economic" className={navClass("/economic")}>
            <EconomicIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Seguimiento Económico</span>
          </Link>
        )}
        {role === Role.GESTOR && (
          <Link href="/team" className={navClass("/team")}>
            <TeamGlobalIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Equipo Global</span>
          </Link>
        )}
        {role === Role.GESTOR && (
          <Link href="/collaborators" className={navClass("/collaborators")}>
            <ExternalCollabIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Colaboradores</span>
          </Link>
        )}
        {(role === Role.GESTOR || role === Role.GERENCIA) && (
          <Link href="/clients" className={navClass("/clients")}>
            <ClientsIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Clientes</span>
          </Link>
        )}
        {role === Role.GERENCIA && (
          <Link href="/users" className={navClass("/users")}>
            <TeamIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Usuarios</span>
          </Link>
        )}
        {role === Role.GERENCIA && (
          <Link href="/audit" className={navClass("/audit", true)}>
            <HistoryIcon className="h-6 w-6" />
            <span className="ml-4 hidden md:inline">Historial</span>
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
