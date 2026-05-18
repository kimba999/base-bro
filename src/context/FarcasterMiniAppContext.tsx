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

export type FarcasterMiniAppContextValue = {
  /** Full host context after `sdk.context` resolves. */
  context: Context.MiniAppContext | null;
  /** `true` inside Warpcast / Farcaster mini app shell. */
  inMiniApp: boolean;
  /** `sdk.actions.ready()` completed — splash screen hidden. */
  isSdkReady: boolean;
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
 * Initializes Farcaster Mini App SDK: loads user context, then calls `ready()`.
 * Must wrap the app on the client (inside dynamic Providers).
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
      const ctx = await sdk.context;
      setContext(ctx);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const inside = await sdk.isInMiniApp();
        if (cancelled) return;
        setInMiniApp(inside);

        if (inside) {
          const ctx = await sdk.context;
          if (!cancelled) setContext(ctx);
        }

        await sdk.actions.ready();
        if (!cancelled) setIsSdkReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
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
