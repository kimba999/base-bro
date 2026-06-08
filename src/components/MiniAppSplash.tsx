"use client";

/** Full-screen splash inside the mini app webview (Warpcast native splash is only 200×200). */
export function MiniAppSplash() {
  return (
    <div
      className="fixed inset-0 z-[10000] flex min-h-[100dvh] min-w-full items-center justify-center bg-[#05070d]"
      role="presentation"
      aria-hidden
    >
      <img
        src="/logo.png"
        alt=""
        className="h-full w-full object-cover object-center"
        fetchPriority="high"
      />
    </div>
  );
}
