import React, { useCallback, useEffect, useRef, useState } from "react";
import { PasscodeVerificationModal } from "../components";
import { usePasscode } from "../store";

type DeleteAction = () => void | Promise<void>;

export const useDeleteAuthentication = () => {
    const { isEnabled, requireDeleteAuth } =
        usePasscode();
    const [pendingAction, setPendingAction] = useState<DeleteAction | null>(
        null,
    );
    const pendingActionRef = useRef<DeleteAction | null>(null);

    useEffect(() => {
        if (!pendingAction) return;
    }, [pendingAction]);

    const requestDeleteAuthentication = useCallback(
        async (action: DeleteAction) => {
            if (!isEnabled || !requireDeleteAuth) {
                try {
                    await action();
                } finally {
                }
                return;
            }
            pendingActionRef.current = action;
            setPendingAction(() => action);
        },
        [isEnabled, requireDeleteAuth],
    );

    const cancelDeleteAuthentication = useCallback(() => {
        pendingActionRef.current = null;
        setPendingAction(null);
    }, []);

    const completeDeleteAuthentication = useCallback(async () => {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setPendingAction(null);
        try {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            await action?.();
        } finally {
        }
    }, []);

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
