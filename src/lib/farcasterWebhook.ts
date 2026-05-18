import {
  encodedJsonFarcasterSignatureSchema,
  serverEventSchema,
  type MiniAppServerEvent,
} from "@farcaster/miniapp-core";
import { decode, verify } from "@farcaster/jfs";

import {
  removeNotificationToken,
  saveNotificationToken,
} from "@/lib/notificationStore";

export type WebhookHandleResult =
  | { ok: true; event: MiniAppServerEvent["event"]; fid: number }
  | { ok: false; status: number; message: string };

export async function handleFarcasterWebhook(
  body: unknown,
): Promise<WebhookHandleResult> {
  const parsed = encodedJsonFarcasterSignatureSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, message: "Invalid JFS envelope" };
  }

  try {
    await verify({
      data: parsed.data,
      keyTypes: ["app_key"],
      strict: true,
    });
  } catch {
    return { ok: false, status: 401, message: "Invalid signature" };
  }

  const decoded = decode<MiniAppServerEvent>(parsed.data);
  const eventParsed = serverEventSchema.safeParse(decoded.payload);
  if (!eventParsed.success) {
    return { ok: false, status: 400, message: "Invalid event payload" };
  }

  const event = eventParsed.data;
  const fid = decoded.header.fid;

  switch (event.event) {
    case "miniapp_added":
      if (event.notificationDetails) {
        await saveNotificationToken(fid, event.notificationDetails);
      }
      break;
    case "notifications_enabled":
      await saveNotificationToken(fid, event.notificationDetails);
      break;
    case "miniapp_removed":
    case "notifications_disabled":
      await removeNotificationToken(fid);
      break;
    default:
      break;
  }

  return { ok: true, event: event.event, fid };
}
