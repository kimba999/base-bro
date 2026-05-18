"use client";

import sdk from "@farcaster/frame-sdk";
import type { Context } from "@farcaster/frame-sdk";
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { withTimeout } from "@/lib/asyncTimeout";

const MINI_APP_DETECT_MS = 2_500;
const MINI_APP_CONTEXT_MS = 3_000;
const MINI_APP_READY_MS = 5_000;

export type FarcasterMiniAppContextValue = {
  /** Full host context after `sdk.context` resolves. */
  context: Context.MiniAppContext | null;
  /** `true` inside Warpcast / Farcaster mini app shell. */
  inMiniApp: boolean;
  /** `sdk.actions.ready()` completed — splash screen hidden. */
  isSdkReady: boolean;
  /** Host detection finished (success, error, or timeout). */
  isLoading: boolean;
  error: Error | null;
  user: Context.MiniAppContext["user"] | null;
  isAppAdded: boolean;
  hasNotifications: boolean;
  refreshContext: () => Promise<void>;
};

export const FarcasterMiniAppContext =
  createContext<FarcasterMiniAppContextValue | null>(null);

type FarcasterMiniAppProviderProps = {
  children: ReactNode;
};

/**
 * Initializes Farcaster Mini App SDK with timeouts so Base App / browser never hang on `isInMiniApp()`.
 */
export function FarcasterMiniAppProvider({
  children,
}: FarcasterMiniAppProviderProps) {
  const [context, setContext] = useState<Context.MiniAppContext | null>(null);
  const [inMiniApp, setInMiniApp] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshContext = useCallback(async () => {
    try {
      const ctx = await withTimeout(
        sdk.context,
        MINI_APP_CONTEXT_MS,
        "Farcaster context timed out",
      );
      setContext(ctx);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let inside = false;

      try {
        inside = await withTimeout(
          sdk.isInMiniApp(),
          MINI_APP_DETECT_MS,
          "Farcaster host detection timed out",
        );
      } catch {
        inside = false;
      }

      if (cancelled) return;
      setInMiniApp(inside);

      if (inside) {
        try {
          const ctx = await withTimeout(
            sdk.context,
            MINI_APP_CONTEXT_MS,
            "Farcaster context timed out",
          );
          if (!cancelled) setContext(ctx);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e : new Error(String(e)));
          }
        }

        try {
          await withTimeout(
            sdk.actions.ready(),
            MINI_APP_READY_MS,
            "Farcaster ready() timed out",
          );
        } catch {
          /* Unblock UI even if splash ready fails */
        }
        if (!cancelled) setIsSdkReady(true);
      } else {
        if (!cancelled) setIsSdkReady(true);
      }

      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<FarcasterMiniAppContextValue>(
    () => ({
      context,
      inMiniApp,
      isSdkReady,
      isLoading,
      error,
      user: context?.user ?? null,
      isAppAdded: context?.client?.added === true,
      hasNotifications: Boolean(context?.client?.notificationDetails),
      refreshContext,
    }),
    [context, inMiniApp, isSdkReady, isLoading, error, refreshContext],
  );

  return (
    <FarcasterMiniAppContext.Provider value={value}>
      {children}
    </FarcasterMiniAppContext.Provider>
  );
}
