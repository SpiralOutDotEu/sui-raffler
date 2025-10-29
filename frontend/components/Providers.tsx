"use client";

import {
  SuiClientProvider,
  WalletProvider as SuiWalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "@/lib/context/WalletContext";
import { TurnstileProvider } from "@/lib/context/TurnstileContext";
import Header from "./Header";
import TurnstileModal from "./TurnstileModal";

const queryClient = new QueryClient();

const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
};

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Debug: log if sitekey is missing
  if (process.env.NODE_ENV === "development" && !turnstileSiteKey) {
    console.warn(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set. Turnstile protection will not work."
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <SuiWalletProvider autoConnect>
          <TurnstileProvider>
            <WalletProvider>
              <Header />
              <main className="pt-16">{children}</main>
              {turnstileSiteKey && (
                <TurnstileModal sitekey={turnstileSiteKey} />
              )}
            </WalletProvider>
          </TurnstileProvider>
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
