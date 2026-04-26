import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useDatabaseContext, useLanguage, useTheme } from "../store";

export const CustomersScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
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

    const customerService = db ? new CustomerService(db) : null;

    const debouncedSearch = useDebounce(searchText, 500);

    React.useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    useEffect(() => {
        const loadAndSortCustomers = async () => {
            if (!db) return;

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
            } catch (error) {
                setOrderedCustomers(customers);
            }
        };

        loadAndSortCustomers();
    }, [customers, db]);

    const handleDragEnd = useCallback(
        ({ data }: { data: CustomerWithAccounts[] }) => {
            setOrderedCustomers(data);
            if (!db) return;
            (async () => {
                try {
                    await db.withTransactionAsync(async () => {
                        await db.runAsync("DELETE FROM customer_order");
                        for (let i = 0; i < data.length; i++) {
                            const customerId = data[i].id;
                            if (
                                customerId !== undefined &&
                                customerId !== null
                            ) {
                                await db.runAsync(
                                    "INSERT INTO customer_order (customer_id, sort_order) VALUES (?, ?)",
                                    [customerId, i],
                                );
                            }
                        }
                    });
                } catch (error) {}
            })();
        },
        [db],
    );

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
            t("customers.deleteTitle"),
            t("customers.deleteMessage", { count: selectedIds.size }),
            [
                { text: t("customers.cancel"), style: "cancel" },
                {
                    text: t("customers.delete"),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await bulkDeleteCustomers(Array.from(selectedIds));
                            exitSelectionMode();
                        } catch (error) {
                            Alert.alert(
                                t("customers.deleteError"),
                                t("customers.deleteErrorMessage"),
                            );
                        }
                    },
                },
            ],
        );
    }, [selectedIds, bulkDeleteCustomers, exitSelectionMode, t]);

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
                            style={[
                                styles.customerCard,
                                ...(isActive
                                    ? [
                                          {
                                              backgroundColor: `${colors.primary}30`,
                                          },
                                      ]
                                    : []),
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
                                    isRTL && { flexDirection: "row-reverse" },
                                ]}
                            >
                                {isSelectionMode && (
                                    <View
                                        style={[
                                            styles.checkbox,
                                            isRTL
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
                                            isRTL
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
                                            isRTL
                                                ? { marginLeft: Spacing.md }
                                                : { marginRight: Spacing.md },
                                        ]}
                                        contentFit="cover"
                                        transition={200}
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
                                            isRTL
                                                ? { marginLeft: Spacing.md }
                                                : { marginRight: Spacing.md },
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
                                            isRTL && {
                                                flexDirection: "row-reverse",
                                            },
                                        ]}
                                    >
                                        <Typography
                                            variant="heading-small"
                                            color="primary"
                                            numberOfLines={1}
                                            style={[
                                                styles.customerName,
                                                isRTL && {
                                                    textAlign: "right",
                                                    marginLeft: Spacing.sm,
                                                    marginRight: 0,
                                                },
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
                                        variant="subheading-small"
                                        color="secondary"
                                        style={[
                                            styles.text,
                                            isRTL && { textAlign: "right" },
                                        ]}
                                    >
                                        {item.phone}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                        style={[
                                            styles.text,
                                            isRTL && { textAlign: "right" },
                                        ]}
                                    >
                                        {t("customers.account", {
                                            number: accountNumber,
                                        })}
                                    </Typography>
                                    {item.email && (
                                        <Typography
                                            variant="body-small"
                                            color="muted"
                                            style={[
                                                styles.text,
                                                isRTL && { textAlign: "right" },
                                            ]}
                                        >
                                            {item.email}
                                        </Typography>
                                    )}
                                    {item.address && (
                                        <Typography
                                            variant="body-small"
                                            color="muted"
                                            style={[
                                                styles.text,
                                                isRTL && { textAlign: "right" },
                                            ]}
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
        },
        [
            selectedIds,
            isSelectionMode,
            isReorderMode,
            toggleSelection,
            activateSelectionMode,
            router,
            t,
            isRTL,
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
                <View
                    style={[
                        styles.headerTopRow,
                        isRTL && { flexDirection: "row-reverse" },
                    ]}
                >
                    <View
                        style={[
                            styles.headerTitleRow,
                            isRTL && { flexDirection: "row-reverse" },
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
                                    <View style={styles.searchInputContainer}>
                                        <TextInput
                                            ref={searchInputRef}
                                            style={[
                                                styles.headerSearchInput,
                                                {
                                                    backgroundColor:
                                                        colors.background,
                                                    color: colors.text.primary,
                                                    textAlign: isRTL
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
                                                    setIsSearchActive(false);
                                            }}
                                        />
                                    </View>
                                )}
                            </>
                        ) : (
                            <View
                                style={[
                                    styles.selectionHeader,
                                    isRTL && { flexDirection: "row-reverse" },
                                ]}
                            >
                                <Pressable
                                    onPress={exitSelectionMode}
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
                                    <Pressable onPress={selectAll}>
                                        <Typography
                                            variant="body-small"
                                            color="primary"
                                        >
                                            {selectedIds.size ===
                                            orderedCustomers.length
                                                ? t("customers.deselectAll")
                                                : t("customers.selectAll")}
                                        </Typography>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                    {!isSelectionMode && (
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
                                    name={isSearchActive ? "close" : "search"}
                                    size={22}
                                    color={
                                        isSearchActive
                                            ? colors.text.primary
                                            : colors.primary
                                    }
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
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    onDragEnd={handleDragEnd}
                    activationDistance={isReorderMode ? 0 : 20}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews={Platform.OS === "android"}
                    getItemLayout={(_, index) => ({
                        length: 120,
                        offset: 120 * index,
                        index,
                    })}
                />
            </GestureHandlerRootView>

            {isSelectionMode && (
                <View
                    style={[
                        styles.bottomActionBar,
                        {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.border,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.actionBarContent,
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Pressable
                            onPress={exitSelectionMode}
                            style={styles.actionBarButton}
                        >
                            <Ionicons
                                name="close"
                                size={24}
                                color={colors.text.primary}
                            />
                            <Typography variant="body-small" color="primary">
                                {t("customers.cancel")}
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={() => setIsReorderMode(!isReorderMode)}
                            style={[
                                styles.actionBarButton,
                                isReorderMode && {
                                    backgroundColor: `${colors.primary}20`,
                                    borderRadius: 8,
                                },
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
                                        ? colors.primary
                                        : colors.text.primary
                                }
                            />
                            <Typography
                                variant="body-small"
                                color={isReorderMode ? "primary" : "secondary"}
                            >
                                {isReorderMode
                                    ? t("customers.done")
                                    : t("customers.reorder")}
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
                                        ? colors.danger
                                        : colors.text.muted
                                }
                            />
                            <Typography
                                variant="body-small"
                                color={
                                    selectedIds.size > 0 ? "danger" : "muted"
                                }
                            >
                                {t("customers.delete")}
                            </Typography>
                        </Pressable>
                    </View>
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
                            [isRTL ? "left" : "right"]: Spacing.lg,
                        },
                    ]}
                    onPress={() => router.push("/add-customer" as any)}
                >
                    <Ionicons
                        name="add"
                        size={28}
                        color={colors.text.primary}
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
    },
    customerImagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    customerInfo: {
        flex: 1,
    },
});
