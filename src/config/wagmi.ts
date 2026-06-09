import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from "wagmi";
import { base } from "wagmi/chains";
import type { EIP1193Provider } from "viem";
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
  /** Explicit connectors only — avoids duplicate Base wallet in Base App (EIP-6963). */
  multiInjectedProviderDiscovery: false,
  connectors: [
    farcasterMiniApp(),
    baseAccount({ appName: "Base Bro" }),
    injected({ target: "metaMask" }),
    injected({
      target: {
        id: "rabby",
        name: "Rabby Wallet",
        provider(window) {
          if (!window) return undefined;
          const w = window as typeof window & {
            rabby?: EIP1193Provider;
            ethereum?: EIP1193Provider & {
              isRabby?: boolean;
              providers?: EIP1193Provider[];
            };
          };
          if (w.rabby) return w.rabby;
          const eth = w.ethereum;
          if (eth?.isRabby) return eth;
          return eth?.providers?.find(
            (p) => (p as { isRabby?: boolean }).isRabby,
          );
        },
      },
    }),
    injected({
      target: {
        id: "keplr",
        name: "Keplr",
        provider(window) {
          if (!window) return undefined;
          return (
            window as typeof window & {
              keplr?: { ethereum?: EIP1193Provider };
            }
          ).keplr?.ethereum;
        },
      },
    }),
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
