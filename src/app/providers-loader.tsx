"use client";

import dynamic from "next/dynamic";
import type { State } from "wagmi";

import { FarcasterMiniAppProvider } from "@/context/FarcasterMiniAppContext";

const DynamicProviders = dynamic(
  () => import("./providers").then((m) => m.Providers),
  { ssr: false },
);

export function ProvidersShell({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State | undefined;
}) {
  return (
    <FarcasterMiniAppProvider>
      <DynamicProviders initialState={initialState}>
        {children}
      </DynamicProviders>
    </FarcasterMiniAppProvider>
  );
}
