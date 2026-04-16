import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import DraggableFlatList, {
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, TouchableAmount, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useDebounce } from "../hooks/useDebounce";
import { CustomerWithAccounts } from "../models";
import { useDatabaseContext } from "../store";

export const CustomersScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { customers, loading, handleSearch, refresh } =
        useCustomersWithAccounts(db);
    const [searchText, setSearchText] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [orderedCustomers, setOrderedCustomers] = useState<
        CustomerWithAccounts[]
    >([]);
    const searchInputRef = useRef<TextInput>(null);

    const debouncedSearch = useDebounce(searchText, 500);

    React.useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh]),
    );

    // Load saved customer order from SQLite and apply to fetched customers
    useEffect(() => {
        const loadAndSortCustomers = async () => {
            if (!db || customers.length === 0) return;

            try {
                // Get saved order from SQLite
                const savedOrder = await db.getAllAsync<{
                    customer_id: number;
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

    const handleDragEnd = async ({
        data,
    }: {
        data: CustomerWithAccounts[];
    }) => {
        if (!db) return;

        setOrderedCustomers(data);
        // Save the new order to SQLite
        try {
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
        } catch (error) {
            console.error("Error saving customer order:", error);
        }
    };

    const renderCustomer = ({
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

        return (
            <ScaleDecorator>
                <Pressable
                    onPress={() => {
                        if (!isReorderMode && item.id) {
                            router.push(
                                `../customer-transactions?customerId=${item.id}` as any,
                            );
                        }
                    }}
                    onLongPress={isReorderMode ? drag : undefined}
                    disabled={isActive}
                >
                    <Card
                        style={{
                            ...styles.customerCard,
                            ...(isActive && styles.activeCustomerCard),
                        }}
                    >
                        <View style={styles.customerRow}>
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
                                            balance < 0 ? "danger" : "success"
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
    };

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
                                <Typography variant="body-small" color="muted">
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
                                    placeholderTextColor={Colors.text.muted}
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
                    </View>
                    <View style={styles.headerActions}>
                        <Pressable
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
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                if (isSearchActive) {
                                    setSearchText("");
                                    setIsSearchActive(false);
                                } else {
                                    setIsSearchActive(true);
                                    setTimeout(
                                        () => searchInputRef.current?.focus(),
                                        100,
                                    );
                                }
                            }}
                            style={styles.actionButton}
                        >
                            <Ionicons
                                name={isSearchActive ? "close" : "search"}
                                size={22}
                                color={Colors.primary}
                            />
                        </Pressable>
                    </View>
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
                    onDragEnd={handleDragEnd}
                    activationDistance={isReorderMode ? 0 : 20}
                />
            </GestureHandlerRootView>

            {!isReorderMode && (
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
