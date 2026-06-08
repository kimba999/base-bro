import { Attribution } from "ox/erc8021";

/** Base Builder Code from base.dev → Settings → Builder Codes */
export const BUILDER_CODE = "bc_ilixbg19" as const;

/** ERC-8021 suffix appended to tx calldata for Base builder attribution. */
export const BUILDER_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
});

/** EIP-5792 `wallet_sendCalls` capability for smart wallets that support dataSuffix. */
export const BUILDER_DATA_SUFFIX_CAPABILITY = {
  dataSuffix: {
    value: BUILDER_DATA_SUFFIX,
    optional: true,
  },
} as const;
