// Lightweight pub/sub error log for the in-app dev console.
// Captures Supabase / edge function errors, unhandled rejections, console.error.

export interface ErrorEntry {
  id: string;
  timestamp: number;
  source: "supabase" | "edge" | "console" | "unhandled" | "network";
  message: string;
  detail?: unknown;
  context?: Record<string, unknown>;
}

type Listener = (entries: ErrorEntry[]) => void;

class ErrorBus {
  private entries: ErrorEntry[] = [];
  private listeners = new Set<Listener>();
  private max = 200;

  list() {
    return this.entries;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.entries);
    return () => this.listeners.delete(fn);
  }

  push(entry: Omit<ErrorEntry, "id" | "timestamp"> & { timestamp?: number }) {
    const e: ErrorEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: entry.timestamp ?? Date.now(),
      ...entry,
    };
    this.entries = [e, ...this.entries].slice(0, this.max);
    this.listeners.forEach((l) => l(this.entries));
  }

  clear() {
    this.entries = [];
    this.listeners.forEach((l) => l(this.entries));
  }
}

export const errorBus = new ErrorBus();

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Unhandled promise rejections (Supabase queries that aren't caught land here)
  window.addEventListener("unhandledrejection", (ev) => {
    const reason: any = ev.reason;
    errorBus.push({
      source: "unhandled",
      message: reason?.message ?? String(reason),
      detail: reason,
    });
  });

  window.addEventListener("error", (ev) => {
    errorBus.push({
      source: "unhandled",
      message: ev.message,
      detail: { filename: ev.filename, lineno: ev.lineno, colno: ev.colno, error: ev.error },
    });
  });

  // Wrap console.error
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const msg = args
        .map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : safeStringify(a)))
        .join(" ");
      errorBus.push({ source: "console", message: msg.slice(0, 500), detail: args });
    } catch {
      /* ignore */
    }
    origError(...args);
  };

  // Intercept fetch for Supabase REST + edge function errors
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    try {
      const res = await origFetch(input, init);
      if (!res.ok) {
        const isSupabase = /\.supabase\.co\//.test(url);
        const isEdge = /\/functions\/v1\//.test(url);
        if (isSupabase || isEdge) {
          let body: unknown;
          try {
            const cloned = res.clone();
            const text = await cloned.text();
            try { body = JSON.parse(text); } catch { body = text; }
          } catch { /* ignore */ }
          errorBus.push({
            source: isEdge ? "edge" : "supabase",
            message: `${res.status} ${res.statusText} · ${shortUrl(url)}`,
            detail: body,
            context: { url, method: init?.method ?? "GET", status: res.status },
          });
        }
      }
      return res;
    } catch (err: any) {
      errorBus.push({
        source: "network",
        message: `Network error · ${shortUrl(url)}: ${err?.message ?? String(err)}`,
        detail: err,
        context: { url, method: init?.method ?? "GET" },
      });
      throw err;
    }
  };
}

function shortUrl(u: string) {
  try {
    const url = new URL(u);
    return url.pathname + (url.search ? url.search : "");
  } catch {
    return u;
  }
}

function safeStringify(v: unknown) {
  try { return JSON.stringify(v); } catch { return String(v); }
}
