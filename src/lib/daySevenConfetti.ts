/** Blue + gold bursts for completing the 7th streak day (client-only). */
export async function fireSeventhDayConfetti(): Promise<void> {
  const { default: confetti } = await import("canvas-confetti");
  const blues = ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#38bdf8"];
  const golds = ["#78350f", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fde047", "#fffbeb"];

  const fire = (opts: Parameters<typeof confetti>[0]) => {
    void confetti({ disableForReducedMotion: true, ...opts });
  };

  fire({
    particleCount: 240,
    spread: 82,
    origin: { y: 0.58 },
    startVelocity: 54,
    scalar: 1.4,
    ticks: 340,
    gravity: 1.02,
    colors: blues,
  });

  window.setTimeout(() => {
    fire({
      particleCount: 160,
      angle: 118,
      spread: 68,
      origin: { x: 0.06, y: 0.62 },
      startVelocity: 50,
      scalar: 1.2,
      colors: golds,
    });
  }, 140);

  window.setTimeout(() => {
    fire({
      particleCount: 160,
      angle: 62,
      spread: 68,
      origin: { x: 0.94, y: 0.62 },
      startVelocity: 50,
      scalar: 1.2,
      colors: [...blues, ...golds],
    });
  }, 260);

  window.setTimeout(() => {
    fire({
      particleCount: 200,
      spread: 360,
      origin: { x: 0.5, y: 0.48 },
      startVelocity: 42,
      scalar: 1.1,
      ticks: 300,
      gravity: 0.88,
      colors: golds,
    });
  }, 400);

  window.setTimeout(() => {
    fire({
      particleCount: 120,
      spread: 88,
      origin: { x: 0.5, y: 0.32 },
      startVelocity: 72,
      scalar: 1.25,
      decay: 0.9,
      colors: blues,
    });
  }, 520);
}
