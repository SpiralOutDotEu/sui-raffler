import { useMemo } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { SuiApiService } from '@/lib/services/suiApiService';

export function useSuiApi() {
    const client = useSuiClient();
    return useMemo(() => new SuiApiService(client), [client]);
}
