"use client";

import { BroCoinButton } from "@/components/BroCoinButton";
import { ClaimTokensButton } from "@/components/ClaimTokensButton";
import { CoinStylePicker } from "@/components/CoinStylePicker";
import { CyberWheel } from "@/components/CyberWheel";
import { StreakVisual } from "@/components/StreakVisual";
import { BUILDER_DATA_SUFFIX } from "@/config/builderCode";
import {
  BRO_CHAIN,
  BRO_TOKEN_ABI,
  BRO_TOKEN_ADDRESS,
} from "@/config/contracts";
import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";
import { useClicker } from "@/hooks/useClicker";
import { useCoinButtonStyle } from "@/hooks/useCoinButtonStyle";
import { useVisibleConnectors } from "@/hooks/useVisibleConnectors";
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

const WALLET_USER_DISCONNECTED_KEY = "basebro_wallet_user_disconnected";

function connectorLabel(connectorId: string, name: string) {
  const id = connectorId.toLowerCase();
  if (id === "farcaster") return "Warpcast wallet";
  if (id === "baseaccount") return "Base Smart Wallet";
  if (id === "metamask" || id === "metamasksdk") return "MetaMask (browser)";
  if (id === "rabby") return "Rabby Wallet";
  if (id === "keplr") return "Keplr";
  return name;
}

const RECONNECT_UI_TIMEOUT_MS = 8_000;

export function ConnectWallet() {
  const { inMiniApp, user: farcasterUser } = useFarcasterMiniApp();
  const visibleConnectors = useVisibleConnectors();
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
  } = useConnection();
  const { supportsBatching } = useWalletCapabilities();
  const { styleId, setStyleId, soundEnabled, setSoundEnabled } =
    useCoinButtonStyle();
  const chainId = useChainId();
  const { connect, isPending: isConnectPending } = useConnect();
  const [pendingConnectorId, setPendingConnectorId] = useState<string | null>(
    null,
  );
  const [reconnectUiTimedOut, setReconnectUiTimedOut] = useState(false);
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
  const [isWheelOpen, setIsWheelOpen] = useState(false);

  const handleConnect = useCallback(
    (connector: (typeof visibleConnectors)[number]) => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(WALLET_USER_DISCONNECTED_KEY);
      }
      setPendingConnectorId(connector.id);
      connect(
        { connector },
        {
          onSettled: () => setPendingConnectorId(null),
        },
      );
    },
    [connect, visibleConnectors],
  );

  useEffect(() => {
    if (!isReconnecting) {
      setReconnectUiTimedOut(false);
      return;
    }
    const timer = window.setTimeout(
      () => setReconnectUiTimedOut(true),
      RECONNECT_UI_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isReconnecting]);

  const handleDisconnect = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(WALLET_USER_DISCONNECTED_KEY, "1");
    }
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    if (
      sessionStorage.getItem(WALLET_USER_DISCONNECTED_KEY) === "1" &&
      isConnected
    ) {
      disconnect();
    }
  }, [mounted, isConnected, disconnect]);

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
      dataSuffix: BUILDER_DATA_SUFFIX,
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

  const userInitiatedConnect = pendingConnectorId !== null;

  if (isReconnecting && !reconnectUiTimedOut) {
    return (
      <motion.div className="flex min-h-screen items-center justify-center bg-background p-6">
        <motion.div className="w-full max-w-md rounded-3xl border border-neon-magenta/50 bg-background/90 p-8 text-center shadow-[0_0_40px_rgba(255,0,255,0.25)]">
          <h1
            className="font-orbitron glitch-text mb-4 text-2xl font-bold tracking-wide sm:text-3xl"
            data-text="Base Bro Mining"
          >
            Base Bro Mining
          </h1>
          <p className="font-orbitron mb-2 text-xs font-medium uppercase tracking-wide text-neon-cyan/50">
            Reconnecting
          </p>
          <p className="text-sm text-neon-cyan/80">
            Restoring your session in Base App…
          </p>
          <motion.span
            className="mx-auto mt-6 block h-8 w-8 rounded-full border-2 border-neon-magenta/40 border-t-neon-orange"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
            aria-hidden
          />
        </motion.div>
      </motion.div>
    );
  }

  if (!isConnected || !address) {
    const statusLine = userInitiatedConnect
      ? "Opening wallet…"
      : isConnecting && !userInitiatedConnect
        ? "Restoring previous session…"
        : isDisconnected
          ? "Choose how to connect"
          : "Connect wallet to start mining BRO";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <motion.div className="w-full max-w-md rounded-3xl border border-neon-magenta/50 bg-background/90 p-6 shadow-[0_0_40px_rgba(255,0,255,0.25)]">
          <h1
            className="font-orbitron glitch-text mb-5 text-center text-2xl font-bold tracking-wide sm:text-3xl"
            data-text="Base Bro"
          >
            Base Bro
          </h1>
          {inMiniApp && farcasterUser ? (
            <p className="mb-3 text-center text-xs text-neon-cyan/70">
              Farcaster:{" "}
              <span className="font-orbitron text-neon-orange">
                @{farcasterUser.username ?? `fid:${farcasterUser.fid}`}
              </span>
              <span className="text-neon-cyan/50"> · fid {farcasterUser.fid}</span>
            </p>
          ) : null}
          <p className="font-orbitron mb-1 text-center text-xs font-medium uppercase tracking-wide text-neon-cyan/50">
            {userInitiatedConnect ? "Connecting" : "Choose wallet"}
          </p>
          <p className="mb-4 text-center text-sm text-neon-cyan/80">
            {inMiniApp
              ? "Warpcast wallet is recommended. Base Smart Wallet and MetaMask also work here."
              : statusLine}
          </p>
          <motion.div className="flex flex-col gap-3">
            {visibleConnectors.length === 0 ? (
              <p className="text-center text-sm text-neon-orange/90">
                No wallet available in this app. Open Base Bro in Warpcast or a
                mobile browser with Base / MetaMask.
              </p>
            ) : (
              visibleConnectors.map((connector) => {
              const isThisPending =
                pendingConnectorId === connector.id && isConnectPending;
              const isOtherPending =
                pendingConnectorId !== null &&
                pendingConnectorId !== connector.id;

              return (
              <button
                key={connector.uid}
                type="button"
                disabled={isThisPending || isOtherPending}
                onClick={() => handleConnect(connector)}
                className="font-orbitron w-full rounded-xl border-2 border-neon-magenta bg-background px-4 py-3 text-sm font-medium text-neon-cyan transition hover:bg-neon-magenta/10 hover:shadow-[0_0_24px_rgba(255,0,255,0.35)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:bg-background/40 disabled:text-neon-cyan/40"
              >
                {isThisPending
                  ? "Connecting…"
                  : `Connect with ${connectorLabel(connector.id, connector.name)}`}
              </button>
              );
            })
            )}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <main
      className={`flex min-h-[100dvh] items-start justify-center bg-background px-3 py-3 text-neon-cyan sm:items-center sm:px-4 sm:py-6 ${screenGlitch ? "screen-glitch" : ""}`}
    >
      <motion.div className="w-full max-w-xl rounded-2xl border border-neon-magenta/40 bg-background/80 px-4 py-4 shadow-[0_0_60px_rgba(255,0,255,0.2)] backdrop-blur sm:rounded-3xl sm:px-10 sm:py-9">
        <h1
          className="font-orbitron glitch-text mb-3 text-center text-xl font-bold tracking-wide sm:mb-6 sm:text-3xl"
          data-text="Base Bro Mining"
        >
          Base Bro Mining
        </h1>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-xs text-neon-cyan/80 sm:mb-4 sm:gap-2 sm:text-sm">
          <motion.div className="min-w-0">
            <span>{shortenAddress(address)}</span>
            {inMiniApp && farcasterUser ? (
              <p className="mt-0.5 truncate text-xs text-neon-cyan/55">
                @{farcasterUser.username ?? `fid:${farcasterUser.fid}`} · fid{" "}
                {farcasterUser.fid}
              </p>
            ) : null}
          </motion.div>
          <div className="flex flex-wrap items-center gap-2">
            {supportsBatching ? (
              <span className="rounded-full border border-neon-cyan/40 bg-background px-2 py-0.5 text-[11px] text-neon-cyan">
                EIP-5792 batch
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleDisconnect}
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

        <div className="font-orbitron mb-2 flex items-center justify-between gap-2 rounded-lg border border-neon-magenta/50 bg-background/80 px-2.5 py-1.5 text-[11px] text-neon-cyan sm:mb-4 sm:gap-3 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm">
          <p className="shrink-0 whitespace-nowrap">
            🔥 Streak:{" "}
            <span className="font-bold text-neon-orange">{streakLabel}</span>
          </p>
          <p
            className="min-w-0 truncate text-right"
            title={`${balanceExact} $BRO`}
          >
            💰 Total $BRO{" "}
            <span className="font-bold text-neon-orange">{balanceCompact}</span>
          </p>
        </div>

        <div className="mb-1.5 flex gap-2">
          <button
            type="button"
            onClick={handleDailyCheckIn}
            disabled={
              isCheckInPending || !isCorrectNetwork || !canDailyCheckIn
            }
            className="font-orbitron min-w-0 flex-1 rounded-lg border-2 border-neon-magenta bg-background px-2 py-2 text-[11px] font-semibold leading-tight text-neon-cyan transition hover:bg-neon-magenta/10 hover:shadow-[0_0_24px_rgba(255,0,255,0.35)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:bg-background/40 disabled:text-neon-cyan/40 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
          >
            {isCheckInPending ? (
              "Pending…"
            ) : (
              <>
                <span className="sm:hidden">Check-in</span>
                <span className="hidden sm:inline">Daily Check-in</span>
              </>
            )}
          </button>
          <ClaimTokensButton
            unclaimedWhole={unclaimedBz}
            disabled={!canClaim}
            supportsBatching={supportsBatching}
            highlight={unclaimedBz >= requiredTapsForClaim}
            className="min-w-0 flex-1 !rounded-lg !px-2 !py-2 !text-[11px] !leading-tight sm:!rounded-xl sm:!px-3 sm:!py-2.5 sm:!text-xs"
            onConfirmed={() => {
              resetClicks();
              void refetchBalance();
            }}
          />
        </div>

        {!canDailyCheckIn && isCorrectNetwork && lastCheckInSec > BigInt(0) ? (
          <p className="mb-2 text-center text-[10px] text-neon-cyan/60 sm:text-xs">
            Следующий чекин через{" "}
            <span className="font-orbitron font-bold text-neon-orange">
              {formatCountdownSeconds(cooldownRemaining)}
            </span>
          </p>
        ) : null}

        <CoinStylePicker
          styleId={styleId}
          soundEnabled={soundEnabled}
          onStyleChange={setStyleId}
          onSoundChange={setSoundEnabled}
        />

        <div className="relative mb-3 sm:mb-6">
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
          <BroCoinButton
            styleId={styleId}
            interactive={coinInteractive}
            energyPercent={energyPercent}
            tapsTowardClaim={tapsTowardClaim}
            requiredTapsForClaim={requiredTapsForClaim}
            soundEnabled={soundEnabled}
            floatingTexts={floatingTexts}
            onTap={handleCoinTap}
          />
        </div>

        <motion.div className="mb-2 sm:mb-4">
          <motion.div className="mb-1 flex justify-between text-[10px] text-neon-cyan/60 sm:mb-2 sm:text-xs">
            <span>Energy</span>
            <span className="font-orbitron font-bold text-neon-orange">
              {energy}/{maxEnergy}
            </span>
          </motion.div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background/60 sm:h-3">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan"
              animate={{ width: `${energyPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-1 text-[10px] text-neon-cyan/50 sm:mt-2 sm:text-xs">
            +2 energy per second
          </p>
        </motion.div>

        <StreakVisual currentStreak={streakBig} />

        <div className="mb-1 flex flex-wrap justify-center gap-1.5 sm:mb-2 sm:gap-2">
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

        <p className="font-orbitron mb-1.5 text-center text-sm font-bold text-neon-orange sm:mb-3 sm:text-lg">
          Unclaimed $BRO: {unclaimedBz}
        </p>

        <motion.div className="mb-2 sm:mb-4">
          <motion.div className="mb-1 flex justify-between text-[10px] text-neon-cyan/60 sm:mb-2 sm:text-xs">
            <span>Taps to claim</span>
            <span className="font-orbitron font-bold text-neon-orange">
              {tapsTowardClaim}/{requiredTapsForClaim}
            </span>
          </motion.div>
          <motion.div className="h-2 w-full overflow-hidden rounded-full bg-background/60 sm:h-3">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan"
              animate={{ width: `${claimTapProgressPercent}%` }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        </motion.div>

        <button
          type="button"
          onClick={() => setIsWheelOpen(true)}
          disabled={!isCorrectNetwork}
          className="font-orbitron w-full rounded-lg border-2 border-neon-orange bg-background px-3 py-2 text-xs font-bold tracking-wide text-neon-orange transition hover:bg-neon-orange/10 hover:shadow-[0_0_24px_rgba(255,69,0,0.4)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:bg-background/40 disabled:text-neon-cyan/40 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
        >
          [ CYBER SPIN 3/DAY ]
        </button>
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
