import { SuiError } from '../types';

export class SuiErrorHandler {
    static createError(message: string, code?: string, details?: unknown): SuiError {
        const error = new Error(message) as SuiError;
        error.code = code;
        error.details = details;
        return error;
    }

    static handleSuiError(error: unknown): SuiError {
        const errorMessage = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
            ? error.message
            : 'Unknown error occurred';

        if (errorMessage.includes('Insufficient funds')) {
            return this.createError('Insufficient SUI balance', 'INSUFFICIENT_FUNDS', error);
        }
        if (errorMessage.includes('User rejected')) {
            return this.createError('Transaction cancelled by user', 'USER_REJECTED', error);
        }
        if (errorMessage.includes('Object not found')) {
            return this.createError('Raffle not found', 'OBJECT_NOT_FOUND', error);
        }
        if (errorMessage.includes('Invalid transaction')) {
            return this.createError('Invalid transaction parameters', 'INVALID_TRANSACTION', error);
        }
        if (errorMessage.includes('Raffle already released')) {
            return this.createError('This raffle has already been released', 'RAFFLE_ALREADY_RELEASED', error);
        }
        if (errorMessage.includes('Raffle has not ended')) {
            return this.createError('Raffle has not ended yet', 'RAFFLE_NOT_ENDED', error);
        }

        return this.createError(errorMessage, 'UNKNOWN_ERROR', error);
    }

    static isRetryableError(error: unknown): boolean {
        const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'];
        return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
            ? retryableCodes.includes(error.code)
            : false;
    }

    static getErrorMessage(error: unknown): string {
        const suiError = this.handleSuiError(error);
        return suiError.message;
    }
}
