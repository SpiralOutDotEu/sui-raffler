import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import {
    PACKAGE_ID,
    MODULE,
    CLOCK_OBJECT_ID
} from '@/lib/constants';
import {
    Raffle,
    Ticket,
    RaffleEvent,
    RaffleFields,
    TicketFields,
    ClockFields,
    UserPurchaseInfo
} from '../types';
import { SuiErrorHandler } from '../utils/errorHandler';

export class SuiApiService {
    constructor(private client: SuiClient) { }

    async getRaffle(id: string): Promise<Raffle> {
        try {
            const response = await this.client.getObject({
                id,
                options: { showContent: true },
            });

            if (!response.data?.content) {
                throw SuiErrorHandler.createError('Raffle not found', 'OBJECT_NOT_FOUND');
            }

            if (response.data.content.dataType !== "moveObject") {
                throw SuiErrorHandler.createError('Invalid raffle format', 'INVALID_FORMAT');
            }

            const fields = response.data.content.fields as unknown as Raffle;

            // Get image URL from IPFS
            let imageUrl = "";
            try {
                const imageResponse = await fetch(`/api/v1/ipfs/retrieve?cid=${fields.image}`);
                if (imageResponse.ok) {
                    const blob = await imageResponse.blob();
                    imageUrl = URL.createObjectURL(blob);
                }
            } catch (error) {
                console.error("Error fetching image URL:", error);
            }

            return {
                ...fields,
                id,
                image: imageUrl,
            };
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async getRaffles(): Promise<Raffle[]> {
        try {
            // Query for RaffleCreated events
            const events = await this.client.queryEvents({
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
                    .filter(event => event.type === `${PACKAGE_ID}::${MODULE}::RaffleCreated`)
                    .map(async (event) => {
                        try {
                            const raffleData = event.parsedJson as RaffleEvent;

                            // Get current state of the raffle
                            const raffleObject = await this.client.getObject({
                                id: raffleData.raffle_id,
                                options: { showContent: true },
                            });

                            if (raffleObject.data?.content?.dataType === "moveObject") {
                                const fields = raffleObject.data.content.fields as unknown as RaffleFields;

                                // Get image URL from IPFS
                                let imageUrl = "";
                                try {
                                    const response = await fetch(`/api/v1/ipfs/retrieve?cid=${fields.image}`);
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
                                    image: imageUrl,
                                    tickets_sold: fields.tickets_sold,
                                    is_released: fields.is_released,
                                    balance: fields.balance,
                                    winners: fields.winners,
                                    prize_pool: fields.prize_pool,
                                } as Raffle;
                            }
                            return null;
                        } catch (error) {
                            console.error(`Error processing raffle ${event.id}:`, error);
                            return null;
                        }
                    })
            );

            return raffles.filter((raffle): raffle is Raffle => raffle !== null);
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async getUserTickets(raffleId: string, userAddress: string): Promise<Ticket[]> {
        try {
            if (!userAddress) return [];

            // Query for all tickets owned by the user
            const response = await this.client.getOwnedObjects({
                owner: userAddress,
                filter: {
                    MatchAll: [{
                        StructType: `${PACKAGE_ID}::${MODULE}::Ticket`,
                    }],
                },
                options: { showContent: true },
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
            const raffleResponse = await this.client.getObject({
                id: raffleId,
                options: { showContent: true },
            });

            if (raffleResponse.data?.content?.dataType === "moveObject") {
                const raffleFields = raffleResponse.data.content.fields as unknown as Raffle;
                if (raffleFields.is_released) {
                    const totalBalance = Number(raffleFields.balance);
                    for (const ticket of tickets) {
                        if (raffleFields.winners && raffleFields.winners[ticket.ticket_number]) {
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
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async getRaffleWinners(raffleId: string): Promise<{ hasWinners: boolean; winningTicketNumbers: number[] }> {
        try {
            // Validate raffle ID format
            if (!raffleId || typeof raffleId !== 'string') {
                console.warn('Invalid raffle ID provided to getRaffleWinners:', raffleId);
                return {
                    hasWinners: false,
                    winningTicketNumbers: [],
                };
            }

            // Validate Sui object ID format (should start with 0x and be 64 chars)
            if (!raffleId.startsWith('0x') || raffleId.length !== 66) {
                console.warn('Invalid Sui object ID format:', raffleId);
                return {
                    hasWinners: false,
                    winningTicketNumbers: [],
                };
            }

            // Add timeout and retry logic
            const maxRetries = 2;
            let lastError: unknown;

            console.log('Fetching winners for raffle:', raffleId);

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    const response = await Promise.race([
                        this.client.getObject({
                            id: raffleId,
                            options: { showContent: true },
                        }),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('Request timeout')), 10000)
                        )
                    ]);

                    if (response.data?.content?.dataType === "moveObject") {
                        const fields = response.data.content.fields as unknown as Raffle;
                        if (fields.is_released) {
                            return {
                                hasWinners: true,
                                winningTicketNumbers: fields.winning_tickets,
                            };
                        }
                    }

                    return {
                        hasWinners: false,
                        winningTicketNumbers: [],
                    };
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} failed for raffle ${raffleId}:`, error);

                    // Don't retry on validation errors
                    if (error instanceof Error &&
                        (error.message.includes('not found') ||
                            error.message.includes('does not exist') ||
                            error.message.includes('Invalid object ID'))) {
                        break;
                    }

                    // Wait before retry (exponential backoff)
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    }
                }
            }

            // If all retries failed, log and return default
            console.error("All attempts failed for raffle winners:", raffleId, lastError);
            return {
                hasWinners: false,
                winningTicketNumbers: [],
            };
        } catch (error) {
            console.error("Unexpected error fetching winners for raffle:", raffleId, error);
            return {
                hasWinners: false,
                winningTicketNumbers: [],
            };
        }
    }

    async getBlockchainTime(): Promise<number> {
        try {
            const clock = await this.client.getObject({
                id: CLOCK_OBJECT_ID,
                options: { showContent: true },
            });

            if (clock.data?.content?.dataType === "moveObject") {
                const fields = clock.data.content.fields as unknown as ClockFields;
                return Number(fields.timestamp_ms);
            }

            throw SuiErrorHandler.createError('Failed to get blockchain time', 'CLOCK_ERROR');
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    /**
     * Check if a raffle is in return state (ended with less than 3 tickets)
     */
    async isRaffleInReturnState(raffleId: string): Promise<boolean> {
        try {
            // Create a transaction to call the is_in_return_state function
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::is_in_return_state`,
                arguments: [
                    tx.object(raffleId),
                    tx.object(CLOCK_OBJECT_ID), // Clock object ID
                ],
            });

            // Use devInspectTransactionBlock to simulate the transaction without executing it
            const result = await this.client.devInspectTransactionBlock({
                transactionBlock: tx,
                sender: '0x0', // Use zero address for simulation
            });

            if (result.effects?.status?.status === 'success' && result.results?.[0]) {
                const returnValues = result.results[0].returnValues;

                if (returnValues && returnValues.length >= 1) {
                    // Parse the return value - it comes as base64 encoded string
                    const isInReturnStateBytes = returnValues[0][0];
                    const isInReturnStateArray = new Uint8Array(isInReturnStateBytes);

                    // Use DataView to read little-endian u8 value (boolean as u8)
                    const isInReturnState = new DataView(isInReturnStateArray.buffer).getUint8(0);

                    return Boolean(isInReturnState);
                }
            }

            // If we can't get the data, return false
            return false;
        } catch {
            // If there's an error, return false
            return false;
        }
    }

    /**
     * Get user purchase info for a specific raffle
     */
    async getUserPurchaseInfo(raffleId: string, userAddress: string): Promise<UserPurchaseInfo> {
        try {
            // Create a transaction to call the get_address_purchase_info function
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::get_address_purchase_info`,
                arguments: [
                    tx.object(raffleId),
                    tx.pure.address(userAddress),
                ],
            });

            // Use devInspectTransactionBlock to simulate the transaction without executing it
            const result = await this.client.devInspectTransactionBlock({
                transactionBlock: tx,
                sender: userAddress,
            });

            if (result.effects?.status?.status === 'success' && result.results?.[0]) {
                const returnValues = result.results[0].returnValues;

                if (returnValues && returnValues.length >= 2) {
                    // Parse the return values - they come as base64 encoded strings
                    // We need to decode them and convert to numbers
                    const purchasedSoFarBytes = returnValues[0][0];
                    const remainingAllowedBytes = returnValues[1][0];

                    // Convert from base64 to Uint8Array, then to number using DataView
                    const purchasedSoFarArray = new Uint8Array(purchasedSoFarBytes);
                    const remainingAllowedArray = new Uint8Array(remainingAllowedBytes);

                    // Use DataView to read little-endian u64 values
                    const purchasedSoFar = new DataView(purchasedSoFarArray.buffer).getBigUint64(0, true);
                    const remainingAllowed = new DataView(remainingAllowedArray.buffer).getBigUint64(0, true);

                    return {
                        purchased_so_far: Number(purchasedSoFar),
                        remaining_allowed: Number(remainingAllowed),
                    };
                }
            }

            // If we can't get the data, return default values
            console.warn('Could not retrieve user purchase info from contract');
            return {
                purchased_so_far: 0,
                remaining_allowed: 10, // Default fallback
            };
        } catch (error) {
            // If there's an error, return default values
            console.warn('Failed to get user purchase info:', error);
            return {
                purchased_so_far: 0,
                remaining_allowed: 10, // Default fallback
            };
        }
    }
}
