import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from "wagmi";
import { base } from "wagmi/chains";
import { farcasterMiniApp } from "@/lib/farcasterMiniAppConnector";
import { baseAccount, injected } from "wagmi/connectors";

const BASE_MAINNET_RPC = "https://mainnet.base.org";

/**
 * Wagmi config for Next.js App Router + Warpcast mini app + Base Smart Wallet.
 * - `ssr: true` + `cookieStorage` — stable hydration (see Base Quickstart / EIP-5792).
 * - `farcasterMiniApp` — embedded Warpcast wallet in mini app hosts.
 */
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    baseAccount({ appName: "Base Bro" }),
    injected({ target: "metaMask" }),
  ],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [base.id]: http(BASE_MAINNET_RPC),
  },
});

export type AppWagmiConfig = typeof wagmiConfig;

export function getConfig(): AppWagmiConfig {
  return wagmiConfig;
}

