import "@mysten/dapp-kit/dist/index.css";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/app/components/Providers";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "Sui Raffler  | %s",
    default: "Sui Raffler - Decentralized Raffle Platform",
  },
  description:
    "A decentralized raffle platform built on Sui blockchain. Create and participate in exciting raffles with transparent prize distribution.",
  openGraph: {
    title: "Sui Raffler - Decentralized Raffle Platform",
    description:
      "A decentralized raffle platform built on Sui blockchain. Create and participate in exciting raffles with transparent prize distribution.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sui Raffler",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sui Raffler - Decentralized Raffle Platform",
    description:
      "A decentralized raffle platform built on Sui blockchain. Create and participate in exciting raffles with transparent prize distribution.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Testnet Warning Banner */}
        <div className="fixed top-0 left-0 w-full bg-gradient-to-r from-indigo-100 via-purple-100 to-indigo-100 border-b border-indigo-200 text-indigo-700 text-center text-sm font-semibold py-1 px-2 shadow z-60">
          ⚠️ This is the <span className="font-bold">testnet</span> version.
          Everything might break or be reset at any time. ⚠️
        </div>
        <div className="pt-6">
          {/* Adjust pt-6 if banner height changes */}
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
