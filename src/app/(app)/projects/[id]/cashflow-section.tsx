import type { CashflowRow } from "@/lib/financials";
import { Card } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Cell({
  value,
  dimZero = false,
  colorize = false,
}: {
  value: number;
  dimZero?: boolean;
  colorize?: boolean;
}) {
  const isZero = value === 0;
  const color = colorize
    ? value > 0
      ? "text-green-400"
      : value < 0
        ? "text-red-400"
        : "text-gray-600"
    : isZero && dimZero
      ? "text-gray-700"
      : "text-gray-300";

  return <td className={`py-2 pr-4 text-right tabular-nums text-xs ${color}`}>{money(value)}</td>;
}

export function CashflowSection({ rows }: { rows: CashflowRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Cashflow mensual
        </h2>
        <p className="text-sm text-gray-500">
          Sin datos todavía — aparecerá cuando haya facturas, previsiones de cobro o horas cargadas con tarifa configurada.
        </p>
      </Card>
    );
  }

  const totCobrado = rows.reduce((s, r) => s + r.cobrado, 0);
  const totPrevisto = rows.reduce((s, r) => s + r.previsto, 0);
  const totInt = rows.reduce((s, r) => s + r.costeInterno, 0);
  const totExt = rows.reduce((s, r) => s + r.costeExterno, 0);
  const totResultado = totCobrado + totPrevisto - totInt - totExt;

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Cashflow mensual
        </h2>
        <p className="mt-0.5 text-xs text-gray-600">
          Resultado = cobrado + previsto − coste interno − coste externo
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Mes</th>
              <th className="pb-2 pr-4 text-right font-medium">Cobrado</th>
              <th className="pb-2 pr-4 text-right font-medium">Previsto</th>
              <th className="pb-2 pr-4 text-right font-medium">Coste int.</th>
              <th className="pb-2 pr-4 text-right font-medium">Coste ext.</th>
              <th className="pb-2 text-right font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {rows.map((row) => {
              const resultado = row.cobrado + row.previsto - row.costeInterno - row.costeExterno;
              return (
                <tr key={row.month} className="hover:bg-gray-800/20">
                  <td className="py-2 pr-4 text-xs font-medium text-gray-300">{row.label}</td>
                  <Cell value={row.cobrado} dimZero />
                  <Cell value={row.previsto} dimZero />
                  <Cell value={row.costeInterno} dimZero />
                  <Cell value={row.costeExterno} dimZero />
                  <Cell value={resultado} colorize />
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-700 text-xs font-semibold">
              <td className="pt-2 text-gray-400">Total</td>
              <Cell value={totCobrado} />
              <Cell value={totPrevisto} />
              <Cell value={totInt} />
              <Cell value={totExt} />
              <Cell value={totResultado} colorize />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
