import { Role } from "@/generated/prisma/enums";

// Etapa 3 (plan_maestro.md, sección 11): políticas de autorización como
// funciones puras, escritas y testeadas ANTES de que exista ningún CRUD
// real (Etapa 4). La API/Server Actions que se construyan después llaman
// a estas funciones — nunca deciden acceso "a mano" en cada endpoint.
//
// Roles del MVP (sección 0.1):
// - GERENCIA:    lectura de todos los proyectos. Nunca edita proyectos
//                ajenos (ver sección 2, tabla de roles).
// - GESTOR:      CRUD solo sobre los proyectos donde es el responsable
//                (`managerId`).
// - COLABORADOR: ve y carga horas solo en los proyectos donde está
//                asignado (`ProjectMember`). Nunca gestiona proyectos.

export type AuthUser = {
  id: string;
  role: Role;
};

// `memberIds`: ids de los Colaboradores asignados a este proyecto (el
// resultado de `project.members.map(m => m.userId)` en la capa de datos
// real de la Etapa 4) — se pasa ya resuelto para que estas funciones no
// dependan de Prisma ni de una conexión a base de datos.
export type AuthProject = {
  id: string;
  managerId: string;
  memberIds: string[];
};

export function canViewProject(user: AuthUser, project: AuthProject): boolean {
  switch (user.role) {
    case Role.GERENCIA:
      return true;
    case Role.GESTOR:
      return project.managerId === user.id;
    case Role.COLABORADOR:
      return project.memberIds.includes(user.id);
    default:
      return false;
  }
}

export function canManageProject(user: AuthUser, project: AuthProject): boolean {
  // Ni Gerencia ni Colaborador editan/borran proyectos — solo el Gestor
  // responsable (sección 2: "Gerencia... no edita proyectos ajenos";
  // Colaborador nunca gestiona proyectos, solo carga sus horas).
  return user.role === Role.GESTOR && project.managerId === user.id;
}

export function canLogTimeEntry(user: AuthUser, project: AuthProject): boolean {
  return user.role === Role.COLABORADOR && project.memberIds.includes(user.id);
}

export function canViewAllTimeEntries(
  user: AuthUser,
  project: AuthProject,
): boolean {
  // Ver las horas cargadas por otros (sección 0.1): Gerencia en todos los
  // proyectos, Gestor solo en los suyos. Colaborador nunca ve las horas
  // de otro Colaborador, solo carga las propias.
  if (user.role === Role.GERENCIA) return true;
  if (user.role === Role.GESTOR) return project.managerId === user.id;
  return false;
}

// Etapa 4: helper para construir un AuthProject a partir de lo que
// devuelve Prisma (`project.findUnique({ include: { members: true } })`)
// — un solo lugar donde se hace el mapeo, en vez de repetirlo en cada
// Server Action.
export function toAuthProject(project: {
  id: string;
  managerId: string;
  members: { userId: string }[];
}): AuthProject {
  return {
    id: project.id,
    managerId: project.managerId,
    memberIds: project.members.map((m) => m.userId),
  };
}
