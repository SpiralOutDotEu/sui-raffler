"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions";
import { TermsAcceptanceModal } from "./TermsAcceptanceModal";
import { HowItWorksModal } from "./HowItWorksModal";
import { ConnectButtonWithTerms } from "./ConnectButtonWithTerms";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const { isAdminOrController } = useAdminPermissions();

  const handleConnectClick = () => {
    setIsTermsOpen(true);
  };

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
              {isAdminOrController && (
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-indigo-600 transition-colors font-semibold"
                >
                  Admin
                </Link>
              )}
              <ConnectButtonWithTerms onConnectClick={handleConnectClick} />
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
                <ConnectButtonWithTerms
                  onConnectClick={() => {
                    setIsMenuOpen(false);
                    handleConnectClick();
                  }}
                  fullWidth
                />
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
              {isAdminOrController && (
                <Link
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md font-semibold"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <TermsAcceptanceModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </>
  );
}
