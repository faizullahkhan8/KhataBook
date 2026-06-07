import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Card,
    DateFilter,
    DateRangePicker,
    ErrorScreen,
    TouchableAmount,
    Typography,
} from "../components";
import { DateFilterType, DateRange } from "../components/DateFilter";
import { Colors, Spacing } from "../constants";
import {
    DateRange as HookDateRange,
    useCustomersWithAccounts,
    useTransactions,
} from "../hooks";
import { TransactionType } from "../models";
import { useDatabaseContext, useLanguage, useTheme } from "../store";
import { formatDateTime } from "../utils";

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
    const { db, error: dbError, initDatabase } = useDatabaseContext();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [selectedFilter, setSelectedFilter] = useState<DateFilterType>("all");
    const [customRange, setCustomRange] = useState<DateRange | undefined>(
        undefined,
    );
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Calculate date range based on selected filter
    const dateRange = useMemo<HookDateRange | null>(() => {
        const now = new Date();
        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        );

        switch (selectedFilter) {
            case "today":
                return { startDate: today, endDate: today };
            case "yesterday": {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return { startDate: yesterday, endDate: yesterday };
            }
            case "last7Days": {
                const last7Days = new Date(today);
                last7Days.setDate(last7Days.getDate() - 6);
                return { startDate: last7Days, endDate: today };
            }
            case "lastMonth": {
                const lastMonth = new Date(today);
                lastMonth.setDate(lastMonth.getDate() - 29);
                return { startDate: lastMonth, endDate: today };
            }
            case "custom":
                if (customRange?.startDate && customRange?.endDate) {
                    return {
                        startDate: customRange.startDate,
                        endDate: customRange.endDate,
                    };
                }
                return null;
            default:
                return null;
        }
    }, [selectedFilter, customRange]);

    const {
        transactions,
        loading: loadingTransactions,
        refresh: refreshTransactions,
    } = useTransactions(db, dateRange);
    const {
        customers,
        loading: loadingCustomers,
        refresh: refreshCustomers,
    } = useCustomersWithAccounts(db);

    const isRefreshing = loadingTransactions || loadingCustomers;

    const handleRefresh = async () => {
        await Promise.all([refreshTransactions(), refreshCustomers()]);
    };
    const [searchText, setSearchText] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const searchInputRef = useRef<TextInput>(null);

    const handleFilterChange = useCallback((filter: DateFilterType) => {
        if (filter === "custom") {
            setShowDatePicker(true);
        } else {
            setSelectedFilter(filter);
            setCustomRange(undefined);
        }
    }, []);

    const handleDateRangeApply = useCallback(
        (range: { startDate: Date | null; endDate: Date | null }) => {
            if (range.startDate && range.endDate) {
                setCustomRange({
                    startDate: range.startDate,
                    endDate: range.endDate,
                });
                setSelectedFilter("custom");
            }
            setShowDatePicker(false);
        },
        [],
    );

    // Create a lookup map for account_id -> { customerName, accountNumber }
    const accountLookup = useMemo(() => {
        const lookup: Record<
            string,
            { customerName: string; accountNumber: string }
        > = {};
        customers.forEach((customer) => {
            customer.accounts?.forEach((account) => {
                if (account.id) {
                    lookup[account.id.toString()] = {
                        customerName: customer.name,
                        accountNumber: account.account_number,
                    };
                }
            });
        });
        return lookup;
    }, [customers]);

    const ledgerEntries: LedgerEntry[] = useMemo(() => {
        return [
            ...transactions.map((transaction) => {
                const accountData = transaction.account_id
                    ? accountLookup[transaction.account_id.toString()]
                    : null;
                return {
                    id: `t-${transaction.id}`,
                    type: "transaction" as const,
                    amount: transaction.amount,
                    description:
                        transaction.description ||
                        (transaction.type === TransactionType.CREDIT
                            ? t("ledger.credit")
                            : t("ledger.debit")),
                    date: transaction.created_at || 0,
                    isCredit: transaction.type === TransactionType.CREDIT,
                    customerName:
                        accountData?.customerName || t("ledger.unknown"),
                    accountNumber:
                        accountData?.accountNumber || t("ledger.notAvailable"),
                };
            }),
        ].sort((a, b) => b.date - a.date);
    }, [transactions, accountLookup, t]);

    const filteredEntries = useMemo(() => {
        const lowerSearch = searchText.toLowerCase();
        return ledgerEntries.filter(
            (entry) =>
                entry.description.toLowerCase().includes(lowerSearch) ||
                entry.customerName.toLowerCase().includes(lowerSearch) ||
                entry.accountNumber.toLowerCase().includes(lowerSearch),
        );
    }, [ledgerEntries, searchText]);

    const renderEntry = useCallback(
        ({ item }: { item: LedgerEntry }) => (
            <Card style={styles.entryCard}>
                <View
                    style={[
                        styles.entryHeader,
                        isRTL && { flexDirection: "row-reverse" },
                    ]}
                >
                    <Typography variant="body-medium" color="secondary">
                        {t("ledger.transaction")}
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
                    <View style={styles.entryContent}>
                        <Typography
                            variant="heading-small"
                            color="primary"
                            style={styles.description}
                            numberOfLines={1}
                        >
                            {item.isCredit
                                ? t("ledger.receivedFrom")
                                : t("ledger.paidTo")}
                        </Typography>
                        <Typography
                            variant="heading-small"
                            numberOfLines={1}
                            style={styles.customerName}
                        >
                            {item.customerName}
                        </Typography>
                        <Typography
                            variant="small-small"
                            color="muted"
                            style={styles.accountNumber}
                            numberOfLines={1}
                        >
                            {item.accountNumber}
                        </Typography>
                    </View>
                    <View style={styles.amountContainer}>
                        <TouchableAmount
                            amount={item.amount}
                            variant="heading-large"
                            color={item.isCredit ? "success" : "danger"}
                            style={styles.amount}
                        />
                    </View>
                </View>
            </Card>
        ),
        [isRTL, t],
    );

    if (!db) {
        return (
            <View
                style={[styles.center, { backgroundColor: colors.background }]}
            >
                <Typography variant="body-medium" color="muted">
                    {t("ledger.loading")}
                </Typography>
            </View>
        );
    }

    return (
        <ErrorScreen
            error={dbError}
            type="database"
            isLoading={!db && !dbError}
            onRetry={initDatabase}
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
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <View
                            style={[
                                styles.headerTitleRow,
                                isRTL && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <View
                                style={[
                                    styles.headerIconContainer,
                                    { backgroundColor: `${colors.primary}20` },
                                ]}
                            >
                                <Ionicons
                                    name="book"
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
                                        {t("ledger.title")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                    >
                                        {t("ledger.subtitle", {
                                            count: filteredEntries.length,
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
                                            },
                                        ]}
                                        placeholder={t(
                                            "ledger.searchPlaceholder",
                                        )}
                                        placeholderTextColor={colors.text.muted}
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
                            style={[
                                styles.searchIconButton,
                                { backgroundColor: `${colors.primary}15` },
                            ]}
                        >
                            <Ionicons
                                name={isSearchActive ? "close" : "search"}
                                size={24}
                                color={colors.primary}
                            />
                        </Pressable>
                    </View>
                </View>

                {/* Date Filter */}
                <DateFilter
                    selectedFilter={selectedFilter}
                    onFilterChange={handleFilterChange}
                    customRange={customRange}
                />

                {/* Date Range Picker Modal */}
                <DateRangePicker
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    onApply={handleDateRangeApply}
                    initialRange={
                        customRange?.startDate && customRange?.endDate
                            ? {
                                  startDate: customRange.startDate,
                                  endDate: customRange.endDate,
                              }
                            : undefined
                    }
                />

                <FlatList
                    data={filteredEntries}
                    renderItem={renderEntry}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        !isRefreshing ? (
                            <View style={styles.emptyState}>
                                <Ionicons
                                    name={
                                        searchText
                                            ? "search-outline"
                                            : "receipt-outline"
                                    }
                                    size={48}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="heading-small"
                                    color="secondary"
                                >
                                    {searchText
                                        ? t("ledger.noResults")
                                        : t("ledger.emptyTitle")}
                                </Typography>
                                <Typography
                                    variant="body-small"
                                    color="muted"
                                    style={styles.emptyStateMessage}
                                >
                                    {searchText
                                        ? t("ledger.noResultsMessage")
                                        : t("ledger.emptyMessage")}
                                </Typography>
                            </View>
                        ) : null
                    }
                    alwaysBounceVertical
                    overScrollMode="always"
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                />
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
        flexGrow: 1,
        padding: Spacing.md,
        gap: Spacing.md,
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
    entryCard: {
        marginBottom: Spacing.md,
    },
    entryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.xs,
    },
    entryContent: {
        flex: 1,
        flexShrink: 1,
        marginRight: Spacing.sm,
    },
    customerName: {
        flex: 1,
    },
    amountContainer: {
        alignSelf: "flex-end",
        flexShrink: 0,
        maxWidth: 140,
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
