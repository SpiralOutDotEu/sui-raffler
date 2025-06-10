"use client";

import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PACKAGE_ID, MODULE, ORGANIZER_PERCENTAGE } from "../../../constants";
import { Transaction } from "@mysten/sui/transactions";
import { useWallet } from "../../context/WalletContext";

interface Raffle {
  id: string;
  start_time: number;
  end_time: number;
  ticket_price: number;
  max_tickets_per_purchase: number;
  organizer: string;
  fee_collector: string;
  admin: string;
  controller: string;
  balance: number;
  tickets_sold: number;
  is_released: boolean;
  winners: { [key: number]: string };
  prize_pool: number;
  organizer_claimed: boolean;
  protocol_claimed: boolean;
  paused: boolean;
  winning_tickets: number[];
  name: string;
  description: string;
  image: string;
}

interface Ticket {
  id: string;
  ticket_number: number;
  is_winner?: boolean;
  prize_amount?: number;
}

interface TicketFields {
  raffle_id: string;
  ticket_number: string;
}

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function useRaffle(id: string) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["raffle", id],
    queryFn: async () => {
      const response = await suiClient.getObject({
        id,
        options: {
          showContent: true,
        },
      });

      if (response.data?.content?.dataType === "moveObject") {
        const fields = response.data.content.fields as unknown as Raffle;

        // Get image URL from IPFS
        let imageUrl = "";
        try {
          const imageResponse = await fetch(
            `/api/v1/ipfs/retrieve?cid=${fields.image}`
          );
          if (imageResponse.ok) {
            const data = await imageResponse.json();
            imageUrl = data.url;
          }
        } catch (error) {
          console.error("Error fetching image URL:", error);
        }

        return {
          ...fields,
          id,
          image: imageUrl,
        };
      }
      throw new Error("Raffle not found");
    },
  });
}

function useUserTickets(raffleId: string, userAddress: string | undefined) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["tickets", raffleId, userAddress],
    queryFn: async () => {
      if (!userAddress) return [];

      // Query for all tickets owned by the user
      const response = await suiClient.getOwnedObjects({
        owner: userAddress,
        filter: {
          MatchAll: [
            {
              StructType: `${PACKAGE_ID}::${MODULE}::Ticket`,
            },
          ],
        },
        options: {
          showContent: true,
        },
      });

      // Filter tickets for this raffle and get their info
      const tickets: Ticket[] = [];
      for (const obj of response.data) {
        if (obj.data?.content?.dataType === "moveObject") {
          const fields = obj.data.content.fields as unknown as TicketFields;
          if (fields.raffle_id === raffleId) {
            tickets.push({
              id: obj.data.objectId,
              ticket_number: Number(fields.ticket_number),
            });
          }
        }
      }

      // If raffle is released, check which tickets are winners
      const raffleResponse = await suiClient.getObject({
        id: raffleId,
        options: {
          showContent: true,
        },
      });

      if (raffleResponse.data?.content?.dataType === "moveObject") {
        const raffleFields = raffleResponse.data.content
          .fields as unknown as Raffle;
        if (raffleFields.is_released) {
          const totalBalance = Number(raffleFields.balance);
          for (const ticket of tickets) {
            if (
              raffleFields.winners &&
              raffleFields.winners[ticket.ticket_number]
            ) {
              ticket.is_winner = true;
              // Calculate prize amount based on position
              const winnerKeys = Object.keys(raffleFields.winners);
              if (ticket.ticket_number === Number(winnerKeys[0])) {
                ticket.prize_amount = (totalBalance * 50) / 100; // First prize: 50%
              } else if (ticket.ticket_number === Number(winnerKeys[1])) {
                ticket.prize_amount = (totalBalance * 25) / 100; // Second prize: 25%
              } else {
                ticket.prize_amount = (totalBalance * 10) / 100; // Third prize: 10%
              }
            }
          }
        }
      }

      return tickets;
    },
    enabled: !!userAddress,
  });
}

function useRaffleWinners(raffleId: string) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["winners", raffleId],
    queryFn: async () => {
      try {
        const response = await suiClient.getObject({
          id: raffleId,
          options: {
            showContent: true,
          },
        });

        if (response.data?.content?.dataType === "moveObject") {
          const fields = response.data.content.fields as unknown as Raffle;
          if (fields.is_released) {
            return {
              hasWinners: true,
              winningTicketNumbers: fields.winning_tickets,
            };
          }
        }
      } catch (error) {
        console.error("Error fetching winners:", error);
      }

      return {
        hasWinners: false,
        winningTicketNumbers: [],
      };
    },
    enabled: !!raffleId,
  });
}

// Add a helper function for relative time
function getRelativeTime(target: number) {
  const now = Date.now();
  const diff = target - now;
  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  const units = [
    { label: "year", ms: 1000 * 60 * 60 * 24 * 365 },
    { label: "month", ms: 1000 * 60 * 60 * 24 * 30 },
    { label: "day", ms: 1000 * 60 * 60 * 24 },
    { label: "hour", ms: 1000 * 60 * 60 },
    { label: "minute", ms: 1000 * 60 },
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

// Add this helper function near the other helper functions
function calculateQuickTicketOptions(maxTickets: number) {
  const options = [1]; // First option is always 1

  // Calculate 25% and 50% of max tickets, rounded down
  const quarterTickets = Math.floor(maxTickets * 0.25);
  const halfTickets = Math.floor(maxTickets * 0.5);

  // Add 25% and 50% options if they're different from 1 and max
  if (quarterTickets > 1) options.push(quarterTickets);
  if (halfTickets > quarterTickets) options.push(halfTickets);

  // Add max tickets if it's different from the last option
  if (maxTickets !== options[options.length - 1]) {
    options.push(maxTickets);
  }

  return options;
}

export default function RaffleDetail() {
  const { id } = useParams();
  const { data: raffle, isLoading, error } = useRaffle(id as string);
  const { data: winners } = useRaffleWinners(id as string);
  const [ticketAmount, setTicketAmount] = useState<number>(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(
    null
  );
  const { address: currentAccount, isConnected } = useWallet();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { data: userTickets = [], isLoading: isLoadingTickets } =
    useUserTickets(id as string, currentAccount);

  // Add console logs for debugging
  console.log("Raffle:", raffle);
  console.log("Winners:", winners);

  // Add this inside the component, before the return statement
  const quickTicketOptions = raffle
    ? calculateQuickTicketOptions(raffle.max_tickets_per_purchase)
    : [1];

  const handleBuyTickets = async () => {
    if (!isConnected || !currentAccount || !raffle) return;

    setIsPurchasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const tx = new Transaction();

      // Calculate total cost in MIST (1 SUI = 1e9 MIST)
      const totalCost = BigInt(raffle.ticket_price) * BigInt(ticketAmount);

      // Split a coin with the exact amount needed
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(totalCost)]);

      // Add the buy_tickets call with all required arguments
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::buy_tickets`,
        arguments: [
          tx.object(raffle.id),
          payment, // Use the split coin as payment
          tx.pure.u64(ticketAmount),
          tx.object("0x6"), // Clock object ID
        ],
      });

      // Execute the transaction
      const result = await signAndExecute({
        transaction: tx,
      });

      // Store the transaction digest for the success message
      setTransactionDigest(result.digest);

      // Refresh raffle data
      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      // Refresh user tickets data
      await queryClient.invalidateQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      // Refresh winners data
      await queryClient.invalidateQueries({ queryKey: ["winners", id] });
    } catch (err) {
      let errorMessage = "Failed to purchase tickets";

      if (err instanceof Error) {
        // Handle specific error cases
        if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to purchase tickets";
        } else if (err.message.includes("raffle is not active")) {
          errorMessage = "This raffle is not active";
        } else if (err.message.includes("invalid ticket amount")) {
          errorMessage = "Invalid number of tickets requested";
        } else {
          errorMessage = err.message;
        }
      }

      setPurchaseError(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClaimPrize = async (ticketId: string) => {
    if (!isConnected || !currentAccount || !raffle) return;

    setIsPurchasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::claim_prize`,
        arguments: [tx.object(raffle.id), tx.object(ticketId)],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      setTransactionDigest(result.digest);
      await queryClient.invalidateQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      await queryClient.invalidateQueries({ queryKey: ["winners", id] });
    } catch (err) {
      let errorMessage = "Failed to claim prize";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setPurchaseError(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClaimOrganizerShare = async () => {
    if (!isConnected || !currentAccount || !raffle) return;

    setIsPurchasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::claim_organizer_share`,
        arguments: [tx.object(raffle.id)],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      setTransactionDigest(result.digest);
      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });

      // Show success toast
      const toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2";
      toast.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Successfully claimed organizer share!</span>
        <a href="https://suiexplorer.com/txblock/${result.digest}?network=testnet" target="_blank" rel="noopener noreferrer" class="underline hover:text-green-100">
          View on Explorer
        </a>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    } catch (err) {
      let errorMessage = "Failed to claim organizer share";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setPurchaseError(errorMessage);

      // Show error toast
      const toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2";
      toast.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span>${errorMessage}</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error loading raffle: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-600">Raffle not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Image */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 flex items-center justify-center">
              <div className="aspect-square w-full max-w-md rounded-2xl overflow-hidden bg-white shadow-lg">
                {raffle.image ? (
                  <img
                    src={raffle.image}
                    alt={raffle.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                    <span className="text-6xl">🎟️</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Data */}
            <div className="flex flex-col h-full">
              {/* 1. Title, Description, Status */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {raffle.name || `Raffle #${raffle.id.slice(0, 8)}...`}
                  </h1>
                  <div className="flex items-center gap-4">
                    {raffle.is_released &&
                      !raffle.organizer_claimed &&
                      currentAccount === raffle.organizer && (
                        <button
                          onClick={handleClaimOrganizerShare}
                          disabled={isPurchasing}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPurchasing ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Claiming...
                            </span>
                          ) : (
                            `Claim ${
                              (raffle.prize_pool * ORGANIZER_PERCENTAGE) /
                              100 /
                              1e9
                            } SUI as organizer`
                          )}
                        </button>
                      )}
                    <span
                      className={`px-4 py-2 rounded-full font-semibold shadow-sm ${
                        raffle.is_released
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {raffle.is_released ? "Ended" : "Active"}
                    </span>
                  </div>
                </div>
                {raffle.description && (
                  <p className="text-gray-600 text-lg mt-2">
                    {raffle.description}
                  </p>
                )}
              </div>

              {/* 2. Middle: Two Columns (Time & Address) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Time Details */}
                <div className="bg-white/70 rounded-xl p-4 border border-purple-100">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">
                      Start Time
                    </p>
                    <p className="text-lg font-semibold text-purple-900">
                      {new Date(Number(raffle.start_time)).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2">
                    <p className="text-purple-600 text-sm font-medium">
                      End Time
                    </p>
                    <p className="text-lg font-semibold text-purple-900">
                      {new Date(Number(raffle.end_time)).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
                    <p className="text-purple-600 text-sm font-medium">
                      Time Remaining
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {getRelativeTime(Number(raffle.end_time))}
                    </p>
                  </div>
                </div>
                {/* Address Details */}
                <div className="bg-white/70 rounded-xl p-4 border border-indigo-100 flex flex-col gap-4 justify-center">
                  <div>
                    <span className="text-indigo-600 text-sm font-medium">
                      Created by:
                    </span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm mt-1">
                      <span className="font-mono text-gray-700">
                        {truncateAddress(raffle.organizer)}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(raffle.organizer)
                        }
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy address"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                      </button>
                      <a
                        href={`https://suiexplorer.com/address/${raffle.organizer}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="View in Explorer"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                  <div>
                    <span className="text-indigo-600 text-sm font-medium">
                      Raffle ID:
                    </span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm mt-1">
                      <span className="font-mono text-gray-700">
                        {truncateAddress(raffle.id)}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(raffle.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy address"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                      </button>
                      <a
                        href={`https://suiexplorer.com/object/${raffle.id}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="View in Explorer"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Max Return Panel - Full Width */}
              <div className="w-full">
                <div className="relative bg-gradient-to-br from-white via-green-50 to-white border-l-4 border-green-400 rounded-xl p-6 shadow-lg w-full overflow-hidden">
                  {/* Decorative floating icon */}
                  <div className="absolute -top-4 -left-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center shadow-md opacity-80 pointer-events-none">
                    <span className="text-3xl">🚀</span>
                  </div>
                  {/* Main content */}
                  <div className="relative z-10">
                    {raffle.is_released ? (
                      <>
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          Winner took home
                        </div>
                        <div className="text-4xl font-extrabold text-indigo-700 mb-2 leading-tight">
                          {(raffle.prize_pool * 0.5) / 1e9} SUI
                        </div>
                        <div className="text-base text-gray-700 mb-2">
                          with a ticket of{" "}
                          <span className="font-semibold">
                            {raffle.ticket_price / 1e9} SUI
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base text-gray-500">gain:</span>
                          <span className="inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full font-bold text-xl shadow-sm animate-pulse">
                            {(
                              (raffle.prize_pool * 0.5) /
                              raffle.ticket_price
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                            x
                          </span>
                          <span className="text-base text-gray-500">
                            on their ticket
                          </span>
                        </div>
                        <div className="text-sm text-green-700 mt-2 italic font-medium">
                          This raffle has ended, but you can explore more
                          opportunities!
                        </div>
                        <a
                          href="/explore"
                          className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors"
                        >
                          Explore More Raffles
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          Win up to
                        </div>
                        <div className="text-4xl font-extrabold text-indigo-700 mb-2 leading-tight">
                          {(raffle.is_released
                            ? raffle.prize_pool * 0.5
                            : raffle.balance * 0.5) / 1e9}{" "}
                          SUI
                          {!raffle.is_released && (
                            <span className="text-sm font-normal text-indigo-500 ml-2">
                              (and growing!)
                            </span>
                          )}
                        </div>
                        <div className="text-base text-gray-700 mb-2">
                          with a ticket of{" "}
                          <span className="font-semibold">
                            {raffle.ticket_price / 1e9} SUI
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base text-gray-500">
                            current return:
                          </span>
                          <span className="inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full font-bold text-xl shadow-sm animate-pulse">
                            {(
                              (raffle.is_released
                                ? raffle.prize_pool * 0.5
                                : raffle.balance * 0.5) / raffle.ticket_price
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                            x
                          </span>
                          <span className="text-base text-gray-500">
                            on the winning ticket
                          </span>
                        </div>
                        <div className="text-sm text-green-700 mt-2 italic font-medium flex items-center gap-2">
                          <span>
                            🎯 Prize pool increases with each ticket sold!
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {raffle.tickets_sold} tickets sold
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Prize Pool Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-yellow-500">🏆</span>
                  Prize Pool Distribution
                </h2>
              </div>
              {raffle.is_released ? (
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-green-700 text-sm flex items-center gap-2">
                    <span className="text-xl">🎉</span>
                    The raffle has concluded! Here are the winners and their
                    prizes.
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-blue-700 text-sm">
                    💡 The prize pool grows with each ticket purchase until the
                    raffle ends. Current minimum prizes shown below.
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-yellow-800 font-semibold flex items-center gap-2">
                        <span className="text-2xl">🥇</span> 1st Place
                      </p>
                    </div>
                    {raffle.is_released &&
                    winners?.winningTicketNumbers?.[0] ? (
                      <div className="text-center">
                        <p className="text-sm text-yellow-600 mb-1">
                          Winning Ticket
                        </p>
                        <p className="text-xl font-bold text-yellow-800">
                          #{winners.winningTicketNumbers[0]}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-yellow-600">
                          Prize Pool: 50%
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-800">
                        {raffle.is_released
                          ? (raffle.prize_pool * 0.5) / 1e9
                          : (raffle.balance * 0.5) / 1e9}{" "}
                        SUI
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-gray-800 font-semibold flex items-center gap-2">
                        <span className="text-2xl">🥈</span> 2nd Place
                      </p>
                    </div>
                    {raffle.is_released &&
                    winners?.winningTicketNumbers?.[1] ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">
                          Winning Ticket
                        </p>
                        <p className="text-xl font-bold text-gray-800">
                          #{winners.winningTicketNumbers[1]}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Prize Pool: 25%</p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">
                        {raffle.is_released
                          ? (raffle.prize_pool * 0.25) / 1e9
                          : (raffle.balance * 0.25) / 1e9}{" "}
                        SUI
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-6">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-amber-800 font-semibold flex items-center gap-2">
                        <span className="text-2xl">🥉</span> 3rd Place
                      </p>
                    </div>
                    {raffle.is_released &&
                    winners?.winningTicketNumbers?.[2] ? (
                      <div className="text-center">
                        <p className="text-sm text-amber-600 mb-1">
                          Winning Ticket
                        </p>
                        <p className="text-xl font-bold text-amber-800">
                          #{winners.winningTicketNumbers[2]}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-amber-600">
                          Prize Pool: 10%
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-800">
                        {raffle.is_released
                          ? (raffle.prize_pool * 0.1) / 1e9
                          : (raffle.balance * 0.1) / 1e9}{" "}
                        SUI
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-blue-500">📊</span>
                Raffle Statistics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-blue-600 text-sm font-medium">
                    Ticket Price
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {raffle.ticket_price / 1e9} SUI
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-green-600 text-sm font-medium">
                    Tickets Sold
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {raffle.tickets_sold}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-purple-600 text-sm font-medium">
                    Max Per Purchase
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {raffle.max_tickets_per_purchase}
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-indigo-600 text-sm font-medium">
                    Total Prize Pool
                  </p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {raffle.is_released
                      ? raffle.prize_pool / 1e9
                      : raffle.balance / 1e9}{" "}
                    SUI
                  </p>
                </div>
              </div>
            </div>

            {/* Your Tickets Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-green-500">🎫</span>
                Your Tickets
              </h2>
              {isLoadingTickets ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : userTickets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTickets.map((ticket) => {
                    // Ensure both sides are strings for comparison
                    const winningTicketStrings =
                      winners?.winningTicketNumbers?.map(String) ?? [];
                    const isWinner = winningTicketStrings.includes(
                      String(ticket.ticket_number)
                    );
                    const winnerIndex = isWinner
                      ? winningTicketStrings.findIndex(
                          (n) => String(ticket.ticket_number) === n
                        )
                      : -1;
                    const prizeAmount = isWinner
                      ? winnerIndex === 0
                        ? (raffle.prize_pool * 0.5) / 1e9
                        : winnerIndex === 1
                        ? (raffle.prize_pool * 0.25) / 1e9
                        : (raffle.prize_pool * 0.1) / 1e9
                      : 0;

                    return (
                      <div
                        key={ticket.id}
                        className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                          isWinner
                            ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50"
                            : "border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <p className="font-bold text-gray-900">
                            Ticket #{ticket.ticket_number}
                          </p>
                          {isWinner && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              Winner
                            </span>
                          )}
                        </div>
                        {isWinner && (
                          <div className="space-y-3">
                            <div className="bg-white/70 rounded-lg p-3">
                              <p className="text-xs text-gray-600">
                                Prize Amount
                              </p>
                              <p className="text-xl font-bold text-gray-900">
                                {prizeAmount} SUI
                              </p>
                            </div>
                            <button
                              onClick={() => handleClaimPrize(ticket.id)}
                              className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all text-sm"
                            >
                              Claim Prize
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🎫</span>
                    </div>
                    <p className="text-gray-600 text-lg font-medium">
                      You don&apos;t have any tickets for this raffle yet.
                    </p>
                    <p className="text-gray-500 mt-2">
                      Buy some tickets to participate!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buy Tickets Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-indigo-500">🎯</span>
                Buy Tickets
              </h2>
              {raffle.is_released ? (
                <div className="text-center py-12">
                  <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <p className="text-gray-600 text-lg font-medium">
                      This raffle has concluded. Check if you are among the
                      winners to claim your prize, or find another amazing
                      raffle to participate in!
                    </p>
                    <a
                      href="/explore"
                      className="mt-4 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Explore Raffles
                    </a>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleBuyTickets();
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label
                      htmlFor="ticketAmount"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Number of Tickets
                    </label>
                    <input
                      type="number"
                      id="ticketAmount"
                      min="1"
                      max={raffle.max_tickets_per_purchase}
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-gray-50"
                    />
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick select:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {quickTicketOptions.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setTicketAmount(amount)}
                            className={`w-full px-4 py-1.5 text-sm rounded-full transition-colors ${
                              ticketAmount === amount
                                ? "bg-indigo-100 text-indigo-700 font-medium"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-50 rounded-lg p-4">
                      <span className="text-gray-600">Price per ticket</span>
                      <span className="font-medium text-gray-900">
                        {raffle.ticket_price / 1e9} SUI
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-indigo-50 rounded-lg p-4">
                      <span className="text-indigo-600 font-medium">
                        Total cost
                      </span>
                      <span className="text-xl font-bold text-indigo-900">
                        {(raffle.ticket_price * ticketAmount) / 1e9} SUI
                      </span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={
                      isPurchasing || !isConnected || raffle.is_released
                    }
                    className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-lg"
                  >
                    {isPurchasing ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Purchasing...
                      </span>
                    ) : (
                      "Buy Tickets"
                    )}
                  </button>
                  {purchaseError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600">{purchaseError}</p>
                    </div>
                  )}
                  {transactionDigest && raffle.is_released && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-600 font-medium mb-2">
                        🎉 Raffle released successfully!
                      </p>
                      <a
                        href={`https://suiexplorer.com/txblock/${transactionDigest}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center"
                      >
                        View on Sui Explorer
                        <svg
                          className="w-4 h-4 ml-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
