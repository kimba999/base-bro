"use client";

import { ClaimTokensButton } from "@/components/ClaimTokensButton";
import { CyberWheel } from "@/components/CyberWheel";
import { StreakVisual } from "@/components/StreakVisual";
import {
  BRO_CHAIN,
  BRO_TOKEN_ABI,
  BRO_TOKEN_ADDRESS,
} from "@/config/contracts";
import { useClicker } from "@/hooks/useClicker";
import { useWalletCapabilities } from "@/hooks/useWalletCapabilities";
import { formatBzCompact, formatBzExact } from "@/lib/bzFormat";
import { AnimatePresence, motion } from "framer-motion";
import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  useChainId,
  useConnect,
  useConnection,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

/** Repeating tile for watermark behind the BRO coin (white fill; layer uses opacity 0.05). */
const BRO_WATERMARK_DATA_URI =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="104" height="72" viewBox="0 0 104 72">' +
      '<text x="6" y="22" fill="white" font-size="10" font-weight="700" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="0.14em">BRO</text>' +
      '<text x="54" y="50" fill="white" font-size="10" font-weight="700" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="0.14em">BRO</text>' +
      "</svg>",
  ) +
  '")';

const succeededTxHashes = new Set<string>();

/** Must match `BaseBroToken` daily check-in interval after redeploy (24 hours). */
const CHECKIN_COOLDOWN_SEC = BigInt(86400);
/** Must match `STREAK_GRACE_PERIOD` in contract (48 hours). */
const STREAK_GRACE_SEC = BigInt(172800);

const NEON_CYAN = "#00FFFF";
const NEON_MAGENTA = "#FF00FF";
const NEON_ORANGE = "#FF4500";

/** Outer rim: dark outline + bevel highlights + depth + drop + glow */
const COIN_SHADOW_REST = [
  "0 0 0 2px rgba(255,0,255,0.35)",
  "0 0 0 5px rgba(0,0,0,0.32)",
  "inset 0 7px 18px rgba(0,255,255,0.18)",
  "inset 0 -10px 22px rgba(0,0,0,0.44)",
  "inset 0 0 0 1px rgba(255,0,255,0.12)",
  "0 22px 44px rgba(0,0,0,0.42)",
  "0 0 50px rgba(255,0,255,0.35)",
  "0 0 28px rgba(0,255,255,0.2)",
].join(", ");

const COIN_SHADOW_HOVER = [
  "0 0 0 2px rgba(255,0,255,0.55)",
  "0 0 0 5px rgba(0,0,0,0.28)",
  "inset 0 8px 20px rgba(0,255,255,0.24)",
  "inset 0 -10px 22px rgba(0,0,0,0.4)",
  "inset 0 0 0 1px rgba(255,0,255,0.2)",
  "0 26px 52px rgba(0,0,0,0.38)",
  "0 0 68px rgba(255,0,255,0.55)",
  "0 0 32px rgba(0,255,255,0.35)",
].join(", ");

/** Pressed: stronger lower inset, weaker top highlight, tighter drop (inset look) */
const COIN_SHADOW_PRESSED = [
  "0 0 0 2px rgba(255,0,255,0.45)",
  "0 0 0 4px rgba(0,0,0,0.28)",
  "inset 0 3px 12px rgba(0,255,255,0.08)",
  "inset 0 -14px 28px rgba(0,0,0,0.58)",
  "inset 0 0 0 1px rgba(0,0,0,0.28)",
  "0 10px 22px rgba(0,0,0,0.52)",
  "0 0 34px rgba(255,0,255,0.22)",
].join(", ");

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCountdownSeconds(totalSeconds: bigint): string {
  if (totalSeconds <= BigInt(0)) return "0:00:00";
  const t = Number(totalSeconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function connectorLabel(connectorId: string, name: string) {
  const id = connectorId.toLowerCase();
  if (id.includes("base") || name.toLowerCase().includes("base"))
    return "Base Smart Wallet";
  if (id.includes("injected") || name.toLowerCase().includes("meta"))
    return "MetaMask (browser)";
  return name;
}

export function ConnectWallet() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const {
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    isDisconnected,
    status,
  } = useConnection();
  const { supportsAtomicBatch, supportsPaymasterService } =
    useWalletCapabilities();
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContract, data: txHash, isPending: isWritePending } =
    useWriteContract();
  const {
    data: txReceipt,
    isLoading: isConfirmingTx,
    isSuccess: isTxConfirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const {
    clicks,
    energy,
    maxEnergy,
    energyPercent,
    claimTapProgressPercent,
    requiredTapsForClaim,
    canClick,
    activeTapMultiplier,
    streakShieldActive,
    screenGlitch,
    registerClick,
    resetClicks,
    addUnclaimed,
    spendUnclaimed,
    refillEnergy,
    activateTapMultiplier,
    activateStreakShield,
    triggerScreenGlitch,
  } = useClicker();
  const txActionRef = useRef<"checkin" | null>(null);
  const floatingIdRef = useRef(0);
  const [floatingTexts, setFloatingTexts] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const [nowSec, setNowSec] = useState(() =>
    Math.floor(Date.now() / 1000),
  );
  const [coinHover, setCoinHover] = useState(false);
  const [coinPressedLocal, setCoinPressedLocal] = useState(false);
  const [isWheelOpen, setIsWheelOpen] = useState(false);

  const isCorrectNetwork = chainId === BRO_CHAIN.id;

  const { data: streakData, refetch: refetchStreak } = useReadContract({
    address: BRO_TOKEN_ADDRESS,
    abi: BRO_TOKEN_ABI,
    functionName: "currentStreak",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && isCorrectNetwork),
      refetchInterval: 5000,
    },
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: BRO_TOKEN_ADDRESS,
    abi: BRO_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && isCorrectNetwork),
      refetchInterval: 5000,
    },
  });

  const { data: lastCheckInData, refetch: refetchLastCheckIn } =
    useReadContract({
      address: BRO_TOKEN_ADDRESS,
      abi: BRO_TOKEN_ABI,
      functionName: "lastCheckIn",
      args: address ? [address] : undefined,
      query: {
        enabled: Boolean(address && isCorrectNetwork),
        refetchInterval: 5000,
      },
    });

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const streakBig =
    typeof streakData === "bigint" ? streakData : BigInt(0);
  const streakLabel = streakBig.toString();

  const balanceWei =
    typeof balanceData === "bigint" ? balanceData : BigInt(0);
  const balanceCompact = formatBzCompact(balanceWei);
  const balanceExact = formatBzExact(balanceWei);
  const walletBroWhole = Number(balanceWei / BigInt(10 ** 18));

  const lastCheckInSec =
    typeof lastCheckInData === "bigint" ? lastCheckInData : BigInt(0);

  const nowBig = BigInt(nowSec);
  const nextCheckInAt =
    lastCheckInSec > BigInt(0)
      ? lastCheckInSec + CHECKIN_COOLDOWN_SEC
      : BigInt(0);
  const cooldownRemaining =
    lastCheckInSec > BigInt(0) && nowBig < nextCheckInAt
      ? nextCheckInAt - nowBig
      : BigInt(0);
  const canDailyCheckIn =
    lastCheckInSec === BigInt(0) || nowBig >= nextCheckInAt;

  const streakBrokenUi =
    lastCheckInSec > BigInt(0) && nowBig > lastCheckInSec + STREAK_GRACE_SEC;

  const isCheckInPending = isWritePending || isConfirmingTx;
  const unclaimedBz = clicks;
  const tapsTowardClaim = Math.min(clicks, requiredTapsForClaim);
  const canClaim =
    unclaimedBz >= requiredTapsForClaim &&
    isCorrectNetwork &&
    !isCheckInPending;

  const coinInteractive = canClick && isCorrectNetwork;

  const handleCoinTap = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!coinInteractive) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = ++floatingIdRef.current;

      setFloatingTexts((prev) => [...prev, { id, x, y }]);
      window.setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
      }, 1000);

      registerClick(event as unknown as MouseEvent<HTMLButtonElement>);
    },
    [coinInteractive, registerClick],
  );

  const coinShadow =
    coinPressedLocal && coinInteractive
      ? COIN_SHADOW_PRESSED
      : coinHover && coinInteractive
        ? COIN_SHADOW_HOVER
        : COIN_SHADOW_REST;

  useEffect(() => {
    if (!txHash || !isTxConfirmed || !txReceipt) return;
    if (txReceipt.status !== "success") return;
    if (succeededTxHashes.has(txHash)) return;
    succeededTxHashes.add(txHash);
    if (succeededTxHashes.size > 64) {
      succeededTxHashes.clear();
    }

    const action = txActionRef.current;
    txActionRef.current = null;

    void (async () => {
      const streakResult = await refetchStreak();
      await refetchBalance();
      await refetchLastCheckIn();

      if (action === "checkin") {
        const s = streakResult.data;
        if (
          typeof s === "bigint" &&
          s > BigInt(0) &&
          s % BigInt(7) === BigInt(0)
        ) {
          const { fireSeventhDayConfetti } = await import(
            "@/lib/daySevenConfetti"
          );
          void fireSeventhDayConfetti();
        }
      }
    })();
  }, [
    txHash,
    isTxConfirmed,
    txReceipt,
    refetchBalance,
    refetchLastCheckIn,
    refetchStreak,
  ]);

  const handleDailyCheckIn = () => {
    if (isCheckInPending || !isCorrectNetwork || !canDailyCheckIn) return;
    txActionRef.current = "checkin";
    writeContract({
      address: BRO_TOKEN_ADDRESS,
      abi: BRO_TOKEN_ABI,
      functionName: "dailyCheckIn",
    });
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-neon-cyan">
        <div className="rounded-2xl border border-neon-magenta/50 bg-background/90 px-5 py-4 text-sm">
          Loading wallet...
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    const statusLine = isReconnecting
      ? "Restoring your session…"
      : isConnecting || isConnectPending
        ? "Opening wallet…"
        : isDisconnected
          ? "Choose how to connect"
          : "Connect wallet to start mining BRO";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <motion.div className="w-full max-w-md rounded-3xl border border-neon-magenta/50 bg-background/90 p-6 shadow-[0_0_40px_rgba(255,0,255,0.25)]">
          <h1
            className="font-orbitron glitch-text mb-5 text-center text-2xl font-bold tracking-wide sm:text-3xl"
            data-text="Base Bro Mining"
          >
            Base Bro Mining
          </h1>
          <p className="font-orbitron mb-1 text-center text-xs font-medium uppercase tracking-wide text-neon-cyan/50">
            {status === "reconnecting"
              ? "Reconnecting"
              : status === "connecting"
                ? "Connecting"
                : "Disconnected"}
          </p>
          <p className="mb-4 text-center text-sm text-neon-cyan/80">{statusLine}</p>
          <div className="flex flex-col gap-3">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={
                  isConnectPending ||
                  isConnecting ||
                  isReconnecting
                }
                onClick={() => connect({ connector })}
                className="font-orbitron w-full rounded-xl border-2 border-neon-magenta bg-background px-4 py-3 text-sm font-medium text-neon-cyan transition hover:bg-neon-magenta/10 hover:shadow-[0_0_24px_rgba(255,0,255,0.35)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:bg-background/40 disabled:text-neon-cyan/40"
              >
                {isConnectPending || isConnecting
                  ? "Connecting…"
                  : `Connect with ${connectorLabel(connector.id, connector.name)}`}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <main
      className={`flex min-h-screen items-center justify-center bg-background px-4 py-6 text-neon-cyan ${screenGlitch ? "screen-glitch" : ""}`}
    >
      <motion.div className="w-full max-w-xl rounded-3xl border border-neon-magenta/40 bg-background/80 px-8 py-8 shadow-[0_0_60px_rgba(255,0,255,0.2)] backdrop-blur sm:px-10 sm:py-9">
        <h1
          className="font-orbitron glitch-text mb-6 text-center text-2xl font-bold tracking-wide sm:text-3xl"
          data-text="Base Bro Mining"
        >
          Base Bro Mining
        </h1>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-neon-cyan/80">
          <span>{shortenAddress(address)}</span>
          <div className="flex flex-wrap items-center gap-2">
            {supportsAtomicBatch ? (
              <span className="rounded-full border border-neon-cyan/40 bg-background px-2 py-0.5 text-[11px] text-neon-cyan">
                EIP-5792 batch
              </span>
            ) : null}
            {supportsPaymasterService ? (
              <span className="rounded-full border border-neon-magenta/40 bg-background px-2 py-0.5 text-[11px] text-neon-magenta">
                Paymaster
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-lg border border-neon-magenta/50 px-3 py-1.5 text-neon-cyan transition hover:border-neon-magenta hover:shadow-[0_0_12px_rgba(255,0,255,0.35)]"
            >
              Disconnect
            </button>
          </div>
        </div>

        {!isCorrectNetwork ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId: BRO_CHAIN.id })}
            disabled={isSwitchingChain}
            className="mb-4 w-full rounded-xl border-2 border-neon-orange bg-background px-4 py-3 text-sm font-medium text-neon-orange transition hover:bg-neon-orange/10 hover:shadow-[0_0_24px_rgba(255,69,0,0.4)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:bg-background/40 disabled:text-neon-cyan/40"
          >
            {isSwitchingChain ? "Switching..." : `Switch to ${BRO_CHAIN.name}`}
          </button>
        ) : null}

        {streakBrokenUi ? (
          <div
            className="mb-4 rounded-xl border border-neon-orange/50 bg-background/90 px-4 py-3 text-center text-sm text-neon-orange"
            role="status"
          >
            Твой стрик обнулился, начни новый цикл!
          </div>
        ) : null}

        <div className="font-orbitron mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-neon-magenta/50 bg-background/80 p-4 text-sm text-neon-cyan">
          <p>
            🔥 Streak:{" "}
            <span className="font-bold text-neon-orange">{streakLabel}</span>
          </p>
          <p
            className="max-w-[55%] justify-self-end text-right text-xs leading-snug sm:text-sm"
            title={`${balanceExact} $BRO`}
          >
            <span className="block text-neon-cyan/60">💰 Total $BRO</span>
            <span className="break-all text-base font-bold text-neon-orange sm:text-lg">
              {balanceCompact}
            </span>
          </p>
        </div>

        <StreakVisual currentStreak={streakBig} />

        <div className="mb-2 flex flex-wrap justify-center gap-2">
          {activeTapMultiplier > 1 ? (
            <span className="rounded-full border border-neon-orange/60 bg-background px-2 py-0.5 text-[10px] font-bold text-neon-orange">
              TAP x{activeTapMultiplier}
            </span>
          ) : null}
          {streakShieldActive ? (
            <span className="rounded-full border border-neon-magenta/60 bg-background px-2 py-0.5 text-[10px] font-bold text-neon-magenta">
              STREAK SHIELD
            </span>
          ) : null}
        </div>

        <p className="font-orbitron mb-3 text-center text-lg font-bold text-neon-orange">
          Unclaimed $BRO: {unclaimedBz}
        </p>

        <motion.div className="mb-5">
          <motion.div className="mb-2 flex justify-between text-xs text-neon-cyan/60">
            <span>Taps to claim</span>
            <span className="font-orbitron font-bold text-neon-orange">
              {tapsTowardClaim}/{requiredTapsForClaim}
            </span>
          </motion.div>
          <motion.div className="h-3 w-full overflow-hidden rounded-full bg-background/60">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan"
              animate={{ width: `${claimTapProgressPercent}%` }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        </motion.div>

        <div className="relative mb-6 flex min-h-[15rem] justify-center py-2">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(34rem,130vw)] w-[min(40rem,96vw)] opacity-[0.05] select-none"
            style={{
              transform: "translate(-50%, -50%) rotate(-18deg)",
              backgroundImage: BRO_WATERMARK_DATA_URI,
              backgroundSize: "104px 72px",
              backgroundRepeat: "repeat",
            }}
            aria-hidden
          />
          <motion.button
            type="button"
            disabled={!coinInteractive}
            onPointerEnter={() => coinInteractive && setCoinHover(true)}
            onPointerLeave={() => {
              setCoinHover(false);
              setCoinPressedLocal(false);
            }}
            onPointerDown={(event) => {
              if (!coinInteractive) return;
              setCoinPressedLocal(true);
              handleCoinTap(event);
            }}
            onPointerUp={() => setCoinPressedLocal(false)}
            onPointerCancel={() => setCoinPressedLocal(false)}
            whileHover={coinInteractive ? { scale: 1.02 } : undefined}
            whileTap={coinInteractive ? { scale: 0.95 } : undefined}
            transition={{ type: "spring", stiffness: 480, damping: 28 }}
            className="relative z-10 h-56 w-56 cursor-pointer overflow-visible rounded-full disabled:cursor-not-allowed disabled:opacity-40"
            style={{ boxShadow: coinShadow }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle at 28% 22%, ${NEON_CYAN} 0%, #00b8b8 14%, ${NEON_MAGENTA} 42%, #8b008b 72%, #05070d 100%)`,
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 26% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 22%, transparent 48%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 78% 88%, rgba(0,0,0,0.22) 0%, transparent 42%)",
              }}
              aria-hidden
            />

            <div
              className="absolute left-1/2 top-1/2 z-[1] flex h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                background: `radial-gradient(circle at 34% 30%, rgba(0,255,255,0.25) 0%, rgba(255,0,255,0.2) 28%, ${NEON_MAGENTA} 58%, #05070d 92%)`,
                boxShadow: [
                  "inset 0 5px 14px rgba(0,0,0,0.48)",
                  "inset 0 -4px 12px rgba(255,255,255,0.1)",
                  "inset 0 0 0 1px rgba(0,0,0,0.28)",
                  "0 1px 0 rgba(255,255,255,0.12)",
                ].join(", "),
              }}
            >
              <span
                className="font-orbitron relative text-3xl font-black tracking-[0.14em] sm:text-4xl sm:tracking-[0.16em]"
                style={{
                  color: NEON_ORANGE,
                  textShadow: [
                    "0 1px 0 rgba(255,255,255,0.35)",
                    "0 -1px 1px rgba(0,0,0,0.55)",
                    "0 2px 4px rgba(0,0,0,0.45)",
                    "0 0 16px rgba(255,69,0,0.65)",
                    "0 0 28px rgba(255,0,255,0.35)",
                  ].join(", "),
                }}
              >
                BRO
              </span>
            </div>

            {floatingTexts.map((tap) => (
              <span
                key={tap.id}
                className={`font-orbitron pointer-events-none absolute z-[3] animate-fade-out-up text-lg font-bold drop-shadow-[0_0_10px_rgba(0,255,255,0.85)] ${
                  tap.id % 2 === 0 ? "text-neon-cyan" : "text-neon-orange"
                }`}
                style={{
                  left: tap.x,
                  top: tap.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                +1
              </span>
            ))}
          </motion.button>
        </div>

        <motion.div className="mb-4">
          <motion.div className="mb-2 flex justify-between text-xs text-neon-cyan/60">
            <span>Energy</span>
            <span className="font-orbitron font-bold text-neon-orange">
              {energy}/{maxEnergy}
            </span>
          </motion.div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-background/60">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan"
              animate={{ width: `${energyPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-2 text-xs text-neon-cyan/50">+2 energy per second</p>
        </motion.div>

        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={handleDailyCheckIn}
            disabled={
              isCheckInPending || !isCorrectNetwork || !canDailyCheckIn
            }
            className="font-orbitron flex-1 rounded-xl border-2 border-neon-magenta bg-background px-4 py-3 text-sm font-semibold text-neon-cyan transition hover:bg-neon-magenta/10 hover:shadow-[0_0_24px_rgba(255,0,255,0.35)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:bg-background/40 disabled:text-neon-cyan/40"
          >
            {isCheckInPending ? "Transaction Pending..." : "Daily Check-in"}
          </button>
          <button
            type="button"
            onClick={() => setIsWheelOpen(true)}
            disabled={!isCorrectNetwork}
            className="font-orbitron flex-1 rounded-xl border-2 border-neon-orange bg-background px-4 py-3 text-sm font-bold tracking-wide text-neon-orange transition hover:bg-neon-orange/10 hover:shadow-[0_0_24px_rgba(255,69,0,0.4)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:bg-background/40 disabled:text-neon-cyan/40"
          >
            [ CYBER SPIN 3/DAY ]
          </button>
        </div>

        {!canDailyCheckIn && isCorrectNetwork && lastCheckInSec > BigInt(0) ? (
          <p className="mb-3 text-center text-xs text-neon-cyan/60">
            Следующий чекин через{" "}
            <span className="font-orbitron font-bold text-neon-orange">
              {formatCountdownSeconds(cooldownRemaining)}
            </span>
          </p>
        ) : (
          <div className="mb-3 h-4" aria-hidden />
        )}

        <ClaimTokensButton
          amount={BigInt(unclaimedBz)}
          disabled={!canClaim}
          supportsAtomicBatch={supportsAtomicBatch}
          highlight={unclaimedBz >= requiredTapsForClaim}
          onConfirmed={() => resetClicks()}
        />
      </motion.div>

      <AnimatePresence>
        {isWheelOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Node Fortune Radar"
            onClick={() => setIsWheelOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-md"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsWheelOpen(false)}
                className="font-orbitron absolute -right-1 -top-1 z-10 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-neon-magenta bg-background text-sm font-bold text-neon-cyan shadow-[0_0_16px_rgba(255,0,255,0.45)] transition hover:border-neon-cyan hover:text-neon-orange"
                aria-label="Close hack radar"
              >
                X
              </button>
              <CyberWheel
                className="mb-0"
                disabled={!isCorrectNetwork}
                onRefillEnergy={refillEnergy}
                onActivateTapMultiplier={activateTapMultiplier}
                onActivateStreakShield={activateStreakShield}
                onTriggerGlitch={triggerScreenGlitch}
                onSpinComplete={() => void refetchBalance()}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
