import { base } from "wagmi/chains";

export { BRO_TOKEN_ABI } from "./abi";

/** Base Mainnet — chain id 8453 (typed as `typeof base` for wagmi chain literals). */
export const BRO_CHAIN = base;

export const BRO_CHAIN_ID = BRO_CHAIN.id;

/** BaseBroToken on Base Mainnet (Remix deploy). */
export const BRO_TOKEN_ADDRESS =
  "0xE258530CdCB5742025588049aCb4C7CDFBAc794c" as const;
