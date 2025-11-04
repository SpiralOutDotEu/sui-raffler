import { useQuery } from '@tanstack/react-query';
import { useSuiApi } from './useSuiApi';

export function useRaffleReturnState(raffleId: string) {
    const suiApi = useSuiApi();

    return useQuery({
        queryKey: ['raffleReturnState', raffleId],
        queryFn: () => suiApi.isRaffleInReturnState(raffleId),
        enabled: !!raffleId,
        staleTime: 30000, // 30 seconds - return state doesn't change often
        refetchInterval: 60000, // 1 minute - check periodically
        refetchOnWindowFocus: true, // Refetch when user focuses the window
    });
}
