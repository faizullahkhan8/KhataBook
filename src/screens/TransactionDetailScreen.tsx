import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    LoadingScreen,
    TouchableAmount,
    Typography,
    ViewPhoto,
} from "../components";
import { Spacing } from "../constants";
import {
    LedgerFundingSource,
    useCustomerById,
    useDeleteAuthentication,
    useLedgerEntries,
} from "../hooks";
import { useTransactions } from "../hooks/useTransactions";
import {
    CustomerId,
    Transaction,
    TransactionId,
    TransactionType,
} from "../models";
import { TransactionService } from "../services/TransactionService";
import { useDatabaseContext, usePasscode, useTheme } from "../store";
import { formatDateTime } from "../utils";

export default function TransactionDetailScreen() {
    const { transactionId, customerId } = useLocalSearchParams<{
        transactionId: string;
        customerId: string;
    }>();

    const router = useRouter();
    const { t } = useTranslation();
    const { db } = useDatabaseContext();
    const { colors } = useTheme();
    const { setAutoLockSuspended } = usePasscode();
    const insets = useSafeAreaInsets();

    const { deleteTransaction } = useTransactions(db);
    const { entries: ledgerEntries } = useLedgerEntries(db);
    const { customer, loading: customerLoading } = useCustomerById(
        db,
        customerId
            ? (parseInt(customerId, 10) as CustomerId)
            : (undefined as unknown as CustomerId),
    );

    const transactionService = useMemo(
        () => (db ? new TransactionService(db) : null),
        [db],
    );

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
    const [voiceDuration, setVoiceDuration] = useState(0);

    const { requestDeleteAuthentication, deleteAuthenticationPrompt } =
        useDeleteAuthentication();

    // Resolve funding source from ledger entries (same logic as CustomerTransactionsScreen)
    // Must be before any early returns to comply with Rules of Hooks
    const fundingDetails = useMemo(() => {
        if (!transaction) return undefined;
        const entry = ledgerEntries.find((e) => e.id === transaction.id);
        if (!entry) return undefined;
        return {
            source: entry.funding_source as LedgerFundingSource,
            balanceFundedAmount: entry.balance_funded_amount,
            pocketFundedAmount: entry.pocket_funded_amount,
        };
    }, [ledgerEntries, transaction]);

    useEffect(() => {
        if (!transactionService || !transactionId) return;

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const tx = await transactionService.getTransactionById(
                    parseInt(transactionId, 10) as TransactionId,
                );
                if (!cancelled) {
                    setTransaction(tx);
                }
            } catch {
                Alert.alert("Error", "Failed to load transaction");
            } finally {
                setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [transactionId, transactionService]);

    const voiceUri = transaction?.voice_uri;
    const voicePlayer = useAudioPlayer(voiceUri ? { uri: voiceUri } : null);
    const playerStatus = useAudioPlayerStatus(voicePlayer);

    useEffect(() => {
        if (playerStatus && playerStatus.duration > 0) {
            setPlaybackProgress(
                playerStatus.currentTime / playerStatus.duration,
            );
            setPlaybackCurrentTime(playerStatus.currentTime);
            setVoiceDuration(playerStatus.duration);
        }
        if (playerStatus?.didJustFinish) {
            setIsPlaying(false);
            setPlaybackProgress(0);
            setPlaybackCurrentTime(0);
        }
    }, [playerStatus]);

    const togglePlayback = async () => {
        if (!voicePlayer) return;
        if (isPlaying) {
            await voicePlayer.pause();
            setIsPlaying(false);
        } else {
            await voicePlayer.play();
            setIsPlaying(true);
        }
    };

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleEdit = () => {
        if (!transaction || !customer) return;
        router.push(
            `/add-transaction?customerId=${customer.id}&transactionId=${transaction.id}&type=${transaction.type === TransactionType.CREDIT ? "receive" : "give"}` as any,
        );
    };

    const handleDelete = () => {
        let released = false;
        const releaseAutoLock = () => {
            if (released) return;
            released = true;
            setAutoLockSuspended(false);
        };
        setAutoLockSuspended(true);
        Alert.alert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: releaseAutoLock,
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        releaseAutoLock();
                        if (!transaction?.id) return;
                        void requestDeleteAuthentication(async () => {
                            try {
                                await deleteTransaction(transaction.id!);
                                router.back();
                            } catch {
                                Alert.alert(
                                    "Error",
                                    "Failed to delete transaction",
                                );
                            }
                        });
                    },
                },
            ],
            { onDismiss: releaseAutoLock },
        );
    };

    if (customerLoading || loading || !customer || !transaction) {
        return <LoadingScreen />;
    }

    const currentBalance = customer.accounts?.[0]?.current_balance || 0;

    // Resolve funding source from ledger entries (same logic as CustomerTransactionsScreen)
    const fundingSource: LedgerFundingSource =
        fundingDetails?.source ??
        (transaction.type === TransactionType.CREDIT ? "received" : "pocket");

    const isReceived = fundingSource === "received";
    const isSettled = fundingSource === "settled";
    const isSettledAndAdded = fundingSource === "settledAndAdded";
    const isAddedBalance = fundingSource === "added";
    const isBalanceFunded = fundingSource === "balance";
    const isMixedFunded = fundingSource === "mixed";

    const label = isSettled
        ? t("ledger.settled")
        : isSettledAndAdded
          ? t("ledger.settledAndAdded")
          : isAddedBalance
            ? t("ledger.addedBalance")
            : isReceived
              ? t("ledger.received")
              : isBalanceFunded
                ? t("ledger.paidFromBalance")
                : isMixedFunded
                  ? t("ledger.paidFromBalanceAndPocket")
                  : t("ledger.paidFromPocket");

    const isCreditVariant =
        isReceived || isSettled || isSettledAndAdded || isAddedBalance;
    const semanticColor: "success" | "danger" | "warning" = isCreditVariant
        ? "success"
        : isMixedFunded
          ? "warning"
          : "danger";

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: colors.background, paddingTop: insets.top },
            ]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View
                    style={[
                        styles.header,
                        { borderBottomColor: colors.border },
                    ]}
                >
                    <Pressable
                        onPress={() => router.back()}
                        style={[
                            styles.backButton,
                            { backgroundColor: `${colors.primary}15` },
                        ]}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={24}
                            color={colors.primary}
                        />
                    </Pressable>
                    <Typography variant="heading-medium" color="primary">
                        Transaction Details
                    </Typography>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Customer Info */}
                <View
                    style={[styles.card, { backgroundColor: colors.surface }]}
                >
                    <Typography variant="body-medium" color="muted">
                        {t("customerProfile.customer")}
                    </Typography>
                    <Typography variant="heading-small" color="primary">
                        {customer.name}
                    </Typography>
                    <Typography variant="body-small" color="muted">
                        {t("customerProfile.currentBalance")}: {currentBalance}
                    </Typography>
                </View>

                {/* Amount & Type */}
                <View
                    style={[styles.card, { backgroundColor: colors.surface }]}
                >
                    <Typography variant="body-medium" color={semanticColor}>
                        {label}
                    </Typography>
                    <View style={styles.amountRow}>
                        <TouchableAmount
                            amount={transaction.amount}
                            variant="heading-large"
                            color={semanticColor}
                        />
                    </View>
                    <Typography variant="body-small" color="muted">
                        {formatDateTime(
                            transaction.created_at || Date.now() / 1000,
                        )}
                    </Typography>
                    {/* Funding breakdown for settledAndAdded (type 2) and mixed/pocket+balance (type 5) */}
                    {(isMixedFunded || isSettledAndAdded) && fundingDetails && (
                        <View style={styles.fundingBreakdown}>
                            <View style={styles.fundingBreakdownRow}>
                                <Typography variant="body-small" color="muted">
                                    {isSettledAndAdded
                                        ? t("ledger.settledAmount")
                                        : t("ledger.fromCustomerBalance")}
                                </Typography>
                                <TouchableAmount
                                    amount={fundingDetails.balanceFundedAmount}
                                    variant="body-small"
                                    color="primary"
                                    style={{ color: colors.info }}
                                />
                            </View>
                            <View style={styles.fundingBreakdownRow}>
                                <Typography variant="body-small" color="muted">
                                    {isSettledAndAdded
                                        ? t("ledger.addedBalanceAmount")
                                        : t("ledger.fromPocketBusiness")}
                                </Typography>
                                <TouchableAmount
                                    amount={fundingDetails.pocketFundedAmount}
                                    variant="body-small"
                                    color="warning"
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Description */}
                {transaction.description ? (
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <Typography variant="body-medium" color="muted">
                            Description
                        </Typography>
                        <Typography variant="body-medium" color="primary">
                            {transaction.description}
                        </Typography>
                    </View>
                ) : null}

                {/* Photo */}
                {transaction.image_uri ? (
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <Typography
                            variant="body-medium"
                            color="muted"
                            style={styles.sectionLabel}
                        >
                            Photo
                        </Typography>
                        <ViewPhoto
                            source={{ uri: transaction.image_uri }}
                            accessibilityLabel="Transaction photo"
                            closeAccessibilityLabel="Close photo"
                        >
                            <Image
                                source={{ uri: transaction.image_uri }}
                                style={styles.photo}
                                contentFit="cover"
                            />
                        </ViewPhoto>
                    </View>
                ) : null}

                {/* Voice */}
                {transaction.voice_uri ? (
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <Typography
                            variant="body-medium"
                            color="muted"
                            style={styles.sectionLabel}
                        >
                            Voice
                        </Typography>
                        <View style={styles.voicePlayer}>
                            <Pressable
                                onPress={togglePlayback}
                                style={[
                                    styles.playButton,
                                    { backgroundColor: colors.primary },
                                ]}
                            >
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={20}
                                    color={colors.background}
                                />
                            </Pressable>
                            <View style={styles.progressContainer}>
                                <View
                                    style={[
                                        styles.progressTrack,
                                        { backgroundColor: colors.border },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                backgroundColor: colors.primary,
                                                width: `${playbackProgress * 100}%`,
                                            },
                                        ]}
                                    />
                                </View>
                                <Typography variant="small-small" color="muted">
                                    {formatDuration(playbackCurrentTime)} /{" "}
                                    {formatDuration(voiceDuration)}
                                </Typography>
                            </View>
                        </View>
                    </View>
                ) : null}
            </ScrollView>

            {/* Actions */}
            <View
                style={[
                    styles.actions,
                    {
                        backgroundColor: colors.background,
                        borderTopColor: colors.border,
                        paddingBottom:
                            Math.max(insets.bottom, Spacing.sm) + Spacing.sm,
                    },
                ]}
            >
                <Pressable
                    onPress={handleEdit}
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: `${colors.primary}15`,
                            borderColor: colors.primary,
                        },
                    ]}
                >
                    <Ionicons
                        name="create-outline"
                        size={20}
                        color={colors.primary}
                    />
                    <Typography variant="body-medium" color="primary">
                        Edit
                    </Typography>
                </Pressable>
                <Pressable
                    onPress={handleDelete}
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: `${colors.danger}15`,
                            borderColor: colors.danger,
                        },
                    ]}
                >
                    <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.danger}
                    />
                    <Typography variant="body-medium" color="danger">
                        Delete
                    </Typography>
                </Pressable>
            </View>

            {deleteAuthenticationPrompt}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        gap: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    headerSpacer: { flex: 1 },
    card: {
        borderRadius: 12,
        padding: Spacing.md,
        marginTop: Spacing.md,
        gap: Spacing.sm,
    },
    amountRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    sectionLabel: { marginBottom: Spacing.xs },
    photo: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    voicePlayer: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    progressContainer: {
        flex: 1,
        gap: Spacing.xs,
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },
    actions: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        gap: Spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        gap: Spacing.sm,
    },
    fundingBreakdown: {
        marginTop: Spacing.sm,
        gap: Spacing.xs,
    },
    fundingBreakdownRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: Spacing.md,
    },
});
