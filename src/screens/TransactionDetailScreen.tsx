import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import * as MailComposer from "expo-mail-composer";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SMS from "expo-sms";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Share from "react-native-share";
import ViewShot from "react-native-view-shot";
import {
    LoadingScreen,
    OptionModal,
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
import { useDatabaseContext, useTheme } from "../store";
import { formatCurrency, formatDateTime } from "../utils";

type TransactionMenuOption =
    | "edit"
    | "delete"
    | "send-sms"
    | "send-whatsapp"
    | "set-reminder"
    | "send-email";

export default function TransactionDetailScreen() {
    const { transactionId, customerId } = useLocalSearchParams<{
        transactionId: string;
        customerId: string;
    }>();

    const router = useRouter();
    const { t } = useTranslation();
    const { db, refreshVersions } = useDatabaseContext();
    const { colors } = useTheme();
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
    const [balanceBefore, setBalanceBefore] = useState<number | null>(null);
    const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
    const [voiceDuration, setVoiceDuration] = useState(0);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(
        null,
    );

    const { requestDeleteAuthentication, deleteAuthenticationPrompt } =
        useDeleteAuthentication();

    const viewShotRef = useRef<ViewShot>(null);

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
                    if (db && tx && tx.id) {
                        try {
                            const result = await db.getFirstAsync<{
                                balance_before: number;
                            }>(
                                `
                                SELECT 
                                    a.current_balance - COALESCE((
                                        SELECT SUM(
                                            CASE 
                                                WHEN later.type = 0 THEN later.amount 
                                                ELSE -later.amount 
                                            END
                                        )
                                        FROM transactions later
                                        WHERE later.account_id = t.account_id
                                          AND later.is_deleted = 0
                                          AND (
                                              later.created_at > t.created_at 
                                              OR (later.created_at = t.created_at AND later.id >= t.id)
                                          )
                                    ), 0) AS balance_before
                                FROM transactions t
                                JOIN accounts a ON t.account_id = a.id
                                WHERE t.id = ?
                            `,
                                [tx.id],
                            );

                            if (result && !cancelled) {
                                setBalanceBefore(result.balance_before);
                                const after =
                                    tx.type === TransactionType.CREDIT
                                        ? result.balance_before - tx.amount
                                        : result.balance_before + tx.amount;
                                setBalanceAfter(after);
                            }
                        } catch (err) {
                            console.error("Failed to load balance", err);
                        }
                    }
                }
            } catch {
                Alert.alert("Error", "Failed to load transaction");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [transactionId, transactionService, refreshVersions.transactions]);

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
        };
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

    const menuOptions = useMemo(
        () => [
            {
                value: "send-whatsapp" as const,
                label: "WhatsApp Receipt",
                icon: "logo-whatsapp" as const,
                disabled: !customer?.phone,
            },
            {
                value: "send-email" as const,
                label: "Email Receipt",
                icon: "mail-outline" as const,
            },
            {
                value: "send-sms" as const,
                label: "SMS",
                icon: "chatbubble-outline" as const,
                disabled: !customer?.phone,
            },
            {
                value: "edit" as const,
                label: "Edit",
                icon: "create-outline" as const,
            },
            {
                value: "delete" as const,
                label: "Delete",
                icon: "trash-outline" as const,
            },
            {
                value: "set-reminder" as const,
                label: "Set Reminder",
                icon: "alarm-outline" as const,
            },
        ],
        [customer?.phone],
    );

    const handleMenuSelect = (value: TransactionMenuOption) => {
        setIsMenuVisible(false);
        switch (value) {
            case "send-whatsapp":
                void handleSendWhatsAppReceipt();
                break;
            case "send-email":
                void handleSendEmailReceipt();
                break;
            case "send-sms":
                void handleSendSmsReceipt();
                break;
            case "edit":
                handleEdit();
                break;
            case "delete":
                handleDelete();
                break;
            case "set-reminder":
                router.push(
                    `/add-reminder?customerId=${customer?.id}&transactionId=${transaction?.id}` as any,
                );
                break;
        }
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

    const generateReceiptMessage = () => {
        const amountStr = formatCurrency(transaction.amount);
        const dateStr = formatDateTime(
            transaction.created_at || Date.now() / 1000,
        );
        return `Transaction Receipt\nCustomer: ${customer.name}\nAmount: ${amountStr} (${isCreditVariant ? "Received" : "Paid"})\nDate: ${dateStr}${transaction.description ? "\nNotes: " + transaction.description : ""}`;
    };

    const handleSendWhatsAppReceipt = async () => {
        if (!customer?.phone) {
            Alert.alert(
                "Error",
                "Customer does not have a valid phone number.",
            );
            return;
        }

        try {
            const uri = await viewShotRef.current?.capture?.();
            if (!uri) throw new Error("Could not capture receipt");

            let formattedPhone = customer.phone.replace(/[^0-9]/g, "");

            // Auto-format phone number with country code if missing
            if (
                formattedPhone.startsWith("03") &&
                formattedPhone.length === 11
            ) {
                formattedPhone = "92" + formattedPhone.substring(1); // Pakistan
            } else if (
                formattedPhone.length === 10 &&
                /^[6-9]/.test(formattedPhone)
            ) {
                formattedPhone = "91" + formattedPhone; // India
            } else if (formattedPhone.startsWith("0")) {
                // Fallback for other leading zero formats, assuming Pakistan for this context
                formattedPhone = "92" + formattedPhone.substring(1);
            }

            const message = generateReceiptMessage();

            await Share.shareSingle({
                social: Share.Social.WHATSAPP,
                message: message,
                url: uri,
                whatsAppNumber: formattedPhone,
            });
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to send WhatsApp receipt.");
        }
    };

    const handleSendEmailReceipt = async () => {
        try {
            const uri = await viewShotRef.current?.capture?.();
            if (!uri) throw new Error("Could not capture receipt");

            const isAvailable = await MailComposer.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert("Error", "Email services are not available.");
                return;
            }

            const message = generateReceiptMessage();
            await MailComposer.composeAsync({
                subject: `Receipt: KhataBook Transaction with ${customer?.name}`,
                body: message + "\n\n- Sent via KhataBook App",
                attachments: [uri],
            });
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to send Email receipt.");
        }
    };

    const handleSendSmsReceipt = async () => {
        if (!customer?.phone) {
            Alert.alert(
                "Error",
                "Customer does not have a valid phone number.",
            );
            return;
        }
        const amountStr = formatCurrency(transaction.amount);
        const dateStr = formatDateTime(
            transaction.created_at || Date.now() / 1000,
        );
        const appSignature = "\n\n- Sent via KhataBook App";
        const msg = `Transaction Receipt:\nCustomer: ${customer.name}\nAmount: ${amountStr} (${isCreditVariant ? "Received" : "Paid"})\nDate: ${dateStr}${transaction.description ? "\nNotes: " + transaction.description : ""}${appSignature}`;
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                await SMS.sendSMSAsync([customer.phone], msg);
            } else {
                Alert.alert("Error", "SMS is not available on this device.");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to open SMS app.");
        }
    };

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: colors.background, paddingTop: insets.top },
            ]}
        >
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        marginTop: Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
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
                        name="arrow-back"
                        size={24}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography
                    variant="heading-medium"
                    color="primary"
                    style={{ flex: 1 }}
                >
                    Transaction Details
                </Typography>
                <Pressable
                    onPress={() => setIsMenuVisible(true)}
                    style={[
                        styles.backButton,
                        { backgroundColor: `${colors.primary}18` },
                    ]}
                >
                    <Ionicons
                        name="ellipsis-vertical"
                        size={20}
                        color={colors.primary}
                    />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Receipt Capture Area */}
                <ViewShot
                    ref={viewShotRef}
                    options={{ format: "png", quality: 0.9 }}
                    style={{
                        backgroundColor: colors.background,
                        paddingHorizontal: Spacing.sm,
                    }}
                >
                    {/* Customer Info */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <Typography variant="body-medium" color="muted">
                            {t("customerProfile.customer")}
                        </Typography>
                        <Typography variant="heading-small" color="primary">
                            {customer.name}
                        </Typography>
                        <Typography variant="body-small" color="muted">
                            {t("customerProfile.currentBalance")}:{" "}
                            {formatCurrency(currentBalance)}
                        </Typography>
                    </View>

                    {/* Amount & Type */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: colors.surface },
                        ]}
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
                        {(isMixedFunded || isSettledAndAdded) &&
                            fundingDetails && (
                                <View style={styles.fundingBreakdown}>
                                    <View style={styles.fundingBreakdownRow}>
                                        <Typography
                                            variant="body-small"
                                            color="muted"
                                        >
                                            {isSettledAndAdded
                                                ? t("ledger.settledAmount")
                                                : t(
                                                      "ledger.fromCustomerBalance",
                                                  )}
                                        </Typography>
                                        <TouchableAmount
                                            amount={
                                                fundingDetails.balanceFundedAmount
                                            }
                                            variant="body-small"
                                            color="primary"
                                            style={{ color: colors.info }}
                                        />
                                    </View>
                                    <View style={styles.fundingBreakdownRow}>
                                        <Typography
                                            variant="body-small"
                                            color="muted"
                                        >
                                            {isSettledAndAdded
                                                ? t("ledger.addedBalanceAmount")
                                                : t(
                                                      "ledger.fromPocketBusiness",
                                                  )}
                                        </Typography>
                                        <TouchableAmount
                                            amount={
                                                fundingDetails.pocketFundedAmount
                                            }
                                            variant="body-small"
                                            color="warning"
                                        />
                                    </View>
                                </View>
                            )}
                    </View>

                    {/* Running Balance */}
                    {balanceBefore !== null && balanceAfter !== null ? (
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: colors.surface },
                            ]}
                        >
                            <Typography variant="body-medium" color="muted">
                                {t("ledger.runningBalance", "Running Balance")}
                            </Typography>
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: Spacing.xs,
                                }}
                            >
                                <View>
                                    <Typography
                                        variant="small-small"
                                        color="muted"
                                    >
                                        Before
                                    </Typography>
                                    <TouchableAmount
                                        amount={balanceBefore}
                                        variant="body-medium"
                                        color={
                                            balanceBefore > 0
                                                ? "danger"
                                                : balanceBefore < 0
                                                  ? "success"
                                                  : "primary"
                                        }
                                    />
                                </View>
                                <Ionicons
                                    name="arrow-forward"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <View>
                                    <Typography
                                        variant="small-small"
                                        color="muted"
                                    >
                                        Transaction
                                    </Typography>
                                    <TouchableAmount
                                        amount={transaction.amount}
                                        variant="body-medium"
                                        color={
                                            transaction.type ===
                                            TransactionType.CREDIT
                                                ? "success"
                                                : "danger"
                                        }
                                    />
                                </View>
                                <Ionicons
                                    name="arrow-forward"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <View>
                                    <Typography
                                        variant="small-small"
                                        color="muted"
                                    >
                                        After
                                    </Typography>
                                    <TouchableAmount
                                        amount={balanceAfter}
                                        variant="body-medium"
                                        color={
                                            balanceAfter > 0
                                                ? "danger"
                                                : balanceAfter < 0
                                                  ? "success"
                                                  : "primary"
                                        }
                                    />
                                </View>
                            </View>
                        </View>
                    ) : null}

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
                                                    backgroundColor:
                                                        colors.primary,
                                                    width: `${playbackProgress * 100}%`,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Typography
                                        variant="small-small"
                                        color="muted"
                                    >
                                        {formatDuration(playbackCurrentTime)} /{" "}
                                        {formatDuration(voiceDuration)}
                                    </Typography>
                                </View>
                            </View>
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
                                    style={[
                                        styles.photo,
                                        imageAspectRatio
                                            ? {
                                                  aspectRatio: imageAspectRatio,
                                                  height: undefined,
                                              }
                                            : { height: 200 },
                                    ]}
                                    contentFit="contain"
                                    onLoad={(e) => {
                                        if (e.source.width && e.source.height) {
                                            setImageAspectRatio(
                                                e.source.width /
                                                    e.source.height,
                                            );
                                        }
                                    }}
                                />
                            </ViewPhoto>
                        </View>
                    ) : null}

                    {/* Receipt Footer */}
                    <View
                        style={{
                            marginTop: Spacing.lg,
                            marginBottom: Spacing.sm,
                            alignItems: "center",
                        }}
                    >
                        <Typography variant="small-small" color="muted">
                            Receipt generated on{" "}
                            {formatDateTime(Date.now() / 1000)}
                        </Typography>
                    </View>
                </ViewShot>
            </ScrollView>

            <OptionModal<TransactionMenuOption>
                visible={isMenuVisible}
                title="Transaction Options"
                options={menuOptions}
                selected={null}
                showSelectionIndicator={false}
                onSelect={handleMenuSelect}
                onClose={() => setIsMenuVisible(false)}
            />

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
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        gap: Spacing.md,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
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
        width: "100%",
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
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        gap: Spacing.md,
    },
    actionRow: {
        flexDirection: "row",
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
