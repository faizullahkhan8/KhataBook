import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import DraggableFlatList, {
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, TouchableAmount, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useDebounce } from "../hooks/useDebounce";
import { CustomerId, CustomerWithAccounts } from "../models";
import { CustomerService } from "../services/CustomerService";
import { useDatabaseContext } from "../store";

export const CustomersScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { customers, loading, handleSearch, refresh, bulkDeleteCustomers } =
        useCustomersWithAccounts(db);
    const [searchText, setSearchText] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<CustomerId>>(new Set());
    const [orderedCustomers, setOrderedCustomers] = useState<
        CustomerWithAccounts[]
    >([]);
    const searchInputRef = useRef<TextInput>(null);

    // Always get the latest db instance for customerService
    const customerService = db ? new CustomerService(db) : null;

    const debouncedSearch = useDebounce(searchText, 500);

    React.useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    // (Removed duplicate customerService declaration)
    // Load saved customer order from SQLite and apply to fetched customers
    useEffect(() => {
        const loadAndSortCustomers = async () => {
            if (!db) return;

            if (customers.length === 0) {
                setOrderedCustomers([]);
                return;
            }

            try {
                // Get saved order from SQLite
                const savedOrder = await db.getAllAsync<{
                    customer_id: CustomerId;
                    sort_order: number;
                }>(
                    "SELECT customer_id, sort_order FROM customer_order ORDER BY sort_order",
                );

                if (savedOrder && savedOrder.length > 0) {
                    const orderIds = savedOrder.map((o) => o.customer_id);
                    // Create a map of customers by id
                    const customerMap = new Map(
                        customers.map((c) => [c.id, c]),
                    );
                    // Reorder based on saved order, adding new customers at the end
                    const ordered = orderIds
                        .map((id) => customerMap.get(id))
                        .filter(Boolean) as CustomerWithAccounts[];
                    // Add any new customers not in the saved order
                    const newCustomers = customers.filter(
                        (c) => !orderIds.includes(c.id!),
                    );
                    setOrderedCustomers([...ordered, ...newCustomers]);
                } else {
                    setOrderedCustomers(customers);
                }
            } catch (error) {
                console.error("Error loading customer order:", error);
                setOrderedCustomers(customers);
            }
        };

        loadAndSortCustomers();
    }, [customers, db]);

    const handleDragEnd = useCallback(
        ({ data }: { data: CustomerWithAccounts[] }) => {
            setOrderedCustomers(data); // Instantly update UI for smoothness
            if (!db) return;
            // Save the new order to SQLite asynchronously (no await, fire-and-forget)
            (async () => {
                try {
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
                } catch (error) {
                    console.error("Error saving customer order:", error);
                }
            })();
        },
        [db],
    );

    // Selection mode handlers
    const activateSelectionMode = useCallback((customerId?: CustomerId) => {
        setIsSelectionMode(true);
        if (customerId) {
            setSelectedIds(new Set([customerId]));
        }
    }, []);

    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        setIsReorderMode(false);
    }, []);

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

    const handleBulkDelete = useCallback(() => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            "Delete Customers",
            `Are you sure you want to delete ${selectedIds.size} customer${selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await bulkDeleteCustomers(Array.from(selectedIds));
                            exitSelectionMode();
                        } catch (error) {
                            console.error("Error deleting customers:", error);
                            Alert.alert(
                                "Error",
                                "Failed to delete some customers. Please try again.",
                            );
                        }
                    },
                },
            ],
        );
    }, [selectedIds, bulkDeleteCustomers, exitSelectionMode]);

    const renderCustomer = useCallback(({
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
        const isSelected = item.id !== undefined && selectedIds.has(item.id);

        return (
            <ScaleDecorator>
                <Pressable
                    onPress={() => {
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
                        style={{
                            ...styles.customerCard,
                            ...(isActive && styles.activeCustomerCard),
                            ...(isSelected && styles.selectedCustomerCard),
                        }}
                    >
                        <View style={styles.customerRow}>
                            {/* Selection Checkbox */}
                            {isSelectionMode && (
                                <View style={styles.checkbox}>
                                    <Ionicons
                                        name={
                                            isSelected
                                                ? "checkbox"
                                                : "square-outline"
                                        }
                                        size={24}
                                        color={
                                            isSelected
                                                ? Colors.primary
                                                : Colors.text.muted
                                        }
                                    />
                                </View>
                            )}
                            {/* Drag Handle (only in reorder mode) */}
                            {isReorderMode && (
                                <View style={styles.dragHandle}>
                                    <Ionicons
                                        name="reorder-three"
                                        size={24}
                                        color={Colors.text.muted}
                                    />
                                </View>
                            )}
                            {item.image_uri ? (
                                <Image
                                    source={{ uri: item.image_uri }}
                                    style={styles.customerImage}
                                    contentFit="cover"
                                    transition={200}
                                    priority="high"
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={styles.customerImagePlaceholder}>
                                    <Ionicons
                                        name="person"
                                        size={24}
                                        color={Colors.text.muted}
                                    />
                                </View>
                            )}
                            <View style={styles.customerInfo}>
                                <View style={styles.customerHeader}>
                                    <Typography
                                        variant="heading-small"
                                        color="primary"
                                        numberOfLines={1}
                                        style={styles.customerName}
                                    >
                                        {item.name}
                                    </Typography>
                                    <TouchableAmount
                                        amount={balance}
                                        variant="heading-medium"
                                        color={
                                            balance > 0 ? "danger" : "success"
                                        }
                                        style={styles.balanceText}
                                    />
                                </View>
                                <Typography
                                    variant="subheading-small"
                                    color="secondary"
                                    style={styles.text}
                                >
                                    {item.phone}
                                </Typography>
                                <Typography
                                    variant="body-small"
                                    color="muted"
                                    style={styles.text}
                                >
                                    Account: {accountNumber}
                                </Typography>
                                {item.email && (
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                        style={styles.text}
                                    >
                                        {item.email}
                                    </Typography>
                                )}
                                {item.address && (
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                        style={styles.text}
                                    >
                                        {item.address}
                                    </Typography>
                                )}
                            </View>
                        </View>
                    </Card>
                </Pressable>
            </ScaleDecorator>
        );
    }, [selectedIds, isSelectionMode, isReorderMode, toggleSelection, activateSelectionMode, router]);

    if (!db) {
        return (
            <View style={styles.center}>
                <Typography variant="body-medium" color="muted">
                    Loading database...
                </Typography>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View
                style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
            >
                <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleRow}>
                        {!isSelectionMode ? (
                            <>
                                <View style={styles.headerIconContainer}>
                                    <Ionicons
                                        name="people"
                                        size={28}
                                        color={Colors.primary}
                                    />
                                </View>
                                {!isSearchActive && (
                                    <View>
                                        <Typography
                                            variant="heading-large"
                                            color="primary"
                                        >
                                            Customers
                                        </Typography>
                                        <Typography
                                            variant="body-small"
                                            color="muted"
                                        >
                                            {customers.length} total customers
                                        </Typography>
                                    </View>
                                )}
                                {isSearchActive && (
                                    <View style={styles.searchInputContainer}>
                                        <TextInput
                                            ref={searchInputRef}
                                            style={styles.headerSearchInput}
                                            placeholder="Search customers..."
                                            placeholderTextColor={
                                                Colors.text.muted
                                            }
                                            value={searchText}
                                            onChangeText={setSearchText}
                                            autoFocus
                                            onBlur={() => {
                                                if (!searchText)
                                                    setIsSearchActive(false);
                                            }}
                                        />
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={styles.selectionHeader}>
                                <Pressable
                                    onPress={exitSelectionMode}
                                    style={styles.closeButton}
                                >
                                    <Ionicons
                                        name="close"
                                        size={28}
                                        color={Colors.text.primary}
                                    />
                                </Pressable>
                                <View>
                                    <Typography
                                        variant="heading-large"
                                        color="primary"
                                    >
                                        {selectedIds.size} selected
                                    </Typography>
                                    <Pressable onPress={selectAll}>
                                        <Typography
                                            variant="body-small"
                                            color="primary"
                                        >
                                            {selectedIds.size ===
                                                orderedCustomers.length
                                                ? "Deselect All"
                                                : "Select All"}
                                        </Typography>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                    {!isSelectionMode && (
                        <View style={styles.headerActions}>
                            {/* <Pressable
                                onPress={() => setIsReorderMode(!isReorderMode)}
                                style={[
                                    styles.actionButton,
                                    isReorderMode && styles.actionButtonActive,
                                ]}
                            >
                                <Ionicons
                                    name={
                                        isReorderMode
                                            ? "checkmark"
                                            : "swap-vertical"
                                    }
                                    size={22}
                                    color={
                                        isReorderMode
                                            ? Colors.text.primary
                                            : Colors.primary
                                    }
                                />
                            </Pressable> */}
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
                                    isSearchActive && styles.actionButtonActive,
                                ]}
                            >
                                <Ionicons
                                    name={isSearchActive ? "close" : "search"}
                                    size={22}
                                    color={Colors.primary}
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
                    contentContainerStyle={[
                        styles.list,
                        { paddingBottom: 100 },
                    ]}
                    refreshing={loading}
                    onRefresh={refresh}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={refresh}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    onDragEnd={handleDragEnd}
                    activationDistance={isReorderMode ? 0 : 20}
                    // Performance optimizations
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews={Platform.OS === "android"}
                    getItemLayout={(_, index) => ({
                        length: 120, // Estimated card height
                        offset: 120 * index,
                        index,
                    })}
                />
            </GestureHandlerRootView>

            {/* Selection Mode Bottom Action Bar */}
            {isSelectionMode && (
                <View style={styles.bottomActionBar}>
                    <View style={styles.actionBarContent}>
                        <Pressable
                            onPress={exitSelectionMode}
                            style={styles.actionBarButton}
                        >
                            <Ionicons
                                name="close"
                                size={24}
                                color={Colors.text.primary}
                            />
                            <Typography variant="body-small" color="primary">
                                Cancel
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={() => setIsReorderMode(!isReorderMode)}
                            style={[
                                styles.actionBarButton,
                                isReorderMode && styles.actionBarButtonActive,
                            ]}
                        >
                            <Ionicons
                                name={
                                    isReorderMode
                                        ? "checkmark"
                                        : "reorder-three"
                                }
                                size={24}
                                color={
                                    isReorderMode
                                        ? Colors.primary
                                        : Colors.text.primary
                                }
                            />
                            <Typography
                                variant="body-small"
                                color={isReorderMode ? "primary" : "secondary"}
                            >
                                {isReorderMode ? "Done" : "Reorder"}
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={handleBulkDelete}
                            style={styles.actionBarButton}
                            disabled={selectedIds.size === 0}
                        >
                            <Ionicons
                                name="trash"
                                size={24}
                                color={
                                    selectedIds.size > 0
                                        ? Colors.danger
                                        : Colors.text.muted
                                }
                            />
                            <Typography
                                variant="body-small"
                                color={
                                    selectedIds.size > 0 ? "danger" : "muted"
                                }
                            >
                                Delete
                            </Typography>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* FAB - only show when NOT in selection mode */}
            {!isSelectionMode && !isReorderMode && (
                <Pressable
                    style={[styles.fab, { bottom: 20 }]}
                    onPress={() => router.push("/add-customer" as any)}
                >
                    <Ionicons
                        name="add"
                        size={28}
                        color={Colors.text.primary}
                    />
                </Pressable>
            )}
        </View>
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
        marginRight: Spacing.sm,
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
        padding: Spacing.md,
        gap: Spacing.md,
    },
    customerCard: {
        marginBottom: Spacing.md,
    },
    selectedCustomerCard: {
        backgroundColor: `${Colors.primary}15`,
        borderColor: Colors.primary,
        borderWidth: 1,
    },
    checkbox: {
        marginRight: Spacing.sm,
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
    bottomActionBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    actionBarContent: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
    },
    actionBarButton: {
        alignItems: "center",
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        minWidth: 80,
    },
    actionBarButtonActive: {
        backgroundColor: `${Colors.primary}20`,
        borderRadius: 8,
    },
    customerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.xs,
        gap: Spacing.sm,
    },
    customerName: {
        flex: 1,
        flexShrink: 1,
        marginRight: Spacing.sm,
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
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: Spacing.md,
    },
    customerImagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.surface,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    customerInfo: {
        flex: 1,
    },
});
