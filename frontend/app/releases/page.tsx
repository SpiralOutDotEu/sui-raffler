"use client";

import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  PACKAGE_ID,
  MODULE,
  RANDOM_OBJECT_ID,
  CLOCK_OBJECT_ID,
} from "../../constants";
import { Transaction } from "@mysten/sui/transactions";

interface RaffleEvent {
  raffle_id: string;
  organizer: string;
  start_time: number;
  end_time: number;
  ticket_price: number;
}

interface RaffleFields {
  tickets_sold: number;
  is_released: boolean;
  balance: number;
  winners: { [key: number]: string } | undefined;
}

// Helper function to format time for display
function formatTimeForDisplay(timestamp: number | string) {
  const timestampNum = Number(timestamp);
  if (isNaN(timestampNum)) {
    console.error("Invalid timestamp:", timestamp);
    return "Invalid Date";
  }

  const date = new Date(timestampNum);
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

      const raffles = await Promise.all(
        events.data
          .filter(
            (event) => event.type === `${PACKAGE_ID}::${MODULE}::RaffleCreated`
          )
          .map(async (event) => {
            const raffleData = event.parsedJson as RaffleEvent;

            const raffleObject = await suiClient.getObject({
              id: raffleData.raffle_id,
              options: {
                showContent: true,
              },
            });

            if (raffleObject.data?.content?.dataType === "moveObject") {
              const fields = raffleObject.data.content
                .fields as unknown as RaffleFields;
              return {
                id: raffleData.raffle_id,
                organizer: raffleData.organizer,
                start_time: raffleData.start_time,
                end_time: raffleData.end_time,
                ticket_price: raffleData.ticket_price,
                tickets_sold: fields.tickets_sold,
                is_released: fields.is_released,
                balance: fields.balance,
                winners: fields.winners,
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

type FilterOption = "all" | "ended" | "released" | "unreleased";

export default function Releases() {
  const { data: raffles, isLoading, error } = useRaffles();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState<FilterOption>("ended");
  const [isReleasing, setIsReleasing] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [releaseError, setReleaseError] = useState<{
    [key: string]: string | null;
  }>({});
  const [releaseSuccess, setReleaseSuccess] = useState<{
    [key: string]: string | null;
  }>({});
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const handleReleaseRaffle = async (raffleId: string) => {
    try {
      setIsReleasing((prev) => ({ ...prev, [raffleId]: true }));
      setReleaseError((prev) => ({ ...prev, [raffleId]: null }));
      setReleaseSuccess((prev) => ({ ...prev, [raffleId]: null }));

      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::release_raffle`,
        arguments: [
          tx.object(raffleId),
          tx.object(RANDOM_OBJECT_ID),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log("release_raffle result.effects:", result.effects);
      setReleaseSuccess((prev) => ({
        ...prev,
        [raffleId]:
          "Raffle release transaction sent. Check explorer for status.",
      }));
    } catch (err) {
      console.error("Error releasing raffle:", err);
      setReleaseError((prev) => ({
        ...prev,
        [raffleId]: "Failed to release raffle",
      }));
    } finally {
      setIsReleasing((prev) => ({ ...prev, [raffleId]: false }));
    }
  };

  const filteredRaffles = useMemo(() => {
    if (!raffles) return [];

    let filtered = [...raffles];
    const now = Date.now();

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
    switch (filterBy) {
      case "ended":
        filtered = filtered.filter(
          (raffle) => raffle.end_time <= now && !raffle.is_released
        );
        break;
      case "released":
        filtered = filtered.filter((raffle) => raffle.is_released);
        break;
      case "unreleased":
        filtered = filtered.filter((raffle) => !raffle.is_released);
        break;
    }

    return filtered;
  }, [raffles, searchQuery, filterBy]);

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
                🎲
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Raffle Releases
                </h1>
                <p className="text-gray-500 mt-1">
                  Manage and release ended raffles
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <option value="ended">Ended & Unreleased</option>
                <option value="released">Released</option>
                <option value="unreleased">All Unreleased</option>
                <option value="all">All Raffles</option>
              </select>
            </div>
          </div>
        </div>

        {/* Raffles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRaffles.map((raffle) => {
            const now = Date.now();
            const isEnded = raffle.end_time <= now;
            const canBeReleased = isEnded && !raffle.is_released;

            return (
              <div
                key={raffle.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200 h-full border border-gray-100"
              >
                {/* Status Badge */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        raffle.is_released
                          ? "bg-green-100 text-green-700"
                          : isEnded
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {raffle.is_released
                        ? "Released"
                        : isEnded
                        ? "Ended"
                        : "Active"}
                    </span>
                    <span className="text-sm text-gray-500">
                      #{raffle.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Prize Pool: {(raffle.balance / 1e9).toFixed(2)} SUI
                  </h2>
                  <p className="text-gray-600">
                    Ticket Price: {(raffle.ticket_price / 1e9).toFixed(2)} SUI
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="p-6 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Tickets Sold</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {raffle.tickets_sold}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">End Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatTimeForDisplay(raffle.end_time)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-b-2xl">
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/raffle/${raffle.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View Details
                    </Link>
                    {canBeReleased && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleReleaseRaffle(raffle.id)}
                          disabled={isReleasing[raffle.id]}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isReleasing[raffle.id]
                            ? "Releasing..."
                            : "Release Raffle"}
                        </button>
                        {releaseError[raffle.id] && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">
                              {releaseError[raffle.id]}
                            </p>
                          </div>
                        )}
                        {releaseSuccess[raffle.id] && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-600 text-sm">
                              {releaseSuccess[raffle.id]}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredRaffles.length === 0 && (
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
