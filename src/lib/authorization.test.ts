import { describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import {
  canAccessClients,
  canLogTimeEntry,
  canManageProject,
  canManageTimeEntry,
  canManageUsers,
  canViewAllTimeEntries,
  canViewProject,
  type AuthProject,
  type AuthUser,
} from "./authorization";

const gerencia: AuthUser = { id: "user-gerencia", role: Role.GERENCIA };
const gestorA: AuthUser = { id: "user-gestor-a", role: Role.GESTOR };
const gestorB: AuthUser = { id: "user-gestor-b", role: Role.GESTOR };
const colaboradorAsignado: AuthUser = {
  id: "user-colaborador-1",
  role: Role.COLABORADOR,
};
const colaboradorAjeno: AuthUser = {
  id: "user-colaborador-2",
  role: Role.COLABORADOR,
};

// Proyecto de Gestor A, con un solo Colaborador asignado.
const proyectoDeGestorA: AuthProject = {
  id: "project-1",
  managerId: gestorA.id,
  memberIds: [colaboradorAsignado.id],
};

describe("canViewProject", () => {
  it("Gerencia ve cualquier proyecto, sin importar quién lo gestiona", () => {
    expect(canViewProject(gerencia, proyectoDeGestorA)).toBe(true);
  });

  it("el Gestor responsable ve su propio proyecto", () => {
    expect(canViewProject(gestorA, proyectoDeGestorA)).toBe(true);
  });

  it("un Gestor NO ve el proyecto de otro Gestor", () => {
    expect(canViewProject(gestorB, proyectoDeGestorA)).toBe(false);
  });

  it("el Colaborador asignado ve el proyecto", () => {
    expect(canViewProject(colaboradorAsignado, proyectoDeGestorA)).toBe(true);
  });

  it("un Colaborador NO asignado no ve el proyecto", () => {
    expect(canViewProject(colaboradorAjeno, proyectoDeGestorA)).toBe(false);
  });
});

describe("canManageProject", () => {
  it("el Gestor responsable puede gestionar su proyecto", () => {
    expect(canManageProject(gestorA, proyectoDeGestorA)).toBe(true);
  });

  it("un Gestor NO puede gestionar el proyecto de otro Gestor", () => {
    expect(canManageProject(gestorB, proyectoDeGestorA)).toBe(false);
  });

  it("Gerencia NO gestiona proyectos ajenos (solo lectura)", () => {
    expect(canManageProject(gerencia, proyectoDeGestorA)).toBe(false);
  });

  it("un Colaborador nunca gestiona proyectos, ni el suyo", () => {
    expect(canManageProject(colaboradorAsignado, proyectoDeGestorA)).toBe(
      false,
    );
  });
});

describe("canLogTimeEntry", () => {
  it("el Colaborador asignado puede cargar horas", () => {
    expect(canLogTimeEntry(colaboradorAsignado, proyectoDeGestorA)).toBe(
      true,
    );
  });

  it("un Colaborador NO asignado no puede cargar horas en ese proyecto", () => {
    expect(canLogTimeEntry(colaboradorAjeno, proyectoDeGestorA)).toBe(false);
  });

  it("el Gestor no carga horas (en el alcance del MVP)", () => {
    expect(canLogTimeEntry(gestorA, proyectoDeGestorA)).toBe(false);
  });

  it("Gerencia no carga horas", () => {
    expect(canLogTimeEntry(gerencia, proyectoDeGestorA)).toBe(false);
  });
});

describe("canViewAllTimeEntries", () => {
  it("Gerencia ve las horas cargadas en cualquier proyecto", () => {
    expect(canViewAllTimeEntries(gerencia, proyectoDeGestorA)).toBe(true);
  });

  it("el Gestor responsable ve las horas cargadas en su proyecto", () => {
    expect(canViewAllTimeEntries(gestorA, proyectoDeGestorA)).toBe(true);
  });

  it("un Gestor NO ve las horas de un proyecto ajeno", () => {
    expect(canViewAllTimeEntries(gestorB, proyectoDeGestorA)).toBe(false);
  });

  it("un Colaborador no ve las horas cargadas por otros", () => {
    expect(canViewAllTimeEntries(colaboradorAsignado, proyectoDeGestorA)).toBe(
      false,
    );
  });
});

describe("canManageTimeEntry", () => {
  it("el Colaborador dueño de la entrada puede corregirla/borrarla", () => {
    expect(
      canManageTimeEntry(colaboradorAsignado, proyectoDeGestorA, colaboradorAsignado.id),
    ).toBe(true);
  });

  it("un Colaborador NO puede tocar una entrada ajena", () => {
    expect(
      canManageTimeEntry(colaboradorAsignado, proyectoDeGestorA, colaboradorAjeno.id),
    ).toBe(false);
  });

  it("el Gestor responsable puede corregir/borrar cualquier entrada de su proyecto", () => {
    expect(
      canManageTimeEntry(gestorA, proyectoDeGestorA, colaboradorAsignado.id),
    ).toBe(true);
  });

  it("un Gestor de otro proyecto NO puede tocar la entrada", () => {
    expect(
      canManageTimeEntry(gestorB, proyectoDeGestorA, colaboradorAsignado.id),
    ).toBe(false);
  });

  it("Gerencia nunca edita/borra entradas (solo lectura)", () => {
    expect(
      canManageTimeEntry(gerencia, proyectoDeGestorA, colaboradorAsignado.id),
    ).toBe(false);
  });
});

describe("canManageUsers", () => {
  it("Gerencia puede crear/gestionar usuarios (Admin queda fuera del MVP)", () => {
    expect(canManageUsers(gerencia)).toBe(true);
  });

  it("un Gestor no puede crear usuarios", () => {
    expect(canManageUsers(gestorA)).toBe(false);
  });

  it("un Colaborador no puede crear usuarios", () => {
    expect(canManageUsers(colaboradorAsignado)).toBe(false);
  });
});

describe("canAccessClients", () => {
  it("Gerencia accede al catálogo de clientes", () => {
    expect(canAccessClients(gerencia)).toBe(true);
  });

  it("cualquier Gestor accede (es un catálogo global, no por Gestor)", () => {
    expect(canAccessClients(gestorA)).toBe(true);
    expect(canAccessClients(gestorB)).toBe(true);
  });

  it("un Colaborador no accede al catálogo de clientes", () => {
    expect(canAccessClients(colaboradorAsignado)).toBe(false);
  });
});
