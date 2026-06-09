import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Modal,
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
import { Card, ErrorScreen, TouchableAmount, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useDebounce } from "../hooks/useDebounce";
import { CustomerId, CustomerWithAccounts } from "../models";

import { useDatabaseContext, useTheme } from "../store";

export const CustomersScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();    const {
        customers,
        loading,
        error,
        handleSearch,
        refresh,
        bulkDeleteCustomers,
    } = useCustomersWithAccounts(db);
    const [searchText, setSearchText] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isSelectionMenuVisible, setIsSelectionMenuVisible] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<CustomerId>>(new Set());
    const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<CustomerId>>(
        new Set(),
    );
    const [orderedCustomers, setOrderedCustomers] = useState<
        CustomerWithAccounts[]
    >([]);
    const searchInputRef = useRef<TextInput>(null);
    const selectionSnapshotRef = useRef<CustomerWithAccounts[]>([]);
    const isDraggingRef = useRef(false);

    const debouncedSearch = useDebounce(searchText, 500);

    React.useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    useEffect(() => {
        const loadAndSortCustomers = async () => {
            if (!db || isSelectionMode) return;

            if (customers.length === 0) {
                setOrderedCustomers([]);
                return;
            }

            try {
                const savedOrder = await db.getAllAsync<{
                    customer_id: CustomerId;
                    sort_order: number;
                }>(
                    "SELECT customer_id, sort_order FROM customer_order ORDER BY sort_order",
                );

                if (savedOrder && savedOrder.length > 0) {
                    const orderIds = savedOrder.map((o) => o.customer_id);
                    const customerMap = new Map(
                        customers.map((c) => [c.id, c]),
                    );
                    const ordered = orderIds
                        .map((id) => customerMap.get(id))
                        .filter(Boolean) as CustomerWithAccounts[];
                    const newCustomers = customers.filter(
                        (c) => !orderIds.includes(c.id!),
                    );
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

    const handleDragEnd = useCallback(
        ({ data }: { data: CustomerWithAccounts[] }) => {
            setOrderedCustomers(data);
            setTimeout(() => {
                isDraggingRef.current = false;
            }, 100);
        },
        [],
    );

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
            if (customerId) {
                setSelectedIds(new Set([customerId]));
            }
        },
        [orderedCustomers],
    );

    const cancelSelectionMode = useCallback(() => {
        setOrderedCustomers(selectionSnapshotRef.current);
        closeSelectionMode();
    }, [closeSelectionMode]);

    const confirmSelectionMode = useCallback(async () => {
        try {
            if (pendingDeleteIds.size > 0) {
                await bulkDeleteCustomers(Array.from(pendingDeleteIds));
            }
            await persistCustomerOrder(orderedCustomers);
            closeSelectionMode();
        } catch {
            Alert.alert(
                t("customers.deleteError"),
                t("customers.deleteErrorMessage"),
            );
        }
    }, [
        pendingDeleteIds,
        bulkDeleteCustomers,
        persistCustomerOrder,
        orderedCustomers,
        closeSelectionMode,
        t,
    ]);

    const toggleSelection = useCallback((customerId: CustomerId) => {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(customerId)) {
                newSet.delete(customerId);
            } else {
                newSet.add(customerId);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback(() => {
        const allIds = orderedCustomers
            .map((c) => c.id)
            .filter((id): id is CustomerId => id !== undefined);
        setSelectedIds(new Set(allIds));
    }, [orderedCustomers]);

    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const handleSelectionToggleAll = useCallback(() => {
        setIsSelectionMenuVisible(false);
        if (selectedIds.size > 0) {
            deselectAll();
        } else {
            selectAll();
        }
    }, [deselectAll, selectAll, selectedIds.size]);

    const handleBulkDelete = useCallback(() => {
        if (selectedIds.size === 0) return;

        setIsSelectionMenuVisible(false);
        Alert.alert(
            t("customers.deleteTitle"),
            t("customers.stageDeleteMessage", { count: selectedIds.size }),
            [
                { text: t("customers.cancel"), style: "cancel" },
                {
                    text: t("customers.delete"),
                    style: "destructive",
                    onPress: () => {
                        setPendingDeleteIds((previousIds) => {
                            const nextIds = new Set(previousIds);
                            selectedIds.forEach((id) => nextIds.add(id));
                            return nextIds;
                        });
                        setOrderedCustomers((previousCustomers) =>
                            previousCustomers.filter(
                                (customer) =>
                                    customer.id === undefined ||
                                    !selectedIds.has(customer.id),
                            ),
                        );
                        setSelectedIds(new Set());
                    },
                },
            ],
        );
    }, [selectedIds, t]);

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
            const balance = item.accounts?.[0]?.current_balance || 0;
            const accountNumber = item.accounts?.[0]?.account_number || "N/A";
            const isSelected =
                item.id !== undefined && selectedIds.has(item.id);

            return (
                <View>
                    <Pressable
                        onPress={() => {
                            if (isDraggingRef.current) return;

                            if (isSelectionMode && item.id) {
                                toggleSelection(item.id);
                            } else if (!isReorderMode && item.id) {
                                router.push(
                                    `../customer-transactions?customerId=${item.id}` as any,
                                );
                            }
                        }}
                        onLongPress={() => {
                            if (!isSelectionMode && item.id) {
                                activateSelectionMode(item.id);
                            } else if (isReorderMode) {
                                drag();
                            }
                        }}
                        disabled={isActive}
                    >
                        <Card
                            style={[
                                styles.customerCard,
                                ...(isSelected
                                    ? [
                                          {
                                              backgroundColor: `${colors.primary}15`,
                                              borderColor: colors.primary,
                                              borderWidth: 1,
                                          },
                                      ]
                                    : []),
                            ]}
                        >
                            <View
                                style={[
                                    styles.customerRow,
                                    ...(false
                                        ? [
                                              {
                                                  flexDirection: "row-reverse",
                                              } as const,
                                          ]
                                        : []),
                                ]}
                            >
                                {isSelectionMode && (
                                    <View
                                        style={[
                                            styles.checkbox,
                                            false
                                                ? { marginLeft: Spacing.sm }
                                                : { marginRight: Spacing.sm },
                                        ]}
                                    >
                                        <Ionicons
                                            name={
                                                isSelected
                                                    ? "checkbox"
                                                    : "square-outline"
                                            }
                                            size={24}
                                            color={
                                                isSelected
                                                    ? colors.primary
                                                    : colors.text.muted
                                            }
                                        />
                                    </View>
                                )}
                                {isReorderMode && (
                                    <View
                                        style={[
                                            styles.dragHandle,
                                            false
                                                ? { marginLeft: Spacing.sm }
                                                : { marginRight: Spacing.sm },
                                        ]}
                                    >
                                        <Ionicons
                                            name="reorder-three"
                                            size={24}
                                            color={colors.text.muted}
                                        />
                                    </View>
                                )}
                                {item.image_uri ? (
                                    <Image
                                        source={{ uri: item.image_uri }}
                                        style={[
                                            styles.customerImage,
                                            false
                                                ? { marginLeft: Spacing.sm }
                                                : { marginRight: Spacing.sm },
                                        ]}
                                        contentFit="cover"
                                        transition={isReorderMode ? 0 : 200}
                                        priority="high"
                                        cachePolicy="memory-disk"
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.customerImagePlaceholder,
                                            {
                                                backgroundColor: `${colors.primary}15`,
                                            },
                                            false
                                                ? { marginLeft: Spacing.sm }
                                                : { marginRight: Spacing.sm },
                                        ]}
                                    >
                                        <Ionicons
                                            name="person"
                                            size={24}
                                            color={colors.text.muted}
                                        />
                                    </View>
                                )}
                                <View style={styles.customerInfo}>
                                    <View
                                        style={[
                                            styles.customerHeader,
                                            ...(false
                                                ? [
                                                      {
                                                          flexDirection:
                                                              "row-reverse",
                                                      } as const,
                                                  ]
                                                : []),
                                        ]}
                                    >
                                        <Typography
                                            variant="heading-small"
                                            color="primary"
                                            numberOfLines={1}
                                            style={[
                                                styles.customerName,
                                                ...(false
                                                    ? [
                                                          {
                                                              textAlign:
                                                                  "right",
                                                              marginLeft:
                                                                  Spacing.sm,
                                                              marginRight: 0,
                                                          } as const,
                                                      ]
                                                    : []),
                                            ]}
                                        >
                                            {item.name}
                                        </Typography>
                                        <TouchableAmount
                                            amount={balance}
                                            variant="heading-medium"
                                            color={
                                                balance > 0
                                                    ? "danger"
                                                    : "success"
                                            }
                                            style={styles.balanceText}
                                        />
                                    </View>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                        style={
                                            false
                                                ? { textAlign: "right" }
                                                : undefined
                                        }
                                    >
                                        {t("customers.account", {
                                            number: accountNumber,
                                        })}
                                    </Typography>
                                </View>
                            </View>
                        </Card>
                    </Pressable>
                </View>
            );
        },
        [
            selectedIds,
            isSelectionMode,
            isReorderMode,
            toggleSelection,
            activateSelectionMode,
            router,
            t,
            false,
            colors.primary,
            colors.text.muted,
        ],
    );

    if (!db) {
        return (
            <View
                style={[styles.center, { backgroundColor: colors.background }]}
            >
                <Typography variant="body-medium" color="muted">
                    {t("customers.loading")}
                </Typography>
            </View>
        );
    }

    return (
        <ErrorScreen
            error={error}
            type="database"
            onRetry={refresh}
            isLoading={loading}
            loadingText={t("customers.loading")}
        >
            <View
                style={[
                    styles.container,
                    { backgroundColor: colors.background },
                ]}
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
                    <View
                        style={[
                            styles.headerTopRow,
                            ...(false
                                ? [{ flexDirection: "row-reverse" } as const]
                                : []),
                        ]}
                    >
                        <View
                            style={[
                                styles.headerTitleRow,
                                ...(false
                                    ? [
                                          {
                                              flexDirection: "row-reverse",
                                          } as const,
                                      ]
                                    : []),
                            ]}
                        >
                            {!isSelectionMode ? (
                                <>
                                    <View
                                        style={[
                                            styles.headerIconContainer,
                                            {
                                                backgroundColor: `${colors.primary}20`,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="people"
                                            size={28}
                                            color={colors.primary}
                                        />
                                    </View>
                                    {!isSearchActive && (
                                        <View>
                                            <Typography
                                                variant="heading-large"
                                                color="primary"
                                            >
                                                {t("customers.title")}
                                            </Typography>
                                            <Typography
                                                variant="body-small"
                                                color="muted"
                                            >
                                                {t("customers.totalCustomers", {
                                                    count: customers.length,
                                                })}
                                            </Typography>
                                        </View>
                                    )}
                                    {isSearchActive && (
                                        <View
                                            style={styles.searchInputContainer}
                                        >
                                            <TextInput
                                                ref={searchInputRef}
                                                style={[
                                                    styles.headerSearchInput,
                                                    {
                                                        backgroundColor:
                                                            colors.background,
                                                        color: colors.text
                                                            .primary,
                                                        textAlign: false
                                                            ? "right"
                                                            : "left",
                                                    },
                                                ]}
                                                placeholder={t(
                                                    "customers.searchPlaceholder",
                                                )}
                                                placeholderTextColor={
                                                    colors.text.muted
                                                }
                                                value={searchText}
                                                onChangeText={setSearchText}
                                                autoFocus
                                                onBlur={() => {
                                                    if (!searchText)
                                                        setIsSearchActive(
                                                            false,
                                                        );
                                                }}
                                            />
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View
                                    style={[
                                        styles.selectionHeader,
                                        ...(false
                                            ? [
                                                  {
                                                      flexDirection:
                                                          "row-reverse",
                                                  } as const,
                                              ]
                                            : []),
                                    ]}
                                >
                                    <Pressable
                                        onPress={cancelSelectionMode}
                                        style={styles.closeButton}
                                    >
                                        <Ionicons
                                            name="close"
                                            size={28}
                                            color={colors.text.primary}
                                        />
                                    </Pressable>
                                    <View>
                                        <Typography
                                            variant="heading-large"
                                            color="primary"
                                        >
                                            {t("customers.selected", {
                                                count: selectedIds.size,
                                            })}
                                        </Typography>
                                    </View>
                                </View>
                            )}
                        </View>
                        {!isSelectionMode ? (
                            <View style={styles.headerActions}>
                                <Pressable
                                    onPress={() => {
                                        if (isSearchActive) {
                                            setSearchText("");
                                            setIsSearchActive(false);
                                        } else {
                                            setIsSearchActive(true);
                                            setTimeout(
                                                () =>
                                                    searchInputRef.current?.focus(),
                                                100,
                                            );
                                        }
                                    }}
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: isSearchActive
                                                ? colors.primary
                                                : `${colors.primary}15`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            isSearchActive ? "close" : "search"
                                        }
                                        size={22}
                                        color={
                                            isSearchActive
                                                ? colors.text.primary
                                                : colors.primary
                                        }
                                    />
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.headerActions}>
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
                            </View>
                        )}
                    </View>
                </View>

                <GestureHandlerRootView style={styles.listContainer}>
                    <DraggableFlatList
                        data={orderedCustomers}
                        renderItem={renderCustomer}
                        keyExtractor={(item) => item.id?.toString() || ""}
                        containerStyle={styles.listContainer}
                        contentContainerStyle={[
                            styles.list,
                            { paddingBottom: 100 },
                        ]}
                        ListEmptyComponent={
                            !loading ? (
                                <View style={styles.emptyState}>
                                    <Ionicons
                                        name={
                                            searchText
                                                ? "search-outline"
                                                : "people-outline"
                                        }
                                        size={48}
                                        color={colors.text.muted}
                                    />
                                    <Typography
                                        variant="heading-small"
                                        color="secondary"
                                    >
                                        {searchText
                                            ? t("customers.noResults")
                                            : t("customers.emptyTitle")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                        style={styles.emptyStateMessage}
                                    >
                                        {searchText
                                            ? t("customers.noResultsMessage")
                                            : t("customers.emptyMessage")}
                                    </Typography>
                                </View>
                            ) : null
                        }
                        alwaysBounceVertical
                        overScrollMode="always"
                        refreshing={loading}
                        onRefresh={refresh}
                        refreshControl={
                            <RefreshControl
                                refreshing={loading}
                                onRefresh={refresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                        onDragEnd={handleDragEnd}
                        onDragBegin={() => {
                            isDraggingRef.current = true;
                        }}
                        activationDistance={isReorderMode ? 0 : 20}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        removeClippedSubviews={
                            Platform.OS === "android" && !isReorderMode
                        }
                    />
                </GestureHandlerRootView>

                <Modal
                    visible={isSelectionMenuVisible}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setIsSelectionMenuVisible(false)}
                >
                    <Pressable
                        style={styles.menuBackdrop}
                        onPress={() => setIsSelectionMenuVisible(false)}
                    >
                        <View
                            style={[
                                styles.selectionMenu,
                                {
                                    top: insets.top + 64,
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    [false ? "left" : "right"]: Spacing.lg,
                                },
                            ]}
                        >
                            <Pressable
                                onPress={handleSelectionToggleAll}
                                style={[
                                    styles.selectionMenuItem,
                                    false && styles.selectionMenuItemRTL,
                                ]}
                                disabled={
                                    selectedIds.size === 0 &&
                                    orderedCustomers.length === 0
                                }
                            >
                                <Ionicons
                                    name={
                                        selectedIds.size > 0
                                            ? "close-circle-outline"
                                            : "checkbox-outline"
                                    }
                                    size={22}
                                    color={
                                        selectedIds.size > 0 ||
                                        orderedCustomers.length > 0
                                            ? colors.primary
                                            : colors.text.muted
                                    }
                                />
                                <Typography
                                    variant="body-medium"
                                    color={
                                        selectedIds.size > 0 ||
                                        orderedCustomers.length > 0
                                            ? "primary"
                                            : "muted"
                                    }
                                >
                                    {selectedIds.size > 0
                                        ? t("customers.deselectAll")
                                        : t("customers.selectAll")}
                                </Typography>
                            </Pressable>
                            <Pressable
                                onPress={handleBulkDelete}
                                style={[
                                    styles.selectionMenuItem,
                                    false && styles.selectionMenuItemRTL,
                                ]}
                                disabled={selectedIds.size === 0}
                            >
                                <Ionicons
                                    name="trash"
                                    size={22}
                                    color={
                                        selectedIds.size > 0
                                            ? colors.danger
                                            : colors.text.muted
                                    }
                                />
                                <Typography
                                    variant="body-medium"
                                    color={
                                        selectedIds.size > 0
                                            ? "danger"
                                            : "muted"
                                    }
                                >
                                    {t("customers.delete")}
                                </Typography>
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal>

                {isSelectionMode && (
                    <View
                        style={[
                            styles.selectionFabContainer,
                            false && styles.selectionFabContainerRTL,
                            {
                                [false ? "left" : "right"]: Spacing.lg,
                            },
                        ]}
                    >
                        <Pressable
                            accessibilityLabel={t("customers.cancel")}
                            onPress={cancelSelectionMode}
                            style={[
                                styles.selectionFab,
                                {
                                    backgroundColor: colors.danger,
                                    shadowColor: colors.danger,
                                },
                            ]}
                        >
                            <Ionicons
                                name="close"
                                size={28}
                                color="#FFFFFF"
                            />
                        </Pressable>
                        <Pressable
                            accessibilityLabel={t("customers.done")}
                            onPress={confirmSelectionMode}
                            style={[
                                styles.selectionFab,
                                {
                                    backgroundColor: colors.success,
                                    shadowColor: colors.success,
                                },
                            ]}
                        >
                            <Ionicons
                                name="checkmark"
                                size={28}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </View>
                )}

                {!isSelectionMode && !isReorderMode && (
                    <Pressable
                        style={[
                            styles.fab,
                            {
                                bottom: 20,
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary,
                                [false ? "left" : "right"]: Spacing.lg,
                            },
                        ]}
                        onPress={() => router.push("/add-customer" as any)}
                    >
                        <Ionicons
                            name="add"
                            size={28}
                            color="#FFFFFF"
                        />
                    </Pressable>
                )}
            </View>
        </ErrorScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
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
    headerActions: {
        flexDirection: "row",
        gap: Spacing.xs,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
    },
    actionButtonActive: {
        backgroundColor: Colors.primary,
    },
    listContainer: {
        flex: 1,
    },
    activeCustomerCard: {
        marginBottom: Spacing.md,
        backgroundColor: `${Colors.primary}30`,
    },
    dragHandle: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: Spacing.xs,
    },
    searchContainer: {
        padding: Spacing.md,
        flexDirection: "row",
        gap: Spacing.md,
    },
    searchInput: {
        flex: 1,
    },
    addButton: {
        minWidth: 100,
    },
    list: {
        flexGrow: 1,
        padding: Spacing.md,
    },
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
    customerCard: {
        marginBottom: Spacing.sm,
        padding: Spacing.md,
    },
    selectedCustomerCard: {
        backgroundColor: `${Colors.primary}15`,
        borderColor: Colors.primary,
        borderWidth: 1,
    },
    checkbox: {
        justifyContent: "center",
    },
    selectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    text: {
        marginBottom: Spacing.xs,
    },
    date: {
        marginTop: Spacing.sm,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: Spacing.md,
    },
    deleteIcon: {
        padding: Spacing.sm,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    fab: {
        position: "absolute",
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
    selectionFabContainer: {
        position: "absolute",
        bottom: 20,
        flexDirection: "row",
        gap: Spacing.md,
    },
    selectionFabContainerRTL: {
        flexDirection: "row-reverse",
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
    menuBackdrop: {
        flex: 1,
    },
    selectionMenu: {
        position: "absolute",
        minWidth: 180,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: Spacing.xs,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        overflow: "hidden",
    },
    selectionMenuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    selectionMenuItemRTL: {
        flexDirection: "row-reverse",
    },
    customerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
        gap: Spacing.sm,
    },
    customerName: {
        flex: 1,
        flexShrink: 1,
    },
    balanceText: {
        flexShrink: 0,
        maxWidth: 120,
    },
    customerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    customerImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    customerImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    customerInfo: {
        flex: 1,
    },
});
