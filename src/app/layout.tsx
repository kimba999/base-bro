import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";

import { buildFcMiniAppEmbed, FARCASTER_APP_NAME } from "@/config/farcaster";
import { getConfig } from "@/config/wagmi";

import { ProvidersShell } from "./providers-loader";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL != null
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

/** Short line for meta + social cards (keep in sync with product copy). */
const BRO_TAGLINE =
  "Mine and claim $BRO on Base — streak check-ins, on-chain claims, Warpcast & MetaMask.";

const fcMiniAppEmbed = JSON.stringify(buildFcMiniAppEmbed(siteUrl));

/** Bump when replacing `public/logo.png` to bust browser/CDN caches for favicon & OG. */
const LOGO_ASSET_VERSION = "2";
const LOGO_PNG = `/logo.png?v=${LOGO_ASSET_VERSION}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BaseBro",
  description:
    "Daily checkins onchain BRO claims and the cyber wheel on Base",
  icons: {
    icon: [{ url: LOGO_PNG, type: "image/png", sizes: "1024x703" }],
    apple: [{ url: LOGO_PNG, type: "image/png", sizes: "1024x703" }],
    shortcut: LOGO_PNG,
  },
  openGraph: {
    title: FARCASTER_APP_NAME,
    description: BRO_TAGLINE,
    images: [
      {
        url: LOGO_PNG,
        width: 1024,
        height: 703,
        alt: FARCASTER_APP_NAME,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: FARCASTER_APP_NAME,
    description: BRO_TAGLINE,
    images: [LOGO_PNG],
  },
  other: {
    "fc:miniapp": fcMiniAppEmbed,
    "fc:frame": fcMiniAppEmbed,
    "base:app_id": "6a09fddf03f4aa23342c5e6f",
    "talentapp:project_verification":
      "cf408f8fbd0c396f3d3d98f008a86f29ec987cd19844bc88fb91694c6fc4ac3a4e06ead9b4911ffcdf5d2cdc8254a944e72b79778db8cd06a1a9391fc1e15dc4",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const initialState = cookieToInitialState(getConfig(), cookieHeader);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ProvidersShell initialState={initialState}>
          {children}
        </ProvidersShell>
      </body>
    </html>
  );
}
