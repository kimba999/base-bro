import type { ResolvedRegister } from "wagmi";
import {
  waitForCallsStatus,
  waitForTransactionReceipt,
} from "wagmi/actions";
import type { Abi, ContractFunctionName } from "viem";

import { BRO_CHAIN_ID } from "@/config/contracts";

type ContractCall<
  abi extends Abi,
  functionName extends ContractFunctionName<abi, "nonpayable" | "payable">,
> = {
  abi: abi;
  address: `0x${string}`;
  functionName: functionName;
  args?: readonly unknown[];
  value?: bigint;
};

export type ContractWriteReceipt = {
  logs: readonly {
    address: `0x${string}`;
    data: `0x${string}`;
    topics: readonly `0x${string}`[];
  }[];
};

type SendCallsAsync = (variables: {
  chainId?: typeof BRO_CHAIN_ID;
  calls: readonly {
    abi: Abi;
    to: `0x${string}`;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  }[];
}) => Promise<{ id: string }>;

type WriteContractAsync = (variables: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId?: typeof BRO_CHAIN_ID;
}) => Promise<`0x${string}`>;

/**
 * Prefer EIP-5792 `wallet_sendCalls` on Base Smart Wallet; fall back to `eth_sendTransaction`.
 */
export async function executeContractWrite<
  const abi extends Abi,
  functionName extends ContractFunctionName<abi, "nonpayable" | "payable">,
>({
  config,
  supportsBatching,
  sendCallsAsync,
  writeContractAsync,
  call,
}: {
  config: ResolvedRegister["config"];
  supportsBatching: boolean;
  sendCallsAsync: SendCallsAsync;
  writeContractAsync: WriteContractAsync;
  call: ContractCall<abi, functionName>;
}): Promise<ContractWriteReceipt> {
  if (supportsBatching) {
    try {
      const { id } = await sendCallsAsync({
        chainId: BRO_CHAIN_ID,
        calls: [
          {
            abi: call.abi,
            to: call.address,
            functionName: call.functionName as string,
            args: call.args,
            value: call.value,
          },
        ],
      });

      const status = await waitForCallsStatus(config, { id });
      const receipt = status.receipts?.[0];
      if (receipt?.logs) {
        return { logs: receipt.logs };
      }
    } catch {
      // Fall through to legacy write.
    }
  }

  const hash = await writeContractAsync({
    address: call.address,
    abi: call.abi,
    functionName: call.functionName as string,
    args: call.args,
    value: call.value,
    chainId: BRO_CHAIN_ID,
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { logs: receipt.logs };
}
