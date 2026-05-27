"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceLineItemInput } from "@/features/money/schemas";

interface Props {
  items: InvoiceLineItemInput[];
  onChange: (items: InvoiceLineItemInput[]) => void;
  currency: "USD" | "BDT";
}

/**
 * Invoice line items editor.
 *
 * Manages the array of line items with add/remove/edit. Line totals are
 * computed client-side for display but the server recomputes them on save
 * (never trust client math for money).
 */
export function InvoiceLineItemsEditor({ items, onChange, currency }: Props) {
  const t = useTranslations("Money.invoices.form");

  function addItem() {
    onChange([
      ...items,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof InvoiceLineItemInput, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );

  return (
    <div className="space-y-3">
      <Label>{t("items")}</Label>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3 sm:grid-cols-12"
          >
            {/* Description */}
            <div className="sm:col-span-5">
              <Label htmlFor={`item-desc-${index}`} className="sr-only">
                {t("itemDescription")}
              </Label>
              <Input
                id={`item-desc-${index}`}
                value={item.description}
                onChange={(e) =>
                  updateItem(index, "description", e.target.value)
                }
                placeholder={t("itemDescription")}
              />
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <Label htmlFor={`item-qty-${index}`} className="sr-only">
                {t("itemQuantity")}
              </Label>
              <Input
                id={`item-qty-${index}`}
                type="number"
                min="0"
                step="0.01"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                }
                placeholder={t("itemQuantity")}
              />
            </div>

            {/* Unit price */}
            <div className="sm:col-span-2">
              <Label htmlFor={`item-price-${index}`} className="sr-only">
                {t("itemUnitPrice")}
              </Label>
              <Input
                id={`item-price-${index}`}
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) =>
                  updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                }
                placeholder={t("itemUnitPrice")}
              />
            </div>

            {/* Line total (read-only) */}
            <div className="flex items-center justify-between sm:col-span-2">
              <span className="text-sm font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
                {currency} {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
              </span>
            </div>

            {/* Remove button */}
            <div className="flex items-center justify-end sm:col-span-1">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--destructive))]"
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4" />
        {t("addItem")}
      </Button>

      {/* Subtotal preview */}
      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/40 px-4 py-3">
          <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            Subtotal
          </span>
          <span className="font-display text-lg font-semibold tabular-nums">
            {currency} {subtotal.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
