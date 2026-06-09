import type { CoinButtonStyleId } from "@/config/coinButtonStyles";

type CoinStyleVisualProps = {
  styleId: CoinButtonStyleId;
  interactive: boolean;
  energyPercent: number;
};

function BroMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-orbitron relative z-[2] text-2xl font-black tracking-[0.18em] sm:text-4xl ${className}`}
    >
      BRO
    </span>
  );
}

export function CoinStyleBackdrop({
  styleId,
  interactive,
}: Pick<CoinStyleVisualProps, "styleId" | "interactive">) {
  if (styleId === "orbitalRing" && interactive) {
    return (
      <div className="coin-backdrop-nova pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <span className="coin-nova-orbit coin-nova-orbit-1" />
        <span className="coin-nova-orbit coin-nova-orbit-2" />
        <span className="coin-nova-orbit coin-nova-orbit-3" />
        <span className="coin-nova-dot coin-nova-dot-1" />
        <span className="coin-nova-dot coin-nova-dot-2" />
      </div>
    );
  }

  if (styleId === "pulseCore" && interactive) {
    return (
      <div className="coin-backdrop-reactor pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <span className="coin-reactor-ring coin-reactor-ring-1" />
        <span className="coin-reactor-ring coin-reactor-ring-2" />
        <span className="coin-reactor-ring coin-reactor-ring-3" />
      </div>
    );
  }

  return null;
}

export function CoinStyleVisual({
  styleId,
  interactive,
  energyPercent,
}: CoinStyleVisualProps) {
  switch (styleId) {
    case "pulseCore":
      return (
        <>
          <div className="coin-layer coin-reactor-body absolute inset-0 rounded-[inherit]" aria-hidden />
          <div className="coin-layer coin-reactor-core absolute inset-[18%] rounded-full" aria-hidden />
          {interactive ? (
            <>
              <span className="coin-ripple coin-ripple-1 pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
              <span className="coin-ripple coin-ripple-2 pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
            </>
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            <BroMark className="coin-text-reactor" />
          </div>
        </>
      );

    case "hexNode":
      return (
        <>
          <div className="coin-layer coin-cipher-frame absolute inset-0" aria-hidden />
          <div className="coin-layer coin-cipher-grid absolute inset-[12%]" aria-hidden />
          <span className="coin-cipher-br coin-cipher-br-tl" aria-hidden />
          <span className="coin-cipher-br coin-cipher-br-tr" aria-hidden />
          <span className="coin-cipher-br coin-cipher-br-bl" aria-hidden />
          <span className="coin-cipher-br coin-cipher-br-br" aria-hidden />
          <div className="coin-layer coin-cipher-glass absolute inset-[22%]" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center">
            <BroMark className="coin-text-cipher" />
          </div>
        </>
      );

    case "coinStack3d":
      return (
        <>
          <div className="coin-layer coin-mint-rim absolute inset-0 rounded-[inherit]" aria-hidden />
          <div className="coin-layer coin-mint-face absolute inset-[6%] rounded-[inherit]" aria-hidden />
          <div className="coin-layer coin-mint-shine absolute inset-[6%] rounded-[inherit]" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center">
            <BroMark className="coin-text-mint" />
          </div>
        </>
      );

    case "orbitalRing":
      return (
        <>
          <div className="coin-layer coin-nova-sphere absolute inset-[8%] rounded-full" aria-hidden />
          <div className="coin-layer coin-nova-atmosphere absolute inset-[8%] rounded-full" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center">
            <BroMark className="coin-text-nova" />
          </div>
        </>
      );

    case "glitchToken":
      return (
        <>
          <div className="coin-layer coin-void-base absolute inset-0 rounded-[inherit]" aria-hidden />
          <div className="coin-layer coin-void-scanlines absolute inset-0 rounded-[inherit]" aria-hidden />
          <div className="coin-layer coin-void-chroma absolute inset-0 rounded-[inherit]" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center">
            <BroMark className="coin-text-void glitch-text" data-text="BRO" />
          </div>
        </>
      );

    case "energyCapsule":
      return (
        <>
          <div className="coin-layer coin-flux-shell absolute inset-0 rounded-[inherit]" aria-hidden />
          <div
            className="coin-layer coin-flux-fill absolute bottom-[8%] left-[14%] right-[14%] rounded-b-[1.4rem] rounded-t-md transition-all duration-500"
            style={{ height: `${Math.max(12, energyPercent * 0.62)}%` }}
            aria-hidden
          />
          <div className="coin-layer coin-flux-glass absolute inset-0 rounded-[inherit]" aria-hidden />
          {interactive ? (
            <>
              <span className="coin-flux-bubble coin-flux-bubble-1" aria-hidden />
              <span className="coin-flux-bubble coin-flux-bubble-2" aria-hidden />
            </>
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            <BroMark className="coin-text-flux" />
          </div>
        </>
      );

    default:
      return null;
  }
}

export function coinShellClass(styleId: CoinButtonStyleId): string {
  const base = "coin-shell relative isolate overflow-hidden";
  switch (styleId) {
    case "hexNode":
      return `${base} coin-shell-cipher h-40 w-40 sm:h-56 sm:w-56`;
    case "energyCapsule":
      return `${base} coin-shell-flux h-44 w-[7.25rem] sm:h-56 sm:w-36`;
    default:
      return `${base} coin-shell-round h-40 w-40 rounded-full sm:h-56 sm:w-56`;
  }
}

export function coinEffectClass(
  styleId: CoinButtonStyleId,
  interactive: boolean,
): string {
  if (!interactive) return "coin-state-idle";
  switch (styleId) {
    case "pulseCore":
      return "coin-fx-ripple coin-theme-reactor";
    case "hexNode":
      return "coin-theme-cipher";
    case "coinStack3d":
      return "coin-fx-idle-bounce coin-fx-3d coin-theme-mint";
    case "orbitalRing":
      return "coin-fx-breathe coin-theme-nova";
    case "glitchToken":
      return "coin-fx-glitch-pulse coin-theme-void";
    case "energyCapsule":
      return "coin-theme-flux";
    default:
      return "";
  }
}
