"use client";

import sdk from "@farcaster/frame-sdk";
import { AddMiniApp } from "@farcaster/miniapp-core";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

type FarcasterAddAppButtonProps = {
  className?: string;
};

export function FarcasterAddAppButton({ className = "" }: FarcasterAddAppButtonProps) {
  const { inMiniApp, isSdkReady, context, refreshContext } = useFarcasterMiniApp();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [localAdded, setLocalAdded] = useState(false);

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

  const handleAdd = useCallback(async () => {
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
    } catch (e) {
      if (e instanceof AddMiniApp.RejectedByUser) {
        setStatus("You declined adding the app");
      } else if (e instanceof AddMiniApp.InvalidDomainManifest) {
        setStatus("Manifest error — redeploy with webhookUrl");
      } else {
        setStatus(e instanceof Error ? e.message : "Could not add app");
      }
    } finally {
      setIsPending(false);
    }
  }, [refreshContext]);

  if (!inMiniApp || !isSdkReady) return null;

  if (isAdded && (hasHostNotifications || localAdded)) {
    return (
      <motion.div
        className={`rounded-xl border border-neon-cyan/40 bg-background/80 px-4 py-3 text-center text-sm text-neon-cyan ${className}`}
      >
        <p className="font-orbitron font-semibold text-neon-orange">
          Added to Warpcast
        </p>
        <p className="mt-1 text-xs text-neon-cyan/70">
          Notifications enabled — we can remind you about daily BRO
        </p>
        {status ? (
          <p className="mt-2 text-xs text-neon-cyan/50">{status}</p>
        ) : null}
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => void handleAdd()}
        className="font-orbitron w-full rounded-xl border-2 border-neon-cyan bg-background px-4 py-3 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/10 hover:shadow-[0_0_24px_rgba(0,255,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Opening Warpcast…" : "Add BaseBro + enable notifications"}
      </button>
      <p className="mt-2 text-center text-xs text-neon-cyan/55">
        Saves the app to your Warpcast list and allows daily check-in reminders
      </p>
      {status ? (
        <p className="mt-1 text-center text-xs text-neon-orange">{status}</p>
      ) : null}
    </div>
  );
}
