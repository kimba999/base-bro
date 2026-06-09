"use client";

import {
  COIN_BUTTON_STYLES,
  type CoinButtonStyleId,
} from "@/config/coinButtonStyles";

type CoinStylePickerProps = {
  styleId: CoinButtonStyleId;
  soundEnabled: boolean;
  onStyleChange: (id: CoinButtonStyleId) => void;
  onSoundChange: (enabled: boolean) => void;
};

export function CoinStylePicker({
  styleId,
  soundEnabled,
  onStyleChange,
  onSoundChange,
}: CoinStylePickerProps) {
  return (
    <div className="mb-2 rounded-lg border border-neon-magenta/25 bg-background/60 px-2 py-2 sm:mb-3 sm:px-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="font-orbitron text-[10px] font-semibold uppercase tracking-wide text-neon-cyan/60 sm:text-xs">
          Coin style
        </p>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-neon-cyan/55 sm:text-xs">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => onSoundChange(e.target.checked)}
            className="accent-neon-magenta"
          />
          Sound
        </label>
      </div>
      <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
        {COIN_BUTTON_STYLES.map((style) => {
          const active = styleId === style.id;
          return (
            <button
              key={style.id}
              type="button"
              title={`${style.label} — ${style.description}`}
              onClick={() => onStyleChange(style.id)}
              className={[
                "font-orbitron rounded-md border px-0.5 py-1.5 text-[9px] leading-tight transition sm:py-2 sm:text-[10px]",
                active
                  ? "border-neon-magenta bg-neon-magenta/15 text-neon-cyan shadow-[0_0_12px_rgba(255,0,255,0.35)]"
                  : "border-neon-magenta/25 bg-background/80 text-neon-cyan/45 hover:border-neon-magenta/50 hover:text-neon-cyan/75",
              ].join(" ")}
            >
              <span className="block font-bold">{style.shortLabel}</span>
              <span className="mt-0.5 block truncate">{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
