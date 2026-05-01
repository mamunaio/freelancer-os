import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoicePDFProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  workspace: { name: string; logoUrl?: string | null; tagline?: string | null };
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null } | null;
  projectName?: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  total: number;
  notes?: string | null;
  paymentInstructions?: string | null;
  status?: string;
}

const COLOR_PRIMARY = "#5B7DFF";
const COLOR_TEXT = "#0A0A0F";
const COLOR_MUTED = "#6B7280";
const COLOR_BORDER = "#E5E7EB";
const COLOR_SUBTLE = "#F8FAFC";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: COLOR_TEXT },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 6 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  tagline: { fontSize: 8, color: COLOR_MUTED, marginTop: 2, textTransform: "uppercase", letterSpacing: 1.2 },
  invMeta: { textAlign: "right" },
  invTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: COLOR_PRIMARY, letterSpacing: 1 },
  invNumber: { fontSize: 10, color: COLOR_MUTED, marginTop: 4 },
  statusPill: { marginTop: 8, alignSelf: "flex-end", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, fontSize: 8, color: "#fff", backgroundColor: COLOR_PRIMARY, textTransform: "uppercase", letterSpacing: 1 },
  divider: { height: 1, backgroundColor: COLOR_BORDER, marginVertical: 18 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  col: { width: "48%" },
  colLabel: { fontSize: 8, color: COLOR_MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  colName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  colLine: { fontSize: 10, color: COLOR_MUTED, marginBottom: 1 },
  table: { borderWidth: 1, borderColor: COLOR_BORDER, borderRadius: 6, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: COLOR_SUBTLE, paddingVertical: 8, paddingHorizontal: 10 },
  th: { fontSize: 8, color: COLOR_MUTED, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: COLOR_BORDER },
  td: { fontSize: 10 },
  cDesc: { width: "55%" },
  cQty: { width: "12%", textAlign: "right" },
  cRate: { width: "16%", textAlign: "right" },
  cAmt: { width: "17%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  totals: { marginTop: 18, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { fontSize: 10, color: COLOR_MUTED },
  totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: COLOR_BORDER },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: COLOR_PRIMARY },
  noteBox: { marginTop: 32, padding: 14, backgroundColor: COLOR_SUBTLE, borderRadius: 6 },
  noteLabel: { fontSize: 8, color: COLOR_MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  noteBody: { fontSize: 10, color: COLOR_TEXT, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 8, color: COLOR_MUTED, textAlign: "center" },
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function InvoicePDF({
  invoiceNumber, issueDate, dueDate, workspace, client, projectName,
  lineItems, subtotal, taxRate, total, notes, paymentInstructions, status,
}: InvoicePDFProps) {
  return (
    <Document title={`Invoice ${invoiceNumber}`} author={workspace.name}>
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
              {workspace.tagline && <Text style={styles.tagline}>{workspace.tagline}</Text>}
            </View>
          </View>
          <View style={styles.invMeta}>
            <Text style={styles.invTitle}>INVOICE</Text>
            <Text style={styles.invNumber}>{invoiceNumber}</Text>
            {status && <Text style={styles.statusPill}>{status}</Text>}
          </View>
        </View>

        {/* Bill to + Dates */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Bill To</Text>
            <Text style={styles.colName}>{client?.name || "—"}</Text>
            {client?.company && <Text style={styles.colLine}>{client.company}</Text>}
            {client?.email && <Text style={styles.colLine}>{client.email}</Text>}
            {client?.phone && <Text style={styles.colLine}>{client.phone}</Text>}
          </View>
          <View style={[styles.col, { alignItems: "flex-end" }]}>
            <Text style={styles.colLabel}>Issued</Text>
            <Text style={[styles.colName, { fontSize: 10 }]}>{fmtDate(issueDate)}</Text>
            {dueDate && (
              <>
                <Text style={[styles.colLabel, { marginTop: 8 }]}>Due</Text>
                <Text style={[styles.colName, { fontSize: 10 }]}>{fmtDate(dueDate)}</Text>
              </>
            )}
            {projectName && (
              <>
                <Text style={[styles.colLabel, { marginTop: 8 }]}>Project</Text>
                <Text style={[styles.colName, { fontSize: 10 }]}>{projectName}</Text>
              </>
            )}
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.cDesc]}>Description</Text>
            <Text style={[styles.th, styles.cQty]}>Qty</Text>
            <Text style={[styles.th, styles.cRate]}>Rate</Text>
            <Text style={[styles.th, styles.cAmt]}>Amount</Text>
          </View>
          {lineItems.map((it, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.cDesc]}>{it.description || "—"}</Text>
              <Text style={[styles.td, styles.cQty]}>{it.quantity}</Text>
              <Text style={[styles.td, styles.cRate]}>{fmt(it.rate)}</Text>
              <Text style={[styles.td, styles.cAmt]}>{fmt(it.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
          </View>
          {taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.totalValue}>{fmt(subtotal * (taxRate / 100))}</Text>
            </View>
          )}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total Due</Text>
            <Text style={styles.grandValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Payment / Notes */}
        {paymentInstructions && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Payment Instructions</Text>
            <Text style={styles.noteBody}>{paymentInstructions}</Text>
          </View>
        )}
        {notes && (
          <View style={[styles.noteBox, { marginTop: 12 }]}>
            <Text style={styles.noteLabel}>Notes</Text>
            <Text style={styles.noteBody}>{notes}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Thank you for your business · {workspace.name}
        </Text>
      </Page>
    </Document>
  );
}
