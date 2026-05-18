import type { MiniAppNotificationDetails } from "@farcaster/miniapp-core";

export type StoredNotification = {
  fid: number;
  url: string;
  token: string;
  updatedAt: string;
};

/** In-process store (resets on cold start). Warpcast still gets HTTP 200 from webhook. */
const memory = new Map<number, StoredNotification>();

export async function saveNotificationToken(
  fid: number,
  details: MiniAppNotificationDetails,
): Promise<void> {
  memory.set(fid, {
    fid,
    url: details.url,
    token: details.token,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeNotificationToken(fid: number): Promise<void> {
  memory.delete(fid);
}

export async function getNotificationToken(
  fid: number,
): Promise<StoredNotification | null> {
  return memory.get(fid) ?? null;
}

export function listNotificationTokens(): StoredNotification[] {
  return [...memory.values()];
}
