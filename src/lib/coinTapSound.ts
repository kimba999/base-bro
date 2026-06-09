let audioCtx: AudioContext | null = null;

/** Short tick via Web Audio — no asset file required. */
export function playCoinTapSound() {
  if (typeof window === "undefined") return;

  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    /* Ignore if audio blocked */
  }
}

export function vibrateCoinTap() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}
