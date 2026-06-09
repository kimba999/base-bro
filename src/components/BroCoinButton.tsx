"use client";

import { motion } from "framer-motion";
import {
  type PointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";

import {
  CoinStyleBackdrop,
  CoinStyleVisual,
  coinEffectClass,
  coinShellClass,
} from "@/components/CoinStyleVisual";
import type { CoinButtonStyleId } from "@/config/coinButtonStyles";
import { playCoinTapSound, vibrateCoinTap } from "@/lib/coinTapSound";

type Particle = {
  id: number;
  x: number;
  y: number;
  hue: "cyan" | "orange" | "magenta";
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
  const [magnetic, setMagnetic] = useState({ x: 0, y: 0, rotate: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  const almostFull =
    interactive &&
    tapsTowardClaim === requiredTapsForClaim - 1 &&
    requiredTapsForClaim > 1;

  const energyGlow = Math.max(0.2, energyPercent / 100);

  const spawnParticles = useCallback((x: number, y: number) => {
    const hues: Particle["hue"][] = ["cyan", "orange", "magenta"];
    const batch: Particle[] = Array.from({ length: 8 }, (_, i) => ({
      id: ++particleIdRef.current,
      x,
      y,
      hue: hues[i % hues.length]!,
      angle: (i / 8) * Math.PI * 2 + Math.random() * 0.5,
    }));
    setParticles((prev) => [...prev, ...batch]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !batch.some((b) => b.id === p.id)));
    }, 620);
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!interactive) return;
      setCoinPressed(true);

      const rect = event.currentTarget.getBoundingClientRect();
      spawnParticles(
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
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
      setMagnetic({
        x: dx * 12,
        y: dy * 12,
        rotate: dx * 4,
      });
    },
    [interactive, styleId],
  );

  const resetMagnetic = useCallback(() => {
    setMagnetic({ x: 0, y: 0, rotate: 0 });
  }, []);

  const ctaLabel = almostFull
    ? "1 MORE TAP!"
    : interactive
      ? "TAP TO MINE"
      : "NO ENERGY";

  const shellShadow =
    styleId === "energyCapsule" && interactive
      ? [
          "0 0 0 1px rgba(0,255,255,0.25)",
          `0 0 ${28 + energyPercent * 0.4}px rgba(255,69,0,${0.2 + energyGlow * 0.5})`,
          `0 0 ${48 + energyPercent * 0.55}px rgba(0,255,255,${0.12 + energyGlow * 0.35})`,
          coinPressed
            ? "0 8px 24px rgba(0,0,0,0.55)"
            : coinHover
              ? "0 18px 40px rgba(0,0,0,0.45)"
              : "0 14px 32px rgba(0,0,0,0.4)",
        ].join(", ")
      : undefined;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex min-h-[10.5rem] items-center justify-center sm:min-h-[15rem]">
        <CoinStyleBackdrop styleId={styleId} interactive={interactive} />

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
              ? { scale: 1.03 }
              : undefined
          }
          whileTap={interactive && styleId !== "hexNode" ? { scale: 0.94 } : undefined}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className={[
            coinShellClass(styleId),
            coinEffectClass(styleId, interactive),
            coinPressed ? "coin-state-pressed" : coinHover ? "coin-state-hover" : "",
            almostFull ? "coin-fx-almost-full" : "",
          ].join(" ")}
          style={{
            boxShadow: shellShadow,
            transform:
              styleId === "hexNode" && interactive
                ? `translate(${magnetic.x}px, ${magnetic.y}px) rotate(${magnetic.rotate}deg)`
                : undefined,
          }}
        >
          <CoinStyleVisual
            styleId={styleId}
            interactive={interactive}
            energyPercent={energyPercent}
          />

          {particles.map((p) => {
            const tx = Math.cos(p.angle) * 44;
            const ty = Math.sin(p.angle) * 44;
            const color =
              p.hue === "cyan"
                ? "bg-neon-cyan shadow-[0_0_8px_#00ffff]"
                : p.hue === "magenta"
                  ? "bg-neon-magenta shadow-[0_0_8px_#ff00ff]"
                  : "bg-neon-orange shadow-[0_0_8px_#ff4500]";
            return (
              <span
                key={p.id}
                className={`coin-particle pointer-events-none absolute z-[6] h-1 w-1 rounded-full ${color}`}
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
              className={`font-orbitron pointer-events-none absolute z-[5] animate-fade-out-up text-lg font-bold drop-shadow-[0_0_10px_rgba(0,255,255,0.85)] ${
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
          "font-orbitron -mt-1 text-center text-[10px] font-bold uppercase tracking-[0.22em] sm:text-xs",
          almostFull
            ? "animate-pulse text-neon-orange"
            : interactive
              ? "coin-cta-pulse text-neon-cyan/85"
              : "text-neon-cyan/35",
        ].join(" ")}
      >
        {ctaLabel}
      </p>
    </div>
  );
}
