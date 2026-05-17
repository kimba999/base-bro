import { base } from "wagmi/chains";

export { BAZA_TOKEN_ABI } from "./abi";

/** Base Mainnet — chain id 8453 (typed as `typeof base` for wagmi chain literals). */
export const BAZA_CHAIN = base;

export const BAZA_CHAIN_ID = BAZA_CHAIN.id;

/** BazaToken on Base Mainnet — set after deploy (placeholder for local dev). */
export const BAZA_TOKEN_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;
