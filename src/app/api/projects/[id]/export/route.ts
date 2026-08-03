import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapSource(src: string): string {
  return src === "AGREEMENT" ? "Acuerdo" : src === "ADDITIONAL" ? "Adicionales" : src;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { include: { contacts: true } },
      manager: true,
      agreement: true,
      additionals: true,
      plannedInvoices: { orderBy: { date: "asc" } },
      invoices: { orderBy: { date: "asc" } },
      members: { include: { user: true } },
      timeEntries: true,
      externalCollaborators: {
        include: { additionals: true, payments: { orderBy: { date: "asc" } } },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  // Solo el gestor del proyecto o Gerencia pueden exportar
  const role = session.user.role as Role;
  if (role !== Role.GERENCIA && project.managerId !== session.user.id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  // ── Construir clientInfo ─────────────────────────────────────────────
  const clientInfo = {
    agreement: {
      amount: project.agreement?.amount ?? 0,
      offerUrl: project.agreement?.offerUrl ?? "",
      contractUrl: project.agreement?.contractUrl ?? undefined,
    },
    additionals: project.additionals.map((a) => ({
      description: a.description,
      amount: a.amount,
      url: a.url ?? undefined,
    })),
    plannedInvoices: project.plannedInvoices.map((pi) => ({
      id: pi.id,
      description: pi.description,
      date: toDateStr(pi.date),
      amount: pi.amount,
      source: mapSource(pi.source),
    })),
    invoices: project.invoices.map((inv) => ({
      id: inv.id,
      amount: inv.amount,
      date: toDateStr(inv.date),
      pdfUrl: inv.pdfUrl ?? "",
      source: mapSource(inv.source),
    })),
  };

  // ── Construir team: internos (ProjectMember) ─────────────────────────
  const internalTeam = project.members.map((m) => ({
    name: m.user.name ?? m.user.email,
    contact: m.user.email,
    role: "Colaborador interno",
    type: "Interno" as const,
    active: m.user.active,
    internalCostInfo: {
      // PMEC usa horas reales (TimeEntry), no rangos planificados como el SPA.
      // Se exporta la tarifa; los rangos se dejan vacíos para no perder info falsa.
      hourlyRate: m.hourlyRate ?? m.user.defaultHourlyRate ?? 0,
      workRanges: [],
    },
  }));

  // ── Construir team: externos (ExternalCollaborator) ──────────────────
  const externalTeam = project.externalCollaborators.map((c) => ({
    name: c.name,
    company: c.company ?? undefined,
    contact: c.contact ?? c.name,
    role: "Colaborador externo",
    type: "Externo" as const,
    collaboratorInfo: {
      agreement: {
        amount: c.agreementAmount ?? 0,
        contractUrl: c.agreementUrl ?? "",
      },
      additionals: c.additionals.map((a) => ({
        description: a.description,
        amount: a.amount,
      })),
      invoices: c.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        date: toDateStr(p.date),
        pdfUrl: "",
      })),
    },
  }));

  // ── Contactos del cliente ────────────────────────────────────────────
  const technicalContacts = project.client?.contacts
    .filter((c) => c.type === "TECHNICAL")
    .map((c) => ({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
    }));

  const economicContacts = project.client?.contacts
    .filter((c) => c.type === "ECONOMIC")
    .map((c) => ({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
    }));

  const generalContact =
    project.client?.generalContactName
      ? {
          name: project.client.generalContactName,
          email: project.client.generalContactEmail ?? "",
          phone: project.client.generalContactPhone ?? "",
        }
      : undefined;

  // ── internalRates: tarifa por email ─────────────────────────────────
  const internalRates: Record<string, number> = {};
  for (const m of project.members) {
    const rate = m.hourlyRate ?? m.user.defaultHourlyRate;
    if (rate != null) internalRates[m.user.email] = rate;
  }

  // ── Documento final (formato SPA) ────────────────────────────────────
  const spaProject = {
    id: project.id,
    code: "",
    name: project.name,
    client: project.client?.name ?? "",
    status: project.status === "ACTIVE" ? "En proceso" : "Finalizado",
    statusDetail: "",
    startDate: toDateStr(project.createdAt),
    team: [...internalTeam, ...externalTeam],
    clientInfo,
    technicalContacts: technicalContacts ?? [],
    economicContacts: economicContacts ?? [],
    generalContact,
  };

  const backup = {
    projects: [spaProject],
    loneCollaborators: [],
    internalRates,
    exportDate: new Date().toISOString(),
    exportedFrom: "PMEC",
    exportedBy: session.user.email,
  };

  const filename = `pmec_export_${project.name.replace(/\s+/g, "_").toLowerCase()}_${toDateStr(new Date())}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
