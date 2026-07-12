import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../services/LogService';

const APP_DIRECTORY = `${FileSystem.documentDirectory}KhataBook/`;

export const ensureAppDirectoryExists = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(APP_DIRECTORY);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(APP_DIRECTORY, { intermediates: true });
        }
    } catch (error) {
        void logger.error("database", "Failed to ensure app directory exists", error);
    }
};

export const saveToPermanentStorage = async (tempUri: string | null | undefined): Promise<string | null> => {
    if (!tempUri) return null;
    
    // If it's already in our permanent directory, return as is
    if (tempUri.startsWith(APP_DIRECTORY)) return tempUri;

    try {
        await ensureAppDirectoryExists();
        
        // Extract filename from the temp URI, fallback to timestamp if not available
        let filename = tempUri.split('/').pop() || `${Date.now()}`;
        
        // Remove any query params that might be on the filename
        filename = filename.split('?')[0];
        
        const newUri = `${APP_DIRECTORY}${Date.now()}_${filename}`;
        
        await FileSystem.copyAsync({ from: tempUri, to: newUri });
        void logger.info("database", "File saved to permanent storage", { uri: newUri });
        return newUri;
    } catch (error) {
        void logger.error("database", "Failed to save to permanent storage", error);
        // Fallback to original URI if copy fails so we don't break the app completely
        return tempUri;
    }
};

export const deleteFromStorage = async (uri: string | null | undefined): Promise<void> => {
    // Only attempt to delete if it's within our controlled permanent directory
    if (!uri || !uri.startsWith(APP_DIRECTORY)) return;
    
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            void logger.info("database", "File permanently deleted", { uri });
        }
    } catch (error) {
        void logger.error("database", "Failed to delete file", error);
    }
};
