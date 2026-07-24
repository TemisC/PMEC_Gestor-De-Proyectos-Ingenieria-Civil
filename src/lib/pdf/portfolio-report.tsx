import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type PortfolioProjectRow = {
  name: string;
  clientName: string | null;
  managerName: string;
  totalBudget: number;
  totalInvoiced: number;
  profit: number;
  profitPct: number;
  atRisk: boolean;
};

export type PortfolioReportData = {
  generatedAt: Date;
  totalCartera: number;
  totalFacturado: number;
  margenCartera: number;
  enRiesgoCount: number;
  projects: PortfolioProjectRow[];
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
  page: { fontFamily: "Helvetica", fontSize: 9, color: GRAY_DARK, backgroundColor: WHITE, padding: "32 40" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  logo: { fontSize: 20, fontFamily: "Helvetica-Bold", color: SKY },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GRAY_DARK },
  headerSub: { fontSize: 8, color: GRAY_MED, marginTop: 2 },

  divider: { height: 1, backgroundColor: SKY, marginBottom: 16 },

  kpiGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  kpiBox: { flex: 1, backgroundColor: GRAY_LIGHT, borderRadius: 4, padding: "8 10" },
  kpiLabel: { fontSize: 7, color: GRAY_MED, marginBottom: 3 },
  kpiValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  kpiValueRed: { fontSize: 11, fontFamily: "Helvetica-Bold", color: RED },
  kpiValueSky: { fontSize: 11, fontFamily: "Helvetica-Bold", color: SKY },

  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY_MED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },

  tableHeader: { flexDirection: "row", backgroundColor: GRAY_DARK, padding: "5 6", borderRadius: 3, marginBottom: 1 },
  tableRow: { flexDirection: "row", padding: "4 6", borderBottomWidth: 1, borderBottomColor: GRAY_LIGHT },
  tableRowAlt: { flexDirection: "row", padding: "4 6", backgroundColor: GRAY_LIGHT },

  colName: { flex: 2 },
  colMgr: { flex: 1.2 },
  colClient: { flex: 1 },
  colNum: { width: 60, textAlign: "right" },
  colPct: { width: 42, textAlign: "right" },

  thText: { fontSize: 7, color: WHITE, fontFamily: "Helvetica-Bold" },
  tdText: { fontSize: 8 },
  tdBold: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  tdRed: { fontSize: 8, color: RED, fontFamily: "Helvetica-Bold" },
  tdGreen: { fontSize: 8, color: GREEN, fontFamily: "Helvetica-Bold" },
  tdGray: { fontSize: 8, color: GRAY_MED },

  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: GRAY_LIGHT, paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY_MED },
});

function money(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function PortfolioReport({ data }: { data: PortfolioReportData }) {
  const { generatedAt, totalCartera, totalFacturado, margenCartera, enRiesgoCount, projects } = data;

  return (
    <Document title="Cartera de proyectos — PMEC" author="PMEC">
      <Page size="A4" orientation="landscape" style={s.page}>

        <View style={s.header}>
          <Text style={s.logo}>PMEC</Text>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Cartera de Proyectos</Text>
            <Text style={s.headerSub}>Generado el {formatDate(generatedAt)}</Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* KPIs */}
        <View style={s.kpiGrid}>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Proyectos activos</Text>
            <Text style={s.kpiValue}>{projects.length}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Presupuesto cartera</Text>
            <Text style={s.kpiValueSky}>{money(totalCartera)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Facturado total</Text>
            <Text style={s.kpiValue}>{money(totalFacturado)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Margen cartera</Text>
            <Text style={margenCartera < 50 ? s.kpiValueRed : s.kpiValue}>{margenCartera.toFixed(1)}%</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Proyectos en riesgo</Text>
            <Text style={enRiesgoCount > 0 ? s.kpiValueRed : s.kpiValue}>{enRiesgoCount}</Text>
          </View>
        </View>

        {/* Tabla de proyectos */}
        <Text style={s.sectionTitle}>Detalle por proyecto — ordenados por margen (peor primero)</Text>

        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colName]}>Proyecto</Text>
          <Text style={[s.thText, s.colMgr]}>Gestor</Text>
          <Text style={[s.thText, s.colClient]}>Cliente</Text>
          <Text style={[s.thText, s.colNum]}>Presupuesto</Text>
          <Text style={[s.thText, s.colNum]}>Facturado</Text>
          <Text style={[s.thText, s.colNum]}>Resultado</Text>
          <Text style={[s.thText, s.colPct]}>Margen</Text>
        </View>

        {projects.map((p, i) => {
          const rowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt;
          const marginStyle = p.atRisk ? s.tdRed : s.tdGreen;
          return (
            <View key={`${p.name}-${i}`} style={rowStyle}>
              <Text style={[s.tdBold, s.colName]}>{p.name}</Text>
              <Text style={[s.tdText, s.colMgr]}>{p.managerName}</Text>
              <Text style={[s.tdGray, s.colClient]}>{p.clientName ?? "—"}</Text>
              <Text style={[s.tdText, s.colNum]}>{p.totalBudget > 0 ? money(p.totalBudget) : "—"}</Text>
              <Text style={[s.tdText, s.colNum]}>{p.totalBudget > 0 ? money(p.totalInvoiced) : "—"}</Text>
              <Text style={[marginStyle, s.colNum]}>{p.totalBudget > 0 ? money(p.profit) : "—"}</Text>
              <Text style={[marginStyle, s.colPct]}>{p.totalBudget > 0 ? `${p.profitPct.toFixed(1)}%` : "—"}</Text>
            </View>
          );
        })}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>PMEC — Sistema de Gestión de Proyectos · Confidencial</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
