"use client";

import { motion } from "framer-motion";
import {
  type PointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";

import type { CoinButtonStyleId } from "@/config/coinButtonStyles";
import { playCoinTapSound, vibrateCoinTap } from "@/lib/coinTapSound";

const NEON_CYAN = "#00FFFF";
const NEON_MAGENTA = "#FF00FF";
const NEON_ORANGE = "#FF4500";

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

const COIN_SHADOW_PRESSED = [
  "0 0 0 2px rgba(255,0,255,0.45)",
  "0 0 0 4px rgba(0,0,0,0.28)",
  "inset 0 3px 12px rgba(0,255,255,0.08)",
  "inset 0 -14px 28px rgba(0,0,0,0.58)",
  "inset 0 0 0 1px rgba(0,0,0,0.28)",
  "0 10px 22px rgba(0,0,0,0.52)",
  "0 0 34px rgba(255,0,255,0.22)",
].join(", ");

type Particle = {
  id: number;
  x: number;
  y: number;
  hue: "cyan" | "orange";
  angle: number;
};

type BroCoinButtonProps = {
  styleId: CoinButtonStyleId;
  interactive: boolean;
  energyPercent: number;
  tapsTowardClaim: number;
  requiredTapsForClaim: number;
  soundEnabled: boolean;
  floatingTexts: readonly { id: number; x: number; y: number }[];
  onTap: (event: PointerEvent<HTMLButtonElement>) => void;
};

function shapeClass(styleId: CoinButtonStyleId): string {
  switch (styleId) {
    case "hexNode":
      return "coin-shape-hex";
    case "energyCapsule":
      return "h-44 w-28 sm:h-56 sm:w-36 rounded-[2.5rem]";
    default:
      return "h-40 w-40 sm:h-56 sm:w-56 rounded-full";
  }
}

function effectClass(styleId: CoinButtonStyleId, interactive: boolean): string {
  if (!interactive) return "";
  switch (styleId) {
    case "pulseCore":
      return "coin-fx-ripple";
    case "hexNode":
      return "";
    case "coinStack3d":
      return "coin-fx-idle-bounce coin-fx-3d";
    case "orbitalRing":
      return "coin-fx-breathe";
    case "glitchToken":
      return "coin-fx-glitch-pulse";
    case "energyCapsule":
      return "";
    default:
      return "";
  }
}

export function BroCoinButton({
  styleId,
  interactive,
  energyPercent,
  tapsTowardClaim,
  requiredTapsForClaim,
  soundEnabled,
  floatingTexts,
  onTap,
}: BroCoinButtonProps) {
  const [coinHover, setCoinHover] = useState(false);
  const [coinPressed, setCoinPressed] = useState(false);
  const [magnetic, setMagnetic] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  const almostFull =
    interactive &&
    tapsTowardClaim === requiredTapsForClaim - 1 &&
    requiredTapsForClaim > 1;

  const energyGlow =
    styleId === "energyCapsule"
      ? Math.max(0.25, energyPercent / 100)
      : 1;

  const coinShadow =
    coinPressed && interactive
      ? COIN_SHADOW_PRESSED
      : coinHover && interactive
        ? COIN_SHADOW_HOVER
        : COIN_SHADOW_REST;

  const spawnParticles = useCallback((x: number, y: number) => {
    const batch: Particle[] = Array.from({ length: 5 }, (_, i) => ({
      id: ++particleIdRef.current,
      x,
      y,
      hue: i % 2 === 0 ? "cyan" : "orange",
      angle: (i / 5) * Math.PI * 2 + Math.random() * 0.4,
    }));
    setParticles((prev) => [...prev, ...batch]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !batch.some((b) => b.id === p.id)));
    }, 520);
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!interactive) return;
      setCoinPressed(true);

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      spawnParticles(x, y);
      vibrateCoinTap();
      if (soundEnabled) playCoinTapSound();
      onTap(event);
    },
    [interactive, onTap, soundEnabled, spawnParticles],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!interactive || styleId !== "hexNode") return;
      const rect = event.currentTarget.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (event.clientX - rect.left - cx) / cx;
      const dy = (event.clientY - rect.top - cy) / cy;
      setMagnetic({ x: dx * 10, y: dy * 10 });
    },
    [interactive, styleId],
  );

  const resetMagnetic = useCallback(() => {
    setMagnetic({ x: 0, y: 0 });
  }, []);

  const ctaLabel = almostFull
    ? "1 MORE TAP!"
    : interactive
      ? "TAP TO MINE"
      : "NO ENERGY";

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex min-h-[10.5rem] items-center justify-center sm:min-h-[15rem]">
        {styleId === "orbitalRing" && interactive ? (
          <>
            <span className="coin-orbit coin-orbit-a pointer-events-none absolute z-[5] h-44 w-44 sm:h-56 sm:w-56" aria-hidden />
            <span className="coin-orbit coin-orbit-b pointer-events-none absolute z-[5] h-52 w-52 sm:h-64 sm:w-64" aria-hidden />
          </>
        ) : null}

        <motion.button
          type="button"
          disabled={!interactive}
          onPointerEnter={() => interactive && setCoinHover(true)}
          onPointerLeave={() => {
            setCoinHover(false);
            setCoinPressed(false);
            resetMagnetic();
          }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={() => setCoinPressed(false)}
          onPointerCancel={() => {
            setCoinPressed(false);
            resetMagnetic();
          }}
          whileHover={
            interactive && styleId !== "coinStack3d" && styleId !== "hexNode"
              ? { scale: 1.02 }
              : undefined
          }
          whileTap={interactive && styleId !== "hexNode" ? { scale: 0.95 } : undefined}
          transition={{ type: "spring", stiffness: 480, damping: 28 }}
          className={[
            "relative z-10 cursor-pointer overflow-visible disabled:cursor-not-allowed disabled:opacity-40",
            shapeClass(styleId),
            effectClass(styleId, interactive),
            almostFull ? "coin-fx-almost-full" : "",
          ].join(" ")}
          style={{
            boxShadow:
              styleId === "energyCapsule" && interactive
                ? [
                    coinShadow,
                    `0 0 ${24 + energyPercent * 0.35}px rgba(255,69,0,${0.15 + energyGlow * 0.45})`,
                    `0 0 ${40 + energyPercent * 0.5}px rgba(0,255,255,${0.08 + energyGlow * 0.25})`,
                  ].join(", ")
                : coinShadow,
            transform:
              styleId === "hexNode" && interactive
                ? `translate(${magnetic.x}px, ${magnetic.y}px)`
                : undefined,
          }}
        >
          {styleId === "pulseCore" && interactive ? (
            <>
              <span className="coin-ripple coin-ripple-1 pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
              <span className="coin-ripple coin-ripple-2 pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
            </>
          ) : null}

          <div
            className="absolute inset-0 rounded-[inherit]"
            style={{
              background: `radial-gradient(circle at 28% 22%, ${NEON_CYAN} 0%, #00b8b8 14%, ${NEON_MAGENTA} 42%, #8b008b 72%, #05070d 100%)`,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background:
                "radial-gradient(circle at 26% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 22%, transparent 48%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background:
                "radial-gradient(circle at 78% 88%, rgba(0,0,0,0.22) 0%, transparent 42%)",
            }}
            aria-hidden
          />

          {styleId === "energyCapsule" && interactive ? (
            <div
              className="pointer-events-none absolute bottom-2 left-2 right-2 overflow-hidden rounded-full bg-background/50"
              aria-hidden
            >
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-neon-magenta to-neon-cyan transition-all duration-300"
                style={{ width: `${energyPercent}%` }}
              />
            </div>
          ) : null}

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
              className={[
                "font-orbitron relative text-2xl font-black tracking-[0.14em] sm:text-4xl sm:tracking-[0.16em]",
                styleId === "glitchToken" ? "glitch-text" : "",
              ].join(" ")}
              data-text={styleId === "glitchToken" ? "BRO" : undefined}
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

          {particles.map((p) => {
            const tx = Math.cos(p.angle) * 36;
            const ty = Math.sin(p.angle) * 36;
            return (
            <span
              key={p.id}
              className={`coin-particle pointer-events-none absolute z-[4] h-1.5 w-1.5 rounded-full ${
                p.hue === "cyan" ? "bg-neon-cyan" : "bg-neon-orange"
              }`}
              style={{
                left: p.x,
                top: p.y,
                ["--tx" as string]: `${tx}px`,
                ["--ty" as string]: `${ty}px`,
              }}
              aria-hidden
            />
            );
          })}

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

      <p
        className={[
          "font-orbitron -mt-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs",
          almostFull
            ? "animate-pulse text-neon-orange"
            : interactive
              ? "coin-cta-pulse text-neon-cyan/80"
              : "text-neon-cyan/35",
        ].join(" ")}
      >
        {ctaLabel}
      </p>
    </div>
  );
}
