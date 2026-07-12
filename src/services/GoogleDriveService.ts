import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import * as ExpoSQLite from "expo-sqlite";
import RNRestart from "react-native-restart";

const ENCRYPTED_DB_NAME = "credit_management.encrypted.db";
const DATABASE_KEY_STORAGE_KEY = "khatabook.database-key.v1";
const BACKUP_FILE_NAME = "KhataBook_Backup.db";

export interface BackupInfo {
    id: string;
    name: string;
    createdTime: string;
    appProperties: {
        databaseKey: string;
    } | null;
}

export class GoogleDriveService {
    private static async getAccessToken(): Promise<string> {
        const tokens = await GoogleSignin.getTokens();
        return tokens.accessToken;
    }

    static async uploadBackup(activeDbInstance?: any): Promise<boolean> {
        try {
            if (activeDbInstance && typeof activeDbInstance.execAsync === "function") {
                try {
                    await activeDbInstance.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
                } catch (e) {
                    console.warn("Failed to checkpoint WAL", e);
                }
            }

            const accessToken = await this.getAccessToken();
            const databaseDirectory = String(
                ExpoSQLite.defaultDatabaseDirectory,
            )
                .replace(/^file:\/\//, "")
                .replace(/\/$/, "");

            const dbUri = `${databaseDirectory}/${ENCRYPTED_DB_NAME}`;
            const encryptionKey = await SecureStore.getItemAsync(
                DATABASE_KEY_STORAGE_KEY,
            );

            if (!encryptionKey) {
                throw new Error(
                    "Database encryption key not found in SecureStore.",
                );
            }

            const fileBase64 = await FileSystem.readAsStringAsync(
                `file://${dbUri}`,
                {
                    encoding: FileSystem.EncodingType.Base64,
                },
            );

            const boundary = "khatabook_multipart_boundary";
            const metadata = {
                name: BACKUP_FILE_NAME,
                parents: ["appDataFolder"],
                appProperties: {
                    databaseKey: encryptionKey,
                },
            };

            let body = `--${boundary}\r\n`;
            body += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
            body += JSON.stringify(metadata) + "\r\n";
            body += `--${boundary}\r\n`;
            body += "Content-Type: application/octet-stream\r\n";
            body += "Content-Transfer-Encoding: base64\r\n\r\n";
            body += fileBase64 + "\r\n";
            body += `--${boundary}--`;

            const response = await fetch(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": `multipart/related; boundary=${boundary}`,
                    },
                    body: body,
                },
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to upload to Google Drive: ${error}`);
            }

            return true;
        } catch (error) {
            console.error("uploadBackup error:", error);
            throw error;
        }
    }

    static async getLatestBackup(): Promise<BackupInfo | null> {
        try {
            const accessToken = await this.getAccessToken();
            const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}'&fields=files(id,name,createdTime,appProperties)&orderBy=createdTime desc&pageSize=1`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch backups: ${await response.text()}`,
                );
            }

            const data = await response.json();
            if (data.files && data.files.length > 0) {
                return data.files[0] as BackupInfo;
            }
            return null;
        } catch (error) {
            console.error("getLatestBackup error:", error);
            throw error;
        }
    }

    static async downloadAndRestoreBackup(
        backup: BackupInfo,
        activeDbInstance: any,
    ): Promise<void> {
        try {
            const accessToken = await this.getAccessToken();

            if (!backup.appProperties?.databaseKey) {
                throw new Error(
                    "Backup file is missing the encryption key in its metadata.",
                );
            }

            const encryptionKey = backup.appProperties.databaseKey;
            const tempFileUri = `${FileSystem.documentDirectory}temp_restore.db`;
            const downloadUrl = `https://www.googleapis.com/drive/v3/files/${backup.id}?alt=media`;

            const downloadResult = await FileSystem.downloadAsync(
                downloadUrl,
                tempFileUri,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                },
            );

            if (downloadResult.status !== 200) {
                throw new Error(
                    `Failed to download backup file. Status: ${downloadResult.status}`,
                );
            }

            const databaseDirectory = String(
                ExpoSQLite.defaultDatabaseDirectory,
            )
                .replace(/^file:\/\//, "")
                .replace(/\/$/, "");
            const dbUri = `${databaseDirectory}/${ENCRYPTED_DB_NAME}`;

            if (
                activeDbInstance &&
                typeof activeDbInstance.closeAsync === "function"
            ) {
                await activeDbInstance.closeAsync();
            }

            await Promise.all(
                ["", "-wal", "-shm", "-journal"].map((suffix) =>
                    FileSystem.deleteAsync(`file://${dbUri}${suffix}`, {
                        idempotent: true,
                    }),
                ),
            );

            await FileSystem.moveAsync({
                from: tempFileUri,
                to: `file://${dbUri}`,
            });

            await SecureStore.setItemAsync(
                DATABASE_KEY_STORAGE_KEY,
                encryptionKey,
                {
                    keychainAccessible:
                        SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
                },
            );

            RNRestart.restart();
        } catch (error) {
            console.error("downloadAndRestoreBackup error:", error);
            throw error;
        }
    }
}
