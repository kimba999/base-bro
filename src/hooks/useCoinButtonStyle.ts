"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  COIN_SOUND_STORAGE_KEY,
  COIN_STYLE_STORAGE_KEY,
  DEFAULT_COIN_STYLE,
  isCoinButtonStyleId,
  type CoinButtonStyleId,
} from "@/config/coinButtonStyles";

function readStyle(): CoinButtonStyleId {
  if (typeof window === "undefined") return DEFAULT_COIN_STYLE;
  const raw = window.localStorage.getItem(COIN_STYLE_STORAGE_KEY);
  return raw && isCoinButtonStyleId(raw) ? raw : DEFAULT_COIN_STYLE;
}

function readSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COIN_SOUND_STORAGE_KEY) === "1";
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === COIN_STYLE_STORAGE_KEY ||
      event.key === COIN_SOUND_STORAGE_KEY
    ) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("basebro-coin-prefs", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("basebro-coin-prefs", callback);
  };
}

function notifyPrefsChanged() {
  window.dispatchEvent(new Event("basebro-coin-prefs"));
}

export function useCoinButtonStyle() {
  const styleId = useSyncExternalStore(subscribe, readStyle, () => DEFAULT_COIN_STYLE);
  const soundEnabled = useSyncExternalStore(subscribe, readSoundEnabled, () => false);

  const setStyleId = useCallback((id: CoinButtonStyleId) => {
    window.localStorage.setItem(COIN_STYLE_STORAGE_KEY, id);
    notifyPrefsChanged();
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    window.localStorage.setItem(COIN_SOUND_STORAGE_KEY, enabled ? "1" : "0");
    notifyPrefsChanged();
  }, []);

  return { styleId, setStyleId, soundEnabled, setSoundEnabled };
}
