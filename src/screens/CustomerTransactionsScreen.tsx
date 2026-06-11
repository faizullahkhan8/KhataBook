import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Button,
    Card,
    Input,
    TouchableAmount,
    Typography,
    ViewPhoto,
} from "../components";
import { Colors, Spacing } from "../constants";
import {
    LedgerFundingSource,
    useCustomerById,
    useLedgerEntries,
} from "../hooks";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useTransactions } from "../hooks/useTransactions";
import {
    AccountStatus,
    CustomerId,
    TransactionId,
    TransactionType,
} from "../models";
import { AccountService } from "../services/AccountService";
import { useDatabaseContext, usePasscode, useTheme } from "../store";
import { formatCurrency, formatDateTime } from "../utils";
import { toInteger } from "../utils/currencyUtils";

export const CustomerTransactionsScreen: React.FC = () => {
    const { customerId } = useLocalSearchParams<{ customerId: string }>();
    const { db, invalidate } = useDatabaseContext();
    const { setAutoLockSuspended } = usePasscode();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { customer, refresh: refreshCustomer } = useCustomerById(
        db,
        parseInt(customerId || "0") as CustomerId,
    );
    const accountService = useMemo(
        () => (db ? new AccountService(db) : null),
        [db],
    );

    const { deleteCustomer, loading: deleteLoading } =
        useCustomersWithAccounts(db);
    const {
        transactions,
        fetchTransactionsByAccount,
        createTransaction,
        deleteTransaction,
        loading: loadingTransactions,
    } = useTransactions(db);
    const { entries: ledgerEntries } = useLedgerEntries(db);

    const handleRefresh = useCallback(async () => {
        await refreshCustomer();
        if (customer?.accounts?.[0]?.id) {
            await fetchTransactionsByAccount(customer.accounts[0].id);
        }
    }, [refreshCustomer, fetchTransactionsByAccount, customer]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [transactionType, setTransactionType] = useState<TransactionType>(
        TransactionType.CREDIT,
    );
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isMenuActionActive, setIsMenuActionActive] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const accountId = customer?.accounts?.[0]?.id;
    const account = customer?.accounts?.[0];
    const isAccountActive = account?.status === AccountStatus.ACTIVE;
    const isAccountInactive = account?.status === AccountStatus.INACTIVE;

    useEffect(() => {
        setAutoLockSuspended(isMenuVisible || isMenuActionActive);
        return () => setAutoLockSuspended(false);
    }, [isMenuActionActive, isMenuVisible, setAutoLockSuspended]);

    useEffect(() => {
        if (accountId) {
            fetchTransactionsByAccount(accountId);
        }
    }, [accountId, fetchTransactionsByAccount]);

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
                    entry.funding_source,
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

        // Return values remain as integers for stats; TouchableAmount will handle formatting
        // Fixed: DEBIT increases balance (customer owes more), CREDIT decreases (customer pays back)
        const balance = totalPaid - totalReceived;
        return { totalReceived, totalPaid, balance };
    }, [customerTransactions]);

    const handleAddTransaction = async () => {
        if (!amount || !customer?.accounts?.[0]?.id) return;

        const account = customer.accounts[0];
        const accountId = account.id;
        if (!accountId) return;
        const transactionAmount = toInteger(parseFloat(amount));
        const currentBalance = account.current_balance || 0;
        const creditLimit = account.credit_limit || 0;

        // Only validate DEBIT transactions (when customer is borrowing/paying)
        // and only if credit limit is set (> 0)
        if (transactionType === TransactionType.DEBIT && creditLimit > 0) {
            const newBalance = currentBalance + transactionAmount;

            if (newBalance > creditLimit) {
                const remaining = Math.max(0, creditLimit - currentBalance);
                Alert.alert(
                    "Credit Limit Exceeded",
                    `Transaction cannot be completed.\n\n` +
                        `Credit Limit: ${formatCurrency(creditLimit)}\n` +
                        `Current Balance: ${formatCurrency(currentBalance)}\n` +
                        `Transaction Amount: ${formatCurrency(transactionAmount)}\n` +
                        `New Balance Would Be: ${formatCurrency(newBalance)}\n\n` +
                        `Remaining Available: ${formatCurrency(remaining)}`,
                    [{ text: "OK", style: "cancel" }],
                );
                return;
            }
        }

        await createTransaction({
            account_id: accountId,
            amount: transactionAmount,
            type: transactionType,
            description: description || undefined,
        });

        // Refresh data
        await fetchTransactionsByAccount(accountId);
        await refreshCustomer();

        setAmount("");
        setDescription("");
        setShowAddModal(false);
    };

    const openAddModal = (type: TransactionType) => {
        setTransactionType(type);
        setShowAddModal(true);
    };

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
                    onPress: async () => {
                        try {
                            await deleteCustomer(customer.id!);
                            router.replace("/" as any);
                        } catch {
                            Alert.alert(
                                t("customerProfile.deleteError"),
                                t("customerProfile.deleteErrorMessage"),
                            );
                        } finally {
                            setIsMenuActionActive(false);
                        }
                    },
                },
            ],
            {
                onDismiss: () => setIsMenuActionActive(false),
            },
        );
    };

    const handleDeleteTransaction = (transaction: any) => {
        Alert.alert(
            "Delete Transaction",
            `Are you sure you want to delete this ${transaction.type === TransactionType.CREDIT ? "RECEIVED" : "PAID"} transaction of ${formatCurrency(transaction.amount)}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (transaction.id) {
                            await deleteTransaction(
                                transaction.id as TransactionId,
                            );
                            if (customer?.accounts?.[0]?.id) {
                                await fetchTransactionsByAccount(
                                    customer.accounts[0].id,
                                );
                            }
                            await refreshCustomer();
                        }
                    },
                },
            ],
        );
    };

    const renderTransaction = ({ item }: { item: any }) => {
        const fundingSource: LedgerFundingSource =
            fundingSourcesByTransactionId.get(item.id as number) ??
            (item.type === TransactionType.CREDIT ? "received" : "pocket");
        const isReceived = fundingSource === "received";
        const isBalanceFunded = fundingSource === "balance";
        const label = isReceived
            ? t("ledger.receivedFrom")
            : isBalanceFunded
              ? t("ledger.paidFromBalance")
              : t("ledger.paidFromPocket");
        const semanticColor: "success" | "primary" | "warning" = isReceived
            ? "success"
            : isBalanceFunded
              ? "primary"
              : "warning";
        const balanceFundedStyle = isBalanceFunded
            ? { color: colors.info }
            : undefined;

        return (
            <Card style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                    <Typography
                        variant="body-medium"
                        color={semanticColor}
                        style={balanceFundedStyle}
                    >
                        {label}
                    </Typography>
                    <View style={styles.transactionActions}>
                        <Typography variant="small-small" color="muted">
                            {formatDateTime(
                                item.created_at || Date.now() / 1000,
                            )}
                        </Typography>
                        <Pressable
                            onPress={() => handleDeleteTransaction(item)}
                            style={styles.deleteIcon}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={18}
                                color={colors.danger}
                            />
                        </Pressable>
                    </View>
                </View>
                <View style={styles.amountContainer}>
                    <TouchableAmount
                        amount={item.amount}
                        variant="heading-medium"
                        color={semanticColor}
                        style={{
                            ...styles.amount,
                            ...(balanceFundedStyle || {}),
                        }}
                    />
                </View>
                {item.description && (
                    <Typography
                        variant="body-small"
                        color="muted"
                        style={styles.description}
                    >
                        {item.description}
                    </Typography>
                )}
            </Card>
        );
    };

    if (!db) {
        return (
            <View
                style={[styles.center, { backgroundColor: colors.background }]}
            >
                <Typography variant="body-medium" color="muted">
                    Loading database...
                </Typography>
            </View>
        );
    }

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + Spacing.md,
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={colors.text.primary}
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
                                    { backgroundColor: colors.background },
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
                            <Typography
                                variant="body-small"
                                color="muted"
                                numberOfLines={1}
                            >
                                {customer?.phone || ""}
                            </Typography>
                        </View>
                    </View>
                </View>
                <Pressable
                    onPress={() => {
                        setAutoLockSuspended(true);
                        setIsMenuVisible(true);
                    }}
                    style={styles.menuButton}
                    disabled={!customer}
                >
                    <Ionicons
                        name="ellipsis-vertical"
                        size={24}
                        color={
                            customer ? colors.text.primary : colors.text.muted
                        }
                    />
                </Pressable>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <Card
                    style={{ ...styles.statCard, ...styles.statCardReceived }}
                >
                    <Typography variant="body-small" color="muted">
                        Total Received
                    </Typography>
                    <TouchableAmount
                        amount={stats.totalReceived}
                        variant="heading-medium"
                        color="success"
                    />
                </Card>
                <Card style={{ ...styles.statCard, ...styles.statCardPaid }}>
                    <Typography variant="body-small" color="muted">
                        Total Paid
                    </Typography>
                    <TouchableAmount
                        amount={stats.totalPaid}
                        variant="heading-medium"
                        color="danger"
                    />
                </Card>
            </View>

            {/* Balance Card */}
            <View style={styles.accountInfo}>
                <Card style={styles.infoCard}>
                    <Typography variant="subheading-small" color="secondary">
                        Current Balance
                    </Typography>
                    <TouchableAmount
                        amount={stats.balance}
                        variant="heading-large"
                        color={stats.balance > 0 ? "danger" : "success"}
                    />
                </Card>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <Pressable
                    style={[
                        styles.actionButton,
                        { backgroundColor: colors.primary },
                    ]}
                    onPress={() => openAddModal(TransactionType.CREDIT)}
                >
                    <Ionicons name="arrow-down" size={20} color="#FFFFFF" />
                    <Typography
                        variant="body-medium"
                        color="primary"
                        style={styles.filledActionText}
                    >
                        Receive
                    </Typography>
                </Pressable>
                <Pressable
                    style={[
                        styles.actionButton,
                        { backgroundColor: colors.danger },
                    ]}
                    onPress={() => openAddModal(TransactionType.DEBIT)}
                >
                    <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                    <Typography
                        variant="body-medium"
                        color="primary"
                        style={styles.filledActionText}
                    >
                        Pay
                    </Typography>
                </Pressable>
            </View>

            {/* Modal */}
            {showAddModal && (
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.keyboardView}
                    >
                        <Card style={styles.modal}>
                            <Typography
                                variant="heading-medium"
                                color="primary"
                                style={styles.modalTitle}
                            >
                                {transactionType === TransactionType.CREDIT
                                    ? "Receive Payment"
                                    : "Make Payment"}
                            </Typography>
                            <Input
                                placeholder="Amount"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                            <Input
                                placeholder="Description (optional)"
                                value={description}
                                onChangeText={setDescription}
                            />
                            <View style={styles.modalActions}>
                                <Button
                                    title="Cancel"
                                    variant="secondary"
                                    onPress={() => setShowAddModal(false)}
                                    style={styles.modalButton}
                                />
                                <Button
                                    title="Save"
                                    onPress={handleAddTransaction}
                                    style={styles.modalButton}
                                />
                            </View>
                        </Card>
                    </KeyboardAvoidingView>
                </View>
            )}

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
                contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                refreshing={loadingTransactions}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Typography variant="body-medium" color="muted">
                            No transactions found
                        </Typography>
                    </View>
                }
                // Performance optimizations
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={Platform.OS === "android"}
                getItemLayout={(_, index) => ({
                    length: 100, // Estimated transaction card height
                    offset: 100 * index,
                    index,
                })}
            />

            {/* FAB
            <Pressable
                style={[styles.fab, { bottom: 20 + insets.bottom }]}
                onPress={() => setShowAddModal(true)}
            >
                <Ionicons name="add" size={28} color={Colors.text.primary} />
            </Pressable> */}

            <Modal
                visible={isMenuVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <Pressable
                    style={styles.menuBackdrop}
                    onPress={() => setIsMenuVisible(false)}
                >
                    <View
                        style={[
                            styles.menu,
                            {
                                top: insets.top + 64,
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                [false ? "left" : "right"]: Spacing.lg,
                            },
                        ]}
                    >
                        <Pressable
                            onPress={handleViewProfile}
                            disabled={!customer?.id}
                            style={[styles.menuItem, false && styles.rowRTL]}
                        >
                            <Ionicons
                                name="person-circle-outline"
                                size={22}
                                color={
                                    customer?.id
                                        ? colors.primary
                                        : colors.text.muted
                                }
                            />
                            <Typography
                                variant="body-medium"
                                color={customer?.id ? "primary" : "muted"}
                            >
                                {t("customerProfile.viewProfile")}
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={handleToggleAccountStatus}
                            disabled={!account?.id || isUpdatingStatus}
                            style={[styles.menuItem, false && styles.rowRTL]}
                        >
                            <Ionicons
                                name={
                                    isAccountActive
                                        ? "pause-circle-outline"
                                        : "checkmark-circle-outline"
                                }
                                size={22}
                                color={
                                    account?.id && !isUpdatingStatus
                                        ? colors.primary
                                        : colors.text.muted
                                }
                            />
                            <Typography
                                variant="body-medium"
                                color={
                                    account?.id && !isUpdatingStatus
                                        ? "primary"
                                        : "muted"
                                }
                            >
                                {isAccountActive
                                    ? t("customerProfile.deactivateAccount")
                                    : t("customerProfile.activateAccount")}
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={handleEditCustomer}
                            style={[styles.menuItem, false && styles.rowRTL]}
                        >
                            <Ionicons
                                name="create-outline"
                                size={22}
                                color={colors.primary}
                            />
                            <Typography variant="body-medium" color="primary">
                                {t("customerProfile.edit")}
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={handleDeleteCustomer}
                            disabled={deleteLoading}
                            style={[styles.menuItem, false && styles.rowRTL]}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={22}
                                color={
                                    deleteLoading
                                        ? colors.text.muted
                                        : colors.danger
                                }
                            />
                            <Typography
                                variant="body-medium"
                                color={deleteLoading ? "muted" : "danger"}
                            >
                                {t("customerProfile.delete")}
                            </Typography>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowRTL: {
        flexDirection: "row-reverse",
    },
    backButton: {
        marginBottom: Spacing.xs,
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
        backgroundColor: Colors.surface,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.sm,
    },
    accountInfo: {
        padding: Spacing.md,
    },
    infoCard: {
        alignItems: "center",
        padding: Spacing.lg,
    },
    transactionsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    list: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    transactionCard: {
        marginBottom: Spacing.md,
    },
    transactionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.xs,
    },
    transactionActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    deleteIcon: {
        padding: Spacing.xs,
    },
    amount: {
        marginTop: Spacing.sm,
    },
    amountContainer: {
        alignSelf: "flex-end",
        flexShrink: 0,
        maxWidth: 140,
    },
    description: {
        marginTop: Spacing.xs,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        marginTop: Spacing.xxl,
    },
    statsRow: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.md,
    },
    statCard: {
        flex: 1,
        alignItems: "center",
        padding: Spacing.md,
    },
    statCardReceived: {
        backgroundColor: "#10B98120",
    },
    statCardPaid: {
        backgroundColor: "#EF444420",
    },
    actionButtons: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.md,
        borderRadius: 8,
        gap: Spacing.sm,
    },
    filledActionText: {
        color: "#FFFFFF",
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 100,
        padding: Spacing.lg,
        zIndex: 1000,
    },
    keyboardView: {
        width: "100%",
        alignItems: "center",
    },
    modal: {
        width: "100%",
        maxWidth: 400,
        padding: Spacing.lg,
    },
    modalTitle: {
        marginBottom: Spacing.md,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    modalButton: {
        minWidth: 80,
    },
    fab: {
        position: "absolute",
        right: Spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: "transparent",
    },
    menu: {
        position: "absolute",
        minWidth: 230,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: Spacing.xs,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
});
