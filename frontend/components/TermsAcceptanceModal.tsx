"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { useTheme } from "@/lib/context/ThemeContext";

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsAcceptanceModal({
  isOpen,
  onClose,
}: TermsAcceptanceModalProps) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount?.address;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
      setHasAgreed(false);
    }
  }, [isConnected, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setHasAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/50 z-50 flex items-center justify-center p-4 transition-colors duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-[#2d3748] rounded-2xl max-w-lg w-full p-6 relative shadow-xl dark:shadow-black/30 border border-gray-200 dark:border-[#4a5568] transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          aria-label="Close"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-200">Agree to Terms</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-200">
          By continuing, you confirm that you have read and agree to the
          <Link
            href="/terms"
            onClick={onClose}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline ml-1 transition-colors duration-200"
          >
            Terms and Conditions
          </Link>
          .
        </p>

        <label className="flex items-start space-x-3 mb-6 cursor-pointer">
          <div className="relative mt-1">
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
              style={{
                backgroundColor: hasAgreed ? "#4f46e5" : isDark ? "#1a202c" : "white",
                border: "2px solid",
                borderColor: hasAgreed ? "#4f46e5" : isDark ? "#4a5568" : "#9ca3af",
                borderRadius: "0.25rem",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
            />
            {hasAgreed && (
              <svg
                className="absolute top-0 left-0 h-4 w-4 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth="3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <span className="text-gray-700 dark:text-gray-300 transition-colors duration-200">
            I have read, understand, and agree to the Terms.
          </span>
        </label>

        <div className="flex justify-end">
          <div className="inline-flex">
            <ConnectButton disabled={!hasAgreed} />
          </div>
        </div>
      </div>
    </div>
  );
}
