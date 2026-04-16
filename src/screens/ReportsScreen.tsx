import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useAccounts, useCustomers, useTransactions } from "../hooks";
import { useDatabaseContext } from "../store";
import { formatCurrency } from "../utils";

export const ReportsScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const insets = useSafeAreaInsets();
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchText, setSearchText] = useState("");
    const searchInputRef = useRef<TextInput>(null);
    const { customers } = useCustomers(db);
    const { accounts } = useAccounts(db);
    const { transactions } = useTransactions(db);

    const totalCreditLimit = accounts.reduce(
        (sum, acc) => sum + acc.credit_limit,
        0,
    );
    const totalCurrentBalance = accounts.reduce(
        (sum, acc) => sum + acc.current_balance,
        0,
    );

    const creditTransactions = transactions.filter((t) => t.type === "CREDIT");
    const debitTransactions = transactions.filter((t) => t.type === "DEBIT");
    const totalCredits = creditTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
    );
    const totalDebits = debitTransactions.reduce((sum, t) => sum + t.amount, 0);

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
                                name="bar-chart"
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
                                    Reports
                                </Typography>
                                <Typography variant="body-small" color="muted">
                                    Financial overview & analytics
                                </Typography>
                            </View>
                        )}
                        {isSearchActive && (
                            <View style={styles.searchInputContainer}>
                                <TextInput
                                    ref={searchInputRef}
                                    style={styles.headerSearchInput}
                                    placeholder="Search reports..."
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

            <ScrollView style={styles.content}>
                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={styles.cardTitle}
                    >
                        Overview
                    </Typography>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Total Customers:
                        </Typography>
                        <Typography variant="heading-medium" color="primary">
                            {customers.length}
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Total Accounts:
                        </Typography>
                        <Typography variant="heading-medium" color="primary">
                            {accounts.length}
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Total Transactions:
                        </Typography>
                        <Typography variant="heading-medium" color="primary">
                            {transactions.length}
                        </Typography>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={styles.cardTitle}
                    >
                        Financial Summary
                    </Typography>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Total Credit Limit:
                        </Typography>
                        <Typography variant="heading-medium" color="primary">
                            {formatCurrency(totalCreditLimit)}
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Total Current Balance:
                        </Typography>
                        <Typography
                            variant="heading-medium"
                            color={
                                totalCurrentBalance > 0 ? "danger" : "primary"
                            }
                        >
                            {formatCurrency(totalCurrentBalance)}
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Total Credits:
                        </Typography>
                        <Typography variant="heading-medium" color="success">
                            {formatCurrency(totalCredits)}
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Total Debits:
                        </Typography>
                        <Typography variant="heading-medium" color="danger">
                            {formatCurrency(totalDebits)}
                        </Typography>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={styles.cardTitle}
                    >
                        Account Status
                    </Typography>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Active Accounts:
                        </Typography>
                        <Typography variant="heading-medium" color="success">
                            {
                                accounts.filter((a) => a.status === "ACTIVE")
                                    .length
                            }
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Inactive Accounts:
                        </Typography>
                        <Typography variant="heading-medium" color="muted">
                            {
                                accounts.filter((a) => a.status === "INACTIVE")
                                    .length
                            }
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Suspended Accounts:
                        </Typography>
                        <Typography variant="heading-medium" color="warning">
                            {
                                accounts.filter((a) => a.status === "SUSPENDED")
                                    .length
                            }
                        </Typography>
                    </View>
                    <View style={styles.statRow}>
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            Closed Accounts:
                        </Typography>
                        <Typography variant="heading-medium" color="danger">
                            {
                                accounts.filter((a) => a.status === "CLOSED")
                                    .length
                            }
                        </Typography>
                    </View>
                </Card>
            </ScrollView>
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
    content: {
        flex: 1,
        padding: Spacing.md,
    },
    card: {
        marginBottom: Spacing.md,
    },
    cardTitle: {
        marginBottom: Spacing.md,
    },
    statRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
