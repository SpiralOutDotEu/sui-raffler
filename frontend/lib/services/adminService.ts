import { Transaction } from '@mysten/sui/transactions';
import {
    PACKAGE_ID,
    MODULE,
    CONFIG_OBJECT_ID,
} from '@/lib/constants';
import { TransactionResult } from '../types';
import { SuiErrorHandler } from '../utils/errorHandler';

export class AdminService {
    constructor(
        private signAndExecute: (params: { transaction: Transaction }) => Promise<TransactionResult>,
    ) { }

    async updateAdmin(newAdmin: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::update_admin`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.pure.address(newAdmin),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async updateController(newController: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::update_controller`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.pure.address(newController),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async updateFeeCollector(newFeeCollector: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::update_fee_collector`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.pure.address(newFeeCollector),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async setPermissionless(value: boolean): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::set_permissionless`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.pure.bool(value),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async pauseContract(): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::pause`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async unpauseContract(): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::unpause`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async pauseRaffle(raffleId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::pause_raffle`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.object(raffleId),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async unpauseRaffle(raffleId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::unpause_raffle`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.object(raffleId),
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }

    async releaseRaffle(raffleId: string): Promise<TransactionResult> {
        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE}::release_raffle`,
                arguments: [
                    tx.object(CONFIG_OBJECT_ID),
                    tx.object(raffleId),
                    tx.object("0x8"), // RANDOM_OBJECT_ID
                    tx.object("0x6"), // CLOCK_OBJECT_ID
                ],
            });

            return await this.signAndExecute({ transaction: tx });
        } catch (error) {
            throw SuiErrorHandler.handleSuiError(error);
        }
    }
}
