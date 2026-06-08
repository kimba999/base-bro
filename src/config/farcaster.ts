/** Shared Farcaster Mini App branding (manifest + embed meta). */

export const FARCASTER_APP_NAME = "Base Bro";

export function buildFcMiniAppEmbed(siteUrl: string) {
  const origin = siteUrl.replace(/\/$/, "");
  const logo = `${origin}/logo.png`;
  const splash = `${origin}/splash.png`;
  const splashBg = "#05070d";
  return {
    version: "1",
    imageUrl: logo,
    button: {
      title: "Mine $BRO",
      action: {
        type: "launch_miniapp",
        name: FARCASTER_APP_NAME,
        url: origin,
        splashImageUrl: splash,
        splashBackgroundColor: splashBg,
      },
    },
  };
}
