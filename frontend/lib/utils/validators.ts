import { CreateRaffleData } from '../types';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/lib/constants';

export function validateEndTime(
    startTime: number,
    endTime: number,
    currentBlockchainTime: number
): string | null {
    if (endTime <= startTime) {
        return "End time must be after start time";
    }
    if (endTime <= currentBlockchainTime) {
        return "End time must be in the future";
    }
    return null;
}

export function validateCreateRaffleData(data: CreateRaffleData): string | null {
    if (!data.name.trim()) {
        return "Please enter a raffle name";
    }
    if (!data.description.trim()) {
        return "Please enter a raffle description";
    }
    if (!data.imageCid) {
        return "Please upload an image";
    }
    if (!data.startTime || !data.endTime) {
        return "Please select start and end times";
    }
    if (!data.ticketPrice || parseFloat(data.ticketPrice) <= 0) {
        return "Please enter a valid ticket price";
    }
    if (!data.maxTicketsPerAddress || parseInt(data.maxTicketsPerAddress) <= 0) {
        return "Please enter a valid max tickets per address";
    }
    return null;
}

export function validateFileUpload(file: File): string | null {
    if (!file.type.startsWith("image/")) {
        return "Please upload an image file";
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return `File type not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
        return `Image size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    return null;
}

export function validateTicketAmount(amount: number, maxTicketsPerAddress: number, purchasedSoFar: number = 0): string | null {
    if (amount <= 0) {
        return "Ticket amount must be greater than 0";
    }
    if (amount > maxTicketsPerAddress) {
        return `Maximum ${maxTicketsPerAddress} tickets per address allowed`;
    }
    if (purchasedSoFar + amount > maxTicketsPerAddress) {
        const remaining = maxTicketsPerAddress - purchasedSoFar;
        return `You can only purchase ${remaining} more tickets (${purchasedSoFar}/${maxTicketsPerAddress} already purchased in your limit)`;
    }
    return null;
}

export function validateRaffleId(raffleId: string): boolean {
    // Basic validation for Sui object ID format
    return /^0x[a-fA-F0-9]{64}$/.test(raffleId);
}

export function validateAddress(address: string): boolean {
    // Basic validation for Sui address format
    return /^0x[a-fA-F0-9]{64}$/.test(address);
}
