import { NextResponse } from "next/server";

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL != null
    ? `https://${process.env.VERCEL_URL}`
    : "https://baza-mining-app.vercel.app");

const WARPCAST_COMPOSE = `https://warpcast.com/~/compose?text=${encodeURIComponent("I'm mining $BAZA on Base! Join me and build your streak:")}&embeds[]=${encodeURIComponent(APP_ORIGIN)}`;

export function GET() {
  return NextResponse.redirect(WARPCAST_COMPOSE, 302);
}
