"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useMemo } from "react";
import { PACKAGE_ID, MODULE } from "../../constants";
import Image from "next/image";

interface RaffleEvent {
  raffle_id: string;
  organizer: string;
  start_time: number;
  end_time: number;
  ticket_price: number;
  name: string;
  description: string;
  image: string;
}

interface RaffleFields {
  tickets_sold: number;
  is_released: boolean;
  balance: number;
  winners: { [key: number]: string } | undefined;
  prize_pool: number;
  image: string;
  name: string;
  description: string;
}

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

function useRaffles() {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["raffles"],
    queryFn: async () => {
      // Query for RaffleCreated events
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: PACKAGE_ID,
            module: MODULE,
          },
        },
        limit: 50,
        order: "descending",
      });

      // Process events and fetch current state for each raffle
      const raffles = await Promise.all(
        events.data
          .filter(
            (event) => event.type === `${PACKAGE_ID}::${MODULE}::RaffleCreated`
          )
          .map(async (event) => {
            const raffleData = event.parsedJson as RaffleEvent;

            // Get current state of the raffle
            const raffleObject = await suiClient.getObject({
              id: raffleData.raffle_id,
              options: {
                showContent: true,
              },
            });

            if (raffleObject.data?.content?.dataType === "moveObject") {
              const fields = raffleObject.data.content
                .fields as unknown as RaffleFields;

              // Get image URL from IPFS
              let imageUrl = "";
              try {
                const response = await fetch(
                  `/api/v1/ipfs/retrieve?cid=${fields.image}`
                );
                if (response.ok) {
                  const blob = await response.blob();
                  imageUrl = URL.createObjectURL(blob);
                }
              } catch (error) {
                console.error("Error fetching image URL:", error);
              }

              return {
                id: raffleData.raffle_id,
                organizer: raffleData.organizer,
                start_time: raffleData.start_time,
                end_time: raffleData.end_time,
                ticket_price: raffleData.ticket_price,
                name: fields.name,
                description: fields.description,
                imageUrl,
                tickets_sold: fields.tickets_sold,
                is_released: fields.is_released,
                balance: fields.balance,
                winners: fields.winners,
                prize_pool: fields.prize_pool,
              };
            }
            return null;
          })
      );

      return raffles.filter(
        (raffle): raffle is NonNullable<typeof raffle> => raffle !== null
      );
    },
  });
}

type SortOption =
  | "newest"
  | "oldest"
  | "highest_prize"
  | "most_tickets"
  | "ending_soon";
type FilterOption = "all" | "active" | "ended" | "upcoming";

export default function Explore() {
  const { data: raffles, isLoading, error } = useRaffles();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error loading raffles: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                🔍
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Explore Raffles
                </h1>
                <p className="text-gray-500 mt-1">
                  Find and participate in exciting raffles on SUI
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by ID or organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-gray-50"
              />
            </div>
            <div>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-gray-50"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-gray-50"
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

        {/* Raffles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedRaffles.map((raffle) => {
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
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200 h-full border border-gray-100 overflow-hidden">
                  {/* Image Section */}
                  <div className="relative h-48 bg-gray-100">
                    {raffle.imageUrl ? (
                      <Image
                        src={raffle.imageUrl}
                        alt={raffle.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <span className="text-gray-400">
                          No image available
                        </span>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          isActive
                            ? "bg-green-100 text-green-700"
                            : isUpcoming
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
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
                      <h2 className="text-xl font-bold text-gray-900 line-clamp-1">
                        {raffle.name}
                      </h2>
                      <span className="text-sm text-gray-500">
                        #{raffle.id.slice(0, 8)}...
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {raffle.description}
                    </p>

                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          Prize Pool:{" "}
                          {raffle.is_released
                            ? ((raffle.prize_pool || 0) / 1e9).toFixed(2)
                            : ((raffle.balance || 0) / 1e9).toFixed(2)}{" "}
                          SUI
                        </h3>
                        <p className="text-gray-600">
                          Ticket Price: {(raffle.ticket_price / 1e9).toFixed(2)}{" "}
                          SUI
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-600">Tickets Sold</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {raffle.tickets_sold}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-600">Time Left</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {getRelativeTime(raffle.end_time)}
                          </p>
                        </div>
                      </div>

                      {/* Time Info */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Start Time</span>
                            <span className="text-gray-900">
                              {formatTimeForDisplay(raffle.start_time)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">End Time</span>
                            <span className="text-gray-900">
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
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Raffles Found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search or filters to find what you&apos;re
                  looking for.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
