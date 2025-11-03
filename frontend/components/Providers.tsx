"use client";

import {
  SuiClientProvider,
  WalletProvider as SuiWalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "@/lib/context/WalletContext";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { lightWalletTheme, darkWalletTheme } from "@/lib/themes/walletThemes";
import Header from "./Header";
import Footer from "./Footer";
import Script from "next/script";

const queryClient = new QueryClient();

const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} defaultNetwork="testnet">
          <SuiWalletProvider
            autoConnect
            theme={[
              {
                variables: lightWalletTheme,
              },
              {
                selector: ".dark",
                variables: darkWalletTheme,
              },
            ]}
          >
            <WalletProvider>
              <Script
                id="recaptcha-v3"
                src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
                strategy="afterInteractive"
              />
              <Header />
              <main
                className="transition-all duration-200"
                style={{
                  paddingTop: `calc(max(1.5rem, calc(var(--testnet-banner-height, 0px) + 0.25rem)) + 4rem)`,
                }}
              >
                {children}
              </main>
              <Footer />
            </WalletProvider>
          </SuiWalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
