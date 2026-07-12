import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ErrorScreen,
    LoadingScreen,
    OptionModal,
    TouchableAmount,
    Typography,
    ViewPhoto,
} from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useDebounce } from "../hooks/useDebounce";
import { useDeleteAuthentication } from "../hooks/useDeleteAuthentication";
import { AccountStatus, CustomerId, CustomerWithAccounts } from "../models";
import { useDatabaseContext, usePasscode, useTheme } from "../store";

type SelectionMenuOption = "toggle-all" | "delete";

const CustomerItem = React.memo(({
    item, drag, isActive, isSelectionMode, isReorderMode, isSelected,
    colors, t, onRowPress, onRowLongPress, balance, isInactive
}: any) => {
    return (
        <Pressable
            onPress={onRowPress}
            onLongPress={onRowLongPress}
            disabled={isActive}
            style={[
                styles.customerRow,
                { backgroundColor: isSelected ? `${colors.primary}12` : colors.surface },
                isSelected && { borderColor: colors.primary, borderWidth: 1 },
            ]}
        >
            {isSelectionMode && (
                <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
                    size={22}
                    color={isSelected ? colors.primary : colors.text.muted}
                    style={styles.checkbox}
                />
            )}
            {isReorderMode && (
                <Ionicons
                    name="reorder-three"
                    size={22}
                    color={colors.text.muted}
                    style={styles.dragHandle}
                />
            )}
            {item.image_uri ? (
                <ViewPhoto
                    source={{ uri: item.image_uri }}
                    enabled={!isSelectionMode && !isReorderMode}
                    accessibilityLabel={t("photoViewer.openCustomer", { name: item.name })}
                    closeAccessibilityLabel={t("photoViewer.close")}
                >
                    <Image
                        source={{ uri: item.image_uri }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={isReorderMode ? 0 : 200}
                        priority="high"
                        cachePolicy="memory-disk"
                    />
                </ViewPhoto>
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="person" size={20} color={colors.text.muted} />
                </View>
            )}
            <View style={styles.customerInfo}>
                <View style={styles.customerTopRow}>
                    <Typography
                        variant="body-medium"
                        color="primary"
                        numberOfLines={1}
                        style={styles.customerName}
                    >
                        {item.name}
                    </Typography>
                    {isInactive && (
                        <View style={[
                            styles.inactiveBadge,
                            {
                                backgroundColor: `${colors.warning}18`,
                                borderColor: `${colors.warning}60`,
                            },
                        ]}>
                            <View style={[styles.inactiveDot, { backgroundColor: colors.warning }]} />
                            <Typography variant="small-small" color="warning" numberOfLines={1}>
                                {t("customers.inactive")}
                            </Typography>
                        </View>
                    )}
                </View>
                <Typography variant="small-small" color="muted" numberOfLines={1}>
                    {item.phone?.trim() || t("customers.noPhoneNumber")}
                </Typography>
            </View>
            <TouchableAmount
                amount={balance}
                variant="body-medium"
                color={balance > 0 ? "danger" : balance < 0 ? "success" : "primary"}
                style={styles.balanceText}
            />
            {!isSelectionMode && !isReorderMode && (
                <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
            )}
        </Pressable>
    );
}, (prev, next) => 
    prev.item.id === next.item.id && 
    prev.isActive === next.isActive &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isReorderMode === next.isReorderMode &&
    prev.isSelected === next.isSelected &&
    prev.colors.surface === next.colors.surface
);

export const CustomersScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
        const { t } = useTranslation();
    const {
        customers,
        loading,
        error,
        handleSearch,
        refresh,
        hasMore,
        nextPage,
        bulkDeleteCustomers,
    } = useCustomersWithAccounts(db);
    const { requestDeleteAuthentication, deleteAuthenticationPrompt } =
        useDeleteAuthentication();

    const [searchText, setSearchText] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isSelectionMenuVisible, setIsSelectionMenuVisible] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<CustomerId>>(new Set());
    const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<CustomerId>>(new Set());
    const [orderedCustomers, setOrderedCustomers] = useState<CustomerWithAccounts[]>([]);

    const searchInputRef = useRef<TextInput>(null);
    const selectionSnapshotRef = useRef<CustomerWithAccounts[]>([]);
    const isDraggingRef = useRef(false);
    const stageDeleteAlertSuspendedRef = useRef(false);

    const debouncedSearch = useDebounce(searchText, 500);

    React.useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    useEffect(() => {
        const loadAndSortCustomers = async () => {
            if (!db || isSelectionMode) return;
            if (customers.length === 0) { setOrderedCustomers([]); return; }
            try {
                const savedOrder = await db.getAllAsync<{
                    customer_id: CustomerId;
                    sort_order: number;
                }>("SELECT customer_id, sort_order FROM customer_order ORDER BY sort_order");
                if (savedOrder?.length > 0) {
                    const orderIds = savedOrder.map((o) => o.customer_id);
                    const customerMap = new Map(customers.map((c) => [c.id, c]));
                    const ordered = orderIds
                        .map((id) => customerMap.get(id))
                        .filter(Boolean) as CustomerWithAccounts[];
                    const newCustomers = customers.filter((c) => !orderIds.includes(c.id!));
                    setOrderedCustomers([...ordered, ...newCustomers]);
                } else {
                    setOrderedCustomers(customers);
                }
            } catch {
                setOrderedCustomers(customers);
            }
        };
        loadAndSortCustomers();
    }, [customers, db, isSelectionMode]);

    useEffect(() => {
        if (!isSelectionMenuVisible) return;
    }, [isSelectionMenuVisible]);

    // Aggregate summary across all customers
    const summary = useMemo(() => {
        const totalOwed = orderedCustomers.reduce((sum, c) => {
            const b = c.accounts?.[0]?.current_balance ?? 0;
            return sum + (b > 0 ? b : 0);
        }, 0);
        const totalCredit = orderedCustomers.reduce((sum, c) => {
            const b = c.accounts?.[0]?.current_balance ?? 0;
            return sum + (b < 0 ? Math.abs(b) : 0);
        }, 0);
        return { totalOwed, totalCredit };
    }, [orderedCustomers]);

    const releaseStageDeleteAlertSuspension = useCallback(() => {
        if (!stageDeleteAlertSuspendedRef.current) return;
        stageDeleteAlertSuspendedRef.current = false;
    }, []);

    const persistCustomerOrder = useCallback(
        async (data: CustomerWithAccounts[]) => {
            if (!db) return;
            await db.withTransactionAsync(async () => {
                await db.runAsync("DELETE FROM customer_order");
                for (let i = 0; i < data.length; i++) {
                    const customerId = data[i].id;
                    if (customerId !== undefined && customerId !== null) {
                        await db.runAsync(
                            "INSERT INTO customer_order (customer_id, sort_order) VALUES (?, ?)",
                            [customerId, i],
                        );
                    }
                }
            });
        },
        [db],
    );

    const handleDragEnd = useCallback(({ data }: { data: CustomerWithAccounts[] }) => {
        setOrderedCustomers(data);
        setTimeout(() => { isDraggingRef.current = false; }, 100);
    }, []);

    const closeSelectionMode = useCallback(() => {
        setIsSelectionMenuVisible(false);
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        setPendingDeleteIds(new Set());
        setIsReorderMode(false);
        selectionSnapshotRef.current = [];
    }, []);

    const activateSelectionMode = useCallback(
        (customerId?: CustomerId) => {
            selectionSnapshotRef.current = [...orderedCustomers];
            setPendingDeleteIds(new Set());
            setIsSelectionMode(true);
            setIsReorderMode(true);
            if (customerId) setSelectedIds(new Set([customerId]));
        },
        [orderedCustomers],
    );

    const cancelSelectionMode = useCallback(() => {
        setOrderedCustomers(selectionSnapshotRef.current);
        closeSelectionMode();
    }, [closeSelectionMode]);

    const confirmSelectionMode = useCallback(async () => {
        const completeSelection = async () => {
            try {
                if (pendingDeleteIds.size > 0) {
                    await bulkDeleteCustomers(Array.from(pendingDeleteIds));
                }
                await persistCustomerOrder(orderedCustomers);
                closeSelectionMode();
            } catch {
                Alert.alert(t("customers.deleteError"), t("customers.deleteErrorMessage"));
            }
        };
        if (pendingDeleteIds.size > 0) {
            await requestDeleteAuthentication(completeSelection);
            return;
        }
        await completeSelection();
    }, [
        pendingDeleteIds, bulkDeleteCustomers, persistCustomerOrder,
        orderedCustomers, closeSelectionMode, requestDeleteAuthentication, t,
    ]);

    const toggleSelection = useCallback((customerId: CustomerId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(customerId) ? next.delete(customerId) : next.add(customerId);
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        const allIds = orderedCustomers
            .map((c) => c.id)
            .filter((id): id is CustomerId => id !== undefined);
        setSelectedIds(new Set(allIds));
    }, [orderedCustomers]);

    const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

    const handleBulkDelete = useCallback(() => {
        if (selectedIds.size === 0) return;
        setIsSelectionMenuVisible(false);
        stageDeleteAlertSuspendedRef.current = true;
        Alert.alert(
            t("customers.deleteTitle"),
            t("customers.stageDeleteMessage", { count: selectedIds.size }),
            [
                { text: t("customers.cancel"), style: "cancel", onPress: releaseStageDeleteAlertSuspension },
                {
                    text: t("customers.delete"),
                    style: "destructive",
                    onPress: () => {
                        setPendingDeleteIds((prev) => {
                            const next = new Set(prev);
                            selectedIds.forEach((id) => next.add(id));
                            return next;
                        });
                        setOrderedCustomers((prev) =>
                            prev.filter((c) => c.id === undefined || !selectedIds.has(c.id)),
                        );
                        setSelectedIds(new Set());
                        releaseStageDeleteAlertSuspension();
                    },
                },
            ],
            { onDismiss: releaseStageDeleteAlertSuspension },
        );
    }, [releaseStageDeleteAlertSuspension, selectedIds, t]);

    const selectionMenuOptions = useMemo<
        { value: SelectionMenuOption; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[]
    >(() => [
        {
            value: "toggle-all" as const,
            label: selectedIds.size > 0 ? t("customers.deselectAll") : t("customers.selectAll"),
            icon: selectedIds.size > 0 ? "close-circle-outline" : "checkbox-outline",
        },
        {
            value: "delete" as const,
            label: t("customers.delete"),
            icon: "trash-outline",
        },
    ], [selectedIds.size, t]);

    const handleSelectionMenuSelect = useCallback((value: SelectionMenuOption) => {
        if (value === "toggle-all") {
            setIsSelectionMenuVisible(false);
            selectedIds.size > 0 ? deselectAll() : selectAll();
        } else if (value === "delete") {
            handleBulkDelete();
        }
    }, [selectedIds.size, deselectAll, selectAll, handleBulkDelete]);

    const renderCustomer = useCallback(
        ({
            item,
            drag,
            isActive,
        }: {
            item: CustomerWithAccounts;
            drag: () => void;
            isActive: boolean;
        }) => {
            const balance = item.accounts?.[0]?.current_balance ?? 0;
            const isInactive = item.accounts?.[0]?.status === AccountStatus.INACTIVE;
            const isSelected = item.id !== undefined && selectedIds.has(item.id);

            const onRowPress = () => {
                if (isDraggingRef.current) return;
                if (isSelectionMode && item.id) {
                    toggleSelection(item.id);
                } else if (!isReorderMode && item.id) {
                    router.push(`../customer-transactions?customerId=${item.id}` as any);
                }
            };

            const onRowLongPress = () => {
                if (!isSelectionMode && item.id) {
                    activateSelectionMode(item.id);
                } else if (isReorderMode) {
                    drag();
                }
            };

            return (
                <CustomerItem
                    item={item}
                    drag={drag}
                    isActive={isActive}
                    isSelectionMode={isSelectionMode}
                    isReorderMode={isReorderMode}
                    isSelected={isSelected}
                    colors={colors}
                    t={t}
                    balance={balance}
                    isInactive={isInactive}
                    onRowPress={onRowPress}
                    onRowLongPress={onRowLongPress}
                />
            );
        },
        [
            selectedIds, isSelectionMode, isReorderMode,
            toggleSelection, activateSelectionMode, router, t,
            colors.primary, colors.warning, colors.text.muted, colors.surface,
        ],
    );

    if (!db) return <LoadingScreen />;

    return (
        <ErrorScreen error={error} type="database" onRetry={refresh} isLoading={loading}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>

                {/* Header */}
                <View style={[
                    styles.header,
                    {
                        marginTop: insets.top + Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        overflow: "hidden",
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                    },
                ]}>
                    <View style={styles.headerTopRow}>
                        <View style={styles.headerTitleRow}>
                            {!isSelectionMode ? (
                                <>
                                    {!isSearchActive && (
                                        <View>
                                            <Typography variant="heading-large" color="primary">
                                                {t("customers.title")}
                                            </Typography>
                                        </View>
                                    )}
                                    {isSearchActive && (
                                        <View style={styles.searchInputContainer}>
                                            <TextInput
                                                ref={searchInputRef}
                                                style={[
                                                    styles.headerSearchInput,
                                                    { backgroundColor: colors.background, color: colors.text.primary },
                                                ]}
                                                placeholder={t("customers.searchPlaceholder")}
                                                placeholderTextColor={colors.text.muted}
                                                value={searchText}
                                                onChangeText={setSearchText}
                                                autoFocus
                                                onBlur={() => { if (!searchText) setIsSearchActive(false); }}
                                            />
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View style={styles.selectionHeader}>
                                    <Pressable onPress={cancelSelectionMode} style={styles.closeButton}>
                                        <Ionicons name="close" size={28} color={colors.text.primary} />
                                    </Pressable>
                                    <Typography variant="heading-large" color="primary">
                                        {t("customers.selected", { count: selectedIds.size })}
                                    </Typography>
                                </View>
                            )}
                        </View>

                        {/* Header actions */}
                        {!isSelectionMode ? (
                            <Pressable
                                onPress={() => {
                                    if (isSearchActive) {
                                        setSearchText("");
                                        setIsSearchActive(false);
                                    } else {
                                        setIsSearchActive(true);
                                        setTimeout(() => searchInputRef.current?.focus(), 100);
                                    }
                                }}
                                style={[
                                    styles.searchIconButton,
                                    { backgroundColor: `${colors.primary}18` },
                                ]}
                            >
                                <Ionicons
                                    name={isSearchActive ? "close" : "search"}
                                    size={24}
                                    color={colors.primary}
                                />
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={() => setIsSelectionMenuVisible(true)}
                                style={[
                                    styles.searchIconButton,
                                    { backgroundColor: `${colors.primary}18` },
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

                {/* Summary cards — shown in normal mode */}
                {!isSelectionMode && !isSearchActive && orderedCustomers.length > 0 && (
                    <View style={styles.summaryCards}>
                        <View style={[styles.summaryCard, {
                            backgroundColor: colors.surface,
                            borderColor: `${colors.danger}30`,
                            borderWidth: 1,
                            shadowColor: colors.danger,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 6,
                            elevation: 2,
                        }]}>
                            <View style={[styles.summaryCardIcon, { backgroundColor: `${colors.danger}15` }]}>
                                <Ionicons name="arrow-up" size={14} color={colors.danger} />
                            </View>
                            <View style={styles.summaryCardText}>
                                <Typography variant="small-small" color="muted">
                                    {t("customers.owed")}
                                </Typography>
                                <TouchableAmount
                                    amount={summary.totalOwed}
                                    variant="body-medium"
                                    color="danger"
                                />
                            </View>
                        </View>

                        <View style={[styles.summaryCard, {
                            backgroundColor: colors.surface,
                            borderColor: `${colors.success}30`,
                            borderWidth: 1,
                            shadowColor: colors.success,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 6,
                            elevation: 2,
                        }]}>
                            <View style={[styles.summaryCardIcon, { backgroundColor: `${colors.success}15` }]}>
                                <Ionicons name="arrow-down" size={14} color={colors.success} />
                            </View>
                            <View style={styles.summaryCardText}>
                                <Typography variant="small-small" color="muted">
                                    {t("customers.credit")}
                                </Typography>
                                <TouchableAmount
                                    amount={summary.totalCredit}
                                    variant="body-medium"
                                    color="success"
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* List */}
                <GestureHandlerRootView style={styles.listContainer}>
                    <DraggableFlatList
                        data={orderedCustomers}
                        renderItem={renderCustomer}
                        keyExtractor={(item) => item.id?.toString() || ""}
                        containerStyle={styles.listContainer}
                        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                        ListEmptyComponent={
                            !loading ? (
                                <View style={styles.emptyState}>
                                    <Ionicons
                                        name={searchText ? "search-outline" : "people-outline"}
                                        size={48}
                                        color={colors.text.muted}
                                    />
                                    <Typography variant="heading-small" color="secondary">
                                        {searchText ? t("customers.noResults") : t("customers.emptyTitle")}
                                    </Typography>
                                    <Typography variant="body-small" color="muted" style={styles.emptyStateMessage}>
                                        {searchText ? t("customers.noResultsMessage") : t("customers.emptyMessage")}
                                    </Typography>
                                </View>
                            ) : null
                        }
                        alwaysBounceVertical
                        overScrollMode="always"
                        refreshControl={
                            <RefreshControl
                                refreshing={loading}
                                onRefresh={refresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                        onDragEnd={handleDragEnd}
                        onDragBegin={() => { isDraggingRef.current = true; }}
                        activationDistance={isReorderMode ? 0 : 20}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        removeClippedSubviews={Platform.OS === "android" && !isReorderMode}
                        onEndReached={hasMore ? nextPage : undefined}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loading && customers.length > 0 ? (
                                <View style={styles.footer}>
                                    <Typography variant="body-small" color="muted">
                                        {t("common.loadingMore")}
                                    </Typography>
                                </View>
                            ) : !hasMore && customers.length > 0 ? (
                                <View style={styles.footer}>
                                    <Typography variant="body-small" color="muted">
                                        {t("customers.allLoaded")}
                                    </Typography>
                                </View>
                            ) : null
                        }
                    />
                </GestureHandlerRootView>

                {/* Selection mode FABs */}
                {isSelectionMode && (
                    <View style={[styles.selectionFabContainer, { right: Spacing.lg, bottom: insets.bottom + 80 }]}>
                        <Pressable
                            accessibilityLabel={t("customers.cancel")}
                            onPress={cancelSelectionMode}
                            style={[styles.selectionFab, { backgroundColor: colors.danger, shadowColor: colors.danger }]}
                        >
                            <Ionicons name="close" size={28} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                            accessibilityLabel={t("customers.done")}
                            onPress={confirmSelectionMode}
                            style={[styles.selectionFab, { backgroundColor: colors.success, shadowColor: colors.success }]}
                        >
                            <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}

                {/* Add FAB */}
                {!isSelectionMode && !isReorderMode && (
                    <Pressable
                        style={[styles.fab, { bottom: insets.bottom + 80, right: Spacing.lg, backgroundColor: colors.primary, shadowColor: colors.primary }]}
                        onPress={() => router.push("/add-customer" as any)}
                    >
                        <Ionicons name="add" size={28} color="#FFFFFF" />
                    </Pressable>
                )}

                {/* Selection context menu — using OptionModal for consistency */}
                <OptionModal<SelectionMenuOption>
                    visible={isSelectionMenuVisible}
                    title={t("customers.selected", { count: selectedIds.size })}
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
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    // Header
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
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
        flex: 1,
    },
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: `${Colors.primary}20`,
        justifyContent: "center",
        alignItems: "center",
    },
    searchInputContainer: {
        flex: 1,
        height: 48,
        justifyContent: "center",
    },
    headerSearchInput: {
        flex: 1,
        height: 40,
        backgroundColor: Colors.background,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        color: Colors.text.primary,
        fontSize: 16,
    },
    selectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    searchIconButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: `${Colors.primary}18`,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: Spacing.sm,
    },
    // Summary cards
    summaryCards: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    summaryCard: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 10,
    },
    summaryCardIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    summaryCardText: {
        flex: 1,
        gap: 1,
    },
    // List
    listContainer: {
        flex: 1,
    },
    list: {
        flexGrow: 1,
        paddingHorizontal: Spacing.sm,
        paddingTop: Spacing.md,
    },
    // Customer row (compact, matches LedgerScreen / CustomerTransactionsScreen pattern)
    customerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        marginBottom: 6,
        gap: Spacing.sm,
    },
    checkbox: {
        flexShrink: 0,
    },
    dragHandle: {
        flexShrink: 0,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        flexShrink: 0,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    customerInfo: {
        flex: 1,
        gap: 2,
        minWidth: 0,
    },
    customerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    customerName: {
        flex: 1,
        flexShrink: 1,
    },
    inactiveBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        flexShrink: 0,
    },
    inactiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    balanceText: {
        flexShrink: 0,
        maxWidth: 120,
    },
    // Empty state
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xxl,
    },
    emptyStateMessage: {
        textAlign: "center",
    },
    // FABs
    fab: {
        position: "absolute",
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
    selectionFabContainer: {
        position: "absolute",
        bottom: 20,
        flexDirection: "row",
        gap: Spacing.md,
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
        elevation: 8,
    },
    footer: {
        padding: Spacing.md,
        alignItems: "center",
    },
});