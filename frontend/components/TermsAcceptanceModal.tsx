"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

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

  // Close modal when wallet connects
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
      setHasAgreed(false);
    }
  }, [isConnected, isOpen, onClose]);

  // Reset agreement when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-white/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
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

        <h2 className="text-xl font-bold text-gray-900 mb-4">Agree to Terms</h2>
        <p className="text-gray-600 mb-4">
          By continuing, you confirm that you have read and agree to the
          <Link
            href="/terms"
            onClick={onClose}
            className="text-indigo-600 hover:text-indigo-700 underline ml-1"
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
                backgroundColor: hasAgreed ? "#4f46e5" : "white",
                border: "2px solid",
                borderColor: hasAgreed ? "#4f46e5" : "#9ca3af",
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
          <span className="text-gray-700">
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
