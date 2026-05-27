"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES, type Currency } from "@/lib/currency/types";
import { currencySymbol } from "@/lib/currency/format";

interface Props {
  /** Numeric amount (controlled). Empty string means "no value yet". */
  amount: number | "";
  onAmountChange: (value: number | "") => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;

  label?: string;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  /** Min/max numeric bounds — passed to the underlying input. */
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /** Optional placeholder for the amount input. */
  placeholder?: string;
}

/**
 * Combined amount + currency picker.
 *
 * The architecture mandates that every monetary form persists *both* the
 * entered currency and a USD snapshot. This input only collects the user's
 * intent — the snapshot is computed server-side via `snapshotMoney()` when
 * the form submits. We deliberately keep it dumb so it works in any form.
 */
export function CurrencyInput({
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  label,
  hint,
  error,
  disabled,
  required,
  min = 0,
  max,
  step = 0.01,
  className,
  placeholder = "0.00",
}: Props) {
  const id = useId();
  const symbol = currencySymbol(currency);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-[hsl(var(--foreground))]/80"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-[hsl(var(--destructive))]">*</span>
          )}
        </label>
      )}

      <div
        className={cn(
          "flex h-10 items-stretch overflow-hidden rounded-lg border bg-[hsl(var(--surface-2))] transition-colors",
          error
            ? "border-[hsl(var(--destructive))]/50"
            : "border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))] focus-within:border-[hsl(var(--ring))]/40 focus-within:ring-2 focus-within:ring-[hsl(var(--ring))]/20",
          disabled && "opacity-60",
        )}
      >
        {/* Currency symbol prefix */}
        <span
          className="grid w-8 shrink-0 place-items-center border-r border-[hsl(var(--border))] bg-[hsl(var(--surface-3))] text-xs font-medium text-[hsl(var(--muted-foreground))]"
          aria-hidden="true"
        >
          {symbol}
        </span>

        {/* Amount input */}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={amount === "" ? "" : amount}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onAmountChange("");
              return;
            }
            const num = Number(raw);
            onAmountChange(Number.isFinite(num) ? num : "");
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          className="flex-1 bg-transparent px-2.5 text-sm tabular-nums text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none disabled:cursor-not-allowed"
        />

        {/* Currency picker */}
        <Select
          value={currency}
          onValueChange={(v) => onCurrencyChange(v as Currency)}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-full w-[88px] shrink-0 rounded-none border-0 border-l border-[hsl(var(--border))] bg-[hsl(var(--surface-3))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]/80 hover:bg-[hsl(var(--surface-2))] focus:ring-0 focus:ring-offset-0"
            aria-label="Currency"
          >
            <SelectValue />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="text-[11px] text-[hsl(var(--destructive))]">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{hint}</p>
      ) : null}
    </div>
  );
}
