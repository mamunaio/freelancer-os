import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceMaker } from "@/components/finance/InvoiceMaker";

export default function InvoicePage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Tools"
        title="Invoice Maker"
        subtitle="Build a clean, branded invoice and download as PDF."
      />
      <InvoiceMaker />
    </AppLayout>
  );
}
