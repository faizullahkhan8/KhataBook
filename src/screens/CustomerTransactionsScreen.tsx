import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Button,
    Card,
    Input,
    TouchableAmount,
    Typography,
} from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomerById } from "../hooks";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { useDatabaseContext, useTheme } from "../store";
import { formatCurrency, formatDateTime } from "../utils";
import { TransactionType, CustomerId, TransactionId, AccountId } from "../models";
import { toInteger, fromInteger } from "../utils/currencyUtils";

export const CustomerTransactionsScreen: React.FC = () => {
    const { customerId } = useLocalSearchParams<{ customerId: string }>();
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { customer, refresh: refreshCustomer } = useCustomerById(
        db,
        parseInt(customerId || "0") as CustomerId,
    );

    const { deleteCustomer } = useCustomersWithAccounts(db);
    const {
        transactions,
        fetchTransactionsByAccount,
        createTransaction,
        deleteTransaction,
        loading: loadingTransactions,
        refresh: refreshTransactions,
    } = useTransactions(db);

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

    const accountId = customer?.accounts?.[0]?.id;

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

    const stats = useMemo(() => {
        const totalReceived = customerTransactions
            .filter((t) => t.type === TransactionType.CREDIT)
            .reduce((sum, t) => sum + t.amount, 0);
        const totalPaid = customerTransactions
            .filter((t) => t.type === TransactionType.DEBIT)
            .reduce((sum, t) => sum + t.amount, 0);
        
        // Return values remain as integers for stats; TouchableAmount will handle formatting
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
                            await deleteTransaction(transaction.id as TransactionId);
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

    const renderTransaction = ({ item }: { item: any }) => (
        <Card style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
                <Typography
                    variant="body-medium"
                    color={item.type === TransactionType.CREDIT ? "success" : "danger"}
                >
                    {item.type === TransactionType.CREDIT ? "RECEIVED" : "PAID"}
                </Typography>
                <View style={styles.transactionActions}>
                    <Typography variant="small-small" color="muted">
                        {formatDateTime(item.created_at || Date.now() / 1000)}
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
                    color={item.type === TransactionType.CREDIT ? "success" : "danger"}
                    style={styles.amount}
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

    if (!db) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Typography variant="body-medium" color="muted">
                    Loading database...
                </Typography>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: colors.surface, borderBottomColor: colors.border }]}
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
                            <Image
                                source={{ uri: customer.image_uri }}
                                style={styles.headerImage}
                            />
                        ) : (
                            <View style={[styles.headerImagePlaceholder, { backgroundColor: colors.background }]}>
                                <Ionicons
                                    name="person"
                                    size={20}
                                    color={colors.text.muted}
                                />
                            </View>
                        )}
                        <View style={styles.headerTextContainer}>
                            <Typography
                                variant="heading-large"
                                color="primary"
                                numberOfLines={1}
                                style={styles.customerName}
                            >
                                {customer?.name || "Customer"}
                            </Typography>
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
                <View style={styles.headerActions}>
                    <Pressable
                        onPress={() => {
                            if (customer?.id) {
                                router.push(
                                    `/add-customer?customerId=${customer.id}` as any,
                                );
                            }
                        }}
                        style={styles.headerActionButton}
                    >
                        <Ionicons
                            name="create-outline"
                            size={24}
                            color={colors.primary}
                        />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            if (customer?.id) {
                                Alert.alert(
                                    "Delete Customer",
                                    `Are you sure you want to delete ${customer.name}? This will also delete their account and all transactions.`,
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Delete",
                                            style: "destructive",
                                            onPress: async () => {
                                                await deleteCustomer(
                                                    customer.id!,
                                                );
                                                router.back();
                                            },
                                        },
                                    ],
                                );
                            }
                        }}
                        style={styles.headerActionButton}
                    >
                        <Ionicons
                            name="trash-outline"
                            size={24}
                            color={colors.danger}
                        />
                    </Pressable>
                </View>
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
                    <Ionicons
                        name="arrow-down"
                        size={20}
                        color={colors.text.primary}
                    />
                    <Typography variant="body-medium" color="primary">
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
                    <Ionicons
                        name="arrow-up"
                        size={20}
                        color={colors.text.primary}
                    />
                    <Typography variant="body-medium" color="primary">
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
    customerName: {
        flex: 1,
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
    headerActions: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    headerActionButton: {
        padding: Spacing.sm,
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
});
