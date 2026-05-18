"use client";

import { useMemo } from "react";
import { useConnectors } from "wagmi";

import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

/**
 * Warpcast: only embedded Farcaster wallet.
 * Base App / browser: Base Smart Wallet + MetaMask (Farcaster connector hangs outside mini app).
 */
export function useVisibleConnectors() {
  const { inMiniApp, isLoading } = useFarcasterMiniApp();
  const connectors = useConnectors();

  return useMemo(() => {
    if (isLoading) return [];
    if (inMiniApp) {
      return connectors.filter((c) => c.id === "farcaster");
    }
    return connectors.filter((c) => c.id !== "farcaster");
  }, [connectors, inMiniApp, isLoading]);
}
