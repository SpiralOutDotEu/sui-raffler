import { useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAdminConfig } from './useAdminConfig';

export function useAdminPermissions() {
    const currentAccount = useCurrentAccount();
    const { data: config, isLoading, error } = useAdminConfig();

    const permissions = useMemo(() => {
        if (!currentAccount || !config) {
            return {
                isAdmin: false,
                isController: false,
                isAdminOrController: false,
                isLoading: true,
                error: null,
            };
        }

        const userAddress = currentAccount.address;
        const isAdmin = config.admin === userAddress;
        const isController = config.controller === userAddress;
        const isAdminOrController = isAdmin || isController;

        return {
            isAdmin,
            isController,
            isAdminOrController,
            isLoading: false,
            error: null,
        };
    }, [currentAccount, config]);

    return {
        ...permissions,
        isLoading: isLoading || permissions.isLoading,
        error: error || permissions.error,
    };
}
