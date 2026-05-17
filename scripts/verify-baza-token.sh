#!/usr/bin/env bash
# Verify `BazaToken` on Base Mainnet (Basescan / Etherscan API v2).
#
# Prerequisite: API key from https://etherscan.io/apidashboard (same key works for Base).
# The Solidity version in ../foundry.toml must match Remix, or verification fails.
#
# Usage:
#   export ETHERSCAN_API_KEY=your_key
#   ./scripts/verify-baza-token.sh 0xYour40CharContractAddress
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ $# -ne 1 ]]; then
  echo "Usage: ETHERSCAN_API_KEY=... $0 <contract_address>" >&2
  exit 1
fi

ADDR="$1"
if [[ "${ADDR#0x}" != "$ADDR" ]]; then
  HEX="${ADDR#0x}"
else
  HEX="$ADDR"
fi
if [[ "${#HEX}" -ne 40 ]]; then
  echo "error: expected 40 hex digits (20 bytes), got ${#HEX}" >&2
  exit 1
fi

if [[ -z "${ETHERSCAN_API_KEY:-}" ]]; then
  echo "error: set ETHERSCAN_API_KEY (from etherscan.io API dashboard)" >&2
  exit 1
fi

forge verify-contract "$ADDR" \
  contracts/BazaToken.sol:BazaToken \
  --chain base \
  --verifier etherscan \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --watch
