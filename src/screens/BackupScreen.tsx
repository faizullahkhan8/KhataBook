import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Typography } from "../components";
import { Spacing } from "../constants";
import { useGoogleDriveBackup } from "../hooks";
import { useLanguage, useTheme } from "../store";

export const BackupScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { isRTL } = useLanguage();

    const {
        isSignedIn,
        userInfo,
        isLoading,
        lastBackupDate,
        signIn,
        signOut,
        uploadBackup,
        downloadBackup,
        checkExistingBackup,
    } = useGoogleDriveBackup();

    const [hasCheckedBackup, setHasCheckedBackup] = useState(false);

    useEffect(() => {
        if (isSignedIn && !hasCheckedBackup) {
            checkExistingBackup();
            setHasCheckedBackup(true);
        }
    }, [isSignedIn, hasCheckedBackup, checkExistingBackup]);

    const handleSignIn = async () => {
        await signIn();
    };

    const handleSignOut = () => {
        Alert.alert(t("backup.signOutTitle"), t("backup.signOutMessage"), [
            { text: t("common.cancel"), style: "cancel" },
            {
                text: t("backup.signOut"),
                style: "destructive",
                onPress: async () => {
                    await signOut();
                    setHasCheckedBackup(false);
                },
            },
        ]);
    };

    const handleBackup = async () => {
        const success = await uploadBackup();
        if (success) {
            Alert.alert(t("backup.success"), t("backup.backupSuccessMessage"));
        } else {
            Alert.alert(t("backup.error"), t("backup.backupErrorMessage"));
        }
    };

    const handleRestore = () => {
        Alert.alert(t("backup.restoreTitle"), t("backup.restoreWarning"), [
            { text: t("common.cancel"), style: "cancel" },
            {
                text: t("backup.restore"),
                style: "destructive",
                onPress: async () => {
                    const success = await downloadBackup();
                    if (success) {
                        Alert.alert(
                            t("backup.success"),
                            t("backup.restoreSuccessMessage"),
                            [
                                {
                                    text: t("common.ok"),
                                    onPress: () => {
                                        // Reload app to reflect restored data
                                        // You may want to use react-native-restart here
                                    },
                                },
                            ],
                        );
                    } else {
                        Alert.alert(
                            t("backup.error"),
                            t("backup.restoreErrorMessage"),
                        );
                    }
                },
            },
        ]);
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + Spacing.lg,
                        alignItems: isRTL ? "flex-end" : "flex-start",
                    },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={[
                        styles.backButton,
                        { backgroundColor: `${colors.primary}20` },
                    ]}
                >
                    <Ionicons
                        name={isRTL ? "arrow-forward" : "arrow-back"}
                        size={24}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography variant="heading-large" color="primary">
                    {t("backup.title")}
                </Typography>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {!isSignedIn ? (
                    <Card
                        style={[
                            styles.signInCard,
                            { borderColor: colors.border },
                        ]}
                    >
                        <View style={styles.iconContainer}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    { backgroundColor: `${colors.primary}20` },
                                ]}
                            >
                                <Ionicons
                                    name="cloud-outline"
                                    size={40}
                                    color={colors.primary}
                                />
                            </View>
                        </View>
                        <Typography
                            variant="body-large"
                            color="primary"
                            style={[styles.signInText, isRTL && styles.rtlText]}
                        >
                            {t("backup.signInPrompt")}
                        </Typography>
                        <Typography
                            variant="small-small"
                            color="muted"
                            style={[
                                styles.signInSubtext,
                                isRTL && styles.rtlText,
                            ]}
                        >
                            {t("backup.signInDescription")}
                        </Typography>
                        <Button
                            title={t("backup.signInWithGoogle")}
                            onPress={handleSignIn}
                            disabled={isLoading}
                            style={styles.signInButton}
                        />
                        {isLoading && (
                            <ActivityIndicator
                                style={styles.loader}
                                color={colors.primary}
                            />
                        )}
                    </Card>
                ) : (
                    <>
                        <Card
                            style={[
                                styles.userCard,
                                { borderColor: colors.border },
                            ]}
                        >
                            <View style={styles.userInfoContainer}>
                                <View
                                    style={[
                                        styles.userIcon,
                                        {
                                            backgroundColor: `${colors.primary}20`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="person"
                                        size={24}
                                        color={colors.primary}
                                    />
                                </View>
                                <View style={styles.userTextContainer}>
                                    <Typography
                                        variant="body-large"
                                        color="primary"
                                    >
                                        {userInfo?.user?.name ||
                                            t("backup.signedInUser")}
                                    </Typography>
                                    <Typography
                                        variant="small-small"
                                        color="muted"
                                    >
                                        {userInfo?.user?.email}
                                    </Typography>
                                </View>
                            </View>
                            <Pressable
                                onPress={handleSignOut}
                                style={[
                                    styles.signOutButton,
                                    { backgroundColor: `${colors.danger}20` },
                                ]}
                            >
                                <Ionicons
                                    name="log-out-outline"
                                    size={20}
                                    color={colors.danger}
                                />
                            </Pressable>
                        </Card>

                        <Card
                            style={[
                                styles.backupStatusCard,
                                { borderColor: colors.border },
                            ]}
                        >
                            <View style={styles.statusRow}>
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="muted"
                                    style={styles.statusText}
                                >
                                    {lastBackupDate
                                        ? `${t("backup.lastBackup")}: ${lastBackupDate}`
                                        : t("backup.noBackup")}
                                </Typography>
                            </View>
                        </Card>

                        <View style={styles.actionsContainer}>
                            <Button
                                title={t("backup.backupNow")}
                                onPress={handleBackup}
                                disabled={isLoading}
                                style={styles.actionButton}
                            />

                            <Button
                                title={t("backup.restore")}
                                onPress={handleRestore}
                                disabled={isLoading}
                                variant="secondary"
                                style={styles.actionButton}
                            />
                        </View>

                        <Typography
                            variant="small-small"
                            color="muted"
                            style={[styles.infoText, isRTL && styles.rtlText]}
                        >
                            {t("backup.infoText")}
                        </Typography>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        gap: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xl,
        gap: Spacing.md,
    },
    signInCard: {
        padding: Spacing.xl,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: "center",
    },
    iconContainer: {
        marginBottom: Spacing.lg,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    signInText: {
        textAlign: "center",
        marginBottom: Spacing.sm,
    },
    signInSubtext: {
        textAlign: "center",
        marginBottom: Spacing.xl,
    },
    rtlText: {
        textAlign: "right",
    },
    signInButton: {
        width: "100%",
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
    },
    userInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    userIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    userTextContainer: {
        flex: 1,
    },
    signOutButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    backupStatusCard: {
        padding: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusText: {
        marginLeft: Spacing.sm,
    },
    actionsContainer: {
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    actionButton: {
        width: "100%",
    },
    infoText: {
        textAlign: "center",
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    loader: {
        marginTop: Spacing.md,
    },
});
