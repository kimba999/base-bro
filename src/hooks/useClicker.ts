"use client";

import { MouseEvent, useEffect, useMemo, useState } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
};

const MAX_ENERGY = 500;
const ENERGY_REGEN_PER_SEC = 2;
const CLICKS_STORAGE_KEY = "base-coin-clicks";

/** Minimum taps before the user can claim mined $BAZA to wallet. */
export const REQUIRED_TAPS_FOR_CLAIM = 5;

export function useClicker() {
  const [clicks, setClicks] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(CLICKS_STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [coinPressed, setCoinPressed] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    window.localStorage.setItem(CLICKS_STORAGE_KEY, String(clicks));
  }, [clicks]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEnergy((prev) => Math.min(MAX_ENERGY, prev + ENERGY_REGEN_PER_SEC));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const canClick = energy > 0;

  const energyPercent = useMemo(() => (energy / MAX_ENERGY) * 100, [energy]);

  const claimTapProgressPercent = useMemo(
    () =>
      (Math.min(clicks, REQUIRED_TAPS_FOR_CLAIM) / REQUIRED_TAPS_FOR_CLAIM) *
      100,
    [clicks],
  );

  const registerClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!canClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setClicks((prev) => prev + 1);
    setEnergy((prev) => Math.max(0, prev - 1));
    setCoinPressed(true);

    setParticles((prev) => [
      ...prev,
      {
        id,
        x,
        y,
        dx: (Math.random() - 0.5) * 70,
        dy: -70 - Math.random() * 40,
      },
    ]);

    window.setTimeout(() => {
      setCoinPressed(false);
    }, 120);

    window.setTimeout(() => {
      setParticles((prev) => prev.filter((particle) => particle.id !== id));
    }, 850);
  };

  const resetClicks = () => setClicks(0);

  return {
    clicks,
    energy,
    maxEnergy: MAX_ENERGY,
    energyPercent,
    claimTapProgressPercent,
    requiredTapsForClaim: REQUIRED_TAPS_FOR_CLAIM,
    canClick,
    coinPressed,
    particles,
    registerClick,
    resetClicks,
  };
}
