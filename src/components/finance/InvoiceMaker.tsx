import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Printer, Download, Upload, X } from "lucide-react";

const LOGO_KEY = "invoice-maker-logo";
const PAY_KEY = "invoice-maker-payment";

type PaymentDetails = {
  bkash: string;
  nagad: string;
  rocket: string;
  wise: string;
  payoneer: string;
};
const emptyPay: PaymentDetails = { bkash: "", nagad: "", rocket: "", wise: "", payoneer: "" };

type Item = { id: string; description: string; quantity: number; rate: number };

const CURRENCIES = [
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "EUR", symbol: "€", locale: "de-DE" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "BDT", symbol: "৳", locale: "en-BD" },
  { code: "INR", symbol: "₹", locale: "en-IN" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDaysISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const uid = () => Math.random().toString(36).slice(2, 9);
const fmtDate = (s: string) =>
  s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export function InvoiceMaker() {
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusDaysISO(14));
  const [currency, setCurrency] = useState("USD");

  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromAddress, setFromAddress] = useState("");

  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toAddress, setToAddress] = useState("");

  const [items, setItems] = useState<Item[]>([
    { id: uid(), description: "", quantity: 1, rate: 0 },
  ]);

  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxLabel, setTaxLabel] = useState("VAT");
  const [taxRate, setTaxRate] = useState(10);

  const [notes, setNotes] = useState("");

  const [payment, setPayment] = useState<PaymentDetails>(() => {
    if (typeof window === "undefined") return emptyPay;
    try {
      const raw = localStorage.getItem(PAY_KEY);
      return raw ? { ...emptyPay, ...JSON.parse(raw) } : emptyPay;
    } catch { return emptyPay; }
  });
  const updatePayment = (patch: Partial<PaymentDetails>) =>
    setPayment((p) => {
      const next = { ...p, ...patch };
      try { localStorage.setItem(PAY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });

  const [logo, setLogo] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(LOGO_KEY); } catch { return null; }
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setLogo(data);
      try { localStorage.setItem(LOGO_KEY, data); } catch {}
      toast.success("Logo added");
    };
    reader.readAsDataURL(file);
  };
  const removeLogo = () => {
    setLogo(null);
    try { localStorage.removeItem(LOGO_KEY); } catch {}
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const cur = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const fmt = (n: number) =>
    new Intl.NumberFormat(cur.locale, { style: "currency", currency: cur.code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0),
    [items],
  );
  const taxAmount = taxEnabled ? subtotal * (Number(taxRate) || 0) / 100 : 0;
  const total = subtotal + taxAmount;

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () => setItems((a) => [...a, { id: uid(), description: "", quantity: 1, rate: 0 }]);
  const removeItem = (id: string) =>
    setItems((a) => (a.length === 1 ? a : a.filter((it) => it.id !== id)));

  const previewRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const node = previewRef.current ?? printRef.current;
    if (!node) return;
    try {
      setExporting(true);
      // Force the print sheet to be visible offscreen for capture if using printRef
      const target = printRef.current!;
      const prevDisplay = target.style.display;
      target.style.display = "block";
      target.style.position = "fixed";
      target.style.left = "-10000px";
      target.style.top = "0";
      target.style.width = "900px";
      target.style.background = "white";

      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      target.style.display = prevDisplay;
      target.style.position = "";
      target.style.left = "";
      target.style.top = "";
      target.style.width = "";
      target.style.background = "";

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
      const safeNum = (invoiceNumber || "invoice").replace(/[^a-z0-9-_]+/gi, "-");
      pdf.save(`${safeNum}.pdf`);
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="invoice-page">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Tools</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">Invoice Maker</h2>
          <p className="mt-1 text-xs text-muted-foreground">Build a clean, branded invoice and download as PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="outline" className="no-print">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPDF} disabled={exporting} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 no-print">
            <Download className="mr-2 h-4 w-4" /> {exporting ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="no-print bg-secondary/40">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Invoice details</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Invoice number</Label>
                    <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Issue date</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">From</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Logo</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-secondary/30">
                          {logo ? (
                            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No logo</span>
                          )}
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleLogoUpload(f);
                          }}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="mr-1.5 h-3.5 w-3.5" /> {logo ? "Replace" : "Upload"}
                        </Button>
                        {logo && (
                          <Button type="button" size="sm" variant="ghost" onClick={removeLogo} className="text-muted-foreground hover:text-destructive">
                            <X className="mr-1.5 h-3.5 w-3.5" /> Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG or WebP · max 2MB</p>
                    </div>
                    <div className="space-y-1.5"><Label>Name / Business</Label>
                      <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your business" /></div>
                    <div className="space-y-1.5"><Label>Email</Label>
                      <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="you@example.com" /></div>
                    <div className="space-y-1.5"><Label>Address</Label>
                      <Textarea rows={3} value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="Street, City, Country" /></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Bill To</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5"><Label>Client name</Label>
                      <Input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Client / company" /></div>
                    <div className="space-y-1.5"><Label>Email</Label>
                      <Input value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="client@example.com" /></div>
                    <div className="space-y-1.5"><Label>Address</Label>
                      <Textarea rows={3} value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="Street, City, Country" /></div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">Line items</CardTitle>
                  <Button size="sm" variant="outline" onClick={addItem}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add item
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="pb-2 font-medium">Description</th>
                          <th className="pb-2 pl-3 font-medium w-24">Qty</th>
                          <th className="pb-2 pl-3 font-medium w-32">Rate</th>
                          <th className="pb-2 pl-3 font-medium w-32 text-right">Amount</th>
                          <th className="pb-2 pl-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const amt = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
                          return (
                            <tr key={it.id} className="border-t border-border/60">
                              <td className="py-2 pr-2">
                                <Input value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} placeholder="Service or product" />
                              </td>
                              <td className="py-2 pl-3">
                                <Input type="number" min={0} step="0.01" value={it.quantity}
                                  onChange={(e) => updateItem(it.id, { quantity: parseFloat(e.target.value) || 0 })} />
                              </td>
                              <td className="py-2 pl-3">
                                <Input type="number" min={0} step="0.01" value={it.rate}
                                  onChange={(e) => updateItem(it.id, { rate: parseFloat(e.target.value) || 0 })} />
                              </td>
                              <td className="py-2 pl-3 text-right tabular-nums font-medium">{fmt(amt)}</td>
                              <td className="py-2 pl-2 text-right">
                                <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)} disabled={items.length === 1}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end text-sm">
                    <div className="flex w-64 justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">{fmt(subtotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tax / VAT</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} id="tax" />
                    <Label htmlFor="tax" className="cursor-pointer">Apply tax to this invoice</Label>
                  </div>
                  {taxEnabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Tax label</Label>
                        <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} placeholder="VAT, GST, Sales Tax…" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tax rate (%)</Label>
                        <Input type="number" min={0} step="0.01" value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Notes / Payment info</CardTitle></CardHeader>
                <CardContent>
                  <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment instructions, thank-you note…" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Details</CardTitle>
                  <p className="text-xs text-muted-foreground">Only filled fields appear on the invoice.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Local Payment (Bangladesh)</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>bKash</Label>
                        <Input value={payment.bkash} onChange={(e) => updatePayment({ bkash: e.target.value })} placeholder="01XXXXXXXXX" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nagad</Label>
                        <Input value={payment.nagad} onChange={(e) => updatePayment({ nagad: e.target.value })} placeholder="01XXXXXXXXX" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Rocket</Label>
                        <Input value={payment.rocket} onChange={(e) => updatePayment({ rocket: e.target.value })} placeholder="01XXXXXXXXX-X" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">International Payment</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Wise account details</Label>
                        <Textarea rows={3} value={payment.wise} onChange={(e) => updatePayment({ wise: e.target.value })}
                          placeholder="Account holder, account #, routing/IBAN…" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Payoneer email</Label>
                        <Input type="email" value={payment.payoneer} onChange={(e) => updatePayment({ payoneer: e.target.value })}
                          placeholder="you@example.com" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Subtotal" value={fmt(subtotal)} />
                  {taxEnabled && (
                    <Row label={`${taxLabel || "Tax"} (${taxRate}%)`} value={fmt(taxAmount)} />
                  )}
                  <div className="border-t border-border/60 pt-3 flex items-baseline justify-between">
                    <span className="text-muted-foreground">Total due</span>
                    <span className="font-display text-2xl font-semibold gradient-text tabular-nums">{fmt(total)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Issued {fmtDate(issueDate)} · Due {fmtDate(dueDate)}
                  </div>
                  <Button onClick={handleDownloadPDF} disabled={exporting} className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                    <Download className="mr-2 h-4 w-4" /> {exporting ? "Generating…" : "Download PDF"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div ref={previewRef}>
            <PreviewSheet
              invoiceNumber={invoiceNumber} issueDate={issueDate} dueDate={dueDate}
              from={{ name: fromName, email: fromEmail, address: fromAddress }}
              to={{ name: toName, email: toEmail, address: toAddress }}
              items={items} subtotal={subtotal}
              tax={{ enabled: taxEnabled, label: taxLabel, rate: taxRate, amount: taxAmount }}
              total={total} notes={notes} fmt={fmt} logo={logo} payment={payment}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="print-only" ref={printRef}>
        <PreviewSheet
          invoiceNumber={invoiceNumber} issueDate={issueDate} dueDate={dueDate}
          from={{ name: fromName, email: fromEmail, address: fromAddress }}
          to={{ name: toName, email: toEmail, address: toAddress }}
          items={items} subtotal={subtotal}
          tax={{ enabled: taxEnabled, label: taxLabel, rate: taxRate, amount: taxAmount }}
          total={total} notes={notes} fmt={fmt} logo={logo} payment={payment}
        />
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print, header, aside, [data-sidebar] { display: none !important; }
          .invoice-page > *:not(.print-only) { display: none !important; }
          .print-only { display: block !important; }
          main { padding: 0 !important; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function PreviewSheet(props: {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  from: { name: string; email: string; address: string };
  to: { name: string; email: string; address: string };
  items: Item[];
  subtotal: number;
  tax: { enabled: boolean; label: string; rate: number; amount: number };
  total: number;
  notes: string;
  fmt: (n: number) => string;
  logo?: string | null;
  payment?: PaymentDetails;
}) {
  const { invoiceNumber, issueDate, dueDate, from, to, items, subtotal, tax, total, notes, fmt, logo, payment } = props;
  const localPay = payment ? [
    { label: "bKash", value: payment.bkash },
    { label: "Nagad", value: payment.nagad },
    { label: "Rocket", value: payment.rocket },
  ].filter((p) => p.value.trim()) : [];
  const intlPay = payment ? [
    { label: "Wise", value: payment.wise, multiline: true },
    { label: "Payoneer", value: payment.payoneer },
  ].filter((p) => p.value.trim()) : [];
  const hasPayment = localPay.length > 0 || intlPay.length > 0;
  return (
    <div className="invoice-sheet mx-auto max-w-4xl rounded-xl bg-white p-10 text-[#0A0A0F] shadow-elegant print:shadow-none print:rounded-none print:p-12">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={`${from.name || "Business"} logo`}
                className="h-14 max-w-[180px] object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#5B7DFF] to-[#A855F7]" />
            )}
            <div>
              <div className="text-lg font-bold">{from.name || "Your business"}</div>
              {from.email && <div className="text-xs text-[#6B7280]">{from.email}</div>}
            </div>
          </div>
          {from.address && (
            <div className="mt-3 whitespace-pre-line text-xs text-[#6B7280] max-w-xs">{from.address}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-widest text-[#5B7DFF]">INVOICE</div>
          <div className="mt-1 text-sm text-[#6B7280]">{invoiceNumber}</div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#6B7280]">Bill To</div>
          <div className="mt-2 font-semibold">{to.name || "—"}</div>
          {to.email && <div className="text-sm text-[#6B7280]">{to.email}</div>}
          {to.address && <div className="mt-1 whitespace-pre-line text-sm text-[#6B7280]">{to.address}</div>}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-[#6B7280]">Issued</div>
          <div className="mt-1 text-sm font-medium">{fmtDate(issueDate)}</div>
          <div className="mt-3 text-[10px] uppercase tracking-widest text-[#6B7280]">Due</div>
          <div className="mt-1 text-sm font-medium">{fmtDate(dueDate)}</div>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-lg border border-[#E5E7EB]">
        <div className="grid grid-cols-12 bg-[#F8FAFC] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
          <div className="col-span-6">Description</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Rate</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>
        {items.map((it) => {
          const amt = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
          return (
            <div key={it.id} className="grid grid-cols-12 border-t border-[#E5E7EB] px-4 py-3 text-sm">
              <div className="col-span-6">{it.description || "—"}</div>
              <div className="col-span-2 text-right tabular-nums">{it.quantity}</div>
              <div className="col-span-2 text-right tabular-nums">{fmt(Number(it.rate) || 0)}</div>
              <div className="col-span-2 text-right font-semibold tabular-nums">{fmt(amt)}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#6B7280]">Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
          {tax.enabled && (
            <div className="flex justify-between"><span className="text-[#6B7280]">{tax.label || "Tax"} ({tax.rate}%)</span><span className="tabular-nums">{fmt(tax.amount)}</span></div>
          )}
          <div className="flex justify-between border-t border-[#E5E7EB] pt-3">
            <span className="font-semibold">Total Due</span>
            <span className="text-lg font-bold text-[#5B7DFF] tabular-nums">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div className="mt-10 rounded-lg bg-[#F8FAFC] p-4">
          <div className="text-[10px] uppercase tracking-widest text-[#6B7280]">Notes</div>
          <div className="mt-2 whitespace-pre-line text-sm">{notes}</div>
        </div>
      )}

      {hasPayment && (
        <div className="mt-6 rounded-lg border border-[#E5E7EB] p-4">
          <div className="text-[10px] uppercase tracking-widest text-[#6B7280]">Payment Details</div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {localPay.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[#0A0A0F]">Local Payment (Bangladesh)</div>
                <div className="mt-1.5 space-y-1 text-sm">
                  {localPay.map((p) => (
                    <div key={p.label} className="flex gap-2">
                      <span className="min-w-[70px] text-[#6B7280]">{p.label}:</span>
                      <span className="font-medium">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {intlPay.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[#0A0A0F]">International Payment</div>
                <div className="mt-1.5 space-y-1 text-sm">
                  {intlPay.map((p) => (
                    <div key={p.label} className="flex gap-2">
                      <span className="min-w-[70px] text-[#6B7280]">{p.label}:</span>
                      <span className="whitespace-pre-line font-medium">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-xs text-[#6B7280]">
        Thank you for your business · {from.name || "Your business"}
      </div>
    </div>
  );
}
