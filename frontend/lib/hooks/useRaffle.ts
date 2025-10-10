import { useQuery } from '@tanstack/react-query';
import { useSuiApi } from './useSuiApi';

export function useRaffle(id: string) {
    const api = useSuiApi();

    return useQuery({
        queryKey: ['raffle', id],
        queryFn: () => api.getRaffle(id),
        enabled: !!id,
        retry: 3,
        retryDelay: 1000,
    });
}
