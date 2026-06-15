import React from "react";
import { useDatabaseContext } from "../store";
import { ErrorScreen } from "./ErrorScreen";
import { LoadingScreen } from "./LoadingScreen";

export const DatabaseSecurityGate: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const { isInitialized, error, initDatabase } = useDatabaseContext();

    if (!isInitialized && !error) {
        return <LoadingScreen />;
    }

    if (error) {
        return (
            <ErrorScreen
                error={error}
                type="database"
                onRetry={initDatabase}
            />
        );
    }

    return <>{children}</>;
};
