import { NextRequest, NextResponse } from "next/server";

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_URL != null
    ? `https://${process.env.VERCEL_URL}`
    : "https://base-bro.vercel.app");

const DEFAULT_SHARE_TEXT =
  "Just claimed my daily $BRO inside @basebro app on Base! 🚀 Build your streak and spin the wheel here:";

const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, max-age=60",
};

export type CastShareResponse = {
  text: string;
  embedUrl: string;
};

function mergeParams(
  fromUrl: URLSearchParams,
  fromBody: Record<string, unknown> | null,
): URLSearchParams {
  const merged = new URLSearchParams(fromUrl);
  if (!fromBody) return merged;

  for (const key of ["streak", "bro", "claimed", "format"] as const) {
    const value = fromBody[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      merged.set(key, String(value));
    }
  }
  return merged;
}

function isInboundCastShare(params: URLSearchParams): boolean {
  return (
    params.has("castHash") ||
    params.has("hash") ||
    params.has("castFid") ||
    params.has("viewerFid")
  );
}

function buildSharePayload(params: URLSearchParams): CastShareResponse {
  const streakRaw = params.get("streak");
  const broRaw = params.get("bro") ?? params.get("claimed");

  let text = DEFAULT_SHARE_TEXT;

  const streak = streakRaw ? Number(streakRaw) : NaN;
  if (Number.isFinite(streak) && streak > 0) {
    text = `🔥 ${Math.floor(streak)}-day streak! Just claimed my daily $BRO in @basebro on Base. Build yours and spin the wheel:`;
  }

  const bro = broRaw ? Number(broRaw) : NaN;
  if (Number.isFinite(bro) && bro > 0) {
    text += ` (${Math.floor(bro)} $BRO ready to claim!)`;
  }

  const embedParams = new URLSearchParams();
  if (streakRaw) embedParams.set("streak", streakRaw);
  if (broRaw) embedParams.set("bro", broRaw);
  embedParams.set("utm_source", "farcaster_share");

  const qs = embedParams.toString();
  const embedUrl = qs ? `${APP_ORIGIN}?${qs}` : APP_ORIGIN;

  return { text, embedUrl };
}

function jsonShare(
  payload: CastShareResponse,
  init?: ResponseInit,
): NextResponse<CastShareResponse> {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

async function parseBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (request.method !== "POST") return null;
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    /* empty or non-JSON body — query string only */
  }
  return null;
}

async function handleShare(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const body = await parseBody(request);
  const params = mergeParams(url.searchParams, body);

  if (isInboundCastShare(params)) {
    const destination = new URL(APP_ORIGIN);
    for (const [key, value] of params.entries()) {
      destination.searchParams.set(key, value);
    }
    const hash = params.get("hash");
    if (hash && !params.has("castHash")) {
      destination.searchParams.set("castHash", hash);
    }
    return NextResponse.redirect(destination, 302);
  }

  return jsonShare(buildSharePayload(params));
}

export async function GET(request: NextRequest) {
  return handleShare(request);
}

export async function POST(request: NextRequest) {
  return handleShare(request);
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
