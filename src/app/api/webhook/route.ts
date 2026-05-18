import { NextRequest, NextResponse } from "next/server";

import { handleFarcasterWebhook } from "@/lib/farcasterWebhook";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await handleFarcasterWebhook(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ success: true, event: result.event, fid: result.fid });
}

export function GET() {
  return NextResponse.json({
    ok: true,
    message: "BaseBro Farcaster webhook endpoint",
  });
}
