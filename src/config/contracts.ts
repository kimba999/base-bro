import { base } from "wagmi/chains";

export { BRO_TOKEN_ABI } from "./abi";

/** Base Mainnet — chain id 8453 (typed as `typeof base` for wagmi chain literals). */
export const BRO_CHAIN = base;

export const BRO_CHAIN_ID = BRO_CHAIN.id;

/** BaseBroToken on Base Mainnet (Remix deploy). */
export const BRO_TOKEN_ADDRESS =
  "0x00915F04dB15816665D9A93C05B6E6E77217bdB2" as const;
