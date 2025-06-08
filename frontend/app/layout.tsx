import "@mysten/dapp-kit/dist/index.css";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/app/components/Providers";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SUI-Raffler",
  description: "Create and participate in raffles on the SUI blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
