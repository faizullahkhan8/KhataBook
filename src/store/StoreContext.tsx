import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store } from '../models/Store';
import { StoreId } from '../models/types';
import { useDatabaseContext } from './DatabaseContext';
import { StoreService } from '../services/StoreService';
import { logger } from '../services/LogService';

const ACTIVE_STORE_STORAGE_KEY = '@khatabook/active_store_id';

interface StoreContextType {
    activeStoreId: StoreId | null;
    activeStore: Store | null;
    stores: Store[];
    isLoading: boolean;
    error: Error | null;
    switchStore: (id: StoreId) => Promise<void>;
    refreshStores: () => Promise<void>;
    createStore: (store: Omit<Store, 'id' | 'created_at' | 'updated_at' | 'is_default'>) => Promise<StoreId | undefined>;
    updateStore: (id: StoreId, store: Partial<Store>) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { db, isInitialized } = useDatabaseContext();
    const [stores, setStores] = useState<Store[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<StoreId | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const storeService = useMemo(() => (db ? new StoreService(db) : null), [db]);

    const fetchStoresAndSetDefault = useCallback(async () => {
        if (!storeService || !isInitialized) return;
        
        try {
            setIsLoading(true);
            const fetchedStores = await storeService.getAllStores();
            setStores(fetchedStores);

            if (fetchedStores.length > 0) {
                // Determine active store
                let initialStoreId: StoreId | null = null;
                const storedId = await AsyncStorage.getItem(ACTIVE_STORE_STORAGE_KEY);
                
                if (storedId) {
                    const parsedId = Number(storedId) as StoreId;
                    if (fetchedStores.some(s => s.id === parsedId)) {
                        initialStoreId = parsedId;
                    }
                }

                if (!initialStoreId) {
                    const defaultStore = fetchedStores.find(s => s.is_default) || fetchedStores[0];
                    initialStoreId = defaultStore.id;
                    await AsyncStorage.setItem(ACTIVE_STORE_STORAGE_KEY, String(initialStoreId));
                }

                setActiveStoreId(initialStoreId);
            }
        } catch (err) {
            void logger.error('stores', 'Failed to fetch stores', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [storeService, isInitialized]);

    useEffect(() => {
        fetchStoresAndSetDefault();
    }, [fetchStoresAndSetDefault]);

    const switchStore = useCallback(async (id: StoreId) => {
        if (stores.some(s => s.id === id)) {
            setActiveStoreId(id);
            await AsyncStorage.setItem(ACTIVE_STORE_STORAGE_KEY, String(id));
        } else {
            throw new Error(`Store with id ${id} not found`);
        }
    }, [stores]);

    const createStore = useCallback(async (store: Omit<Store, 'id' | 'created_at' | 'updated_at' | 'is_default'>) => {
        if (!storeService) return undefined;
        try {
            const newStoreId = await storeService.createStore({ ...store, is_default: false });
            await fetchStoresAndSetDefault();
            return newStoreId;
        } catch (err) {
            void logger.error('stores', 'Failed to create store', err);
            throw err;
        }
    }, [storeService, fetchStoresAndSetDefault]);

    const updateStore = useCallback(async (id: StoreId, store: Partial<Store>) => {
        if (!storeService) return;
        try {
            await storeService.updateStore(id, store);
            await fetchStoresAndSetDefault();
        } catch (err) {
            void logger.error('stores', 'Failed to update store', err);
            throw err;
        }
    }, [storeService, fetchStoresAndSetDefault]);

    const activeStore = useMemo(() => {
        if (!activeStoreId) return null;
        return stores.find(s => s.id === activeStoreId) || null;
    }, [activeStoreId, stores]);

    const value = useMemo(() => ({
        activeStoreId,
        activeStore,
        stores,
        isLoading,
        error,
        switchStore,
        refreshStores: fetchStoresAndSetDefault,
        createStore,
        updateStore
    }), [activeStoreId, activeStore, stores, isLoading, error, switchStore, fetchStoresAndSetDefault, createStore, updateStore]);

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStoreContext = () => {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStoreContext must be used within a StoreProvider');
    }
    return context;
};
