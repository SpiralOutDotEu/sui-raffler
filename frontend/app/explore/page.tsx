"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useRaffles } from "@/lib/hooks/useRaffles";
import Image from "next/image";

// Helper function to format relative time
function getRelativeTime(target: number) {
  const now = Date.now(); // Current time in milliseconds
  const targetNum = Number(target); // Ensure we're working with a number
  const diff = targetNum - now;
  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  const units = [
    { label: "year", ms: 60 * 60 * 24 * 365 * 1000 },
    { label: "month", ms: 60 * 60 * 24 * 30 * 1000 },
    { label: "day", ms: 60 * 60 * 24 * 1000 },
    { label: "hour", ms: 60 * 60 * 1000 },
    { label: "minute", ms: 60 * 1000 },
    { label: "second", ms: 1000 },
  ];

  for (const unit of units) {
    const value = Math.floor(absDiff / unit.ms);
    if (value > 0) {
      return isFuture
        ? `in ${value} ${unit.label}${value > 1 ? "s" : ""}`
        : `${value} ${unit.label}${value > 1 ? "s" : ""} ago`;
    }
  }
  return isFuture ? "in a moment" : "just now";
}

// Helper function to format time for display
function formatTimeForDisplay(timestamp: number | string) {
  // Convert to number and validate
  const timestampNum = Number(timestamp);
  if (isNaN(timestampNum)) {
    console.error("Invalid timestamp:", timestamp);
    return "Invalid Date";
  }

  // Create date object
  const date = new Date(timestampNum);

  // Validate the date
  if (isNaN(date.getTime())) {
    console.error("Invalid date created from timestamp:", timestamp);
    return "Invalid Date";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year}, ${hours}:${minutes} UTC`;
}

type SortOption =
  | "newest"
  | "oldest"
  | "highest_prize"
  | "most_tickets"
  | "ending_soon";
type FilterOption = "all" | "active" | "ended" | "upcoming";

const ITEMS_PER_PAGE = 6;

export default function Explore() {
  const { data: raffles, isLoading, error } = useRaffles();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedRaffles = useMemo(() => {
    if (!raffles) return [];

    let filtered = [...raffles];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (raffle) =>
          raffle.id.toLowerCase().includes(query) ||
          raffle.organizer.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    const now = Date.now();
    switch (filterBy) {
      case "active":
        filtered = filtered.filter(
          (raffle) =>
            raffle.start_time <= now &&
            raffle.end_time > now &&
            !raffle.is_released
        );
        break;
      case "ended":
        filtered = filtered.filter(
          (raffle) => raffle.end_time <= now || raffle.is_released
        );
        break;
      case "upcoming":
        filtered = filtered.filter((raffle) => raffle.start_time > now);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => b.start_time - a.start_time);
        break;
      case "oldest":
        filtered.sort((a, b) => a.start_time - b.start_time);
        break;
      case "highest_prize":
        filtered.sort((a, b) => b.balance - a.balance);
        break;
      case "most_tickets":
        filtered.sort((a, b) => b.tickets_sold - a.tickets_sold);
        break;
      case "ending_soon":
        filtered.sort((a, b) => a.end_time - b.end_time);
        break;
    }

    return filtered;
  }, [raffles, searchQuery, sortBy, filterBy]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, filterBy]);

  // Calculate pagination
  const totalPages = Math.ceil(
    filteredAndSortedRaffles.length / ITEMS_PER_PAGE
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRaffles = filteredAndSortedRaffles.slice(startIndex, endIndex);

  // Generate page numbers for pagination UI
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">Error loading raffles: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a202c] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 mb-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                🔍
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                  Explore Raffles
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-200">
                  Find and participate in exciting raffles on SUI
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 mb-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by ID or organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-gray-50 dark:bg-[#1a202c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
              />
            </div>
            <div>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-gray-50 dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200"
              >
                <option value="all">All Raffles</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-gray-50 dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest_prize">Highest Prize</option>
                <option value="most_tickets">Most Tickets</option>
                <option value="ending_soon">Ending Soon</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-4 mb-6 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
          <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
            Showing{" "}
            <span className="font-semibold text-gray-900 dark:text-white transition-colors duration-200">
              {filteredAndSortedRaffles.length === 0
                ? 0
                : `${startIndex + 1}-${Math.min(
                    endIndex,
                    filteredAndSortedRaffles.length
                  )}`}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900 dark:text-white transition-colors duration-200">
              {filteredAndSortedRaffles.length}
            </span>{" "}
            raffles
          </p>
        </div>

        {/* Raffles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {paginatedRaffles.map((raffle) => {
            const now = Date.now();
            const isActive =
              raffle.start_time <= now &&
              raffle.end_time > now &&
              !raffle.is_released;
            const isUpcoming = raffle.start_time > now;

            return (
              <Link
                key={raffle.id}
                href={`/raffle/${raffle.id}`}
                className="block"
              >
                <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 hover:shadow-xl dark:hover:shadow-black/30 transition-shadow duration-200 h-full border border-gray-100 dark:border-[#4a5568] overflow-hidden transition-colors duration-200">
                  {/* Image Section */}
                  <div className="relative h-48 bg-gray-100 dark:bg-[#1a202c]">
                    {raffle.image ? (
                      <Image
                        src={raffle.image}
                        alt={raffle.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover rounded-t-lg"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-[#1a202c]">
                        <span className="text-gray-400 dark:text-gray-500">
                          No image available
                        </span>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          isActive
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : isUpcoming
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        } transition-colors duration-200`}
                      >
                        {isActive
                          ? "Active"
                          : isUpcoming
                          ? "Upcoming"
                          : "Ended"}
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 transition-colors duration-200">
                        {raffle.name}
                      </h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
                        #{raffle.id.slice(0, 8)}...
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 transition-colors duration-200">
                      {raffle.description}
                    </p>

                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/30 transition-colors duration-200">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                          Prize Pool:{" "}
                          {raffle.is_released
                            ? ((raffle.prize_pool || 0) / 1e9).toFixed(2)
                            : ((raffle.balance || 0) / 1e9).toFixed(2)}{" "}
                          SUI
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                          Ticket Price: {(raffle.ticket_price / 1e9).toFixed(2)}{" "}
                          SUI
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-[#1a202c] rounded-xl p-4 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
                          <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">Tickets Sold</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                            {raffle.tickets_sold}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#1a202c] rounded-xl p-4 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
                          <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                            {raffle.end_time <= now ? "Ended" : "Time Left"}
                          </p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                            {raffle.end_time <= now
                              ? `Ended ${getRelativeTime(raffle.end_time)}`
                              : getRelativeTime(raffle.end_time)}
                          </p>
                        </div>
                      </div>

                      {/* Time Info */}
                      <div className="bg-gray-50 dark:bg-[#1a202c] rounded-xl p-4 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Start Time</span>
                            <span className="text-gray-900 dark:text-white transition-colors duration-200">
                              {formatTimeForDisplay(raffle.start_time)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">End Time</span>
                            <span className="text-gray-900 dark:text-white transition-colors duration-200">
                              {formatTimeForDisplay(raffle.end_time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {filteredAndSortedRaffles.length === 0 && (
            <div className="col-span-full">
              <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 border border-gray-100 dark:border-[#4a5568] text-center transition-colors duration-200">
                <div className="w-16 h-16 bg-gray-100 dark:bg-[#1a202c] rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-200">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                  No Raffles Found
                </h3>
                <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                  Try adjusting your search or filters to find what you&apos;re
                  looking for.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-indigo-900/20 dark:via-[#2d3748] dark:to-purple-900/20 rounded-2xl shadow-lg dark:shadow-black/20 p-4 sm:p-6 border border-indigo-100 dark:border-indigo-800/30 transition-colors duration-200">
            <div className="flex justify-center">
              {/* Pagination Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                {/* Previous Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="min-w-[44px] sm:min-w-[48px] px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 dark:border-[#4a5568] rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 dark:disabled:hover:border-[#4a5568] disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:disabled:hover:text-gray-400 transition-all duration-200 font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md flex items-center justify-center gap-1 sm:gap-1.5"
                  aria-label="Previous page"
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/60 dark:bg-[#1a202c]/60 rounded-xl p-1.5 sm:p-2 border border-gray-200 dark:border-[#4a5568] shadow-sm transition-colors duration-200">
                  {getPageNumbers().map((page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 sm:px-3 py-2 sm:py-2.5 text-gray-400 dark:text-gray-500 font-medium text-sm sm:text-base transition-colors duration-200"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = page as number;
                    const isActive = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[44px] sm:min-w-[48px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white shadow-lg shadow-indigo-500/30 dark:shadow-indigo-800/30 scale-105"
                            : "text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 hover:shadow-sm"
                        }`}
                        aria-label={`Go to page ${pageNum}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="min-w-[44px] sm:min-w-[48px] px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 dark:border-[#4a5568] rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 dark:disabled:hover:border-[#4a5568] disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:disabled:hover:text-gray-400 transition-all duration-200 font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md flex items-center justify-center gap-1 sm:gap-1.5"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
