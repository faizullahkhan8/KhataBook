import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import {
    ErrorScreen,
    LoadingScreen,
    OptionModal,
    TouchableAmount,
    Typography,
    ViewPhoto,
} from "../components";
import { Spacing } from "../constants";
import { useDeleteAuthentication, useTrash } from "../hooks";
import { CustomerId, TransactionId } from "../models";
import { TrashedCustomer, TrashedTransaction } from "../services/TrashService";
import { useDatabaseContext, usePasscode, useTheme } from "../store";

type SelectionMenuOption = "toggle-all" | "restore" | "delete";

type MixedItem =
    | ({ kind: "customer" } & TrashedCustomer)
    | ({ kind: "transaction" } & TrashedTransaction);

export const TrashScreen: React.FC = () => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db } = useDatabaseContext();
    const { setAutoLockSuspended } = usePasscode();
    const { requestDeleteAuthentication, deleteAuthenticationPrompt } =
        useDeleteAuthentication();

    const {
        deletedCustomers,
        deletedTransactions,
        trashCount,
        loading,
        error,
        refresh,
        restoreCustomers,
        restoreTransactions,
        permanentDeleteCustomers,
        permanentDeleteTransactions,
        emptyTrash,
    } = useTrash(db);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<
        Set<CustomerId>
    >(new Set());
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<
        Set<TransactionId>
    >(new Set());
    const [isSelectionMenuVisible, setIsSelectionMenuVisible] = useState(false);

    // Merged list sorted by deleted_at descending
    const mixedList = useMemo<MixedItem[]>(() => {
        const customers: MixedItem[] = deletedCustomers.map((c) => ({
            kind: "customer",
            ...c,
        }));
        const transactions: MixedItem[] = deletedTransactions.map((t) => ({
            kind: "transaction",
            ...t,
        }));
        return [...customers, ...transactions].sort(
            (a, b) => b.deleted_at - a.deleted_at,
        );
    }, [deletedCustomers, deletedTransactions]);

    const selectedCount =
        selectedCustomerIds.size + selectedTransactionIds.size;

    const closeSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedCustomerIds(new Set());
        setSelectedTransactionIds(new Set());
        setIsSelectionMenuVisible(false);
    }, []);

    const toggleSelection = useCallback((item: MixedItem) => {
        if (item.kind === "customer") {
            setSelectedCustomerIds((prev) => {
                const next = new Set(prev);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
            });
        } else {
            setSelectedTransactionIds((prev) => {
                const next = new Set(prev);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
            });
        }
    }, []);

    const activateSelectionMode = useCallback(
        (item: MixedItem) => {
            setIsSelectionMode(true);
            toggleSelection(item);
        },
        [toggleSelection],
    );

    const selectAll = useCallback(() => {
        setSelectedCustomerIds(
            new Set(
                deletedCustomers
                    .map((c) => c.id)
                    .filter(Boolean) as CustomerId[],
            ),
        );
        setSelectedTransactionIds(
            new Set(
                deletedTransactions
                    .map((t) => t.id)
                    .filter(Boolean) as TransactionId[],
            ),
        );
    }, [deletedCustomers, deletedTransactions]);

    const deselectAll = useCallback(() => {
        setSelectedCustomerIds(new Set());
        setSelectedTransactionIds(new Set());
    }, []);

    // ── Single-item actions (inline restore / delete buttons) ─────────────────

    const handleRestoreOne = useCallback(
        (item: MixedItem) => {
            let released = false;
            const releaseAutoLock = () => {
                if (released) return;
                released = true;
                setAutoLockSuspended(false);
            };
            setAutoLockSuspended(true);
            Alert.alert(
                t("trash.restoreTitle"),
                t("trash.restoreMessage", { count: 1 }),
                [
                    {
                        text: t("trash.cancel"),
                        style: "cancel",
                        onPress: releaseAutoLock,
                    },
                    {
                        text: t("trash.restore"),
                        onPress: async () => {
                            try {
                                if (item.kind === "customer") {
                                    await restoreCustomers([
                                        item.id as CustomerId,
                                    ]);
                                } else {
                                    await restoreTransactions([
                                        item.id as TransactionId,
                                    ]);
                                }
                                void refresh();
                            } finally {
                                releaseAutoLock();
                            }
                        },
                    },
                ],
                { onDismiss: releaseAutoLock },
            );
        },
        [
            restoreCustomers,
            restoreTransactions,
            refresh,
            setAutoLockSuspended,
            t,
        ],
    );

    const handleDeleteOne = useCallback(
        (item: MixedItem) => {
            let released = false;
            const releaseAutoLock = () => {
                if (released) return;
                released = true;
                setAutoLockSuspended(false);
            };
            setAutoLockSuspended(true);
            Alert.alert(
                t("trash.permanentDeleteTitle"),
                t("trash.permanentDeleteMessage", { count: 1 }),
                [
                    {
                        text: t("trash.cancel"),
                        style: "cancel",
                        onPress: releaseAutoLock,
                    },
                    {
                        text: t("trash.permanentDelete"),
                        style: "destructive",
                        onPress: () => {
                            void requestDeleteAuthentication(async () => {
                                try {
                                    if (item.kind === "customer") {
                                        await permanentDeleteCustomers([
                                            item.id as CustomerId,
                                        ]);
                                    } else {
                                        await permanentDeleteTransactions([
                                            item.id as TransactionId,
                                        ]);
                                    }
                                    void refresh();
                                } finally {
                                    releaseAutoLock();
                                }
                            });
                        },
                    },
                ],
                { onDismiss: releaseAutoLock },
            );
        },
        [
            permanentDeleteCustomers,
            permanentDeleteTransactions,
            refresh,
            requestDeleteAuthentication,
            setAutoLockSuspended,
            t,
        ],
    );

    // ── Bulk selection actions ────────────────────────────────────────────────

    const handleRestoreSelected = useCallback(() => {
        if (selectedCount === 0) return;
        let released = false;
        const releaseAutoLock = () => {
            if (released) return;
            released = true;
            setAutoLockSuspended(false);
        };
        setAutoLockSuspended(true);
        Alert.alert(
            t("trash.restoreTitle"),
            t("trash.restoreMessage", { count: selectedCount }),
            [
                {
                    text: t("trash.cancel"),
                    style: "cancel",
                    onPress: releaseAutoLock,
                },
                {
                    text: t("trash.restore"),
                    onPress: async () => {
                        try {
                            if (selectedCustomerIds.size > 0)
                                await restoreCustomers(
                                    Array.from(selectedCustomerIds),
                                );
                            if (selectedTransactionIds.size > 0)
                                await restoreTransactions(
                                    Array.from(selectedTransactionIds),
                                );
                            closeSelectionMode();
                            void refresh();
                        } finally {
                            releaseAutoLock();
                        }
                    },
                },
            ],
            { onDismiss: releaseAutoLock },
        );
    }, [
        closeSelectionMode,
        refresh,
        restoreCustomers,
        restoreTransactions,
        selectedCount,
        selectedCustomerIds,
        selectedTransactionIds,
        setAutoLockSuspended,
        t,
    ]);

    const handlePermanentDeleteSelected = useCallback(() => {
        if (selectedCount === 0) return;
        let released = false;
        const releaseAutoLock = () => {
            if (released) return;
            released = true;
            setAutoLockSuspended(false);
        };
        setAutoLockSuspended(true);
        Alert.alert(
            t("trash.permanentDeleteTitle"),
            t("trash.permanentDeleteMessage", { count: selectedCount }),
            [
                {
                    text: t("trash.cancel"),
                    style: "cancel",
                    onPress: releaseAutoLock,
                },
                {
                    text: t("trash.permanentDelete"),
                    style: "destructive",
                    onPress: () => {
                        void requestDeleteAuthentication(async () => {
                            if (selectedCustomerIds.size > 0)
                                await permanentDeleteCustomers(
                                    Array.from(selectedCustomerIds),
                                );
                            if (selectedTransactionIds.size > 0)
                                await permanentDeleteTransactions(
                                    Array.from(selectedTransactionIds),
                                );
                            closeSelectionMode();
                            void refresh();
                        });
                    },
                },
            ],
            { onDismiss: releaseAutoLock },
        );
    }, [
        closeSelectionMode,
        permanentDeleteCustomers,
        permanentDeleteTransactions,
        refresh,
        requestDeleteAuthentication,
        selectedCount,
        selectedCustomerIds,
        selectedTransactionIds,
        setAutoLockSuspended,
        t,
    ]);

    const handleEmptyTrash = useCallback(() => {
        if (deletedCustomers.length === 0 && deletedTransactions.length === 0)
            return;
        let released = false;
        const releaseAutoLock = () => {
            if (released) return;
            released = true;
            setAutoLockSuspended(false);
        };
        setAutoLockSuspended(true);
        Alert.alert(
            t("trash.emptyTrashTitle"),
            t("trash.emptyTrashMessage"),
            [
                {
                    text: t("trash.cancel"),
                    style: "cancel",
                    onPress: releaseAutoLock,
                },
                {
                    text: t("trash.emptyTrashButton"),
                    style: "destructive",
                    onPress: () => {
                        void requestDeleteAuthentication(async () => {
                            await emptyTrash();
                            closeSelectionMode();
                            void refresh();
                        });
                    },
                },
            ],
            { onDismiss: releaseAutoLock },
        );
    }, [
        deletedCustomers.length,
        deletedTransactions.length,
        emptyTrash,
        closeSelectionMode,
        refresh,
        requestDeleteAuthentication,
        setAutoLockSuspended,
        t,
    ]);

    const selectionMenuOptions = useMemo<
        { value: SelectionMenuOption; label: string; icon: any }[]
    >(
        () => [
            {
                value: "toggle-all",
                label:
                    selectedCount > 0
                        ? t("trash.deselectAll")
                        : t("trash.selectAll"),
                icon:
                    selectedCount > 0
                        ? "close-circle-outline"
                        : "checkbox-outline",
            },
            {
                value: "restore",
                label: t("trash.restore"),
                icon: "refresh-outline",
            },
            {
                value: "delete",
                label: t("trash.permanentDelete"),
                icon: "trash-outline",
            },
        ],
        [selectedCount, t],
    );

    const handleSelectionMenuSelect = useCallback(
        (value: SelectionMenuOption) => {
            setIsSelectionMenuVisible(false);
            if (value === "toggle-all") {
                selectedCount > 0 ? deselectAll() : selectAll();
            } else if (value === "restore") {
                handleRestoreSelected();
            } else if (value === "delete") {
                handlePermanentDeleteSelected();
            }
        },
        [
            selectedCount,
            deselectAll,
            selectAll,
            handleRestoreSelected,
            handlePermanentDeleteSelected,
        ],
    );

    // ── Row renderer ──────────────────────────────────────────────────────────

    const renderItem = useCallback(
        ({ item }: { item: MixedItem }) => {
            const isCustomer = item.kind === "customer";
            const isSelected = isCustomer
                ? selectedCustomerIds.has(item.id as CustomerId)
                : selectedTransactionIds.has(item.id as TransactionId);
            const dateStr = new Date(
                item.deleted_at * 1000,
            ).toLocaleDateString();
            const isDebit =
                !isCustomer && (item as TrashedTransaction).type === 0;

            return (
                <Pressable
                    onPress={() => {
                        if (isSelectionMode) toggleSelection(item);
                    }}
                    onLongPress={() => {
                        if (!isSelectionMode) activateSelectionMode(item);
                    }}
                    style={[
                        styles.itemRow,
                        {
                            backgroundColor: isSelected
                                ? `${colors.primary}12`
                                : colors.surface,
                        },
                        isSelected && {
                            borderColor: colors.primary,
                            borderWidth: 1,
                        },
                    ]}
                >
                    {/* Checkbox — selection mode only */}
                    {isSelectionMode && (
                        <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={22}
                            color={
                                isSelected ? colors.primary : colors.text.muted
                            }
                            style={styles.checkbox}
                        />
                    )}

                    {/* Avatar / type icon */}
                    {isCustomer ? (
                        (item as TrashedCustomer).image_uri ? (
                            <ViewPhoto
                                source={{
                                    uri: (item as TrashedCustomer).image_uri!,
                                }}
                                accessibilityLabel="Customer Image"
                                closeAccessibilityLabel="Close Image"
                                enabled={!isSelectionMode}
                            >
                                <Image
                                    source={{
                                        uri: (item as TrashedCustomer)
                                            .image_uri!,
                                    }}
                                    style={styles.avatar}
                                />
                            </ViewPhoto>
                        ) : (
                            <View
                                style={[
                                    styles.iconBox,
                                    { backgroundColor: `${colors.primary}15` },
                                ]}
                            >
                                <Ionicons
                                    name="person"
                                    size={20}
                                    color={colors.text.muted}
                                />
                            </View>
                        )
                    ) : (
                        <View
                            style={[
                                styles.iconBox,
                                {
                                    backgroundColor: isDebit
                                        ? `${colors.danger}15`
                                        : `${colors.success}15`,
                                },
                            ]}
                        >
                            <Ionicons
                                name={isDebit ? "arrow-up" : "arrow-down"}
                                size={20}
                                color={isDebit ? colors.danger : colors.success}
                            />
                        </View>
                    )}

                    {/* Info */}
                    <View style={styles.itemInfo}>
                        <View style={styles.itemTopRow}>
                            <Typography
                                variant="body-medium"
                                color="primary"
                                numberOfLines={1}
                                style={styles.itemName}
                            >
                                {isCustomer
                                    ? (item as TrashedCustomer).name
                                    : (item as TrashedTransaction)
                                          .customer_name}
                            </Typography>
                            {/* <View
                                style={[
                                    styles.kindPill,
                                    {
                                        backgroundColor: isCustomer
                                            ? `${colors.primary}15`
                                            : isDebit
                                              ? `${colors.danger}15`
                                              : `${colors.success}15`,
                                    },
                                ]}
                            >
                                <Typography
                                    variant="small-small"
                                    color={
                                        isCustomer
                                            ? "primary"
                                            : isDebit
                                              ? "danger"
                                              : "success"
                                    }
                                >
                                    {isCustomer
                                        ? t("trash.kindCustomer")
                                        : t("trash.kindTransaction")}
                                </Typography>
                            </View> */}
                        </View>
                        <View style={styles.itemBottomRow}>
                            <Typography
                                variant="small-small"
                                color="muted"
                                numberOfLines={1}
                                style={styles.dateText}
                            >
                                {t("trash.deletedAgo", { time: dateStr })}
                            </Typography>
                            {/* Amount inline for transactions */}
                            {!isCustomer && (
                                <TouchableAmount
                                    amount={(item as TrashedTransaction).amount}
                                    variant="small-small"
                                    color={isDebit ? "danger" : "success"}
                                />
                            )}
                        </View>
                    </View>

                    {/* Inline action buttons — normal mode only */}
                    {!isSelectionMode && (
                        <View style={styles.rowActions}>
                            <Pressable
                                onPress={() => handleRestoreOne(item)}
                                hitSlop={8}
                                style={[
                                    styles.rowActionBtn,
                                    { backgroundColor: `${colors.success}15` },
                                ]}
                            >
                                <Ionicons
                                    name="refresh"
                                    size={16}
                                    color={colors.success}
                                />
                            </Pressable>
                            <Pressable
                                onPress={() => handleDeleteOne(item)}
                                hitSlop={8}
                                style={[
                                    styles.rowActionBtn,
                                    { backgroundColor: `${colors.danger}15` },
                                ]}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={16}
                                    color={colors.danger}
                                />
                            </Pressable>
                        </View>
                    )}
                </Pressable>
            );
        },
        [
            isSelectionMode,
            selectedCustomerIds,
            selectedTransactionIds,
            toggleSelection,
            activateSelectionMode,
            handleRestoreOne,
            handleDeleteOne,
            colors,
            t,
        ],
    );

    if (!db) return <LoadingScreen />;

    return (
        <ErrorScreen
            error={error}
            type="database"
            onRetry={refresh}
            isLoading={loading}
        >
            <View
                style={[
                    styles.container,
                    { backgroundColor: colors.background },
                ]}
            >
                {/* Header */}
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
                    <View style={styles.headerTopRow}>
                        {!isSelectionMode ? (
                            <View style={styles.headerTitleRow}>
                                <Pressable
                                    onPress={() => router.back()}
                                    style={[
                                        styles.backButton,
                                        {
                                            backgroundColor: `${colors.primary}15`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={24}
                                        color={colors.primary}
                                    />
                                </Pressable>
                                <View>
                                    <Typography
                                        variant="heading-large"
                                        color="primary"
                                    >
                                        {t("trash.title")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                    >
                                        {t("trash.subtitle", {
                                            count:
                                                trashCount.customers +
                                                trashCount.transactions,
                                        })}
                                    </Typography>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.selectionHeader}>
                                <Pressable
                                    onPress={closeSelectionMode}
                                    style={styles.closeButton}
                                >
                                    <Ionicons
                                        name="close"
                                        size={28}
                                        color={colors.text.primary}
                                    />
                                </Pressable>
                                <Typography
                                    variant="heading-large"
                                    color="primary"
                                >
                                    {t("trash.selected", {
                                        count: selectedCount,
                                    })}
                                </Typography>
                            </View>
                        )}

                        <View style={styles.headerActions}>
                            {!isSelectionMode ? (
                                <Pressable
                                    onPress={handleEmptyTrash}
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: `${colors.danger}15`,
                                        },
                                    ]}
                                    disabled={
                                        trashCount.customers === 0 &&
                                        trashCount.transactions === 0
                                    }
                                >
                                    <Ionicons
                                        name="trash"
                                        size={22}
                                        color={colors.danger}
                                    />
                                </Pressable>
                            ) : (
                                <Pressable
                                    onPress={() =>
                                        setIsSelectionMenuVisible(true)
                                    }
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: `${colors.primary}15`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="ellipsis-vertical"
                                        size={22}
                                        color={colors.primary}
                                    />
                                </Pressable>
                            )}
                        </View>
                    </View>
                </View>

                {/* Unified list */}
                <FlatList
                    data={mixedList}
                    keyExtractor={(item) => `${item.kind}-${item.id}`}
                    renderItem={renderItem}
                    contentContainerStyle={[
                        styles.list,
                        { paddingBottom: insets.bottom + 100 },
                    ]}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyState}>
                                <Ionicons
                                    name="trash-bin-outline"
                                    size={48}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="heading-small"
                                    color="secondary"
                                >
                                    {t("trash.emptyState")}
                                </Typography>
                                <Typography
                                    variant="body-small"
                                    color="muted"
                                    style={styles.emptyStateMessage}
                                >
                                    {t("trash.emptyStateMessage")}
                                </Typography>
                            </View>
                        ) : null
                    }
                />

                {/* Selection FABs */}
                {isSelectionMode && (
                    <View
                        style={[
                            styles.selectionFabContainer,
                            {
                                right: Spacing.lg,
                                bottom: insets.bottom + Spacing.lg,
                            },
                        ]}
                    >
                        <Pressable
                            accessibilityLabel={t("trash.cancel")}
                            onPress={closeSelectionMode}
                            style={[
                                styles.selectionFab,
                                {
                                    backgroundColor: colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <Ionicons
                                name="close"
                                size={28}
                                color={colors.text.primary}
                            />
                        </Pressable>
                        <Pressable
                            accessibilityLabel={t("trash.restore")}
                            onPress={handleRestoreSelected}
                            style={[
                                styles.selectionFab,
                                {
                                    backgroundColor: colors.success,
                                    shadowColor: colors.success,
                                },
                            ]}
                        >
                            <Ionicons
                                name="refresh"
                                size={28}
                                color="#FFFFFF"
                            />
                        </Pressable>
                        <Pressable
                            accessibilityLabel={t("trash.permanentDelete")}
                            onPress={handlePermanentDeleteSelected}
                            style={[
                                styles.selectionFab,
                                {
                                    backgroundColor: colors.danger,
                                    shadowColor: colors.danger,
                                },
                            ]}
                        >
                            <Ionicons name="trash" size={28} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}

                <OptionModal<SelectionMenuOption>
                    visible={isSelectionMenuVisible}
                    title={t("trash.selected", { count: selectedCount })}
                    options={selectionMenuOptions}
                    selected={null}
                    showSelectionIndicator={false}
                    onSelect={handleSelectionMenuSelect}
                    onClose={() => setIsSelectionMenuVisible(false)}
                />

                {deleteAuthenticationPrompt}
            </View>
        </ErrorScreen>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    selectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    closeButton: { padding: Spacing.xs },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    list: {
        flexGrow: 1,
        paddingHorizontal: Spacing.sm,
        paddingTop: Spacing.md,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        marginBottom: 6,
        gap: Spacing.sm,
    },
    checkbox: { flexShrink: 0 },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        flexShrink: 0,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    itemInfo: {
        flex: 1,
        gap: 2,
        minWidth: 0,
    },
    itemTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    itemBottomRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    itemName: {
        flex: 1,
        flexShrink: 1,
    },
    dateText: {
        flexShrink: 1,
    },
    kindPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        flexShrink: 0,
    },
    // Inline per-row action buttons
    rowActions: {
        flexDirection: "row",
        gap: Spacing.xs,
        flexShrink: 0,
    },
    rowActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xxl,
        marginTop: 60,
    },
    emptyStateMessage: { textAlign: "center" },
    selectionFabContainer: {
        position: "absolute",
        flexDirection: "row",
        gap: Spacing.sm,
    },
    selectionFab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
