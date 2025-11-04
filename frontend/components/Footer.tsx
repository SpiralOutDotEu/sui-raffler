"use client";

import { useState } from "react";
import Link from "next/link";
import { HowItWorksModal } from "./HowItWorksModal";

export default function Footer() {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  return (
    <footer className="bg-white dark:bg-[#1a202c] text-gray-700 dark:text-gray-300 py-12 transition-colors duration-200 border-t border-gray-200 dark:border-[#2d3748]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-gray-900 dark:text-gray-100 text-lg font-semibold mb-4 transition-colors duration-200">
              SUI Raffler
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
              The most secure and transparent raffle platform on SUI
              blockchain.
            </p>
          </div>
          <div>
            <h4 className="text-gray-900 dark:text-gray-100 text-sm font-semibold mb-4 transition-colors duration-200">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/explore"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
                >
                  Explore Raffles
                </Link>
              </li>
              <li>
                <Link
                  href="/create"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
                >
                  Create Raffle
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setIsHowItWorksOpen(true)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200 text-left"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 dark:text-gray-100 text-sm font-semibold mb-4 transition-colors duration-200">
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://docs.sui.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
                >
                  SUI Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://suiexplorer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
                >
                  SUI Explorer
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 dark:text-gray-100 text-sm font-semibold mb-4 transition-colors duration-200">
              Connect
            </h4>
            <ul className="space-y-2 text-sm">
              {/* TODO: Add actual Twitter link when available - replace span with anchor tag */}
              <li>
                <span className="text-gray-600 dark:text-gray-400 cursor-default transition-colors duration-200">
                  Twitter
                </span>
              </li>
              {/* TODO: Add actual Discord link when available - replace span with anchor tag */}
              <li>
                <span className="text-gray-600 dark:text-gray-400 cursor-default transition-colors duration-200">
                  Discord
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-[#2d3748] text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
          <p>© {new Date().getFullYear()} SUI Raffler. All rights reserved.</p>
        </div>
      </div>

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </footer>
  );
}

