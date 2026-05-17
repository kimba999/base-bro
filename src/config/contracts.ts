import { base } from "wagmi/chains";

export { BRO_TOKEN_ABI } from "./abi";

/** Base Mainnet — chain id 8453 (typed as `typeof base` for wagmi chain literals). */
export const BRO_CHAIN = base;

export const BRO_CHAIN_ID = BRO_CHAIN.id;

/** BaseBroToken on Base Mainnet — set after deploy (placeholder for local dev). */
export const BRO_TOKEN_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;
