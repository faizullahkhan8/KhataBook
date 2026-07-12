import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { GoogleDriveService, BackupInfo } from '../services/GoogleDriveService';
import { useDatabaseContext } from '../store';

export const GoogleBackup: React.FC = () => {
    const { db } = useDatabaseContext();
    const { userInfo, isLoading: isInitializing, login: signIn, logout: signOut } = useGoogleAuth();
    const [latestBackup, setLatestBackup] = useState<BackupInfo | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const fetchLatestBackup = async () => {
        if (!userInfo) return;
        try {
            setIsLoading(true);
            const backup = await GoogleDriveService.getLatestBackup();
            setLatestBackup(backup);
        } catch (error) {
            console.error('Error fetching backup:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userInfo) {
            fetchLatestBackup();
        } else {
            setLatestBackup(null);
        }
    }, [userInfo]);

    const handleBackup = async () => {
        try {
            setIsLoading(true);
            await GoogleDriveService.uploadBackup(db);
            Alert.alert('Success', 'Backup uploaded successfully!');
            await fetchLatestBackup();
        } catch (error: any) {
            Alert.alert('Backup Failed', error.message || 'An error occurred during backup.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!latestBackup) return;
        
        Alert.alert(
            'Restore Backup',
            'Are you sure you want to restore this backup? This will overwrite your current data and restart the app.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await GoogleDriveService.downloadAndRestoreBackup(latestBackup, db);
                            // App will restart here if successful
                        } catch (error: any) {
                            setIsLoading(false);
                            Alert.alert('Restore Failed', error.message || 'An error occurred during restore.');
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    if (isInitializing) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    const handleSignIn = async () => {
        try {
            await signIn();
        } catch (error: any) {
            Alert.alert('Sign-In Error', error.message || 'Failed to sign in. Please check your configuration.');
        }
    };

    if (!userInfo) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Google Drive Backup</Text>
                <Text style={styles.description}>
                    Sign in with Google to securely backup and restore your data.
                </Text>
                <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={isLoading}>
                    <Text style={styles.buttonText}>Sign in with Google</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Signed in as {userInfo.name}</Text>
                <TouchableOpacity onPress={signOut}>
                    <Text style={styles.signOutText}>Sign out</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.backupInfo}>
                <Text style={styles.label}>Latest Backup:</Text>
                {isLoading ? (
                    <ActivityIndicator size="small" color="#0000ff" />
                ) : latestBackup ? (
                    <Text style={styles.value}>
                        {new Date(latestBackup.createdTime).toLocaleString()}
                    </Text>
                ) : (
                    <Text style={styles.value}>No backup found</Text>
                )}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity 
                    style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]} 
                    onPress={handleBackup}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Backup Now</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.secondaryButton, (!latestBackup || isLoading) && styles.disabledButton]} 
                    onPress={handleRestore}
                    disabled={!latestBackup || isLoading}
                >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>Restore Data</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },
    signOutText: {
        color: '#ff3b30',
        fontSize: 14,
        fontWeight: '600',
    },
    backupInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginRight: 10,
    },
    value: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButtonText: {
        color: '#007AFF',
    },
    disabledButton: {
        opacity: 0.5,
    }
});
