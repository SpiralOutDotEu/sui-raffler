import { useQuery } from '@tanstack/react-query';
import { useSuiApi } from './useSuiApi';

export function useRaffleWinners(raffleId: string) {
    const api = useSuiApi();

    return useQuery({
        queryKey: ['winners', raffleId],
        queryFn: () => api.getRaffleWinners(raffleId),
        enabled: !!raffleId,
        retry: 3,
        retryDelay: 1000,
    });
}
