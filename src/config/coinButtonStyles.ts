/** Tap coin visual style — each style is paired with one signature effect. */
export const COIN_BUTTON_STYLES = [
  {
    id: "pulseCore",
    label: "Pulse",
    shortLabel: "A",
    description: "Sonar rings",
    effect: "ripple",
  },
  {
    id: "hexNode",
    label: "Hex",
    shortLabel: "B",
    description: "Magnetic pull",
    effect: "magnetic",
  },
  {
    id: "coinStack3d",
    label: "3D",
    shortLabel: "C",
    description: "Idle bounce",
    effect: "idleBounce",
  },
  {
    id: "orbitalRing",
    label: "Orbit",
    shortLabel: "D",
    description: "Breathing glow",
    effect: "breathingGlow",
  },
  {
    id: "glitchToken",
    label: "Glitch",
    shortLabel: "E",
    description: "RGB split pulse",
    effect: "glitchPulse",
  },
  {
    id: "energyCapsule",
    label: "Capsule",
    shortLabel: "F",
    description: "Energy-linked glow",
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
