"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PACKAGE_ID, MODULE } from "../../constants";

interface RaffleEvent {
  raffle_id: string;
  organizer: string;
  start_time: number;
  end_time: number;
  ticket_price: number;
}

interface Raffle {
  id: string;
  organizer: string;
  start_time: number;
  end_time: number;
  ticket_price: number;
  tickets_sold: number;
  is_released: boolean;
  balance: number;
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
                .fields as unknown as Raffle;
              return {
                id: raffleData.raffle_id,
                organizer: raffleData.organizer,
                start_time: raffleData.start_time,
                end_time: raffleData.end_time,
                ticket_price: raffleData.ticket_price,
                tickets_sold: fields.tickets_sold,
                is_released: fields.is_released,
                balance: fields.balance,
              };
            }
            return null;
          })
      );

      return raffles.filter((raffle): raffle is Raffle => raffle !== null);
    },
  });
}

export default function Explore() {
  const { data: raffles, isLoading, error } = useRaffles();

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
        <p className="text-red-600">Error loading raffles: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Active Raffles</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {raffles?.map((raffle) => (
          <div key={raffle.id}>
            <Link href={`/raffle/${raffle.id}`} className="block">
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-2">
                    Raffle #{raffle.id.slice(0, 8)}...
                  </h2>
                  <p className="text-gray-600 mb-2">
                    Ticket Price: {raffle.ticket_price / 1e9} SUI
                  </p>
                  <p className="text-gray-600 mb-2">
                    Tickets Sold: {raffle.tickets_sold}
                  </p>
                  <p className="text-gray-600 mb-2">
                    Status: {raffle.is_released ? "Ended" : "Active"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Organizer: {raffle.organizer.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
        {raffles?.length === 0 && (
          <div className="col-span-full">
            <p className="text-gray-600">No active raffles found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
