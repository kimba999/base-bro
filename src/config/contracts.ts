import { base } from "wagmi/chains";

export { BRO_TOKEN_ABI } from "./abi";

/** Base Mainnet — chain id 8453 (typed as `typeof base` for wagmi chain literals). */
export const BRO_CHAIN = base;

export const BRO_CHAIN_ID = BRO_CHAIN.id;

/** BaseBroToken on Base Mainnet (Remix deploy). */
export const BRO_TOKEN_ADDRESS =
  "0x59a4B057191Fc9F6a2df36509a3d0980eA01201a" as const;
