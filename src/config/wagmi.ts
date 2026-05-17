import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount, injected } from "wagmi/connectors";

const BASE_MAINNET_RPC = "https://mainnet.base.org";

/**
 * Wagmi config for Next.js App Router (SSR + cookie persistence).
 * Call once per client `Providers` mount via `useState(() => getConfig())`.
 */
export function getConfig() {
  return createConfig({
    chains: [base],
    connectors: [
      baseAccount({ appName: "BAZA Mining" }),
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
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
