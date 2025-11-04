import { useQuery } from '@tanstack/react-query';
import { useSuiApi } from './useSuiApi';

export function useRaffles() {
    const api = useSuiApi();

    return useQuery({
        queryKey: ['raffles'],
        queryFn: () => api.getRaffles(),
        retry: 3,
        retryDelay: 1000,
        staleTime: 30000, // 30 seconds
    });
}
