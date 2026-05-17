import { decodeEventLog } from "viem";

import { BRO_TOKEN_ABI } from "@/config/abi";

export type WheelOutcomeType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ParsedWheelSpin = {
  outcomeType: WheelOutcomeType;
  broAmountWei: bigint;
  roll: number;
  dailySpinsUsed: number;
};

type WheelSpinLog = {
  address: `0x${string}`;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

export function parseWheelSpinLogs(
  logs: readonly WheelSpinLog[],
  tokenAddress: string,
): ParsedWheelSpin | null {
  const target = tokenAddress.toLowerCase();

  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;

    try {
      const decoded = decodeEventLog({
        abi: BRO_TOKEN_ABI,
        data: log.data,
        topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
      });

      if (decoded.eventName !== "WheelSpin") continue;

      const { outcomeType, broAmount, roll, dailySpinsUsed } = decoded.args as {
        outcomeType: number;
        broAmount: bigint;
        roll: number;
        dailySpinsUsed: bigint;
      };

      return {
        outcomeType: outcomeType as WheelOutcomeType,
        broAmountWei: broAmount,
        roll: Number(roll),
        dailySpinsUsed: Number(dailySpinsUsed),
      };
    } catch {
      continue;
    }
  }

  return null;
}

export function outcomeTypeToSectorId(outcomeType: WheelOutcomeType): number {
  return outcomeType;
}
