"use client";

import {
  SuiClientProvider,
  WalletProvider as SuiWalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "../context/WalletContext";
import Header from "./Header";

const queryClient = new QueryClient();

const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <SuiWalletProvider autoConnect>
          <WalletProvider>
            <Header />
            <main className="pt-16">{children}</main>
          </WalletProvider>
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
