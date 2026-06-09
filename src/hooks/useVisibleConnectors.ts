"use client";

import { useMemo } from "react";
import type { Connector } from "wagmi";
import { useConnectors } from "wagmi";

import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

const OUTSIDE_MINI_APP_IDS = new Set(["baseAccount", "metaMask"]);

function isDuplicateBaseWallet(connector: Connector): boolean {
  if (connector.id === "baseAccount") return false;
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();
  return (
    id.includes("base") ||
    name.includes("base account") ||
    name.includes("base wallet") ||
    name.includes("smart wallet")
  );
}

/** Keep one Base option (`baseAccount`) when EIP-6963 or host injects extras. */
function dedupeBaseWallet(connectors: readonly Connector[]): Connector[] {
  const hasBaseAccount = connectors.some((c) => c.id === "baseAccount");
  if (!hasBaseAccount) return [...connectors];
  return connectors.filter((c) => !isDuplicateBaseWallet(c));
}

function sortConnectors(
  connectors: readonly Connector[],
  inMiniApp: boolean,
  envLoading: boolean,
) {
  const farcaster = connectors.filter((c) => c.id === "farcaster");
  let others = connectors.filter((c) => c.id !== "farcaster");

  if (!inMiniApp) {
    others = others.filter((c) => OUTSIDE_MINI_APP_IDS.has(c.id));
  }

  others = dedupeBaseWallet(others);

  // While host is unknown, show Base + MetaMask only (not Warpcast in Base App).
  if (envLoading) {
    return others;
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
