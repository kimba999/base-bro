"use client";

import { useMemo } from "react";
import { base } from "wagmi/chains";
import { useCapabilities } from "wagmi";

/**
 * EIP-5792 / `wallet_getCapabilities` — atomic batching & paymaster (Base Smart Wallet).
 * @see https://docs.base.org/
 */
export function useWalletCapabilities() {
  const {
    data: capabilities,
    error,
    isPending,
    isFetching,
    refetch,
    isSuccess,
  } = useCapabilities();

  const supportsBatching = useMemo(() => {
    const atomic = capabilities?.[base.id]?.atomic;
    return atomic?.status === "ready" || atomic?.status === "supported";
  }, [capabilities]);

  const supportsPaymasterService = useMemo(() => {
    const paymaster = capabilities?.[base.id]?.paymasterService;
    return paymaster?.supported === true;
  }, [capabilities]);

  return {
    capabilities,
    supportsBatching,
    /** Alias kept for existing call sites. */
    supportsAtomicBatch: supportsBatching,
    supportsPaymasterService,
    error,
    isPending,
    isFetching,
    isSuccess,
    refetch,
  };
}
