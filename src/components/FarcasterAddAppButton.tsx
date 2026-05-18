"use client";

import { motion } from "framer-motion";

import { useFarcasterAddMiniApp } from "@/hooks/useFarcasterAddMiniApp";
import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

type FarcasterAddAppButtonProps = {
  className?: string;
};

export function FarcasterAddAppButton({ className = "" }: FarcasterAddAppButtonProps) {
  const { inMiniApp, isSdkReady } = useFarcasterMiniApp();
  const { promptAddMiniApp, isPending, status, isAdded } =
    useFarcasterAddMiniApp();

  if (!inMiniApp || !isSdkReady) return null;

  if (isAdded) {
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
    <motion.div className={className}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => void promptAddMiniApp()}
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
    </motion.div>
  );
}
