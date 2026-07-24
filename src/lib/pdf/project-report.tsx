import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CashflowRow } from "@/lib/financials";

// ─── Tipos de datos que recibe el PDF ─────────────────────────────────────

export type ProjectReportData = {
  projectName: string;
  clientName: string | null;
  managerName: string;
  status: "ACTIVE" | "ARCHIVED";
  generatedAt: Date;

  // Financiero
  totalBudget: number;
  totalInvoiced: number;
  pendingBilling: number;
  pendingPlanned: number;
  internalCost: number;
  externalCost: number;
  profit: number;
  profitPct: number;
  atRisk: boolean;

  // Cashflow
  cashflowRows: CashflowRow[];
};

// ─── Estilos ──────────────────────────────────────────────────────────────

const SKY = "#0EA5E9";
const GRAY_DARK = "#1F2937";
const GRAY_MED = "#6B7280";
const GRAY_LIGHT = "#F3F4F6";
const RED = "#EF4444";
const GREEN = "#22C55E";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: GRAY_DARK,
    backgroundColor: WHITE,
    padding: "32 40",
  },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  logo: { fontSize: 20, fontFamily: "Helvetica-Bold", color: SKY },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GRAY_DARK },
  headerSub: { fontSize: 8, color: GRAY_MED, marginTop: 2 },

  // Divider
  divider: { height: 1, backgroundColor: SKY, marginBottom: 16 },

  // Info row
  infoRow: { flexDirection: "row", gap: 32, marginBottom: 16 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 7, color: GRAY_MED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  // Section header
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GRAY_MED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },

  // KPI grid
  kpiGrid: { flexDirection: "row", gap: 8, marginBottom: 4 },
  kpiBox: {
    flex: 1,
    backgroundColor: GRAY_LIGHT,
    borderRadius: 4,
    padding: "8 10",
  },
  kpiLabel: { fontSize: 7, color: GRAY_MED, marginBottom: 3 },
  kpiValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  kpiValueRed: { fontSize: 11, fontFamily: "Helvetica-Bold", color: RED },
  kpiValueGreen: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GREEN },
  kpiValueSky: { fontSize: 11, fontFamily: "Helvetica-Bold", color: SKY },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GRAY_DARK,
    padding: "5 6",
    borderRadius: 3,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: "row",
    padding: "4 6",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_LIGHT,
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "4 6",
    backgroundColor: GRAY_LIGHT,
  },
  tableFooter: {
    flexDirection: "row",
    padding: "5 6",
    backgroundColor: GRAY_DARK,
    borderRadius: 3,
    marginTop: 1,
  },
  colLeft: { flex: 1 },
  colRight: { width: 70, textAlign: "right" },
  colRightSm: { width: 55, textAlign: "right" },
  thText: { fontSize: 7, color: WHITE, fontFamily: "Helvetica-Bold" },
  tdText: { fontSize: 8 },
  tdBold: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  tdRed: { fontSize: 8, color: RED },
  tdGreen: { fontSize: 8, color: GREEN },
  tdGray: { fontSize: 8, color: GRAY_MED },

  // Risk badge
  riskBadge: {
    backgroundColor: RED,
    color: WHITE,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: "flex-start",
    marginTop: 4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: GRAY_LIGHT,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: GRAY_MED },
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function money(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Documento ────────────────────────────────────────────────────────────

export function ProjectReport({ data }: { data: ProjectReportData }) {
  const {
    projectName, clientName, managerName, status, generatedAt,
    totalBudget, totalInvoiced, pendingBilling, pendingPlanned,
    internalCost, externalCost, profit, profitPct, atRisk,
    cashflowRows,
  } = data;

  const totCobrado = cashflowRows.reduce((s, r) => s + r.cobrado, 0);
  const totPrevisto = cashflowRows.reduce((s, r) => s + r.previsto, 0);
  const totInt = cashflowRows.reduce((s, r) => s + r.costeInterno, 0);
  const totExt = cashflowRows.reduce((s, r) => s + r.costeExterno, 0);
  const totResultado = totCobrado + totPrevisto - totInt - totExt;

  return (
    <Document title={`Reporte — ${projectName}`} author="PMEC">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>PMEC</Text>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Reporte de Proyecto</Text>
            <Text style={s.headerSub}>Generado el {formatDate(generatedAt)}</Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* Info del proyecto */}
        <View style={s.infoRow}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Proyecto</Text>
            <Text style={s.infoValue}>{projectName}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Cliente</Text>
            <Text style={s.infoValue}>{clientName ?? "—"}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Gestor responsable</Text>
            <Text style={s.infoValue}>{managerName}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Estado</Text>
            <Text style={s.infoValue}>{status === "ARCHIVED" ? "Archivado" : "Activo"}</Text>
          </View>
        </View>

        {/* KPIs financieros */}
        <Text style={s.sectionTitle}>Resumen financiero</Text>

        <View style={s.kpiGrid}>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Presupuesto total</Text>
            <Text style={s.kpiValueSky}>{money(totalBudget)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Facturado</Text>
            <Text style={s.kpiValue}>{money(totalInvoiced)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Pend. de facturar</Text>
            <Text style={s.kpiValue}>{money(pendingBilling)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Previsto sin facturar</Text>
            <Text style={s.kpiValue}>{money(pendingPlanned)}</Text>
          </View>
        </View>

        <View style={[s.kpiGrid, { marginTop: 8 }]}>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Coste interno (horas)</Text>
            <Text style={s.kpiValue}>{money(internalCost)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Coste externo (pagos)</Text>
            <Text style={s.kpiValue}>{money(externalCost)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Resultado</Text>
            <Text style={atRisk ? s.kpiValueRed : s.kpiValueGreen}>{money(profit)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Margen</Text>
            <Text style={atRisk ? s.kpiValueRed : s.kpiValueGreen}>{pct(profitPct)}</Text>
          </View>
        </View>

        {atRisk && (
          <Text style={s.riskBadge}>⚠ Margen por debajo del objetivo (50%)</Text>
        )}

        {/* Cashflow mensual */}
        {cashflowRows.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Cashflow mensual</Text>

            {/* Encabezado tabla */}
            <View style={s.tableHeader}>
              <Text style={[s.thText, s.colLeft]}>Mes</Text>
              <Text style={[s.thText, s.colRightSm]}>Cobrado</Text>
              <Text style={[s.thText, s.colRightSm]}>Previsto</Text>
              <Text style={[s.thText, s.colRightSm]}>Costo int.</Text>
              <Text style={[s.thText, s.colRightSm]}>Costo ext.</Text>
              <Text style={[s.thText, s.colRightSm]}>Resultado</Text>
            </View>

            {cashflowRows.map((row, i) => {
              const resultado = row.cobrado + row.previsto - row.costeInterno - row.costeExterno;
              const rowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt;
              const resultStyle = resultado > 0 ? s.tdGreen : resultado < 0 ? s.tdRed : s.tdGray;
              return (
                <View key={row.month} style={rowStyle}>
                  <Text style={[s.tdBold, s.colLeft]}>{row.label}</Text>
                  <Text style={[row.cobrado === 0 ? s.tdGray : s.tdText, s.colRightSm]}>{money(row.cobrado)}</Text>
                  <Text style={[row.previsto === 0 ? s.tdGray : s.tdText, s.colRightSm]}>{money(row.previsto)}</Text>
                  <Text style={[row.costeInterno === 0 ? s.tdGray : s.tdText, s.colRightSm]}>{money(row.costeInterno)}</Text>
                  <Text style={[row.costeExterno === 0 ? s.tdGray : s.tdText, s.colRightSm]}>{money(row.costeExterno)}</Text>
                  <Text style={[resultStyle, s.colRightSm]}>{money(resultado)}</Text>
                </View>
              );
            })}

            {/* Totales */}
            <View style={s.tableFooter}>
              <Text style={[s.thText, s.colLeft]}>Total</Text>
              <Text style={[s.thText, s.colRightSm]}>{money(totCobrado)}</Text>
              <Text style={[s.thText, s.colRightSm]}>{money(totPrevisto)}</Text>
              <Text style={[s.thText, s.colRightSm]}>{money(totInt)}</Text>
              <Text style={[s.thText, s.colRightSm]}>{money(totExt)}</Text>
              <Text style={[s.thText, s.colRightSm]}>{money(totResultado)}</Text>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>PMEC — Sistema de Gestión de Proyectos</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Pág. ${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
}
