"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#1a202c] dark:to-[#1a202c] transition-colors duration-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/SUI-Raffler_logo.png"
                alt="SUI-Raffler Logo"
                width={96}
                height={96}
                priority
              />
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-200">
              Create and Play{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-transparent bg-clip-text">
                Raffles
              </span>{" "}
              on SUI
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 transition-colors duration-200">
              The most secure and transparent way to create and participate in
              raffles on the SUI blockchain. Win amazing prizes with just a few
              clicks!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/create"
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-500 dark:hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all text-lg shadow-lg"
              >
                Create a Raffle
              </Link>
              <Link
                href="/explore"
                className="px-8 py-4 bg-white dark:bg-[#2d3748] border-2 border-indigo-500 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg font-semibold hover:bg-indigo-50 dark:hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all text-lg shadow-lg"
              >
                Explore Raffles
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 sm:py-24 bg-white dark:bg-[#1a202c] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
              Why Choose SUI-Raffler?
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 transition-colors duration-200">
              Experience the future of raffles with our innovative platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-[#2d3748] dark:to-[#2d3748] rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-6 transition-colors duration-200">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-200">
                Secure & Transparent
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Built on SUI blockchain, ensuring complete transparency and
                security for all participants.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-[#2d3748] dark:to-[#2d3748] rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-6 transition-colors duration-200">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-200">
                Instant Results
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Automated winner selection and instant prize distribution
                through smart contracts.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-[#2d3748] dark:to-[#2d3748] rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center mb-6 transition-colors duration-200">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-200">
                Easy to Use
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Simple interface for both creators and participants. No
                technical knowledge required.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 sm:py-24 bg-gray-50 dark:bg-[#2d3748] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 transition-colors duration-200">
              Get started in just a few simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-200">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                Connect Wallet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Connect your SUI wallet to get started
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-200">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                Create or Join
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Create your own raffle or join existing ones
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-200">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                Buy Tickets
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Purchase tickets using SUI tokens
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-200">
                <span className="text-2xl">4️⃣</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                Win Prizes
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Claim your prizes automatically if you win
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 sm:py-24 bg-gradient-to-r from-indigo-500 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Ready to Start Your Raffle Journey?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-all text-lg shadow-lg"
            >
              Create a Raffle
            </Link>
            <Link
              href="/explore"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-all text-lg"
            >
              Explore Raffles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
