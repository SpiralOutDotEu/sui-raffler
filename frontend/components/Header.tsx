"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions";
import { TermsAcceptanceModal } from "./TermsAcceptanceModal";
import { HowItWorksModal } from "./HowItWorksModal";
import { ConnectButtonWithTerms } from "./ConnectButtonWithTerms";
import { ThemeToggle } from "./ThemeToggle";

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
      <header className="bg-white dark:bg-[#1a202c] border-b border-gray-100 dark:border-[#2d3748] fixed w-full top-6 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shadow-lg bg-white dark:bg-[#2d3748] transition-colors duration-200">
                  <Image
                    src="/SUI-Raffler_logo.png"
                    alt="SUI-Raffler Logo"
                    width={48}
                    height={48}
                    priority
                  />
                </div>
                <span className="text-4xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-transparent bg-clip-text">
                  SUI Raffler
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setIsHowItWorksOpen(true)}
                className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                How It Works
              </button>
              <Link
                href="/explore"
                className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Explore
              </Link>
              <Link
                href="/create"
                className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Create
              </Link>
              {isAdminOrController && (
                <Link
                  href="/admin"
                  className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
                >
                  Admin
                </Link>
              )}
              <ThemeToggle />
              <ConnectButtonWithTerms onConnectClick={handleConnectClick} />
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-colors"
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
          <div className="md:hidden bg-white dark:bg-[#1a202c] border-t border-gray-100 dark:border-[#2d3748] transition-colors duration-200">
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
                className="block w-full text-left px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-[#2d3748] rounded-md transition-colors"
              >
                How It Works
              </button>
              <Link
                href="/explore"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-[#2d3748] rounded-md transition-colors"
              >
                Explore
              </Link>
              <Link
                href="/create"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-[#2d3748] rounded-md transition-colors"
              >
                Create
              </Link>
              {isAdminOrController && (
                <Link
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-[#2d3748] rounded-md font-semibold transition-colors"
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
