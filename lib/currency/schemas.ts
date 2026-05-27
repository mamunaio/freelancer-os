import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./types";

/**
 * Zod helper for forms that accept a money input.
 *
 * Use:
 *   const FinanceEntrySchema = z.object({
 *     ...,
 *     ...moneyInputSchema.shape,   // adds `amount` + `currency`
 *   });
 */
export const moneyInputSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Enter an amount" })
    .finite("Enter a valid number")
    .min(0, "Amount can't be negative"),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

export type MoneyInputForm = z.infer<typeof moneyInputSchema>;
