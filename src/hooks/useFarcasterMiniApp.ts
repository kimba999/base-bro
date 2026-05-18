"use client";

import sdk from "@farcaster/frame-sdk";
import type { Context } from "@farcaster/frame-sdk";
import { useContext } from "react";

import {
  FarcasterMiniAppContext,
  type FarcasterMiniAppContextValue,
} from "@/context/FarcasterMiniAppContext";

export type FarcasterUser = Context.MiniAppContext["user"];

export type { FarcasterMiniAppContextValue } from "@/context/FarcasterMiniAppContext";

const defaultValue: FarcasterMiniAppContextValue = {
  context: null,
  inMiniApp: false,
  isSdkReady: false,
  isLoading: true,
  error: null,
  user: null,
  isAppAdded: false,
  hasNotifications: false,
  refreshContext: async () => {},
};

/** Farcaster user + host context (FID, username, wallet is via wagmi after connect). */
export function useFarcasterMiniApp(): FarcasterMiniAppContextValue {
  const ctx = useContext(FarcasterMiniAppContext);
  return ctx ?? defaultValue;
}

/** True when running inside Warpcast / a Farcaster mini app host. */
export async function detectInMiniApp(): Promise<boolean> {
  try {
    return await sdk.isInMiniApp();
  } catch {
    return false;
  }
}

/** Load host context (user FID, username, client metadata). */
export async function loadMiniAppContext(): Promise<Context.MiniAppContext> {
  return sdk.context;
}
