"use client";

import { useMemo } from "react";
import type { Connector } from "wagmi";
import { useConnectors } from "wagmi";

import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

const MINI_APP_WALLET_IDS = new Set(["baseAccount", "metaMask"]);
const BROWSER_WALLET_IDS = new Set([
  "baseAccount",
  "metaMask",
  "rabby",
  "keplr",
]);

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

  const allowedIds = inMiniApp ? MINI_APP_WALLET_IDS : BROWSER_WALLET_IDS;
  others = others.filter((c) => allowedIds.has(c.id));
  others = dedupeBaseWallet(others);

  // While host is unknown, show browser/Base App wallets only (not Warpcast).
  if (envLoading) {
    return others;
  }

  if (inMiniApp) {
    return [...farcaster, ...others];
  }

  return others;
}

/**
 * Warpcast: Warpcast + Base + MetaMask.
 * Browser: Base Smart Wallet, MetaMask, Rabby, Keplr.
 * Base App: Base Smart Wallet + MetaMask.
 */
export function useVisibleConnectors() {
  const { inMiniApp, isLoading: envLoading } = useFarcasterMiniApp();
  const connectors = useConnectors();

  return useMemo(
    () => sortConnectors(connectors, inMiniApp, envLoading),
    [connectors, inMiniApp, envLoading],
  );
}
