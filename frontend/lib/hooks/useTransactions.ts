import { useMemo } from 'react';
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { TransactionService } from '@/lib/services/transactionService';
import { Transaction } from '@mysten/sui/transactions';
import { TransactionResult } from '@/lib/types';

export function useTransactions() {
    const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
    const client = useSuiClient();

    return useMemo(
        () => new TransactionService(signAndExecute as unknown as (params: { transaction: Transaction }) => Promise<TransactionResult>, client),
        [signAndExecute, client]
    );
}
