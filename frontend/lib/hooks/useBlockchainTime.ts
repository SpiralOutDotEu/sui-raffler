import { useState, useEffect, useCallback } from 'react';
import { useSuiApi } from './useSuiApi';
import { BLOCKCHAIN_TIME_UPDATE_INTERVAL } from '@/lib/constants';

export function useBlockchainTime() {
    const api = useSuiApi();
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const updateTime = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const time = await api.getBlockchainTime();
            setCurrentTime(time);
        } catch (err) {
            console.error('Failed to fetch blockchain time:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch time');
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => {
        updateTime();
        const interval = setInterval(updateTime, BLOCKCHAIN_TIME_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [updateTime]);

    return { currentTime, isLoading, error, refetch: updateTime };
}
