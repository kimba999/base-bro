"use client";

import { ClaimTokensButton } from "@/components/ClaimTokensButton";
import { StreakVisual } from "@/components/StreakVisual";
import {
  BAZA_CHAIN,
  BAZA_TOKEN_ABI,
  BAZA_TOKEN_ADDRESS,
} from "@/config/contracts";
import { useClicker } from "@/hooks/useClicker";
import { useWalletCapabilities } from "@/hooks/useWalletCapabilities";
import { formatBzCompact, formatBzExact } from "@/lib/bzFormat";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

/** Repeating tile for watermark behind the BAZA coin (white fill; layer uses opacity 0.05). */
const BAZA_WATERMARK_DATA_URI =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="104" height="72" viewBox="0 0 104 72">' +
      '<text x="6" y="22" fill="white" font-size="10" font-weight="700" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="0.14em">BAZA</text>' +
      '<text x="54" y="50" fill="white" font-size="10" font-weight="700" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="0.14em">BAZA</text>' +
      "</svg>",
  ) +
  '")';

const succeededTxHashes = new Set<string>();

/** Must match `BazaToken.MIN_CHECKIN_INTERVAL` after redeploy (24 hours). */
const CHECKIN_COOLDOWN_SEC = BigInt(86400);
/** Must match `STREAK_GRACE_PERIOD` in contract (48 hours). */
const STREAK_GRACE_SEC = BigInt(172800);

/** Base brand blue */
const BASE_BLUE = "#0052FF";

/** Outer rim: dark outline + bevel highlights + depth + drop + glow */
const COIN_SHADOW_REST = [
  "0 0 0 2px rgba(0,12,40,0.95)",
  "0 0 0 5px rgba(0,0,0,0.32)",
  "inset 0 7px 18px rgba(255,255,255,0.24)",
  "inset 0 -10px 22px rgba(0,0,0,0.44)",
  "inset 0 0 0 1px rgba(255,255,255,0.07)",
  "0 22px 44px rgba(0,0,0,0.42)",
  "0 0 50px rgba(0,82,255,0.45)",
].join(", ");

const COIN_SHADOW_HOVER = [
  "0 0 0 2px rgba(0,12,40,0.95)",
  "0 0 0 5px rgba(0,0,0,0.28)",
  "inset 0 8px 20px rgba(255,255,255,0.28)",
  "inset 0 -10px 22px rgba(0,0,0,0.4)",
  "inset 0 0 0 1px rgba(255,255,255,0.1)",
  "0 26px 52px rgba(0,0,0,0.38)",
  "0 0 68px rgba(0,82,255,0.72)",
  "0 0 24px rgba(120,170,255,0.35)",
].join(", ");

/** Pressed: stronger lower inset, weaker top highlight, tighter drop (inset look) */
const COIN_SHADOW_PRESSED = [
  "0 0 0 2px rgba(0,12,40,0.98)",
  "0 0 0 4px rgba(0,0,0,0.28)",
  "inset 0 3px 12px rgba(255,255,255,0.1)",
  "inset 0 -14px 28px rgba(0,0,0,0.58)",
  "inset 0 0 0 1px rgba(0,0,0,0.28)",
  "0 10px 22px rgba(0,0,0,0.52)",
  "0 0 34px rgba(0,82,255,0.28)",
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
    particles,
    registerClick,
    resetClicks,
  } = useClicker();
  const txActionRef = useRef<"checkin" | null>(null);
  const [nowSec, setNowSec] = useState(() =>
    Math.floor(Date.now() / 1000),
  );
  const [coinHover, setCoinHover] = useState(false);
  const [coinPressedLocal, setCoinPressedLocal] = useState(false);

  const isCorrectNetwork = chainId === BAZA_CHAIN.id;

  const { data: streakData, refetch: refetchStreak } = useReadContract({
    address: BAZA_TOKEN_ADDRESS,
    abi: BAZA_TOKEN_ABI,
    functionName: "currentStreak",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && isCorrectNetwork),
      refetchInterval: 5000,
    },
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: BAZA_TOKEN_ADDRESS,
    abi: BAZA_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && isCorrectNetwork),
      refetchInterval: 5000,
    },
  });

  const { data: lastCheckInData, refetch: refetchLastCheckIn } =
    useReadContract({
      address: BAZA_TOKEN_ADDRESS,
      abi: BAZA_TOKEN_ABI,
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
      address: BAZA_TOKEN_ADDRESS,
      abi: BAZA_TOKEN_ABI,
      functionName: "dailyCheckIn",
    });
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-4 text-sm">
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
          : "Connect wallet to start mining BAZA";

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-blue-500/10">
          <p className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            {status === "reconnecting"
              ? "Reconnecting"
              : status === "connecting"
                ? "Connecting"
                : "Disconnected"}
          </p>
          <p className="mb-4 text-center text-sm text-slate-300">{statusLine}</p>
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
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {isConnectPending || isConnecting
                  ? "Connecting…"
                  : `Connect with ${connectorLabel(connector.id, connector.name)}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-6 text-slate-100">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/80 px-8 py-8 shadow-[0_0_60px_rgba(59,130,246,0.15)] backdrop-blur sm:px-10 sm:py-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
          <span>{shortenAddress(address)}</span>
          <div className="flex flex-wrap items-center gap-2">
            {supportsAtomicBatch ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-200">
                EIP-5792 batch
              </span>
            ) : null}
            {supportsPaymasterService ? (
              <span className="rounded-full border border-violet-500/40 bg-violet-950/40 px-2 py-0.5 text-[11px] text-violet-200">
                Paymaster
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 transition hover:border-slate-500"
            >
              Disconnect
            </button>
          </div>
        </div>

        {!isCorrectNetwork ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId: BAZA_CHAIN.id })}
            disabled={isSwitchingChain}
            className="mb-4 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {isSwitchingChain ? "Switching..." : `Switch to ${BAZA_CHAIN.name}`}
          </button>
        ) : null}

        {streakBrokenUi ? (
          <div
            className="mb-4 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100"
            role="status"
          >
            Твой стрик обнулился, начни новый цикл!
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm">
          <p>🔥 Streak: {streakLabel}</p>
          <p
            className="max-w-[55%] justify-self-end text-right font-mono text-xs leading-snug sm:text-sm"
            title={`${balanceExact} $BAZA`}
          >
            <span className="block text-slate-400">💰 Total $BAZA</span>
            <span className="break-all text-slate-100">{balanceCompact}</span>
          </p>
        </div>

        <StreakVisual currentStreak={streakBig} />

        <p className="mb-3 text-center text-lg font-semibold text-blue-300">
          Unclaimed $BAZA: {unclaimedBz}
        </p>

        <motion.div className="mb-5">
          <motion.div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Taps to claim</span>
            <span>
              {tapsTowardClaim}/{requiredTapsForClaim}
            </span>
          </motion.div>
          <motion.div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-400"
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
              backgroundImage: BAZA_WATERMARK_DATA_URI,
              backgroundSize: "104px 72px",
              backgroundRepeat: "repeat",
            }}
            aria-hidden
          />
          <motion.button
            type="button"
            onClick={registerClick}
            disabled={!coinInteractive}
            onPointerEnter={() => coinInteractive && setCoinHover(true)}
            onPointerLeave={() => {
              setCoinHover(false);
              setCoinPressedLocal(false);
            }}
            onPointerDown={() =>
              coinInteractive && setCoinPressedLocal(true)
            }
            onPointerUp={() => setCoinPressedLocal(false)}
            onPointerCancel={() => setCoinPressedLocal(false)}
            whileHover={coinInteractive ? { scale: 1.02 } : undefined}
            whileTap={coinInteractive ? { scale: 0.95 } : undefined}
            transition={{ type: "spring", stiffness: 480, damping: 28 }}
            className="relative z-10 h-56 w-56 cursor-pointer overflow-hidden rounded-full disabled:cursor-not-allowed disabled:opacity-40"
            style={{ boxShadow: coinShadow }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle at 28% 22%, #7ab8ff 0%, #3d84ff 14%, ${BASE_BLUE} 42%, #0046df 72%, #001d66 100%)`,
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
                background: `radial-gradient(circle at 34% 30%, rgba(0,25,90,0.55) 0%, rgba(0,50,160,0.35) 28%, ${BASE_BLUE} 58%, #1a65ff 92%)`,
                boxShadow: [
                  "inset 0 5px 14px rgba(0,0,0,0.48)",
                  "inset 0 -4px 12px rgba(255,255,255,0.1)",
                  "inset 0 0 0 1px rgba(0,0,0,0.28)",
                  "0 1px 0 rgba(255,255,255,0.12)",
                ].join(", "),
              }}
            >
              <span
                className="relative text-3xl font-black tracking-[0.14em] sm:text-4xl sm:tracking-[0.16em]"
                style={{
                  color: "rgba(232,240,255,0.96)",
                  textShadow: [
                    "0 1px 0 rgba(255,255,255,0.35)",
                    "0 -1px 1px rgba(0,0,0,0.55)",
                    "0 2px 4px rgba(0,0,0,0.45)",
                    "0 0 12px rgba(0,40,120,0.35)",
                  ].join(", "),
                }}
              >
                BAZA
              </span>
            </div>

            <AnimatePresence>
              {particles.map((particle) => (
                <motion.span
                  key={particle.id}
                  initial={{
                    opacity: 1,
                    x: particle.x - 12,
                    y: particle.y - 12,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 0,
                    x: particle.x + particle.dx,
                    y: particle.y + particle.dy,
                    scale: 1.15,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: "easeOut" }}
                  className="pointer-events-none absolute z-[3] text-lg font-bold text-blue-100"
                >
                  +1
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Energy</span>
            <span>
              {energy}/{maxEnergy}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
              animate={{ width: `${energyPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">+2 energy per second</p>
        </div>

        <button
          type="button"
          onClick={handleDailyCheckIn}
          disabled={
            isCheckInPending || !isCorrectNetwork || !canDailyCheckIn
          }
          className="mb-2 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isCheckInPending ? "Transaction Pending..." : "Daily Check-in"}
        </button>

        {!canDailyCheckIn && isCorrectNetwork && lastCheckInSec > BigInt(0) ? (
          <p className="mb-3 text-center text-xs text-slate-400">
            Следующий чекин через{" "}
            <span className="font-mono text-slate-200">
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
      </div>
    </main>
  );
}
