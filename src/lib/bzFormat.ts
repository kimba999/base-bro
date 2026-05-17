import { formatEther } from "viem";

/** One full token in wei (18 decimals). */
const WAD = BigInt(10) ** BigInt(18);

/** Full balance string from wei, for tooltips and exact display. */
export function formatBzExact(wei: bigint): string {
  return formatEther(wei);
}

/**
 * Compact display: whole $BAZA ≥ 1000 → "1.2k", ≥ 1_000_000 → "1.2M" (one decimal).
 * Tooltip should use {@link formatBzExact}.
 */
export function formatBzCompact(wei: bigint): string {
  const exact = formatEther(wei);
  const intPart = exact.split(".")[0] ?? "0";
  if (intPart.replace(/^-/, "").length < 4) {
    return exact;
  }
  const n = Number(exact);
  if (!Number.isFinite(n)) {
    return exact;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
}
