import { useMemo } from 'react';
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { AdminService } from '@/lib/services/adminService';
import { Transaction } from '@mysten/sui/transactions';
import { TransactionResult } from '@/lib/types';

export function useAdmin() {
    const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
    const client = useSuiClient();

    return useMemo(
        () => new AdminService(signAndExecute as unknown as (params: { transaction: Transaction }) => Promise<TransactionResult>, client),
        [signAndExecute, client]
    );
}
