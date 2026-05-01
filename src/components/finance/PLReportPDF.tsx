import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export interface PLClientBreakdown {
  name: string;
  amount: number;
}

export interface PLReportPDFProps {
  workspace: { name: string; logoUrl?: string | null; tagline?: string | null };
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  net: number;
  margin: number;
  incomeByClient: PLClientBreakdown[];
  expenseByCategory: PLClientBreakdown[];
}

const COLOR_PRIMARY = "#5B7DFF";
const COLOR_TEXT = "#0A0A0F";
const COLOR_MUTED = "#6B7280";
const COLOR_BORDER = "#E5E7EB";
const COLOR_SUBTLE = "#F8FAFC";
const COLOR_SUCCESS = "#10B981";
const COLOR_DANGER = "#EF4444";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: COLOR_TEXT },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 6 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  tagline: { fontSize: 8, color: COLOR_MUTED, marginTop: 2, textTransform: "uppercase", letterSpacing: 1.2 },
  reportMeta: { textAlign: "right" },
  reportTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: COLOR_PRIMARY, letterSpacing: 1 },
  reportRange: { fontSize: 10, color: COLOR_MUTED, marginTop: 4 },
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  kpiCard: { flex: 1, padding: 14, backgroundColor: COLOR_SUBTLE, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: COLOR_PRIMARY },
  kpiLabel: { fontSize: 8, color: COLOR_MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: COLOR_BORDER },
  table: { borderWidth: 1, borderColor: COLOR_BORDER, borderRadius: 6, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: COLOR_SUBTLE, paddingVertical: 8, paddingHorizontal: 10 },
  th: { fontSize: 8, color: COLOR_MUTED, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: COLOR_BORDER },
  td: { fontSize: 10 },
  cName: { width: "70%" },
  cAmt: { width: "30%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  emptyRow: { padding: 14, fontSize: 10, color: COLOR_MUTED, textAlign: "center", fontStyle: "italic" },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 8, color: COLOR_MUTED, textAlign: "center" },
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function PLReportPDF({
  workspace, startDate, endDate, income, expense, net, margin,
  incomeByClient, expenseByCategory,
}: PLReportPDFProps) {
  return (
    <Document title={`P&L ${startDate} to ${endDate}`} author={workspace.name}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {workspace.logoUrl ? (
              <Image src={workspace.logoUrl} style={styles.logo} />
            ) : (
              <View style={[styles.logo, { backgroundColor: COLOR_PRIMARY }]} />
            )}
            <View>
              <Text style={styles.brand}>{workspace.name}</Text>
              {workspace.tagline ? <Text style={styles.tagline}>{workspace.tagline}</Text> : null}
            </View>
          </View>
          <View style={styles.reportMeta}>
            <Text style={styles.reportTitle}>P&L REPORT</Text>
            <Text style={styles.reportRange}>{fmtDate(startDate)} — {fmtDate(endDate)}</Text>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: COLOR_SUCCESS }]}>
            <Text style={styles.kpiLabel}>Total Income</Text>
            <Text style={[styles.kpiValue, { color: COLOR_SUCCESS }]}>{fmt(income)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: COLOR_DANGER }]}>
            <Text style={styles.kpiLabel}>Total Expense</Text>
            <Text style={[styles.kpiValue, { color: COLOR_DANGER }]}>{fmt(expense)}</Text>
          </View>
        </View>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Net Profit</Text>
            <Text style={[styles.kpiValue, { color: net >= 0 ? COLOR_SUCCESS : COLOR_DANGER }]}>{fmt(net)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Profit Margin</Text>
            <Text style={styles.kpiValue}>{margin.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Income by Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income by Client</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, styles.cName]}>Client</Text>
              <Text style={[styles.th, styles.cAmt]}>Amount</Text>
            </View>
            {incomeByClient.length === 0 ? (
              <Text style={styles.emptyRow}>No income recorded in this period</Text>
            ) : (
              incomeByClient.map((row, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, styles.cName]}>{row.name}</Text>
                  <Text style={[styles.td, styles.cAmt, { color: COLOR_SUCCESS }]}>{fmt(row.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Expense by Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense by Category</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, styles.cName]}>Category</Text>
              <Text style={[styles.th, styles.cAmt]}>Amount</Text>
            </View>
            {expenseByCategory.length === 0 ? (
              <Text style={styles.emptyRow}>No expenses recorded in this period</Text>
            ) : (
              expenseByCategory.map((row, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, styles.cName]}>{row.name}</Text>
                  <Text style={[styles.td, styles.cAmt, { color: COLOR_DANGER }]}>{fmt(row.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {workspace.name} · Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </Page>
    </Document>
  );
}
