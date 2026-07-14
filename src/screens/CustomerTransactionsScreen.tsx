import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SMS from "expo-sms";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    FlatList,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { AccountStatus, CustomerId, TransactionType } from "../models";
import { AccountService } from "../services/AccountService";
import { useDatabaseContext, useTheme } from "../store";
import { formatCurrency, formatDateTime } from "../utils";

type HeaderMenuOption =
    | "view-profile"
    | "toggle-status"
    | "edit"
    | "delete"
    | "send-sms"
    | "send-whatsapp"
    | "set-reminder";

export const CustomerTransactionsScreen: React.FC = () => {
    const { customerId } = useLocalSearchParams<{ customerId: string }>();
    const { db, invalidate } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();

    const {
        customer,
        loading: customerLoading,
        refresh: refreshCustomer,
    } = useCustomerById(db, parseInt(customerId || "0") as CustomerId);

    const accountService = useMemo(
        () => (db ? new AccountService(db) : null),
        [db],
    );

    const { deleteCustomer, loading: deleteLoading } =
        useCustomersWithAccounts(db);

    const {
        transactions,
        fetchTransactionsByAccount,
        loading: loadingTransactions,
        hasMore,
        nextPage,
    } = useTransactions(db);

    const { entries: ledgerEntries } = useLedgerEntries(db);
    const { requestDeleteAuthentication, deleteAuthenticationPrompt } =
        useDeleteAuthentication();

    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isMenuActionActive, setIsMenuActionActive] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const [hasInitiatedTransactionFetch, setHasInitiatedTransactionFetch] =
        useState(false);

    const accountId = customer?.accounts?.[0]?.id;
    const account = customer?.accounts?.[0];
    const isAccountActive = account?.status === AccountStatus.ACTIVE;
    const isAccountInactive = account?.status === AccountStatus.INACTIVE;

    useEffect(() => {
        if (!isMenuActionActive) return;
    }, [isMenuActionActive]);

    useEffect(() => {
        if (accountId) {
            fetchTransactionsByAccount(accountId);
            setHasInitiatedTransactionFetch(true);
        } else if (
            customer &&
            (!customer.accounts || customer.accounts.length === 0)
        ) {
            setHasInitiatedTransactionFetch(true);
        }
    }, [accountId, customer, fetchTransactionsByAccount]);

    const handleRefresh = useCallback(async () => {
        await refreshCustomer();
        if (customer?.accounts?.[0]?.id) {
            await fetchTransactionsByAccount(customer.accounts[0].id);
        }
    }, [refreshCustomer, fetchTransactionsByAccount, customer]);

    const customerTransactions = useMemo(() => {
        if (!customer?.accounts || customer.accounts.length === 0) return [];
        const accountIds = customer.accounts.map((a: any) => a.id);
        return transactions.filter((t) => accountIds.includes(t.account_id));
    }, [transactions, customer]);

    const fundingSourcesByTransactionId = useMemo(
        () =>
            new Map(
                ledgerEntries.map((entry) => [
                    entry.id as number,
                    {
                        source: entry.funding_source,
                        balanceFundedAmount: entry.balance_funded_amount,
                        pocketFundedAmount: entry.pocket_funded_amount,
                    },
                ]),
            ),
        [ledgerEntries],
    );

    const stats = useMemo(() => {
        const totalReceived = customerTransactions
            .filter((t) => t.type === TransactionType.CREDIT)
            .reduce((sum, t) => sum + t.amount, 0);
        const totalPaid = customerTransactions
            .filter((t) => t.type === TransactionType.DEBIT)
            .reduce((sum, t) => sum + t.amount, 0);
        const balance = totalPaid - totalReceived;
        return { totalReceived, totalPaid, balance };
    }, [customerTransactions]);

    const headerMenuOptions = useMemo(
        () => [
            {
                value: "view-profile" as const,
                label: t("customerProfile.viewProfile"),
                icon: "person-circle-outline" as const,
                disabled: !customer?.id,
            },
            {
                value: "toggle-status" as const,
                label: isAccountActive
                    ? t("customerProfile.deactivateAccount")
                    : t("customerProfile.activateAccount"),
                icon: isAccountActive
                    ? ("pause-circle-outline" as const)
                    : ("checkmark-circle-outline" as const),
                disabled: !account?.id || isUpdatingStatus,
            },
            {
                value: "edit" as const,
                label: t("customerProfile.edit"),
                icon: "create-outline" as const,
                disabled: !customer?.id,
            },
            {
                value: "delete" as const,
                label: t("customerProfile.delete"),
                icon: "trash-outline" as const,
                disabled: deleteLoading || !customer?.id,
            },
            {
                value: "send-sms" as const,
                label: t("customerProfile.sendSms", "Send SMS"),
                icon: "chatbubble-outline" as const,
                disabled: !customer?.phone,
            },
            {
                value: "send-whatsapp" as const,
                label: t("customerProfile.sendWhatsapp", "Send WhatsApp"),
                icon: "logo-whatsapp" as const,
                disabled: !customer?.phone,
            },
            {
                value: "set-reminder" as const,
                label: "Set Reminder",
                icon: "alarm-outline" as const,
                disabled: !customer?.id,
            },
        ],
        [
            account?.id,
            customer?.id,
            customer?.phone,
            deleteLoading,
            isAccountActive,
            isUpdatingStatus,
            t,
        ],
    );

    const handleViewProfile = () => {
        if (!customer?.id) return;
        setIsMenuActionActive(true);
        setIsMenuVisible(false);
        router.push(`/customer-profile?customerId=${customer.id}` as any);
        setTimeout(() => setIsMenuActionActive(false), 500);
    };

    const handleEditCustomer = () => {
        if (!customer?.id) return;
        setIsMenuActionActive(true);
        setIsMenuVisible(false);
        router.push(`/add-customer?customerId=${customer.id}` as any);
        setTimeout(() => setIsMenuActionActive(false), 500);
    };

    const handleToggleAccountStatus = async () => {
        if (!accountService || !account?.id) return;
        setIsMenuActionActive(true);
        setIsMenuVisible(false);
        setIsUpdatingStatus(true);
        try {
            await accountService.updateAccountStatus(
                account.id,
                isAccountActive ? AccountStatus.INACTIVE : AccountStatus.ACTIVE,
            );
            invalidate("accounts");
            invalidate("customers");
            await refreshCustomer();
        } catch {
            Alert.alert(
                t("customerProfile.statusUpdateError"),
                t("customerProfile.statusUpdateErrorMessage"),
            );
        } finally {
            setIsUpdatingStatus(false);
            setIsMenuActionActive(false);
        }
    };

    const handleDeleteCustomer = () => {
        if (!customer?.id) return;
        setIsMenuActionActive(true);
        setIsMenuVisible(false);
        Alert.alert(
            t("customerProfile.deleteTitle"),
            t("customerProfile.deleteMessage", { name: customer.name }),
            [
                {
                    text: t("customerProfile.cancel"),
                    style: "cancel",
                    onPress: () => setIsMenuActionActive(false),
                },
                {
                    text: t("customerProfile.delete"),
                    style: "destructive",
                    onPress: () => {
                        setIsMenuActionActive(false);
                        void requestDeleteAuthentication(async () => {
                            try {
                                await deleteCustomer(customer.id!);
                                router.back();
                            } catch {
                                Alert.alert(
                                    t("customerProfile.deleteError"),
                                    t("customerProfile.deleteErrorMessage"),
                                );
                            }
                        });
                    },
                },
            ],
            {
                onDismiss: () => setIsMenuActionActive(false),
            },
        );
    };

    const handleHeaderMenuSelect = (value: HeaderMenuOption) => {
        switch (value) {
            case "view-profile":
                handleViewProfile();
                break;
            case "toggle-status":
                void handleToggleAccountStatus();
                break;
            case "edit":
                handleEditCustomer();
                break;
            case "delete":
                handleDeleteCustomer();
                break;
            case "send-sms":
                void handleSendSms();
                break;
            case "send-whatsapp":
                void handleSendWhatsapp();
                break;
            case "set-reminder":
                setIsMenuVisible(false);
                router.push(`/add-reminder?customerId=${customer?.id}` as any);
                break;
        }
    };

    const generateMessageBody = () => {
        const amount = formatCurrency(Math.abs(stats.balance));
        const appSignature = "\n\n- Sent via KhataBook App";
        let message = "";

        if (stats.balance > 0) {
            message = t("customerMessages.balanceDue", {
                name: customer?.name,
                amount,
                defaultValue: `Dear ${customer?.name}, your current balance due is ${amount}. Please arrange a settlement at your earliest convenience.`,
            });
        } else if (stats.balance < 0) {
            message = t("customerMessages.balanceAdvance", {
                name: customer?.name,
                amount,
                defaultValue: `Dear ${customer?.name}, this is a balance update. You currently have an advance balance of ${amount} with us.`,
            });
        } else {
            message = t("customerMessages.balanceZero", {
                name: customer?.name,
                defaultValue: `Dear ${customer?.name}, your account balance is fully settled. Thank you for doing business with us! Keep managing your ledger easily with KhataBook.`,
            });
        }

        return message + appSignature;
    };

    const handleSendSms = async () => {
        if (!customer?.phone) return;
        setIsMenuActionActive(true);
        setIsMenuVisible(false);
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                await SMS.sendSMSAsync([customer.phone], generateMessageBody());
            } else {
                Alert.alert(
                    t("customerProfile.error", "Error"),
                    t(
                        "customerProfile.smsUnavailable",
                        "SMS is not available on this device.",
                    ),
                );
            }
        } catch (error) {
            Alert.alert(
                t("customerProfile.error", "Error"),
                t("customerProfile.smsError", "Failed to open SMS app."),
            );
        } finally {
            setIsMenuActionActive(false);
        }
    };

    const handleSendWhatsapp = async () => {
        if (!customer?.phone) return;
        setIsMenuActionActive(true);
        setIsMenuVisible(false);

        let phone = customer.phone.replace(/\D/g, "");
        if (phone.startsWith("0")) {
            phone = "92" + phone.substring(1);
        }

        const url = `whatsapp://send?text=${encodeURIComponent(generateMessageBody())}&phone=${phone}`;

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert(
                    t("customerProfile.error", "Error"),
                    t(
                        "customerProfile.whatsappUnavailable",
                        "WhatsApp is not installed on this device.",
                    ),
                );
            }
        } catch (error) {
            Alert.alert(
                t("customerProfile.error", "Error"),
                t("customerProfile.whatsappError", "Failed to open WhatsApp."),
            );
        } finally {
            setIsMenuActionActive(false);
        }
    };

    const renderTransaction = ({ item }: { item: any }) => {
        const fundingDetails = fundingSourcesByTransactionId.get(
            item.id as number,
        );

        const fundingSource: LedgerFundingSource =
            fundingDetails?.source ??
            (item.type === TransactionType.CREDIT ? "received" : "pocket");

        const isReceived = fundingSource === "received";
        const isSettled = fundingSource === "settled";
        const isSettledAndAdded = fundingSource === "settledAndAdded";
        const isAddedBalance = fundingSource === "added";
        const isBalanceFunded = fundingSource === "balance";
        const isMixedFunded = fundingSource === "mixed";

        const isCreditVariant =
            isReceived || isSettled || isSettledAndAdded || isAddedBalance;

        const semanticColor: "success" | "danger" | "warning" = isCreditVariant
            ? "success"
            : isMixedFunded
              ? "warning"
              : "danger";

        const typeIcon = isCreditVariant
            ? ("arrow-down-circle" as const)
            : isMixedFunded
              ? ("git-merge-outline" as const)
              : ("arrow-up-circle" as const);

        const shortLabel = isSettled
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

        const colorValue =
            semanticColor === "success"
                ? colors.success
                : semanticColor === "warning"
                  ? colors.warning
                  : colors.danger;

        const handleViewTransaction = () => {
            router.push(
                `/transaction-detail?transactionId=${item.id}&customerId=${customer?.id}` as any,
            );
        };

        return (
            <Pressable
                onPress={handleViewTransaction}
                style={[
                    styles.transactionRow,
                    { backgroundColor: colors.surface },
                ]}
            >
                <View
                    style={[
                        styles.typeIconWrap,
                        { backgroundColor: `${colorValue}18` },
                    ]}
                >
                    <Ionicons name={typeIcon} size={18} color={colorValue} />
                </View>

                <View style={styles.rowCenter}>
                    <Typography
                        variant="body-medium"
                        color={semanticColor}
                        numberOfLines={1}
                    >
                        {shortLabel}
                    </Typography>
                    <View style={styles.rowMeta}>
                        <Typography
                            variant="small-small"
                            color="muted"
                            numberOfLines={1}
                            style={styles.rowMetaText}
                        >
                            {item.description
                                ? item.description
                                : formatDateTime(
                                      item.created_at || Date.now() / 1000,
                                  )}
                        </Typography>

                        {item.voice_uri && (
                            <Ionicons
                                name="mic"
                                size={10}
                                color={colors.text.muted}
                            />
                        )}
                        {item.image_uri && (
                            <Ionicons
                                name="image-outline"
                                size={10}
                                color={colors.text.muted}
                            />
                        )}

                        {(isMixedFunded || isSettledAndAdded) &&
                            fundingDetails && (
                                <View
                                    style={[
                                        styles.splitPill,
                                        {
                                            backgroundColor: `${colorValue}18`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="layers-outline"
                                        size={9}
                                        color={colorValue}
                                    />
                                </View>
                            )}
                    </View>
                </View>

                <View style={styles.rowRight}>
                    <TouchableAmount
                        amount={item.amount}
                        variant="body-medium"
                        color={semanticColor}
                    />
                    <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={colors.text.muted}
                    />
                </View>
            </Pressable>
        );
    };

    if (
        !db ||
        customerLoading ||
        !hasInitiatedTransactionFetch ||
        (loadingTransactions && customerTransactions.length === 0)
    ) {
        return <LoadingScreen />;
    }

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

                <View style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        {customer?.image_uri ? (
                            <ViewPhoto
                                source={{ uri: customer.image_uri }}
                                accessibilityLabel={t(
                                    "photoViewer.openCustomer",
                                    {
                                        name: customer.name,
                                    },
                                )}
                                closeAccessibilityLabel={t("photoViewer.close")}
                            >
                                <Image
                                    source={{ uri: customer.image_uri }}
                                    style={styles.headerImage}
                                />
                            </ViewPhoto>
                        ) : (
                            <View
                                style={[
                                    styles.headerImagePlaceholder,
                                    { backgroundColor: colors.surface },
                                ]}
                            >
                                <Ionicons
                                    name="person"
                                    size={20}
                                    color={colors.text.muted}
                                />
                            </View>
                        )}
                        <View style={styles.headerTextContainer}>
                            <View style={styles.customerNameRow}>
                                <Typography
                                    variant="heading-large"
                                    color="primary"
                                    numberOfLines={1}
                                    style={styles.customerName}
                                >
                                    {customer?.name || "Customer"}
                                </Typography>
                                {isAccountInactive && (
                                    <View
                                        style={[
                                            styles.inactiveBadge,
                                            {
                                                backgroundColor: `${colors.warning}18`,
                                                borderColor: `${colors.warning}60`,
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.inactiveDot,
                                                {
                                                    backgroundColor:
                                                        colors.warning,
                                                },
                                            ]}
                                        />
                                        <Typography
                                            variant="small-small"
                                            color="warning"
                                            numberOfLines={1}
                                        >
                                            {t("customers.inactive")}
                                        </Typography>
                                    </View>
                                )}
                            </View>
                            {customer?.phone && (
                                <Typography
                                    variant="body-small"
                                    color="muted"
                                    numberOfLines={1}
                                >
                                    {customer.phone}
                                </Typography>
                            )}
                        </View>
                    </View>
                </View>

                <Pressable
                    onPress={() => {
                        setIsMenuVisible(true);
                    }}
                    style={styles.menuButton}
                    disabled={!customer}
                >
                    <Ionicons
                        name="ellipsis-vertical"
                        size={20}
                        color={
                            customer ? colors.text.primary : colors.text.muted
                        }
                    />
                </Pressable>
            </View>

            <View style={styles.balanceSection}>
                <View
                    style={[
                        styles.balanceCard,
                        { backgroundColor: colors.surface },
                    ]}
                >
                    <Typography variant="body-small" color="muted">
                        Current Balance
                    </Typography>
                    <TouchableAmount
                        amount={stats.balance}
                        variant="heading-large"
                        color={
                            stats.balance > 0
                                ? "danger"
                                : stats.balance < 0
                                  ? "success"
                                  : "primary"
                        }
                    />

                    <View
                        style={[
                            styles.balanceDivider,
                            { backgroundColor: colors.border },
                        ]}
                    />

                    <View style={styles.miniStatsRow}>
                        <View style={styles.miniStat}>
                            <View
                                style={[
                                    styles.miniStatDot,
                                    { backgroundColor: colors.success },
                                ]}
                            />
                            <Typography variant="small-small" color="muted">
                                Received
                            </Typography>
                            <TouchableAmount
                                amount={stats.totalReceived}
                                variant="body-small"
                                color="success"
                            />
                        </View>

                        <View
                            style={[
                                styles.miniStatSep,
                                { backgroundColor: colors.border },
                            ]}
                        />

                        <View style={styles.miniStat}>
                            <View
                                style={[
                                    styles.miniStatDot,
                                    { backgroundColor: colors.danger },
                                ]}
                            />
                            <Typography variant="small-small" color="muted">
                                Paid
                            </Typography>
                            <TouchableAmount
                                amount={stats.totalPaid}
                                variant="body-small"
                                color="danger"
                            />
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.transactionsHeader}>
                <Typography variant="heading-medium" color="primary">
                    Transactions
                </Typography>
                <Typography variant="body-small" color="muted">
                    {customerTransactions.length} records
                </Typography>
            </View>

            <FlatList
                data={customerTransactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id?.toString() || ""}
                contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
                refreshing={loadingTransactions}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Typography variant="body-medium" color="muted">
                            No transactions found
                        </Typography>
                    </View>
                }
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={Platform.OS === "android"}
                onEndReached={hasMore ? nextPage : undefined}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingTransactions && customerTransactions.length > 0 ? (
                        <View style={styles.footer}>
                            <Typography variant="body-small" color="muted">
                                Loading more...
                            </Typography>
                        </View>
                    ) : !hasMore && customerTransactions.length > 0 ? (
                        <View style={styles.footer}>
                            <Typography variant="body-small" color="muted">
                                All transactions loaded
                            </Typography>
                        </View>
                    ) : null
                }
            />

            <View
                style={[
                    styles.fabRow,
                    { bottom: Spacing.xxl * 2 + insets.bottom },
                ]}
            >
                <Pressable
                    style={[
                        styles.fab,
                        {
                            backgroundColor: colors.success,
                            shadowColor: colors.primary,
                        },
                    ]}
                    onPress={() =>
                        router.push(
                            `/add-transaction?customerId=${customerId}&type=receive` as any,
                        )
                    }
                >
                    <Ionicons
                        name="arrow-down"
                        size={24}
                        color={colors.background}
                    />
                </Pressable>

                <Pressable
                    style={[
                        styles.fab,
                        {
                            backgroundColor: colors.danger,
                            shadowColor: colors.primary,
                        },
                    ]}
                    onPress={() =>
                        router.push(
                            `/add-transaction?customerId=${customerId}&type=give` as any,
                        )
                    }
                >
                    <Ionicons
                        name="arrow-up"
                        size={24}
                        color={colors.background}
                    />
                </Pressable>
            </View>

            <OptionModal<HeaderMenuOption>
                visible={isMenuVisible}
                title={customer?.name || t("customerProfile.customer")}
                options={headerMenuOptions}
                selected={null}
                showSelectionIndicator={false}
                onSelect={handleHeaderMenuSelect}
                onClose={() => setIsMenuVisible(false)}
            />

            {deleteAuthenticationPrompt}
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
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    headerContent: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    headerTextContainer: {
        flex: 1,
        flexShrink: 1,
        marginRight: Spacing.sm,
    },
    customerNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    customerName: {
        flex: 1,
    },
    inactiveBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    inactiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    menuButton: {
        padding: Spacing.sm,
    },
    headerImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: Spacing.sm,
    },
    headerImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.sm,
    },
    balanceSection: {
        paddingHorizontal: Spacing.sm,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xs,
    },
    balanceCard: {
        borderRadius: 14,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    balanceDivider: {
        height: 1,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    miniStatsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    miniStat: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    miniStatDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    miniStatSep: {
        width: 1,
        height: 20,
        marginHorizontal: Spacing.sm,
    },
    transactionsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
    list: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.xs,
    },
    transactionRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        marginBottom: 6,
        gap: Spacing.sm,
    },
    typeIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    rowCenter: {
        flex: 1,
        gap: 2,
        minWidth: 0,
    },
    rowMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    rowMetaText: {
        flex: 1,
        minWidth: 0,
    },
    splitPill: {
        width: 16,
        height: 16,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    rowRight: {
        alignItems: "flex-end",
        flexDirection: "row",
        gap: 2,
        flexShrink: 0,
    },
    emptyState: {
        alignItems: "center",
        marginTop: Spacing.xxl,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabRow: {
        position: "absolute",
        right: Spacing.lg,
        flexDirection: "row",
        gap: Spacing.md,
        zIndex: 10,
    },
    footer: {
        padding: Spacing.md,
        alignItems: "center",
    },
});
