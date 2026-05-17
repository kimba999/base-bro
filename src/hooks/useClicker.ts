"use client";

import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";

const MAX_ENERGY = 500;
const ENERGY_REGEN_PER_SEC = 2;
const CLICKS_STORAGE_KEY = "base-coin-clicks";

/** Minimum taps before the user can claim mined $BRO to wallet. */
export const REQUIRED_TAPS_FOR_CLAIM = 5;

const DEFAULT_BUFF_MS = 5 * 60 * 1000;

export function useClicker() {
  const [clicks, setClicks] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(CLICKS_STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [coinPressed, setCoinPressed] = useState(false);
  const [tapMultiplier, setTapMultiplier] = useState(1);
  const [tapMultiplierUntil, setTapMultiplierUntil] = useState(0);
  const [streakShieldUntil, setStreakShieldUntil] = useState(0);
  const [screenGlitch, setScreenGlitch] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(CLICKS_STORAGE_KEY, String(clicks));
  }, [clicks]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEnergy((prev) => Math.min(MAX_ENERGY, prev + ENERGY_REGEN_PER_SEC));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tapMultiplierUntil <= Date.now()) return;
    const id = window.setTimeout(() => {
      setTapMultiplier(1);
      setTapMultiplierUntil(0);
    }, tapMultiplierUntil - Date.now());
    return () => window.clearTimeout(id);
  }, [tapMultiplierUntil]);

  const activeTapMultiplier =
    tapMultiplierUntil > Date.now() ? tapMultiplier : 1;

  const streakShieldActive = streakShieldUntil > Date.now();

  const canClick = energy > 0;

  const energyPercent = useMemo(() => (energy / MAX_ENERGY) * 100, [energy]);

  const claimTapProgressPercent = useMemo(
    () =>
      (Math.min(clicks, REQUIRED_TAPS_FOR_CLAIM) / REQUIRED_TAPS_FOR_CLAIM) *
      100,
    [clicks],
  );

  const addUnclaimed = useCallback((amount: number) => {
    if (amount <= 0) return;
    setClicks((prev) => prev + amount);
  }, []);

  const spendUnclaimed = useCallback((amount: number) => {
    if (amount <= 0) return true;
    let ok = false;
    setClicks((prev) => {
      if (prev < amount) return prev;
      ok = true;
      return prev - amount;
    });
    return ok;
  }, []);

  const refillEnergy = useCallback(() => {
    setEnergy(MAX_ENERGY);
  }, []);

  const activateTapMultiplier = useCallback(
    (durationMs = DEFAULT_BUFF_MS) => {
      setTapMultiplier(2);
      setTapMultiplierUntil(Date.now() + durationMs);
    },
    [],
  );

  const activateStreakShield = useCallback((durationMs = DEFAULT_BUFF_MS) => {
    setStreakShieldUntil(Date.now() + durationMs);
  }, []);

  const triggerScreenGlitch = useCallback((durationMs = 2200) => {
    setScreenGlitch(true);
    window.setTimeout(() => setScreenGlitch(false), durationMs);
  }, []);

  const registerClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!canClick) return;

    const gain = activeTapMultiplier;
    setClicks((prev) => prev + gain);
    setEnergy((prev) => Math.max(0, prev - 1));
    setCoinPressed(true);

    window.setTimeout(() => {
      setCoinPressed(false);
    }, 120);
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
  };
}
