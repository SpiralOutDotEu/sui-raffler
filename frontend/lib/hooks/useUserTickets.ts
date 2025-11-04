import { useQuery } from '@tanstack/react-query';
import { useSuiApi } from './useSuiApi';

export function useUserTickets(raffleId: string, userAddress?: string) {
    const api = useSuiApi();

    return useQuery({
        queryKey: ['tickets', raffleId, userAddress],
        queryFn: () => api.getUserTickets(raffleId, userAddress!),
        enabled: !!userAddress && !!raffleId,
        retry: 3,
        retryDelay: 1000,
    });
}
