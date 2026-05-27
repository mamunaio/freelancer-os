import { NextResponse } from "next/server";
import { notFound } from "next/navigation";

import { requireOrgContext } from "@/lib/auth/session";
import { getInvoiceById } from "@/features/money/invoices/queries";
import { hasLocale, type Locale } from "@/i18n/routing";

/**
 * Invoice PDF download route.
 *
 * PLACEHOLDER: Returns a simple text response for now.
 * Full implementation with @react-pdf/renderer will be added in a follow-up
 * commit once the package is installed and the PDF template is designed.
 *
 * Future: Node runtime, render with @react-pdf/renderer, stream as PDF.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale, id } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";

  const ctx = await requireOrgContext(safeLocale);
  const invoice = await getInvoiceById(ctx.organizationId, id);

  if (!invoice) notFound();

  // Placeholder: return plain text
  const text = `
Invoice: ${invoice.number}
Client: ${invoice.clientLabel}
Issue Date: ${invoice.issueDate.slice(0, 10)}
Due Date: ${invoice.dueDate.slice(0, 10)}
Status: ${invoice.status}

Line Items:
${invoice.items.map((item) => `- ${item.description}: ${item.quantity} × ${invoice.currency} ${item.unitPrice} = ${invoice.currency} ${item.lineTotal}`).join("\n")}

Subtotal: ${invoice.currency} ${invoice.subtotal}
Tax: ${invoice.currency} ${invoice.tax}
Total: ${invoice.currency} ${invoice.total}

Notes: ${invoice.notes ?? "—"}
Terms: ${invoice.terms ?? "—"}
  `.trim();

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${invoice.number}.txt"`,
    },
  });
}

export const dynamic = "force-dynamic";
