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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md transition-colors duration-200" />

      {/* Modal content */}
      <div className="relative bg-white dark:bg-[#2d3748] rounded-2xl shadow-2xl dark:shadow-black/40 p-8 mx-4 max-w-md w-full border border-gray-200 dark:border-[#4a5568] transition-colors duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center transition-colors duration-200">
            <svg
              className="w-10 h-10 text-red-600 dark:text-red-400"
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4 transition-colors duration-200">
          Raffle Paused
        </h2>

        {/* Description */}
        <div className="text-center mb-6">
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-2 transition-colors duration-200">
            This raffle has been temporarily paused by administrators.
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-200">
            All functionality is currently disabled until further notice.
          </p>
          {raffleId && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1a202c] border border-gray-200 dark:border-[#4a5568] rounded-lg transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1 transition-colors duration-200">
                    Raffle ID
                  </p>
                  <p className="text-gray-800 dark:text-white text-sm font-mono transition-colors duration-200">
                    {raffleId.slice(0, 12)}...{raffleId.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={handleCopyRaffleId}
                  className={`ml-3 p-3 rounded-lg transition-colors duration-200 ${
                    copied
                      ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a202c]"
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 transition-colors duration-200">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full animate-pulse transition-colors duration-200"></div>
              <span className="text-red-700 dark:text-red-400 font-medium transition-colors duration-200">Currently Paused</span>
            </div>
          </div>
        </div>

        {/* Information box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 transition-colors duration-200">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0 transition-colors duration-200"
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
              <p className="text-blue-800 dark:text-blue-300 text-sm font-medium mb-1 transition-colors duration-200">
                What does this mean?
              </p>
              <p className="text-blue-700 dark:text-blue-400 text-sm transition-colors duration-200">
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
            className="w-full px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200 text-center"
          >
            Explore Other Raffles
          </a>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
