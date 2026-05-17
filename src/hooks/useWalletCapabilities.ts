"use client";

import { useMemo } from "react";
import { useCapabilities, useConnection } from "wagmi";

import { BAZA_CHAIN_ID } from "@/config/contracts";

/**
 * EIP-5792 / `wallet_getCapabilities` — batching (atomic) and paymaster hints.
 */
export function useWalletCapabilities() {
  const { address, status } = useConnection();

  const {
    data,
    error,
    isPending,
    isFetching,
    refetch,
    isSuccess,
  } = useCapabilities({
    chainId: BAZA_CHAIN_ID,
    account: address,
    query: {
      enabled: Boolean(address) && status === "connected",
    },
  });

  const { supportsAtomicBatch, supportsPaymasterService } = useMemo(() => {
    const atomic = data?.atomic;
    const supportsAtomicBatch =
      atomic?.status === "supported" || atomic?.status === "ready";
    const supportsPaymasterService = data?.paymasterService?.supported === true;
    return { supportsAtomicBatch, supportsPaymasterService };
  }, [data]);

  return {
    capabilities: data,
    supportsAtomicBatch,
    supportsPaymasterService,
    error,
    isPending,
    isFetching,
    isSuccess,
    refetch,
  };
}
