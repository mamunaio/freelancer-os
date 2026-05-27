import { NextResponse } from "next/server";

import { connectMongoose } from "@/lib/db/client";
import { ExchangeRate } from "@/lib/db/models/exchange-rate";
import { publicEnv, serverEnv } from "@/lib/env";

export const runtime = "nodejs";
// Always run; never cached.
export const dynamic = "force-dynamic";

/**
 * Daily cron — refresh exchange rates from open.er-api.com.
 *
 * Auth model:
 *  - Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically
 *    when the env var is set on the deployment.
 *  - Local invocation: `curl -H "Authorization: Bearer dev-cron-secret-..." http://localhost:3000/api/cron/exchange-rates`
 *
 * The route is idempotent — running it multiple times in the same UTC day
 * just upserts the same row.
 */
export async function GET(request: Request) {
  // Auth gate.
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${serverEnv.cronSecret}`;
  if (!serverEnv.cronSecret || auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = `${publicEnv.exchangeRateApiUrl.replace(/\/+$/, "")}/USD`;
    const res = await fetch(url, {
      // Bypass Next.js fetch cache — we want the live rates.
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    type ApiResponse = {
      result?: string;
      base_code?: string;
      rates?: Record<string, number>;
    };
    const body = (await res.json()) as ApiResponse;

    if (body.result !== "success" || !body.rates) {
      return NextResponse.json(
        { ok: false, error: "Upstream payload was unexpected." },
        { status: 502 },
      );
    }

    const rates = pickRates(body.rates);
    const date = new Date().toISOString().slice(0, 10);

    await connectMongoose();
    await ExchangeRate.findOneAndUpdate(
      { base: "USD", date },
      {
        base: "USD",
        date,
        rates,
        source: "open.er-api.com",
        fetchedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      ok: true,
      base: "USD",
      date,
      rates,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Failed to refresh rates.",
      },
      { status: 500 },
    );
  }
}

/** Keep only the currencies we care about + a few common reserves. */
function pickRates(all: Record<string, number>) {
  const wanted = ["BDT", "EUR", "GBP", "INR", "AUD", "CAD", "JPY"];
  const out: Record<string, number> = {};
  for (const code of wanted) {
    if (typeof all[code] === "number" && Number.isFinite(all[code])) {
      out[code] = all[code];
    }
  }
  if (typeof out.BDT !== "number") {
    throw new Error("BDT rate missing from upstream payload");
  }
  return out;
}
