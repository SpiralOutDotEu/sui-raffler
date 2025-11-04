// Time formatting utilities
export function formatTimeForDisplay(timestamp: number | string): string {
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

export function getRelativeTime(target: number): string {
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

export function formatDuration(start: number, end: number): string {
    const duration = end - start;
    const units = [
        { label: "year", ms: 1000 * 60 * 60 * 24 * 365 },
        { label: "month", ms: 1000 * 60 * 60 * 24 * 30 },
        { label: "day", ms: 1000 * 60 * 60 * 24 },
        { label: "hour", ms: 1000 * 60 * 60 },
        { label: "minute", ms: 1000 * 60 },
    ];

    for (const unit of units) {
        const value = Math.floor(duration / unit.ms);
        if (value > 0) {
            return `${value} ${unit.label}${value > 1 ? "s" : ""}`;
        }
    }
    return "less than a minute";
}

// Address formatting
export function truncateAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Blockchain time conversion
export function blockchainTimeToISOString(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function isoStringToBlockchainTime(isoString: string): number {
    const [datePart, timePart] = isoString.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    return Date.UTC(year, month - 1, day, hours, minutes);
}

// SUI amount formatting
export function formatSUI(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 SUI';

    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(2)}M SUI`;
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(2)}K SUI`;
    } else if (num >= 1) {
        return `${num.toFixed(2)} SUI`;
    } else {
        return `${num.toFixed(4)} SUI`;
    }
}

export function formatMistToSUI(mist: number | string): string {
    const num = typeof mist === 'string' ? parseFloat(mist) : mist;
    const sui = num / 1e9;
    return formatSUI(sui);
}
