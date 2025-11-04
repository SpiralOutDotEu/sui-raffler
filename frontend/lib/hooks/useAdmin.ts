import { useMemo } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { AdminService } from '@/lib/services/adminService';
import { Transaction } from '@mysten/sui/transactions';
import { TransactionResult } from '@/lib/types';

export function useAdmin() {
    const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

    return useMemo(
        () => new AdminService(signAndExecute as unknown as (params: { transaction: Transaction }) => Promise<TransactionResult>),
        [signAndExecute]
    );
}
