"use client";

import { useEffect, useState } from "react";

interface PausedRaffleModalProps {
  isOpen: boolean;
  raffleId?: string;
}

export default function PausedRaffleModal({
  isOpen,
  raffleId,
}: PausedRaffleModalProps) {
  const [copied, setCopied] = useState(false);

  // Handle copy to clipboard
  const handleCopyRaffleId = async () => {
    if (!raffleId) return;

    try {
      await navigator.clipboard.writeText(raffleId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy raffle ID:", err);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      {/* Modal content */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full border border-gray-200">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Raffle Paused
        </h2>

        {/* Description */}
        <div className="text-center mb-6">
          <p className="text-gray-600 text-lg mb-2">
            This raffle has been temporarily paused by administrators.
          </p>
          <p className="text-gray-500 text-sm">
            All functionality is currently disabled until further notice.
          </p>
          {raffleId && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    Raffle ID
                  </p>
                  <p className="text-gray-800 text-sm font-mono">
                    {raffleId.slice(0, 12)}...{raffleId.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={handleCopyRaffleId}
                  className={`ml-3 p-3 rounded-lg transition-colors ${
                    copied
                      ? "text-green-600 bg-green-50"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  }`}
                  title={copied ? "Copied!" : "Copy full raffle ID"}
                >
                  {copied ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-700 font-medium">Currently Paused</span>
            </div>
          </div>
        </div>

        {/* Information box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-blue-800 text-sm font-medium mb-1">
                What does this mean?
              </p>
              <p className="text-blue-700 text-sm">
                You cannot buy tickets or perform other actions on this raffle
                while it&apos;s paused. Check back later or explore other active
                raffles.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col space-y-3 mt-6">
          <a
            href="/explore"
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors text-center"
          >
            Explore Other Raffles
          </a>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
