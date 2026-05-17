# Deployment notes (BAZA)

Public on-chain metadata only — **never** commit private keys or mnemonics.

## Base Mainnet (chain id `8453`)

| Field | Value |
|--------|--------|
| **Network** | Base Mainnet |
| **BazaToken address** | `0x685cD8bBC7EDac563024D798f19D12fdb2A89887` |
| **Basescan (verified source)** | [Contract on Basescan](https://basescan.org/address/0x685cD8bBC7EDac563024D798f19D12fdb2A89887#code) |
| **Verification** | Source code verified (exact match) on Basescan |
| **Deploy tx hash** | _(optional — paste from wallet / explorer)_ |
| **Date** | 2026-05-15 |
| **Remix / compiler** | _(optional — e.g. Solidity 0.8.x used in Remix)_ |

Frontend reads the token address from `src/config/contracts.ts` → `BAZA_TOKEN_ADDRESS`.

## Verify again (after upgrades)

Source of truth for bytecode: **`contracts/BazaToken.sol`**, contract name **`BazaToken`**. The nested **`contract/`** Foundry app is a different stack (OZ `BAZA`); do not mix them for this token.

- **Foundry (repo root):** `foundry.toml` + `./scripts/verify-baza-token.sh <address>` — see script header and `ETHERSCAN_API_KEY`.
- **Basescan UI:** [Verify contract](https://basescan.org/verifyContract).

## Farcaster Mini App manifest

- File: `public/.well-known/farcaster.json` → `https://baza-mining-app.vercel.app/.well-known/farcaster.json`
- **Warpcast:** Manifests → Create → domain `baza-mining-app.vercel.app` → **Verify**
- **`accountAssociation`** must be signed (empty placeholders in repo until you generate them):
  - [Farcaster Developers](https://farcaster.xyz/~/developers) or Base manifest signer
  - Paste `header`, `payload`, `signature` into the JSON, then redeploy
- **Emulator:** test URL `https://baza-mining-app.vercel.app` before publishing
- Icon spec: 1024×1024 PNG (replace `public/logo.png` when you have final art)

## Optional

- Proxy / implementation addresses if you upgrade later
