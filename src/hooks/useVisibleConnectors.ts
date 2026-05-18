"use client";

import { useMemo } from "react";
import type { Connector } from "wagmi";
import { useConnectors } from "wagmi";

import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

function sortConnectors(
  connectors: readonly Connector[],
  inMiniApp: boolean,
  envLoading: boolean,
) {
  const farcaster = connectors.filter((c) => c.id === "farcaster");
  const others = connectors.filter((c) => c.id !== "farcaster");

  // While host is unknown, show Base + MetaMask immediately (Base App).
  if (envLoading) {
    return others.length > 0 ? [...others, ...farcaster] : [...connectors];
  }

  if (inMiniApp) {
    return [...farcaster, ...others];
  }

  return others;
}

/**
 * All wallet options in Warpcast (Warpcast + Base + MetaMask).
 * In Base App / browser: Base Smart Wallet + MetaMask (no Farcaster reconnect hang).
 */
export function useVisibleConnectors() {
  const { inMiniApp, isLoading: envLoading } = useFarcasterMiniApp();
  const connectors = useConnectors();

  return useMemo(
    () => sortConnectors(connectors, inMiniApp, envLoading),
    [connectors, inMiniApp, envLoading],
  );
}
