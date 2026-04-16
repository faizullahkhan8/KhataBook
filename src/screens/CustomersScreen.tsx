import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useDebounce } from "../hooks/useDebounce";
import { CustomerWithAccounts } from "../models";
import { useDatabaseContext } from "../store";
import { formatCurrency } from "../utils";

export const CustomersScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { customers, loading, handleSearch, refresh } =
        useCustomersWithAccounts(db);
    const [searchText, setSearchText] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
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

    const renderCustomer = ({ item }: { item: CustomerWithAccounts }) => {
        const balance = item.accounts?.[0]?.current_balance || 0;
        const accountNumber = item.accounts?.[0]?.account_number || "N/A";

        return (
            <Pressable
                onPress={() => {
                    if (item.id) {
                        router.push(
                            `../customer-transactions?customerId=${item.id}` as any,
                        );
                    }
                }}
            >
                <Card style={styles.customerCard}>
                    <View style={styles.customerRow}>
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
                                >
                                    {item.name}
                                </Typography>
                                <Typography
                                    variant="heading-medium"
                                    color={balance < 0 ? "danger" : "success"}
                                >
                                    {formatCurrency(balance)}
                                </Typography>
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
                        style={styles.searchIconButton}
                    >
                        <Ionicons
                            name={isSearchActive ? "close" : "search"}
                            size={24}
                            color={Colors.primary}
                        />
                    </Pressable>
                </View>
            </View>

            <FlatList
                data={customers}
                renderItem={renderCustomer}
                keyExtractor={(item) => item.id?.toString() || ""}
                contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                refreshing={loading}
                onRefresh={refresh}
            />

            <Pressable
                style={[styles.fab, { bottom: 20 }]}
                onPress={() => router.push("/add-customer" as any)}
            >
                <Ionicons name="add" size={28} color={Colors.text.primary} />
            </Pressable>
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
    searchIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: Spacing.sm,
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
