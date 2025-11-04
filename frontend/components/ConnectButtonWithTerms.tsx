"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

interface ConnectButtonWithTermsProps {
  onConnectClick: () => void;
  className?: string;
  fullWidth?: boolean;
}

export function ConnectButtonWithTerms({
  onConnectClick,
  className = "",
  fullWidth = false,
}: ConnectButtonWithTermsProps) {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount?.address;

  if (isConnected) {
    return <ConnectButton />;
  }

  const baseClasses =
    "px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all";
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      onClick={onConnectClick}
      className={`${baseClasses} ${widthClass} ${className}`.trim()}
    >
      Connect
    </button>
  );
}
