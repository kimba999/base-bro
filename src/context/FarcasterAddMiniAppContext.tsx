"use client";

import sdk from "@farcaster/frame-sdk";
import { AddMiniApp } from "@farcaster/miniapp-core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

const DECLINED_SESSION_KEY = "basebro_add_miniapp_declined";
const AUTO_PROMPT_DELAY_MS = 800;

type FarcasterAddMiniAppContextValue = {
  promptAddMiniApp: () => Promise<
    | { ok: true }
    | { ok: false; reason: "not_mini_app" | "already_added" | "rejected" | "manifest" | "error" }
  >;
  isPending: boolean;
  status: string | null;
  isAdded: boolean;
  hasHostNotifications: boolean;
};

const FarcasterAddMiniAppContext =
  createContext<FarcasterAddMiniAppContextValue | null>(null);

export function FarcasterAddMiniAppProvider({ children }: { children: ReactNode }) {
  const { inMiniApp, isSdkReady, context, refreshContext } = useFarcasterMiniApp();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [localAdded, setLocalAdded] = useState(false);
  const autoPromptStartedRef = useRef(false);

  const isAdded = context?.client?.added === true || localAdded;
  const hasHostNotifications = Boolean(context?.client?.notificationDetails);

  useEffect(() => {
    if (!isSdkReady) return;

    const onAdded = () => {
      setLocalAdded(true);
      setStatus("App added — notifications enabled");
      void refreshContext();
    };
    const onEnabled = () => {
      setStatus("Notifications enabled");
      void refreshContext();
    };
    const onRejected = () => setStatus("Cancelled");
    const onRemoved = () => {
      setLocalAdded(false);
      setStatus("App removed from Warpcast");
      void refreshContext();
    };
    const onDisabled = () => setStatus("Notifications turned off in Warpcast");

    sdk.on("miniAppAdded", onAdded);
    sdk.on("notificationsEnabled", onEnabled);
    sdk.on("miniAppAddRejected", onRejected);
    sdk.on("miniAppRemoved", onRemoved);
    sdk.on("notificationsDisabled", onDisabled);

    return () => {
      sdk.removeListener("miniAppAdded", onAdded);
      sdk.removeListener("notificationsEnabled", onEnabled);
      sdk.removeListener("miniAppAddRejected", onRejected);
      sdk.removeListener("miniAppRemoved", onRemoved);
      sdk.removeListener("notificationsDisabled", onDisabled);
    };
  }, [isSdkReady, refreshContext]);

  const promptAddMiniApp = useCallback(async () => {
    if (!inMiniApp || !isSdkReady) {
      return { ok: false as const, reason: "not_mini_app" as const };
    }
    if (isAdded) {
      return { ok: false as const, reason: "already_added" as const };
    }

    setIsPending(true);
    setStatus(null);
    try {
      const result = await sdk.actions.addMiniApp();
      setLocalAdded(true);
      if (result.notificationDetails) {
        setStatus("BaseBro added — push notifications on");
      } else {
        setStatus("BaseBro added to Warpcast");
      }
      await refreshContext();
      return { ok: true as const };
    } catch (e) {
      if (e instanceof AddMiniApp.RejectedByUser) {
        setStatus("You declined adding the app");
        return { ok: false as const, reason: "rejected" as const };
      }
      if (e instanceof AddMiniApp.InvalidDomainManifest) {
        setStatus("Manifest error — redeploy with webhookUrl");
        return { ok: false as const, reason: "manifest" as const };
      }
      setStatus(e instanceof Error ? e.message : "Could not add app");
      return { ok: false as const, reason: "error" as const };
    } finally {
      setIsPending(false);
    }
  }, [inMiniApp, isAdded, isSdkReady, refreshContext]);

  useEffect(() => {
    if (autoPromptStartedRef.current) return;
    if (!inMiniApp || !isSdkReady) return;
    if (isAdded) return;
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem(DECLINED_SESSION_KEY) === "1"
    ) {
      return;
    }

    autoPromptStartedRef.current = true;

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await promptAddMiniApp();
        if (result.ok === false && result.reason === "rejected") {
          sessionStorage.setItem(DECLINED_SESSION_KEY, "1");
        }
      })();
    }, AUTO_PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [inMiniApp, isAdded, isSdkReady, promptAddMiniApp]);

  const value: FarcasterAddMiniAppContextValue = {
    promptAddMiniApp,
    isPending,
    status,
    isAdded,
    hasHostNotifications,
  };

  return (
    <FarcasterAddMiniAppContext.Provider value={value}>
      {children}
    </FarcasterAddMiniAppContext.Provider>
  );
}

export function useFarcasterAddMiniApp(): FarcasterAddMiniAppContextValue {
  const ctx = useContext(FarcasterAddMiniAppContext);
  if (!ctx) {
    throw new Error(
      "useFarcasterAddMiniApp must be used within FarcasterAddMiniAppProvider",
    );
  }
  return ctx;
}
