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

import { MiniAppSplash } from "@/components/MiniAppSplash";
import { withTimeout } from "@/lib/asyncTimeout";

const MINI_APP_DETECT_MS = 2_500;
const MINI_APP_CONTEXT_MS = 3_000;
const MINI_APP_READY_MS = 5_000;
const SPLASH_MIN_MS = 400;

export type FarcasterMiniAppContextValue = {
  context: Context.MiniAppContext | null;
  inMiniApp: boolean;
  /** Host splash dismissed via `sdk.actions.ready()`. */
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
 * Dismisses the Warpcast manifest splash immediately via `ready()`, then shows our
 * full-screen MiniAppSplash until init finishes.
 */
export function FarcasterMiniAppProvider({
  children,
}: FarcasterMiniAppProviderProps) {
  const [context, setContext] = useState<Context.MiniAppContext | null>(null);
  const [inMiniApp, setInMiniApp] = useState(false);
  const [envChecked, setEnvChecked] = useState(false);
  const [isHostReady, setIsHostReady] = useState(false);
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

    // Hide the native Warpcast splash (splash.png from manifest) as early as possible.
    void (async () => {
      try {
        await withTimeout(
          sdk.actions.ready(),
          MINI_APP_READY_MS,
          "Farcaster ready() timed out",
        );
      } catch {
        /* Unblock even if ready fails outside a host */
      }
      if (!cancelled) setIsHostReady(true);
    })();

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
      setEnvChecked(true);

      if (!inside) {
        setIsLoading(false);
        return;
      }

      const splashStarted = Date.now();

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

      const elapsed = Date.now() - splashStarted;
      if (elapsed < SPLASH_MIN_MS) {
        await new Promise((r) => setTimeout(r, SPLASH_MIN_MS - elapsed));
      }

      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Show our splash while detecting the host, then keep it during mini app init.
  const showSplash = !envChecked || (inMiniApp && isLoading);
  const isSdkReady = !inMiniApp || isHostReady;

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
      {showSplash ? <MiniAppSplash /> : null}
      {children}
    </FarcasterMiniAppContext.Provider>
  );
}
