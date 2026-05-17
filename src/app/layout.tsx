import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";

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
  "Mine and claim $BRO on Base — streak check-ins, on-chain claims, Base Smart Wallet & MetaMask.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Base Bro Mining",
  description: BRO_TAGLINE,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png", sizes: "256x256" },
    ],
    apple: "/logo.png",
  },
  openGraph: {
    title: "Base Bro Mining",
    description: BRO_TAGLINE,
    images: [
      {
        url: "/logo.png",
        width: 256,
        height: 256,
        alt: "Base Bro Mining",
        type: "image/png",
      },
    ],
  },
  other: {
    "base:app_id": "69861ce98dcaa0daf5755fcc",
    "talentapp:project_verification": "050ae6ae47c19734702b4db87c31051af3c4566685cc57f4ad72674477e369f74c4573e9e9e235e01654899a505aeb764575c4d26abff6ec8c1b39cf9f3ba0b3",
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
