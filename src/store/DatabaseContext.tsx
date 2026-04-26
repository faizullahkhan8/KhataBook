import React, { createContext, useContext, ReactNode } from 'react';
import * as SQLite from 'expo-sqlite';
import { useDatabase } from '../hooks/useDatabase';

export type InvalidationDomain = "customers" | "accounts" | "transactions" | "all";

interface DatabaseContextType {
    db: SQLite.SQLiteDatabase | null;
    isInitialized: boolean;
    error: Error | null;
    initDatabase: () => Promise<void>;
    refreshVersions: Record<InvalidationDomain, number>;
    invalidate: (domain?: InvalidationDomain) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
    undefined,
);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const { db, isInitialized, error, initDatabase } = useDatabase();
    const [refreshVersions, setRefreshVersions] = React.useState<
        Record<InvalidationDomain, number>
    >({
        customers: 0,
        accounts: 0,
        transactions: 0,
        all: 0,
    });

    const invalidate = React.useCallback((domain: InvalidationDomain = "all") => {
        setRefreshVersions((prev) => {
            if (domain === "all") {
                return {
                    customers: prev.customers + 1,
                    accounts: prev.accounts + 1,
                    transactions: prev.transactions + 1,
                    all: prev.all + 1,
                };
            }
            return {
                ...prev,
                [domain]: prev[domain] + 1,
                all: prev.all + 1,
            };
        });
    }, []);

    const value = React.useMemo(
        () => ({
            db,
            isInitialized,
            error,
            initDatabase,
            refreshVersions,
            invalidate,
        }),
        [db, isInitialized, error, initDatabase, refreshVersions, invalidate],
    );

    return (
        <DatabaseContext.Provider value={value}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
};
