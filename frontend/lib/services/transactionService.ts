import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import {
    PACKAGE_ID,
    MODULE,
    CONFIG_OBJECT_ID,
    RANDOM_OBJECT_ID,
    CLOCK_OBJECT_ID,
    CREATE_RAFFLE_TARGET,
    BUY_TICKETS_TARGET,
    RELEASE_RAFFLE_TARGET,
    BURN_TICKETS_TARGET
} from '@/lib/constants';
import { CreateRaffleData, TransactionResult } from '../types';
import { SuiErrorHandler } from '../utils/errorHandler';

export class TransactionService {
    constructor(
        private signAndExecute: (params: { transaction: Transaction }) => Promise<TransactionResult>,
        private client: SuiClient
    ) { }

    async createRaffle(data: CreateRaffleData, organizer: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            // Convert ticket price to MIST (1 SUI = 1e9 MIST)
            const ticketPriceInMist = Math.floor(parseFloat(data.ticketPrice) * 1e9);
            const startTime = Math.floor(data.startTime);
            const endTime = Math.floor(data.endTime);
            const maxTicketsPerAddress = parseInt(data.maxTicketsPerAddress);

            // Build Option<Coin<SUI>> for payment based on admin/controller and creation fee
            const needsFee = !data.isAdminOrController && (data.creationFeeMist ?? 0) > 0;
            let paymentOption;
            if (needsFee) {
                // Split a coin from gas for the exact creation fee
                const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(data.creationFeeMist!)]);
                // Create Some<Coin<SUI>> using moveCall
                paymentOption = tx.moveCall({
                    target: '0x1::option::some',
                    typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
                    arguments: [feeCoin],
                });
            } else {
                // Create None<Coin<SUI>> using moveCall
                paymentOption = tx.moveCall({
                    target: '0x1::option::none',
                    typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
                    arguments: [],
                });
            }

            tx.moveCall({
                target: CREATE_RAFFLE_TARGET,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    paymentOption,
                    tx.pure.string(data.name),
                    tx.pure.string(data.description),
                    tx.pure.string(data.imageCid),
                    tx.pure.u64(startTime),
                    tx.pure.u64(endTime),
                    tx.pure.u64(ticketPriceInMist),
                    tx.pure.u64(maxTicketsPerAddress),
                    tx.pure.address(organizer),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async buyTickets(raffleId: string, amount: number, ticketPrice: number): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            // Calculate total cost in MIST (1 SUI = 1e9 MIST)
            const totalCost = BigInt(amount) * BigInt(ticketPrice);

            // Split a coin with the exact amount needed
            const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(totalCost)]);

            // Add the buy_tickets call with all required arguments
            tx.moveCall({
                target: BUY_TICKETS_TARGET,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID), // Config object ID
                    tx.object(raffleId),
                    payment, // Use the split coin as payment
                    tx.pure.u64(amount),
                    tx.object(CLOCK_OBJECT_ID), // Clock object ID
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            const suiError = SuiErrorHandler.handleSuiError(error);

            // Don't log user cancellations as errors - they're expected behavior
            if (suiError.code !== 'USER_REJECTED') {
                console.error('Buy tickets error:', suiError);
            }

            throw suiError;
        }
    }

    async releaseRaffle(raffleId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: RELEASE_RAFFLE_TARGET,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.object(raffleId),
                    tx.object(RANDOM_OBJECT_ID),
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async claimPrize(raffleId: string, ticketId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::claim_prize`,
                arguments: [
                    tx.object(raffleId),
                    tx.object(ticketId), // Ticket object, not ticket number
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async claimOrganizerShare(raffleId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::claim_organizer_share`,
                arguments: [
                    tx.object(raffleId),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async claimProtocolFee(raffleId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::claim_protocol_fee`,
                arguments: [
                    tx.object(raffleId),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async returnTicket(raffleId: string, ticketId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::return_ticket`,
                arguments: [
                    tx.object(raffleId),
                    tx.object(ticketId), // Ticket object
                    tx.object(CLOCK_OBJECT_ID), // Clock object
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async burnTickets(raffleId: string, ticketIds: string[]): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            // Create ticket objects
            const ticketObjects = ticketIds.map(ticketId => tx.object(ticketId));

            // Create a vector of ticket objects using makeMoveVec
            const ticketsVector = tx.makeMoveVec({
                elements: ticketObjects
            });

            tx.moveCall({
                target: BURN_TICKETS_TARGET,
                arguments: [
                    tx.object(raffleId),
                    ticketsVector,
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            const suiError = SuiErrorHandler.handleSuiError(error);

            // Don't log user cancellations as errors - they're expected behavior
            if (suiError.code !== 'USER_REJECTED') {
                console.error('Burn tickets error:', suiError);
            }

            throw suiError;
        }
    }
}
