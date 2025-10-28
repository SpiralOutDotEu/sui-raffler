import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { CONFIG_OBJECT_ID } from '@/lib/constants';

export interface AdminConfig {
    admin: string;
    controller: string;
    feeCollector: string;
    paused: boolean;
    permissionless: boolean;
    creationFee: number; // in MIST
    minTicketPrice: number; // in MIST
}

export function useAdminConfig() {
    const client = useSuiClient();

    return useQuery({
        queryKey: ['adminConfig'],
        queryFn: async (): Promise<AdminConfig> => {
            try {
                const configObject = await client.getObject({
                    id: CONFIG_OBJECT_ID,
                    options: {
                        showContent: true,
                    },
                });

                if (!configObject.data?.content || configObject.data.content.dataType !== 'moveObject') {
                    throw new Error('Config object not found or invalid');
                }

                const fields = configObject.data.content.fields as Record<string, unknown>;

                return {
                    admin: fields.admin as string,
                    controller: fields.controller as string,
                    feeCollector: fields.fee_collector as string,
                    paused: fields.paused as boolean,
                    permissionless: fields.permissionless as boolean,
                    creationFee: Number(fields.creation_fee ?? 0),
                    minTicketPrice: Number(fields.min_ticket_price ?? 0),
                };
            } catch (error) {
                console.error('Error fetching admin config:', error);
                throw error;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    });
}
