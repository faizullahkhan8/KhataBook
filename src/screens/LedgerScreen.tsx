import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomersWithAccounts, useTransactions } from "../hooks";
import { useDatabaseContext } from "../store";
import { formatCurrency, formatDateTime } from "../utils";

interface LedgerEntry {
    id: string;
    type: "transaction";
    amount: number;
    description: string;
    date: number;
    isCredit: boolean;
    customerName: string;
    accountNumber: string;
}

export const LedgerScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const insets = useSafeAreaInsets();
    const { transactions } = useTransactions(db);
    const { customers } = useCustomersWithAccounts(db);
    const [searchText, setSearchText] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const searchInputRef = useRef<TextInput>(null);

    // Create a lookup map for account_id -> { customerName, accountNumber }
    const accountLookup = useMemo(() => {
        const lookup: Record<
            number,
            { customerName: string; accountNumber: string }
        > = {};
        customers.forEach((customer) => {
            customer.accounts?.forEach((account) => {
                if (account.id) {
                    lookup[account.id] = {
                        customerName: customer.name,
                        accountNumber: account.account_number,
                    };
                }
            });
        });
        return lookup;
    }, [customers]);

    const ledgerEntries: LedgerEntry[] = [
        ...transactions.map((t) => {
            const accountData = t.account_id
                ? accountLookup[t.account_id]
                : null;
            return {
                id: `t-${t.id}`,
                type: "transaction" as const,
                amount: t.amount,
                description: t.description || t.type,
                date: t.created_at || 0,
                isCredit: t.type === "CREDIT",
                customerName: accountData?.customerName || "Unknown",
                accountNumber: accountData?.accountNumber || "N/A",
            };
        }),
    ].sort((a, b) => b.date - a.date);

    const filteredEntries = ledgerEntries.filter(
        (entry) =>
            entry.description
                .toLowerCase()
                .includes(searchText.toLowerCase()) ||
            entry.customerName
                .toLowerCase()
                .includes(searchText.toLowerCase()) ||
            entry.accountNumber
                .toLowerCase()
                .includes(searchText.toLowerCase()),
    );

    const renderEntry = ({ item }: { item: LedgerEntry }) => (
        <Card style={styles.entryCard}>
            <View style={styles.entryHeader}>
                <Typography variant="body-medium" color="secondary">
                    Transaction
                </Typography>
                <Typography variant="small-small" color="muted">
                    {formatDateTime(item.date)}
                </Typography>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                }}
            >
                <View>
                    <Typography
                        variant="heading-small"
                        color="primary"
                        style={styles.description}
                    >
                        {item.description === "CREDIT" ? (
                            <Typography variant="heading-small" color="success">
                                Received from
                            </Typography>
                        ) : (
                            <Typography variant="heading-small" color="danger">
                                Paid to
                            </Typography>
                        )}
                    </Typography>
                    <Typography variant="heading-small">
                        {item.customerName}
                    </Typography>
                    <Typography
                        variant="small-small"
                        color="muted"
                        style={styles.accountNumber}
                    >
                        {item.accountNumber}
                    </Typography>
                </View>
                {/* place in the bottom right */}
                <View style={{ alignSelf: "flex-end" }}>
                    <Typography
                        variant="heading-large"
                        color={item.isCredit ? "success" : "danger"}
                        style={styles.amount}
                    >
                        {item.isCredit ? "+" : "-"}
                        {formatCurrency(item.amount)}
                    </Typography>
                </View>
            </View>
        </Card>
    );

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
                                name="book"
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
                                    Ledger
                                </Typography>
                                <Typography variant="body-small" color="muted">
                                    {filteredEntries.length} transactions
                                </Typography>
                            </View>
                        )}
                        {isSearchActive && (
                            <View style={styles.searchInputContainer}>
                                <TextInput
                                    ref={searchInputRef}
                                    style={styles.headerSearchInput}
                                    placeholder="Search ledger..."
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
                data={filteredEntries}
                renderItem={renderEntry}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
            />
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
    },
    list: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    entryCard: {
        marginBottom: Spacing.md,
    },
    entryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.xs,
    },
    description: {
        marginTop: Spacing.sm,
    },
    accountNumber: {
        marginTop: Spacing.xs,
    },
    amount: {
        textAlign: "right",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
