/**
 * Submit Remix Standard JSON Input to Etherscan V2 (Base chainId 8453).
 * Usage:
 *   export BASESCAN_API_KEY=your_key
 *   node scripts/verify-standard-json.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const ADDRESS = "0x00915F04dB15816665D9A93C05B6E6E77217bdB2";
const CHAIN_ID = "8453";
const API_KEY = process.env.BASESCAN_API_KEY;

if (!API_KEY || API_KEY.includes("PASTE_")) {
  console.error("Set BASESCAN_API_KEY in your environment first.");
  process.exit(1);
}

const inputPath = path.join(ROOT, "contract_input.json");
const standardJson = fs.readFileSync(inputPath, "utf8");

const body = new URLSearchParams({
  apikey: API_KEY,
  chainid: CHAIN_ID,
  module: "contract",
  action: "verifysourcecode",
  contractaddress: ADDRESS,
  codeformat: "solidity-standard-json-input",
  contractname: "BaseBroToken3.sol:BaseBroToken",
  compilerversion: "v0.8.34+commit.46dd454c",
  sourceCode: standardJson,
  constructorArguements: "",
});

console.log("Submitting Standard JSON verification to Etherscan V2 (Base)…");

const res = await fetch("https://api.etherscan.io/v2/api", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: body.toString(),
});

const json = await res.json();
console.log(JSON.stringify(json, null, 2));

if (json.status === "1" && json.result) {
  const guid = json.result;
  console.log("\nPoll status:");
  console.log(
    `curl "https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=contract&action=checkverifystatus&apikey=$BASESCAN_API_KEY&guid=${guid}"`,
  );
} else {
  process.exit(1);
}
