"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@mysten/dapp-kit";
import Image from "next/image";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 fixed w-full top-6 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shadow-lg bg-white">
                  <Image
                    src="/SUI-Raffler_logo.png"
                    alt="SUI-Raffler Logo"
                    width={48}
                    height={48}
                    priority
                  />
                </div>
                <span className="text-4xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
                  SUI-Raffler
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setIsHowItWorksOpen(true)}
                className="text-gray-600 hover:text-indigo-600 transition-colors"
              >
                How It Works
              </button>
              <Link
                href="/explore"
                className="text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Explore
              </Link>
              <Link
                href="/create"
                className="text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Create
              </Link>
              <ConnectButton />
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-indigo-600 focus:outline-none"
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
                  {isMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <div className="px-3 py-2">
                <ConnectButton />
              </div>
              <button
                onClick={() => {
                  setIsHowItWorksOpen(true);
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
              >
                How It Works
              </button>
              <Link
                href="/explore"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
              >
                Explore
              </Link>
              <Link
                href="/create"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
              >
                Create
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* How It Works Modal */}
      {isHowItWorksOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-white/30 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsHowItWorksOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 relative shadow-xl">
            <button
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
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

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              How SUI-Raffler Works
            </h2>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create or Join
                  </h3>
                  <p className="text-gray-600">
                    Create your own raffle with custom settings or join existing
                    ones. Set ticket prices, duration, and maximum tickets per
                    purchase.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Buy Tickets
                  </h3>
                  <p className="text-gray-600">
                    Purchase tickets using SUI tokens. The more tickets you buy,
                    the higher your chances of winning!
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Wait for Results
                  </h3>
                  <p className="text-gray-600">
                    Once the raffle ends, winners are automatically selected
                    using Sui&apos;s on-chain randomness. The selection is
                    performed by smart contracts, ensuring complete transparency
                    and fairness. No human intervention is possible!
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Claim Prizes
                  </h3>
                  <p className="text-gray-600">
                    Winners can claim their prizes directly through smart
                    contracts. The prize distribution is automatic and
                    transparent:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>1st Place: 50% of the prize pool</li>
                      <li>2nd Place: 25% of the prize pool</li>
                      <li>3rd Place: 10% of the prize pool</li>
                      <li>Organizer: 10% of the prize pool</li>
                      <li>Protocol Fee: 5% of the prize pool</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setIsHowItWorksOpen(false)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
