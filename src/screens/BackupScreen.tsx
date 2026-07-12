import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Spacing } from "../constants";
import { useGoogleAuth } from "../context/GoogleAuthContext";
import { BackupInfo, GoogleDriveService } from "../services/GoogleDriveService";
import { useDatabaseContext, useTheme } from "../store";
import { formatDateTime, checkInternetConnection } from "../utils";

export const BackupScreen: React.FC = () => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db } = useDatabaseContext();

    const {
        userInfo,
        lastBackupTime,
        login,
        logout,
        updateBackupTimestamp,
        isAuthenticated,
    } = useGoogleAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [cloudBackup, setCloudBackup] = useState<BackupInfo | null>(null);

    const fetchLatestCloudInfo = async () => {
        if (!isAuthenticated) return;
        try {
            const latest = await GoogleDriveService.getLatestBackup();
            setCloudBackup(latest);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchLatestCloudInfo();
    }, [isAuthenticated]);

    const handleBackup = async () => {
        const isOnline = await checkInternetConnection();
        if (!isOnline) {
            Alert.alert(
                t("backup.noInternetTitle", "No Internet"),
                t("backup.noInternetMessage", "Please check your internet connection and try again.")
            );
            return;
        }

        setIsProcessing(true);
        try {
            await GoogleDriveService.uploadBackup(db);
            await updateBackupTimestamp();
            await fetchLatestCloudInfo();
            Alert.alert(
                t("common.success"),
                t("backup.successMessage", "Backup uploaded successfully!"),
            );
        } catch (error) {
            Alert.alert(
                t("common.error"),
                t("backup.errorMessage", "Backup generation failed."),
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestore = async () => {
        if (!cloudBackup) return;

        const isOnline = await checkInternetConnection();
        if (!isOnline) {
            Alert.alert(
                t("backup.noInternetTitle", "No Internet"),
                t("backup.noInternetMessage", "Please check your internet connection and try again.")
            );
            return;
        }

        Alert.alert(
            t("backup.restoreTitle", "Restore Data"),
            t(
                "backup.restoreConfirm",
                "This will replace your entire local data and restart the application. Continue?",
            ),
            [
                { text: t("addCustomer.cancel"), style: "cancel" },
                {
                    text: t("backup.restoreButton", "Restore Now"),
                    style: "destructive",
                    onPress: async () => {
                        setIsProcessing(true);
                        try {
                            await GoogleDriveService.downloadAndRestoreBackup(
                                cloudBackup,
                                db,
                            );
                        } catch (error) {
                            Alert.alert(
                                t("common.error"),
                                t(
                                    "backup.restoreFailed",
                                    "Restore cycle failed.",
                                ),
                            );
                            setIsProcessing(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View
                style={[
                    styles.header,
                    {
                        marginTop: insets.top + Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                    },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={[
                        styles.backButton,
                        { backgroundColor: `${colors.primary}18` },
                    ]}
                >
                    <Ionicons
                        name="chevron-back"
                        size={20}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography variant="heading-medium" color="primary">
                    {t("settings.cloudBackup", "Cloud Backup")}
                </Typography>
            </View>

            <View style={styles.content}>
                {!isAuthenticated ? (
                    <Card
                        style={[
                            styles.authCard,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <View
                            style={[
                                styles.iconWrap,
                                { backgroundColor: `${colors.primary}15` },
                            ]}
                        >
                            <Ionicons
                                name="logo-google"
                                size={32}
                                color={colors.primary}
                            />
                        </View>
                        <Typography
                            variant="heading-small"
                            color="primary"
                            style={styles.centerText}
                        >
                            Google Drive Sync
                        </Typography>
                        <Typography
                            variant="body-small"
                            color="muted"
                            style={styles.centerText}
                        >
                            Connect your Google account to automatically
                            preserve your ledger files safely inside your
                            personal space.
                        </Typography>
                        <Pressable
                            style={[
                                styles.primaryButton,
                                { backgroundColor: colors.primary },
                            ]}
                            onPress={login}
                        >
                            <Typography
                                variant="body-medium"
                                style={styles.buttonTextLight}
                            >
                                Link Google Account
                            </Typography>
                        </Pressable>
                    </Card>
                ) : (
                    <View style={styles.panelContainer}>
                        <Card
                            style={[
                                styles.profileCard,
                                { backgroundColor: colors.surface },
                            ]}
                        >
                            <Image
                                source={{ uri: userInfo?.photo ?? undefined }}
                                style={styles.avatar}
                            />
                            <View style={styles.profileMeta}>
                                <Typography
                                    variant="body-medium"
                                    color="primary"
                                >
                                    {userInfo?.name}
                                </Typography>
                                <Typography variant="small-small" color="muted">
                                    {userInfo?.email}
                                </Typography>
                            </View>
                            <Pressable
                                style={[
                                    styles.disconnectBtn,
                                    { borderColor: colors.border },
                                ]}
                                onPress={logout}
                            >
                                <Ionicons
                                    name="log-out-outline"
                                    size={18}
                                    color={colors.danger}
                                />
                            </Pressable>
                        </Card>

                        <Card
                            style={[
                                styles.metaCard,
                                { backgroundColor: colors.surface },
                            ]}
                        >
                            <View style={styles.metaRow}>
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color={colors.text.muted}
                                />
                                <View style={styles.metaTextWrap}>
                                    <Typography
                                        variant="small-small"
                                        color="muted"
                                    >
                                        Last Local Backup
                                    </Typography>
                                    <Typography
                                        variant="body-medium"
                                        color="primary"
                                    >
                                        {lastBackupTime
                                            ? formatDateTime(
                                                  Math.floor(
                                                      new Date(
                                                          lastBackupTime,
                                                      ).getTime() / 1000,
                                                  ),
                                              )
                                            : "Never"}
                                    </Typography>
                                </View>
                            </View>

                            <View
                                style={[
                                    styles.divider,
                                    { backgroundColor: colors.border },
                                ]}
                            />

                            <View style={styles.metaRow}>
                                <Ionicons
                                    name="cloud-done-outline"
                                    size={20}
                                    color={colors.success}
                                />
                                <View style={styles.metaTextWrap}>
                                    <Typography
                                        variant="small-small"
                                        color="muted"
                                    >
                                        Available Cloud Version
                                    </Typography>
                                    <Typography
                                        variant="body-medium"
                                        color="primary"
                                    >
                                        {cloudBackup
                                            ? formatDateTime(
                                                  Math.floor(
                                                      new Date(
                                                          cloudBackup.createdTime,
                                                      ).getTime() / 1000,
                                                  ),
                                              )
                                            : "No cloud files found"}
                                    </Typography>
                                </View>
                            </View>
                        </Card>

                        <View style={styles.actionContainer}>
                            <Pressable
                                style={[
                                    styles.actionBtn,
                                    { backgroundColor: colors.primary },
                                    isProcessing && { opacity: 0.6 },
                                ]}
                                onPress={handleBackup}
                                disabled={isProcessing}
                            >
                                <Ionicons
                                    name="cloud-upload"
                                    size={20}
                                    color="#FFFFFF"
                                />
                                <Typography
                                    variant="body-medium"
                                    style={styles.buttonTextLight}
                                >
                                    Backup Now
                                </Typography>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.actionBtn,
                                    {
                                        backgroundColor: `${colors.success}15`,
                                        borderColor: colors.success,
                                        borderWidth: 1,
                                    },
                                    (!cloudBackup || isProcessing) && {
                                        opacity: 0.4,
                                    },
                                ]}
                                onPress={handleRestore}
                                disabled={!cloudBackup || isProcessing}
                            >
                                <Ionicons
                                    name="cloud-download"
                                    size={20}
                                    color={colors.success}
                                />
                                <Typography
                                    variant="body-medium"
                                    style={{
                                        color: colors.success,
                                        fontWeight: "600",
                                    }}
                                >
                                    Restore Backup
                                </Typography>
                            </Pressable>
                        </View>
                    </View>
                )}

                {isProcessing && (
                    <View
                        style={[
                            styles.loadingOverlay,
                            { backgroundColor: `${colors.background}cc` },
                        ]}
                    >
                        <ActivityIndicator
                            size="large"
                            color={colors.primary}
                        />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: Spacing.sm,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        position: "relative",
    },
    authCard: {
        padding: Spacing.xl,
        alignItems: "center",
        gap: Spacing.md,
        borderRadius: 10,
        marginTop: Spacing.md,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    centerText: {
        textAlign: "center",
    },
    primaryButton: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: Spacing.sm,
    },
    buttonTextLight: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    panelContainer: {
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.md,
        borderRadius: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    profileMeta: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    disconnectBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    metaCard: {
        padding: Spacing.lg,
        borderRadius: 10,
        gap: Spacing.md,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    metaTextWrap: {
        flex: 1,
    },
    divider: {
        height: 1,
        width: "100%",
    },
    actionContainer: {
        flexDirection: "row",
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 8,
        gap: Spacing.sm,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
    },
});
