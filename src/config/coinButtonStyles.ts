/** Tap coin visual style — each style is paired with one signature effect. */
export const COIN_BUTTON_STYLES = [
  {
    id: "pulseCore",
    label: "Reactor",
    shortLabel: "A",
    description: "Sonar core",
    effect: "ripple",
  },
  {
    id: "hexNode",
    label: "Cipher",
    shortLabel: "B",
    description: "HUD hex node",
    effect: "magnetic",
  },
  {
    id: "coinStack3d",
    label: "Mint",
    shortLabel: "C",
    description: "Gold coin",
    effect: "idleBounce",
  },
  {
    id: "orbitalRing",
    label: "Nova",
    shortLabel: "D",
    description: "Orbital sphere",
    effect: "breathingGlow",
  },
  {
    id: "glitchToken",
    label: "Void",
    shortLabel: "E",
    description: "Glitch artifact",
    effect: "glitchPulse",
  },
  {
    id: "energyCapsule",
    label: "Flux",
    shortLabel: "F",
    description: "Energy pod",
    effect: "energyLinked",
  },
] as const;

export type CoinButtonStyleId = (typeof COIN_BUTTON_STYLES)[number]["id"];

export const DEFAULT_COIN_STYLE: CoinButtonStyleId = "pulseCore";

export const COIN_STYLE_STORAGE_KEY = "basebro_coin_style";
export const COIN_SOUND_STORAGE_KEY = "basebro_coin_sound";

export function isCoinButtonStyleId(value: string): value is CoinButtonStyleId {
  return COIN_BUTTON_STYLES.some((s) => s.id === value);
}
