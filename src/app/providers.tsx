"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import type { Config, State } from "wagmi";
import { WagmiProvider } from "wagmi";

import { WalletAutoReconnect } from "@/components/WalletAutoReconnect";
import { FarcasterAddMiniAppProvider } from "@/context/FarcasterAddMiniAppContext";
import { FarcasterMiniAppProvider } from "@/context/FarcasterMiniAppContext";
import { wagmiConfig } from "@/config/wagmi";

type ProvidersProps = {
  children: ReactNode;
  initialState?: State | undefined;
};

export function Providers({ children, initialState }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <FarcasterMiniAppProvider>
      <WagmiProvider
        config={wagmiConfig as Config}
        initialState={initialState}
        reconnectOnMount={false}
      >
        <QueryClientProvider client={queryClient}>
          <FarcasterAddMiniAppProvider>
            <WalletAutoReconnect />
            {children}
          </FarcasterAddMiniAppProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </FarcasterMiniAppProvider>
  );
}
