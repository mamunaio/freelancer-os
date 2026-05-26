"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * Client-side providers stack:
 *  - ThemeProvider: dark/light toggle persisted in localStorage
 *  - QueryClient: server state with sane defaults
 *  - Sonner toaster: only one toast surface (consolidated from legacy v1)
 */
export function Providers({ children }: { children: ReactNode }) {
  // Initialize once per render lifecycle so it survives Fast Refresh.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="system"
          className="font-sans"
        />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
