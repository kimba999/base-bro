"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import {
  useConfig,
  useConnection,
  useReadContract,
  useSendCalls,
  useWriteContract,
} from "wagmi";

import { useWalletCapabilities } from "@/hooks/useWalletCapabilities";
import { executeContractWrite } from "@/lib/eip5792ContractWrite";

import { BRO_TOKEN_ABI, BRO_TOKEN_ADDRESS } from "@/config/contracts";
import {
  outcomeTypeToSectorId,
  parseWheelSpinLogs,
  type WheelOutcomeType,
} from "@/lib/wheelSpin";

const SECTOR_COUNT = 8;
const SECTOR_ANGLE = 360 / SECTOR_COUNT;

type PrizeKind =
  | "bro5"
  | "bro20"
  | "bro100"
  | "jackpot"
  | "energy"
  | "shield"
  | "multiplier"
  | "glitch";

type Sector = {
  id: number;
  label: string;
  shortLabel: string;
  kind: PrizeKind;
  color: string;
  epic?: boolean;
};

const SECTORS: Sector[] = [
  {
    id: 0,
    label: "+5 $BRO",
    shortLabel: "+5",
    kind: "bro5",
    color: "#00ffff",
  },
  {
    id: 1,
    label: "+20 $BRO",
    shortLabel: "+20",
    kind: "bro20",
    color: "#00e5ff",
  },
  {
    id: 2,
    label: "+100 $BRO",
    shortLabel: "+100",
    kind: "bro100",
    color: "#7df9ff",
  },
  {
    id: 3,
    label: "JACKPOT",
    shortLabel: "500",
    kind: "jackpot",
    color: "#ff4500",
    epic: true,
  },
  {
    id: 4,
    label: "FULL ENERGY",
    shortLabel: "NRG",
    kind: "energy",
    color: "#ff00ff",
  },
  {
    id: 5,
    label: "STREAK SHIELD",
    shortLabel: "SHLD",
    kind: "shield",
    color: "#c77dff",
  },
  {
    id: 6,
    label: "TAP x2",
    shortLabel: "x2",
    kind: "multiplier",
    color: "#ff6ec7",
  },
  {
    id: 7,
    label: "SYS ERROR",
    shortLabel: "ERR",
    kind: "glitch",
    color: "#ff0040",
  },
];

function rotationForSectorIndex(index: number, currentRotation: number) {
  const extraSpins = 5 + Math.floor(Math.random() * 3);
  const centerOffset = index * SECTOR_ANGLE + SECTOR_ANGLE / 2;
  const target = extraSpins * 360 + (360 - centerOffset);
  const base = currentRotation % 360;
  return currentRotation + target - base + (Math.random() * 8 - 4);
}

function broLabelFromWei(wei: bigint): string {
  return (wei / BigInt(10) ** BigInt(18)).toString();
}

type CyberWheelProps = {
  disabled?: boolean;
  className?: string;
  onRefillEnergy: () => void;
  onActivateTapMultiplier: () => void;
  onActivateStreakShield: () => void;
  onTriggerGlitch: () => void;
  onSpinComplete?: () => void;
};

type ModalState = {
  title: string;
  message: string;
  epic?: boolean;
};

export function CyberWheel({
  disabled = false,
  className = "",
  onRefillEnergy,
  onActivateTapMultiplier,
  onActivateStreakShield,
  onTriggerGlitch,
  onSpinComplete,
}: CyberWheelProps) {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { address, status } = useConnection();
  const { supportsBatching } = useWalletCapabilities();
  const { sendCallsAsync, isPending: isSendCallsPending } = useSendCalls();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [waitingChain, setWaitingChain] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const rotationRef = useRef(0);

  const readsEnabled =
    Boolean(address) && status === "connected" && !disabled;

  const { data: maxSpinsData } = useReadContract({
    address: BRO_TOKEN_ADDRESS,
    abi: BRO_TOKEN_ABI,
    functionName: "MAX_DAILY_SPINS",
    query: { enabled: readsEnabled },
  });

  const { data: spinsUsedData, refetch: refetchSpins } = useReadContract({
    address: BRO_TOKEN_ADDRESS,
    abi: BRO_TOKEN_ABI,
    functionName: "effectiveDailySpinCount",
    args: address ? [address] : undefined,
    query: {
      enabled: readsEnabled,
      refetchInterval: 8000,
    },
  });

  const maxSpins =
    typeof maxSpinsData === "bigint" ? Number(maxSpinsData) : 3;
  const spinsUsed =
    typeof spinsUsedData === "bigint" ? Number(spinsUsedData) : 0;
  const spinsLeft = Math.max(0, maxSpins - spinsUsed);

  const isWaitingBlockchain =
    waitingChain || isWritePending || isSendCallsPending;
  const canHack =
    !disabled &&
    !spinning &&
    !isWaitingBlockchain &&
    status === "connected" &&
    Boolean(address) &&
    spinsLeft > 0;

  const applyOutcome = useCallback(
    (outcomeType: WheelOutcomeType, broAmountWei: bigint) => {
      const sector = SECTORS[outcomeTypeToSectorId(outcomeType)] ?? SECTORS[0];

      switch (outcomeType) {
        case 0:
        case 1:
        case 2:
        case 3:
          setModal({
            title: sector.epic ? "◆ JACKPOT BREACH ◆" : "NODE REWARD",
            message: `+${broLabelFromWei(broAmountWei)} $BRO minted to your wallet on-chain.`,
            epic: sector.epic,
          });
          break;
        case 4:
          onRefillEnergy();
          setModal({
            title: "POWER SURGE",
            message: "Energy restored to 500/500.",
          });
          break;
        case 5:
          onActivateStreakShield();
          setModal({
            title: "STREAK SHIELD ONLINE",
            message: "Streak protection active for 5 minutes.",
          });
          break;
        case 6:
          onActivateTapMultiplier();
          setModal({
            title: "TAP MULTIPLIER x2",
            message: "Mining taps grant +2 $BRO for 5 minutes.",
          });
          break;
        case 7:
          onTriggerGlitch();
          setModal({
            title: "SYSTEM ERROR",
            message: "Node corrupted. No on-chain $BRO — screen glitch engaged.",
          });
          break;
        default:
          break;
      }
    },
    [
      onActivateStreakShield,
      onActivateTapMultiplier,
      onRefillEnergy,
      onTriggerGlitch,
    ],
  );

  const runWheelAnimation = useCallback(
    (outcomeType: WheelOutcomeType, broAmountWei: bigint) => {
      const sectorIndex = outcomeTypeToSectorId(outcomeType);
      const nextRotation = rotationForSectorIndex(
        sectorIndex,
        rotationRef.current,
      );
      rotationRef.current = nextRotation;
      setRotation(nextRotation);
      setSpinning(true);

      window.setTimeout(() => {
        setSpinning(false);
        applyOutcome(outcomeType, broAmountWei);
      }, 5200);
    },
    [applyOutcome],
  );

  const handleHack = useCallback(async () => {
    if (!canHack || !address) return;

    setSpinError(null);
    setWaitingChain(true);

    try {
      const { logs } = await executeContractWrite({
        config,
        supportsBatching,
        sendCallsAsync: sendCallsAsync as Parameters<
          typeof executeContractWrite
        >[0]["sendCallsAsync"],
        writeContractAsync: writeContractAsync as Parameters<
          typeof executeContractWrite
        >[0]["writeContractAsync"],
        call: {
          address: BRO_TOKEN_ADDRESS,
          abi: BRO_TOKEN_ABI,
          functionName: "spinWheel",
        },
      });

      const parsed = parseWheelSpinLogs([...logs], BRO_TOKEN_ADDRESS);

      if (!parsed) {
        setSpinError("Spin confirmed but prize event was not found in logs.");
        return;
      }

      await queryClient.invalidateQueries();
      await refetchSpins();
      onSpinComplete?.();
      runWheelAnimation(parsed.outcomeType, parsed.broAmountWei);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transaction failed or rejected.";
      setSpinError(message);
    } finally {
      setWaitingChain(false);
    }
  }, [
    address,
    canHack,
    config,
    onSpinComplete,
    queryClient,
    refetchSpins,
    runWheelAnimation,
    sendCallsAsync,
    supportsBatching,
    writeContractAsync,
  ]);

  const costLabel = `ON-CHAIN — ${spinsUsed}/${maxSpins} spins today (resets 24h after last spin)`;

  const conicGradient = SECTORS.map((s, i) => {
    const start = i * SECTOR_ANGLE;
    const end = (i + 1) * SECTOR_ANGLE;
    const fill =
      i % 2 === 0 ? "rgba(5,7,13,0.95)" : "rgba(255,0,255,0.12)";
    return `${fill} ${start}deg ${end}deg`;
  }).join(", ");

  let buttonLabel = "[ HACK THE NODE ]";
  if (isWaitingBlockchain) {
    buttonLabel = "[ WAITING FOR BLOCKCHAIN... ]";
  } else if (spinning) {
    buttonLabel = "BREACH IN PROGRESS…";
  } else if (spinsLeft <= 0) {
    buttonLabel = "DAILY LIMIT REACHED (3/3)";
  } else if (!address || status !== "connected") {
    buttonLabel = "CONNECT WALLET";
  }

  return (
    <section
      className={`font-orbitron mb-6 rounded-2xl border border-neon-magenta/40 bg-background/90 p-4 shadow-[0_0_32px_rgba(255,0,255,0.15)] sm:p-5 ${className}`}
    >
      <motion.div className="mb-3 flex items-center justify-between gap-2">
        <motion.div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-neon-cyan/60">
            System Hack
          </p>
          <h2 className="text-lg font-bold text-neon-magenta sm:text-xl">
            NODE FORTUNE RADAR
          </h2>
        </motion.div>
        <span className="rounded border border-neon-orange/50 px-2 py-1 text-[10px] text-neon-orange">
          {spinsLeft}/{maxSpins} LEFT
        </span>
      </motion.div>

      <motion.div className="relative mx-auto flex max-w-xs flex-col items-center">
        <motion.div
          className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2"
          aria-hidden
        >
          <div className="h-0 w-0 border-x-[10px] border-b-[16px] border-x-transparent border-b-neon-orange drop-shadow-[0_0_8px_rgba(255,69,0,0.9)]" />
        </motion.div>

        <motion.div
          className="relative h-56 w-56 rounded-full border-2 border-neon-magenta p-1 shadow-[0_0_40px_rgba(0,255,255,0.2),inset_0_0_24px_rgba(255,0,255,0.15)]"
          style={{
            background:
              "radial-gradient(circle, rgba(0,255,255,0.08) 0%, rgba(5,7,13,1) 65%)",
          }}
        >
          <motion.div
            className="absolute inset-2 rounded-full border border-neon-cyan/30"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 5.2s cubic-bezier(0.1, 0.8, 0.2, 1)"
                : "none",
              background: `conic-gradient(from -90deg, ${conicGradient})`,
            }}
          >
            {SECTORS.map((sector, i) => {
              const angle = i * SECTOR_ANGLE + SECTOR_ANGLE / 2 - 90;
              return (
                <span
                  key={sector.id}
                  className="absolute left-1/2 top-1/2 w-0 text-center text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    color: sector.color,
                    transform: `rotate(${angle}deg) translateY(-76px)`,
                    textShadow: `0 0 8px ${sector.color}`,
                  }}
                >
                  {sector.shortLabel}
                </span>
              );
            })}
          </motion.div>

          <motion.div
            className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-neon-cyan bg-background text-center text-[9px] font-bold leading-tight text-neon-cyan shadow-[0_0_20px_rgba(0,255,255,0.4)]"
            aria-hidden
          >
            SYS
            <br />
            HACK
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-neon-cyan/20"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
          />
        </motion.div>

        <p className="mt-4 text-center text-[11px] text-neon-cyan/70">{costLabel}</p>

        {spinError ? (
          <p className="mt-2 text-center text-[10px] text-red-400">{spinError}</p>
        ) : null}

        <button
          type="button"
          disabled={!canHack}
          onClick={() => void handleHack()}
          className="font-orbitron mt-3 w-full rounded-xl border-2 border-neon-orange bg-background px-4 py-3 text-sm font-bold tracking-wider text-neon-orange transition hover:bg-neon-orange/10 hover:shadow-[0_0_28px_rgba(255,69,0,0.45)] disabled:cursor-not-allowed disabled:border-neon-magenta/20 disabled:text-neon-cyan/30"
        >
          {buttonLabel}
        </button>
      </motion.div>

      <ul className="mt-4 grid grid-cols-2 gap-1 text-[10px] text-neon-cyan/55 sm:grid-cols-4">
        {SECTORS.map((s) => (
          <li key={s.id} className="truncate">
            <span style={{ color: s.color }}>▸</span> {s.label}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {modal ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
          >
            <motion.div
              role="alertdialog"
              aria-live="assertive"
              className={`font-orbitron w-full max-w-sm rounded-2xl border-2 bg-background p-6 text-center shadow-[0_0_48px_rgba(255,0,255,0.35)] ${
                modal.epic
                  ? "border-neon-orange shadow-[0_0_64px_rgba(255,69,0,0.55)]"
                  : "border-neon-magenta"
              }`}
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                className={`mb-2 text-xs uppercase tracking-[0.3em] ${
                  modal.epic ? "text-neon-orange" : "text-neon-cyan"
                }`}
              >
                {modal.epic ? "◆ LEGENDARY ◆" : "ACCESS GRANTED"}
              </p>
              <h3
                className={`mb-3 text-xl font-bold ${
                  modal.epic ? "glitch-text text-neon-orange" : "text-neon-magenta"
                }`}
                data-text={modal.title}
              >
                {modal.title}
              </h3>
              <p className="mb-5 text-sm text-neon-cyan/90">{modal.message}</p>
              <button
                type="button"
                className="w-full rounded-lg border border-neon-cyan px-4 py-2 text-sm font-semibold text-neon-cyan hover:bg-neon-cyan/10"
                onClick={() => setModal(null)}
              >
                ACKNOWLEDGE
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
