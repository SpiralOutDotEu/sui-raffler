import { useQuery } from '@tanstack/react-query';
import { useSuiApi } from './useSuiApi';
import { useCurrentAccount } from '@mysten/dapp-kit';

export function useUserPurchaseInfo(raffleId: string) {
    const suiApi = useSuiApi();
    const currentAccount = useCurrentAccount();

    return useQuery({
        queryKey: ['userPurchaseInfo', raffleId, currentAccount?.address],
        queryFn: () => {
            if (!currentAccount?.address) {
                throw new Error('No wallet connected');
            }
            return suiApi.getUserPurchaseInfo(raffleId, currentAccount.address);
        },
        enabled: !!raffleId && !!currentAccount?.address,
        staleTime: 10000, // 10 seconds - shorter for more real-time updates
        refetchInterval: 30000, // 30 seconds - more frequent updates
        refetchOnWindowFocus: true, // Refetch when user focuses the window
    });
}
