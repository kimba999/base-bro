"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { waitForCallsStatus, waitForTransactionReceipt } from "wagmi/actions";
import {
  useConfig,
  useConnection,
  useSendCalls,
  useWriteContract,
} from "wagmi";

import {
  BRO_CHAIN_ID,
  BRO_TOKEN_ABI,
  BRO_TOKEN_ADDRESS,
} from "@/config/contracts";
import { toClaimAmountWhole } from "@/lib/claimTokens";

type ClaimTokensButtonProps = {
  /** Whole $BRO units from local unclaimed pool (not wei). */
  unclaimedWhole: number;
  disabled: boolean;
  /** When true, prefer EIP-5792 `wallet_sendCalls` (atomic batch path). */
  supportsAtomicBatch: boolean;
  highlight: boolean;
  onConfirmed: () => void;
};

export function ClaimTokensButton({
  unclaimedWhole,
  disabled,
  supportsAtomicBatch,
  highlight,
  onConfirmed,
}: ClaimTokensButtonProps) {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { address, status } = useConnection();
  const [phase, setPhase] = useState<"idle" | "batch" | "legacy">("idle");

  const amount = toClaimAmountWhole(unclaimedWhole);

  const { sendCallsAsync, isPending: isSendCallsPending } = useSendCalls();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const invalidateReads = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const executeLegacyClaim = useCallback(async () => {
    const hash = await writeContractAsync({
      address: BRO_TOKEN_ADDRESS,
      abi: BRO_TOKEN_ABI,
      functionName: "claimTokens",
      args: [amount],
      chainId: BRO_CHAIN_ID,
    });
    await waitForTransactionReceipt(config, { hash });
  }, [amount, config, writeContractAsync]);

  const handleClick = useCallback(async () => {
    if (disabled || amount <= BigInt(0) || status !== "connected" || !address) {
      return;
    }

    try {
      if (supportsAtomicBatch) {
        setPhase("batch");
        try {
          const { id } = await sendCallsAsync({
            chainId: BRO_CHAIN_ID,
            calls: [
              {
                abi: BRO_TOKEN_ABI,
                to: BRO_TOKEN_ADDRESS,
                functionName: "claimTokens",
                args: [amount],
              },
            ],
          });
          await waitForCallsStatus(config, { id });
        } catch {
          setPhase("legacy");
          await executeLegacyClaim();
        }
      } else {
        setPhase("legacy");
        await executeLegacyClaim();
      }

      await invalidateReads();
      onConfirmed();
    } finally {
      setPhase("idle");
    }
  }, [
    address,
    amount,
    config,
    disabled,
    executeLegacyClaim,
    invalidateReads,
    onConfirmed,
    sendCallsAsync,
    status,
    supportsAtomicBatch,
  ]);

  const isPending =
    isSendCallsPending || isWritePending || phase !== "idle";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || isPending || amount <= BigInt(0)}
      className={`font-orbitron w-full rounded-xl border-2 px-4 py-3 text-sm font-semibold text-neon-orange transition ${
        highlight
          ? "border-neon-magenta bg-background shadow-[0_0_30px_rgba(255,0,255,0.45)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)]"
          : "border-neon-magenta/50 bg-background/80 hover:border-neon-magenta"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {isPending ? (
        <span className="inline-flex items-center gap-2">
          <motion.span
            className="h-4 w-4 rounded-full border-2 border-neon-magenta/50 border-t-neon-orange"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
          {phase === "batch" ? "Confirm batch…" : "Transaction pending…"}
        </span>
      ) : (
        <span
          className="glitch-text glitch-hover inline-block"
          data-text="Claim to wallet"
        >
          Claim to wallet
        </span>
      )}
    </button>
  );
}
