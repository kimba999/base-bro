/** Contract expects whole $BRO units; it multiplies by 10^18 internally. */
export function toClaimAmountWhole(unclaimed: number): bigint {
  if (!Number.isFinite(unclaimed) || unclaimed <= 0) {
    return BigInt(0);
  }
  return BigInt(Math.floor(unclaimed));
}
