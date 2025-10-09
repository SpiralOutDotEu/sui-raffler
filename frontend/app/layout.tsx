import "@mysten/dapp-kit/dist/index.css";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://suiraffler.xyz"
  ),
  title: {
    template: "Sui Raffler | %s",
    default: "Sui Raffler - Play to Earn Raffles on Sui Blockchain",
  },
  description:
    "Join the ultimate play-to-earn raffle experience on Sui blockchain! Win big prizes, earn rewards, and participate in transparent, fair raffles. Start playing and earning today!",
  keywords: [
    "play to earn",
    "gambling",
    "raffle",
    "lottery",
    "prize",
    "win money",
    "earn crypto",
    "Sui",
    "blockchain",
    "decentralized",
    "Web3",
    "NFT",
    "cryptocurrency",
    "defi",
    "gaming",
    "transparent",
    "smart contract",
    "casino",
    "betting",
    "jackpot",
  ],
  authors: [{ name: "Sui Raffler Team" }],
  creator: "Sui Raffler",
  publisher: "Sui Raffler",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_VERIFICATION,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://suiraffler.xyz",
    siteName: "Sui Raffler",
    title: "Sui Raffler - Play to Earn Raffles on Sui Blockchain",
    description:
      "Join the ultimate play-to-earn raffle experience on Sui blockchain! Win big prizes, earn rewards, and participate in transparent, fair raffles. Start playing and earning today!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sui Raffler - Play to Earn Raffles on Sui Blockchain",
        type: "image/png",
      },
      {
        url: "/SUI-Raffler_logo.png",
        width: 600,
        height: 600,
        alt: "Sui Raffler Logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sui_raffler",
    creator: "@sui_raffler",
    title: "Sui Raffler - Play to Earn Raffles on Sui Blockchain",
    description:
      "Join the ultimate play-to-earn raffle experience on Sui blockchain! Win big prizes, earn rewards, and participate in transparent, fair raffles. Start playing and earning today!",
    images: ["/og-image.png"],
  },
  other: {
    "msapplication-TileColor": "#6366f1",
    "msapplication-config": "/favicon/browserconfig.xml",
    "theme-color": "#6366f1",
    "color-scheme": "light dark",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Sui Raffler",
    "application-name": "Sui Raffler",
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon/favicon.ico",
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
  category: "gaming",
  classification: "Play-to-Earn Gaming Application",
  referrer: "origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data for Rich Snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Sui Raffler",
              description:
                "Play-to-earn raffle platform on Sui blockchain - Win big prizes and earn rewards!",
              url: "https://suiraffler.xyz",
              applicationCategory: "GameApplication",
              operatingSystem: "Web Browser",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free to play, earn rewards and win prizes",
              },
              author: {
                "@type": "Organization",
                name: "Sui Raffler",
                url: "https://suiraffler.xyz",
              },
              publisher: {
                "@type": "Organization",
                name: "Sui Raffler",
                url: "https://suiraffler.xyz",
              },
              screenshot: "/og-image.png",
              softwareVersion: "1.0.0",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "1250",
                bestRating: "5",
                worstRating: "1",
              },
              featureList: [
                "Play to Earn",
                "Transparent Raffles",
                "Instant Payouts",
                "Fair Gaming",
                "Crypto Rewards",
                "Multiple Prize Pools",
              ],
            }),
          }}
        />

        {/* Additional Meta Tags for Better SEO */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />

        {/* Social Media Meta Tags */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta
          property="og:image:alt"
          content="Sui Raffler - Play to Earn Raffles on Sui Blockchain"
        />

        {/* LinkedIn specific */}
        <meta
          property="og:image:secure_url"
          content="https://suiraffler.xyz/og-image.png"
        />

        {/* WhatsApp specific */}
        <meta
          property="og:image:url"
          content="https://suiraffler.xyz/og-image.png"
        />

        {/* Pinterest specific */}
        <meta name="pinterest-rich-pin" content="true" />

        {/* Discord specific */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Telegram specific */}
        <meta
          property="og:image"
          content="https://suiraffler.xyz/og-image.png"
        />

        {/* Additional Twitter Meta Tags */}
        <meta
          name="twitter:image:alt"
          content="Sui Raffler - Play to Earn Raffles on Sui Blockchain"
        />
        <meta name="twitter:app:name:iphone" content="Sui Raffler" />
        <meta name="twitter:app:name:ipad" content="Sui Raffler" />
        <meta name="twitter:app:name:googleplay" content="Sui Raffler" />

        {/* Security Headers */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Performance and Accessibility */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="format-detection" content="date=no" />
        <meta name="format-detection" content="address=no" />
        <meta name="format-detection" content="email=no" />

        {/* Gambling/Play-to-Earn Specific Meta Tags */}
        <meta name="gambling" content="raffle" />
        <meta name="game-type" content="play-to-earn" />
        <meta name="prize-pool" content="cryptocurrency" />
        <meta name="payout-type" content="instant" />
        <meta name="fairness" content="blockchain-verified" />
      </head>
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
        <Toaster
          position="top-center"
          gutter={20}
          toastOptions={{
            duration: 10000,
            style: {
              zIndex: 9999,
            },
          }}
        />
      </body>
    </html>
  );
}
