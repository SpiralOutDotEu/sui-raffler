"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { PACKAGE_ID, MODULE } from "../constants";

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
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">
          Error loading raffles: {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Active Raffles
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 3,
        }}
      >
        {raffles?.map((raffle) => (
          <Box key={raffle.id}>
            <Link
              href={`/raffle/${raffle.id}`}
              style={{ textDecoration: "none" }}
            >
              <Card
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  "&:hover": { boxShadow: 6 },
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Raffle #{raffle.id.slice(0, 8)}...
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    Ticket Price: {raffle.ticket_price / 1e9} SUI
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    Tickets Sold: {raffle.tickets_sold}
                  </Typography>
                  <Typography color="textSecondary">
                    Status: {raffle.is_released ? "Ended" : "Active"}
                  </Typography>
                  <Typography
                    color="textSecondary"
                    variant="caption"
                    display="block"
                  >
                    Organizer: {raffle.organizer.slice(0, 8)}...
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </Box>
        ))}
        {raffles?.length === 0 && (
          <Box>
            <Typography>No active raffles found.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
