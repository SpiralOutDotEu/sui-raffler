import { useCallback } from 'react';
import { notify } from '../utils/notifications';
import { SuiErrorHandler } from '../utils/errorHandler';

export function useNotifications() {
    const handleError = useCallback((error: unknown) => {
        const suiError = SuiErrorHandler.handleSuiError(error);
        notify.error(suiError.message);
        console.error('Sui Error:', suiError);
    }, []);

    const handleSuccess = useCallback((message: string) => {
        notify.success(message);
    }, []);

    const handleInfo = useCallback((message: string) => {
        notify.info(message);
    }, []);

    return { handleError, handleSuccess, handleInfo };
}
