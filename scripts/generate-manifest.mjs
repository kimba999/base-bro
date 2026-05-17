#!/usr/bin/env node
/**
 * Generates public/.well-known/farcaster.json with a valid accountAssociation (JFS).
 *
 * Usage:
 *   npm run manifest:create          # interactive (recommended)
 *   npm run generate:manifest        # non-interactive (.env.local)
 *
 * Note: @farcaster/mini-app-cli is not published on npm (404). This script uses
 * @farcaster/jfs + viem — the same JFS signing spec as Warpcast/Farcaster hosts.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import {
  encodeHeader,
  encodePayload,
  encodeSignature,
  verify,
} from "@farcaster/jfs";
import { createPublicClient, http, hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "public/.well-known/farcaster.json");
const ID_REGISTRY = "0x00000000Fc6c5F01Fc4011634a6f475c76e6e938";
const DEFAULT_DOMAIN = "baza-mining-app.vercel.app";
const DEFAULT_ORIGIN = "https://baza-mining-app.vercel.app";

const idRegistryAbi = [
  {
    type: "function",
    name: "idOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "custodyOf",
    stateMutability: "view",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
];

const isInteractive =
  process.argv.includes("--interactive") ||
  process.argv.includes("-i") ||
  (process.stdin.isTTY && !process.env.FARCASTER_CUSTODY_PRIVATE_KEY);

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function normalizePrivateKey(raw) {
  const key = raw.trim();
  return key.startsWith("0x") ? key : `0x${key}`;
}

function normalizeDomain(raw) {
  return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function buildFrameConfig({ name, origin, iconPath }) {
  const iconUrl = iconPath.startsWith("http")
    ? iconPath
    : `${origin.replace(/\/$/, "")}/${iconPath.replace(/^\//, "")}`;
  return {
    version: "1",
    name,
    iconUrl,
    homeUrl: origin,
    imageUrl: iconUrl,
    buttonTitle: "Start Mining",
    splashImageUrl: iconUrl,
    splashBackgroundColor: "#0052FF",
  };
}

async function resolveFid(publicClient, custodyAddress, fidFromEnv) {
  if (fidFromEnv) {
    const fid = Number(fidFromEnv);
    if (!Number.isInteger(fid) || fid <= 0) {
      throw new Error("FARCASTER_FID must be a positive integer");
    }
    const onChainCustody = await publicClient.readContract({
      address: ID_REGISTRY,
      abi: idRegistryAbi,
      functionName: "custodyOf",
      args: [BigInt(fid)],
    });
    if (onChainCustody.toLowerCase() !== custodyAddress.toLowerCase()) {
      throw new Error(
        `FID ${fid} custody is ${onChainCustody}, but your key is ${custodyAddress}. Use the Farcaster custody private key.`,
      );
    }
    return fid;
  }

  const fid = await publicClient.readContract({
    address: ID_REGISTRY,
    abi: idRegistryAbi,
    functionName: "idOf",
    args: [custodyAddress],
  });
  const fidNumber = Number(fid);
  if (!fidNumber) {
    throw new Error(
      `No Farcaster ID for ${custodyAddress}. Set FID manually or use your custody key.`,
    );
  }
  return fidNumber;
}

async function signAccountAssociation({ fid, custodyAddress, domain, privateKey }) {
  const account = privateKeyToAccount(normalizePrivateKey(privateKey));
  if (account.address.toLowerCase() !== custodyAddress.toLowerCase()) {
    throw new Error(`Private key does not match custody address ${custodyAddress}`);
  }

  const header = { fid, type: "custody", key: account.address };
  const payload = { domain };
  const encodedHeader = encodeHeader(header);
  const encodedPayload = encodePayload(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signatureHex = await account.signMessage({ message: signingInput });
  const encodedSignature = encodeSignature(hexToBytes(signatureHex));

  const accountAssociation = {
    header: encodedHeader,
    payload: encodedPayload,
    signature: encodedSignature,
  };

  await verify({ data: accountAssociation, keyTypes: ["custody"], strict: true });
  return accountAssociation;
}

async function promptInteractiveConfig() {
  p.intro("Farcaster manifest — BAZA Mining");

  p.log.info(
    "@farcaster/mini-app-cli is not on npm yet. This wizard signs the manifest locally (JFS + custody key), same result as Warpcast.",
  );

  const name = await p.text({
    message: "App name",
    initialValue: "BAZA Mining",
    validate: (v) => (v?.trim() ? undefined : "Required"),
  });
  if (p.isCancel(name)) process.exit(0);

  const domain = await p.text({
    message: "Domain (no https://)",
    initialValue: DEFAULT_DOMAIN,
    validate: (v) => (v?.trim() ? undefined : "Required"),
  });
  if (p.isCancel(domain)) process.exit(0);

  const origin = await p.text({
    message: "Home URL",
    initialValue: DEFAULT_ORIGIN,
    validate: (v) => (v?.trim() ? undefined : "Required"),
  });
  if (p.isCancel(origin)) process.exit(0);

  const iconPath = await p.text({
    message: "Icon path or full URL",
    initialValue: "logo.png",
    validate: (v) => (v?.trim() ? undefined : "Required"),
  });
  if (p.isCancel(iconPath)) process.exit(0);

  const privateKey = await p.password({
    message: "Farcaster custody private key (0x…, never committed)",
    validate: (v) =>
      v?.trim().length >= 64 ? undefined : "Enter your custody wallet private key",
  });
  if (p.isCancel(privateKey)) process.exit(0);

  const fidInput = await p.text({
    message: "FID (leave empty to auto-detect from custody address)",
    placeholder: "auto",
  });
  if (p.isCancel(fidInput)) process.exit(0);

  const frame = buildFrameConfig({
    name: String(name).trim(),
    origin: String(origin).trim(),
    iconPath: String(iconPath).trim(),
  });

  const confirmed = await p.confirm({
    message: `Sign manifest for domain "${normalizeDomain(String(domain))}" and write public/.well-known/farcaster.json?`,
    initialValue: true,
  });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return {
    domain: normalizeDomain(String(domain)),
    privateKey: String(privateKey).trim(),
    fidFromEnv: String(fidInput || "").trim() || undefined,
    frame,
  };
}

async function main() {
  loadDotEnv(join(ROOT, ".env.local"));

  let domain;
  let privateKey;
  let fidFromEnv;
  let frame;

  if (isInteractive) {
    ({ domain, privateKey, fidFromEnv, frame } = await promptInteractiveConfig());
  } else {
    privateKey = process.env.FARCASTER_CUSTODY_PRIVATE_KEY;
    domain = normalizeDomain(process.env.FARCASTER_DOMAIN || DEFAULT_DOMAIN);
    fidFromEnv = process.env.FARCASTER_FID;
    frame = buildFrameConfig({
      name: "BAZA Mining",
      origin: DEFAULT_ORIGIN,
      iconPath: "logo.png",
    });

    if (!privateKey) {
      console.error(
        [
          "Missing FARCASTER_CUSTODY_PRIVATE_KEY.",
          "",
          "Run interactively:  npm run manifest:create",
          "Or create .env.local (see .env.example) and: npm run generate:manifest",
        ].join("\n"),
      );
      process.exit(1);
    }
  }

  const spinner = p.spinner();
  spinner.start("Resolving FID and signing accountAssociation…");

  const account = privateKeyToAccount(normalizePrivateKey(privateKey));
  const publicClient = createPublicClient({
    chain: optimism,
    transport: http(),
  });

  const fid = await resolveFid(publicClient, account.address, fidFromEnv);
  const accountAssociation = await signAccountAssociation({
    fid,
    custodyAddress: account.address,
    domain,
    privateKey,
  });

  const manifest = { accountAssociation, frame };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  spinner.stop("Manifest written and signature verified locally.");

  if (isInteractive) {
    p.note(
      [
        `Custody: ${account.address}`,
        `FID: ${fid}`,
        `Domain: ${domain}`,
        `File: public/.well-known/farcaster.json`,
      ].join("\n"),
      "Done",
    );
    p.outro("Next: git add, commit, push — or ask Cursor to deploy.");
  } else {
    console.log(`Custody: ${account.address}`);
    console.log(`FID: ${fid}`);
    console.log(`Domain: ${domain}`);
    console.log(`Wrote ${MANIFEST_PATH}`);
  }
}

main().catch((err) => {
  p.log.error(err.message || String(err));
  process.exit(1);
});
