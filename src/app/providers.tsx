"use client";

import sdk from "@farcaster/frame-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import type { State } from "wagmi";
import { WagmiProvider } from "wagmi";

import { getConfig } from "@/config/wagmi";

type ProvidersProps = {
  children: ReactNode;
  initialState?: State | undefined;
};

export function Providers({ children, initialState }: ProvidersProps) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    void sdk.actions.ready();
  }, []);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
