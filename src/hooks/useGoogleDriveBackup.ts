import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes,
} from "@react-native-google-signin/google-signin";
import * as SQLite from "expo-sqlite";
import { useCallback, useState } from "react";

const DB_NAME = "credit_management.db";
const BACKUP_FOLDER_NAME = "KhataBook_Backups";
const BACKUP_FILE_NAME = "khatabackup_backup.json";

interface BackupData {
    customers: any[];
    accounts: any[];
    transactions: any[];
    payments: any[];
    customer_order: any[];
    backupDate: string;
    version: string;
}

interface UseGoogleDriveBackupReturn {
    isSignedIn: boolean;
    userInfo: any | null;
    isLoading: boolean;
    lastBackupDate: string | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    uploadBackup: () => Promise<boolean>;
    downloadBackup: () => Promise<boolean>;
    checkExistingBackup: () => Promise<string | null>;
}

export const useGoogleDriveBackup = (): UseGoogleDriveBackupReturn => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userInfo, setUserInfo] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

    const getAccessToken = async (): Promise<string | null> => {
        try {
            const tokens = await GoogleSignin.getTokens();
            return tokens.accessToken;
        } catch (error) {
            console.error("Error getting access token:", error);
            return null;
        }
    };

    const signIn = useCallback(async () => {
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();

            if (isSuccessResponse(response)) {
                setUserInfo(response.data);
                setIsSignedIn(true);

                // Get access token for Drive API
                await GoogleSignin.getTokens();
            }
        } catch (error: any) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        console.log("User cancelled the sign-in");
                        break;
                    case statusCodes.IN_PROGRESS:
                        console.log("Sign-in already in progress");
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        console.log("Play services not available");
                        break;
                    default:
                        console.error("Sign-in error:", error);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        setIsLoading(true);
        try {
            await GoogleSignin.signOut();
            setIsSignedIn(false);
            setUserInfo(null);
            setLastBackupDate(null);
        } catch (error) {
            console.error("Sign-out error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const exportDatabaseData = async (): Promise<BackupData | null> => {
        try {
            const db = await SQLite.openDatabaseAsync(DB_NAME);

            const customers = await db.getAllAsync("SELECT * FROM customers");
            const accounts = await db.getAllAsync("SELECT * FROM accounts");
            const transactions = await db.getAllAsync(
                "SELECT * FROM transactions",
            );
            const payments = await db.getAllAsync("SELECT * FROM payments");
            const customer_order = await db.getAllAsync(
                "SELECT * FROM customer_order",
            );

            return {
                customers,
                accounts,
                transactions,
                payments,
                customer_order,
                backupDate: new Date().toISOString(),
                version: "1.0",
            };
        } catch (error) {
            console.error("Error exporting database:", error);
            return null;
        }
    };

    const findOrCreateBackupFolder = async (
        accessToken: string,
    ): Promise<string | null> => {
        try {
            // Search for existing folder
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );

            const searchData = await searchResponse.json();

            if (searchData.files && searchData.files.length > 0) {
                return searchData.files[0].id;
            }

            // Create folder if it doesn't exist
            const metadata = {
                name: BACKUP_FOLDER_NAME,
                mimeType: "application/vnd.google-apps.folder",
            };

            const createResponse = await fetch(
                "https://www.googleapis.com/drive/v3/files",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(metadata),
                },
            );

            const createData = await createResponse.json();
            return createData.id;
        } catch (error) {
            console.error("Error finding/creating folder:", error);
            return null;
        }
    };

    const uploadBackup = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                console.error("No access token available");
                return false;
            }

            const backupData = await exportDatabaseData();
            if (!backupData) {
                console.error("Failed to export database");
                return false;
            }

            const folderId = await findOrCreateBackupFolder(accessToken);
            if (!folderId) {
                console.error("Failed to find/create backup folder");
                return false;
            }

            // Check for existing backup file
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime)`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );

            const searchData = await searchResponse.json();

            const jsonContent = JSON.stringify(backupData, null, 2);
            const boundary = "-------314159265358979323846";
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const metadata = {
                name: BACKUP_FILE_NAME,
                mimeType: "application/json",
                parents: searchData.files?.length > 0 ? undefined : [folderId],
            };

            const multipartRequestBody =
                delimiter +
                "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
                JSON.stringify(metadata) +
                delimiter +
                "Content-Type: application/json\r\n\r\n" +
                jsonContent +
                close_delim;

            let uploadResponse;

            if (searchData.files && searchData.files.length > 0) {
                // Update existing file
                const fileId = searchData.files[0].id;
                uploadResponse = await fetch(
                    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,modifiedTime`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": `multipart/related; boundary="${boundary}"`,
                        },
                        body: multipartRequestBody,
                    },
                );
            } else {
                // Create new file
                uploadResponse = await fetch(
                    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": `multipart/related; boundary="${boundary}"`,
                        },
                        body: multipartRequestBody,
                    },
                );
            }

            const uploadData = await uploadResponse.json();

            if (uploadData.id) {
                setLastBackupDate(new Date().toLocaleString());
                return true;
            }

            return false;
        } catch (error) {
            console.error("Error uploading backup:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const checkExistingBackup = useCallback(async (): Promise<
        string | null
    > => {
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) return null;

            const folderId = await findOrCreateBackupFolder(accessToken);
            if (!folderId) return null;

            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false&fields=files(modifiedTime)`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );

            const searchData = await searchResponse.json();

            if (searchData.files && searchData.files.length > 0) {
                const modifiedTime = searchData.files[0].modifiedTime;
                setLastBackupDate(new Date(modifiedTime).toLocaleString());
                return modifiedTime;
            }

            return null;
        } catch (error) {
            console.error("Error checking backup:", error);
            return null;
        }
    }, []);

    const importDatabaseData = async (
        backupData: BackupData,
    ): Promise<boolean> => {
        try {
            const db = await SQLite.openDatabaseAsync(DB_NAME);

            await db.withTransactionAsync(async () => {
                // Clear existing data
                await db.runAsync("DELETE FROM customer_order");
                await db.runAsync("DELETE FROM payments");
                await db.runAsync("DELETE FROM transactions");
                await db.runAsync("DELETE FROM accounts");
                await db.runAsync("DELETE FROM customers");

                // Restore customers
                for (const customer of backupData.customers) {
                    await db.runAsync(
                        `INSERT INTO customers (id, name, phone, email, address, image_uri, notes, 
                        total_receivable, total_payable, last_transaction_at, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            customer.id,
                            customer.name,
                            customer.phone,
                            customer.email,
                            customer.address,
                            customer.image_uri,
                            customer.notes,
                            customer.total_receivable,
                            customer.total_payable,
                            customer.last_transaction_at,
                            customer.created_at,
                            customer.updated_at,
                        ],
                    );
                }

                // Restore accounts
                for (const account of backupData.accounts) {
                    await db.runAsync(
                        `INSERT INTO accounts (id, customer_id, account_number, account_type, 
                        credit_limit, current_balance, status, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            account.id,
                            account.customer_id,
                            account.account_number,
                            account.account_type,
                            account.credit_limit,
                            account.current_balance,
                            account.status,
                            account.created_at,
                            account.updated_at,
                        ],
                    );
                }

                // Restore transactions
                for (const transaction of backupData.transactions) {
                    await db.runAsync(
                        `INSERT INTO transactions (id, account_id, type, amount, description, 
                        reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            transaction.id,
                            transaction.account_id,
                            transaction.type,
                            transaction.amount,
                            transaction.description,
                            transaction.reference,
                            transaction.created_at,
                        ],
                    );
                }

                // Restore payments
                for (const payment of backupData.payments) {
                    await db.runAsync(
                        `INSERT INTO payments (id, account_id, amount, payment_method, 
                        reference, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            payment.id,
                            payment.account_id,
                            payment.amount,
                            payment.payment_method,
                            payment.reference,
                            payment.notes,
                            payment.created_at,
                        ],
                    );
                }

                // Restore customer order
                for (const order of backupData.customer_order) {
                    await db.runAsync(
                        "INSERT INTO customer_order (customer_id, sort_order) VALUES (?, ?)",
                        [order.customer_id, order.sort_order],
                    );
                }
            });

            return true;
        } catch (error) {
            console.error("Error importing database:", error);
            return false;
        }
    };

    const downloadBackup = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                console.error("No access token available");
                return false;
            }

            const folderId = await findOrCreateBackupFolder(accessToken);
            if (!folderId) {
                console.error("Failed to find backup folder");
                return false;
            }

            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false&fields=files(id)`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );

            const searchData = await searchResponse.json();

            if (!searchData.files || searchData.files.length === 0) {
                console.error("No backup file found");
                return false;
            }

            const fileId = searchData.files[0].id;

            const downloadResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );

            const backupData: BackupData = await downloadResponse.json();

            if (!backupData || !backupData.customers) {
                console.error("Invalid backup data");
                return false;
            }

            const success = await importDatabaseData(backupData);

            if (success) {
                setLastBackupDate(
                    new Date(backupData.backupDate).toLocaleString(),
                );
            }

            return success;
        } catch (error) {
            console.error("Error downloading backup:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isSignedIn,
        userInfo,
        isLoading,
        lastBackupDate,
        signIn,
        signOut,
        uploadBackup,
        downloadBackup,
        checkExistingBackup,
    };
};
