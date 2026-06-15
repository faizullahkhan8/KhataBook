import React, { useCallback, useEffect, useRef, useState } from "react";
import { PasscodeVerificationModal } from "../components";
import { usePasscode } from "../store";

type DeleteAction = () => void | Promise<void>;

export const useDeleteAuthentication = () => {
    const { isEnabled, requireDeleteAuth, setAutoLockSuspended } =
        usePasscode();
    const [pendingAction, setPendingAction] = useState<DeleteAction | null>(
        null,
    );
    const pendingActionRef = useRef<DeleteAction | null>(null);

    useEffect(() => {
        if (!pendingAction) return;
        setAutoLockSuspended(true);
        return () => setAutoLockSuspended(false);
    }, [pendingAction, setAutoLockSuspended]);

    const requestDeleteAuthentication = useCallback(
        async (action: DeleteAction) => {
            setAutoLockSuspended(true);
            if (!isEnabled || !requireDeleteAuth) {
                try {
                    await action();
                } finally {
                    setAutoLockSuspended(false);
                }
                return;
            }
            pendingActionRef.current = action;
            setPendingAction(() => action);
        },
        [isEnabled, requireDeleteAuth, setAutoLockSuspended],
    );

    const cancelDeleteAuthentication = useCallback(() => {
        pendingActionRef.current = null;
        setPendingAction(null);
        setAutoLockSuspended(false);
    }, [setAutoLockSuspended]);

    const completeDeleteAuthentication = useCallback(async () => {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setPendingAction(null);
        try {
            await action?.();
        } finally {
            setAutoLockSuspended(false);
        }
    }, [setAutoLockSuspended]);

    const deleteAuthenticationPrompt = (
        <PasscodeVerificationModal
            visible={Boolean(pendingAction)}
            onCancel={cancelDeleteAuthentication}
            onVerified={completeDeleteAuthentication}
        />
    );

    return {
        requestDeleteAuthentication,
        deleteAuthenticationPrompt,
    };
};
