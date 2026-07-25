import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function CollaboratorsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  if (session.user.role !== Role.GESTOR) redirect("/dashboard");

  const projects = await prisma.project.findMany({
    where: { managerId: userId, status: "ACTIVE" },
    include: {
      client: true,
      externalCollaborators: {
        include: { payments: true, additionals: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const allCollabs = projects.flatMap((p) =>
    p.externalCollaborators.map((ec) => {
      const agreed = ec.agreementAmount ?? 0;
      const extras = ec.additionals.reduce((s, a) => s + a.amount, 0);
      const paid = ec.payments.reduce((s, pay) => s + pay.amount, 0);
      const totalAgreed = agreed + extras;
      const pending = Math.max(0, totalAgreed - paid);
      return { id: ec.id, name: ec.name, company: ec.company, project: p, agreed, extras, totalAgreed, paid, pending };
    }),
  );

  const totalAgreed = allCollabs.reduce((s, c) => s + c.totalAgreed, 0);
  const totalPaid = allCollabs.reduce((s, c) => s + c.paid, 0);
  const totalPending = allCollabs.reduce((s, c) => s + c.pending, 0);
  const projectsWithCollabs = projects.filter((p) => p.externalCollaborators.length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Colaboradores Externos</h1>
        <p className="text-sm text-gray-400">
          {allCollabs.length} subcontratista{allCollabs.length !== 1 ? "s" : ""} en{" "}
          {projectsWithCollabs} proyecto{projectsWithCollabs !== 1 ? "s" : ""} activo{projectsWithCollabs !== 1 ? "s" : ""}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-800/60 bg-blue-950/20 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
            Total acordado
          </p>
          <p className="truncate text-xl font-bold text-white">{money(totalAgreed)}</p>
          <p className="mt-1 text-xs text-gray-400">Acuerdos + adicionales</p>
        </div>
        <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Pagado
          </p>
          <p className="truncate text-xl font-bold text-white">{money(totalPaid)}</p>
          <p className="mt-1 text-xs text-gray-400">Pagos ya realizados</p>
        </div>
        <div className="rounded-lg border border-red-800/60 bg-red-950/20 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
            Pendiente pago
          </p>
          <p className="truncate text-xl font-bold text-white">{money(totalPending)}</p>
          <p className="mt-1 text-xs text-gray-400">Por pagar a subcontratistas</p>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        {allCollabs.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay colaboradores externos en proyectos activos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Empresa</th>
                  <th className="pb-3 font-medium">Proyecto</th>
                  <th className="pb-3 text-right font-medium">Acuerdo</th>
                  <th className="pb-3 text-right font-medium">Adicionales</th>
                  <th className="pb-3 text-right font-medium">Pagado</th>
                  <th className="pb-3 text-right font-medium">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {allCollabs.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/30">
                    <td className="py-3 font-medium text-white">{c.name}</td>
                    <td className="py-3 text-gray-400">{c.company ?? "—"}</td>
                    <td className="py-3">
                      <Link
                        href={`/projects/${c.project.id}`}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        {c.project.name}
                      </Link>
                    </td>
                    <td className="py-3 text-right text-gray-300">
                      {c.agreed > 0 ? money(c.agreed) : "—"}
                    </td>
                    <td className="py-3 text-right text-gray-400">
                      {c.extras > 0 ? money(c.extras) : "—"}
                    </td>
                    <td className="py-3 text-right text-emerald-400">
                      {c.paid > 0 ? money(c.paid) : "—"}
                    </td>
                    <td className={`py-3 text-right font-medium ${c.pending > 0 ? "text-red-400" : "text-gray-600"}`}>
                      {c.pending > 0 ? money(c.pending) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-600 text-xs font-semibold">
                  <td colSpan={3} className="pt-3 text-gray-400">Total</td>
                  <td className="pt-3 text-right text-white">
                    {money(allCollabs.reduce((s, c) => s + c.agreed, 0))}
                  </td>
                  <td className="pt-3 text-right text-white">
                    {money(allCollabs.reduce((s, c) => s + c.extras, 0))}
                  </td>
                  <td className="pt-3 text-right text-emerald-400">{money(totalPaid)}</td>
                  <td className="pt-3 text-right text-red-400">{money(totalPending)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
