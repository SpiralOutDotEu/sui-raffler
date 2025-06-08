"use client";

import { createContext, useContext } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

// Create a custom hook for wallet state
function useWalletState() {
  const currentAccount = useCurrentAccount();
  return {
    isConnected: !!currentAccount?.address,
    address: currentAccount?.address,
  };
}

// Create the context with the custom hook
const WalletContext = createContext<ReturnType<typeof useWalletState>>({
  isConnected: false,
  address: undefined,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const walletState = useWalletState();

  return (
    <WalletContext.Provider value={walletState}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
