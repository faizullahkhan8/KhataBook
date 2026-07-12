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
    DateFilter,
    DateRangePicker,
    ErrorScreen,
    LoadingScreen,
    TouchableAmount,
    Typography,
} from "../components";
import { DateFilterType, DateRange } from "../components/DateFilter";
import { Colors, Spacing } from "../constants";
import {
    DateRange as HookDateRange,
    LedgerFundingSource,
    useLedgerEntries,
} from "../hooks";
import { useDatabaseContext, useTheme } from "../store";
import { formatDateTime } from "../utils";

interface LedgerEntry {
    id: string;
    type: "transaction";
    amount: number;
    description: string;
    date: number;
    fundingSource: LedgerFundingSource;
    balanceFundedAmount: number;
    pocketFundedAmount: number;
    customerName: string;
    accountNumber: string;
}

export const LedgerScreen: React.FC = () => {
    const { db, error: dbError, initDatabase } = useDatabaseContext();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [selectedFilter, setSelectedFilter] = useState<DateFilterType>("all");
    const [customRange, setCustomRange] = useState<DateRange | undefined>(
        undefined,
    );
    const [showDatePicker, setShowDatePicker] = useState(false);

    // --- NEW: Structural Loading State Management ---
    const initialLoadDone = useRef(false);

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
        entries: transactionEntries,
        loading: loadingEntries,
        hasMore,
        nextPage,
        refresh: refreshEntries,
    } = useLedgerEntries(db);

    const isRefreshing = loadingEntries;

    const handleRefresh = async () => {
        await refreshEntries();
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

    const ledgerEntries: LedgerEntry[] = useMemo(() => {
        const startTimestamp = dateRange
            ? Math.floor(dateRange.startDate.getTime() / 1000)
            : null;
        const endTimestamp = dateRange
            ? Math.floor(dateRange.endDate.getTime() / 1000) + 86399
            : null;

        return transactionEntries
            .filter(
                (entry) =>
                    startTimestamp === null ||
                    endTimestamp === null ||
                    (entry.created_at >= startTimestamp &&
                        entry.created_at <= endTimestamp),
            )
            .map((entry) => ({
                id: `t-${entry.id}`,
                type: "transaction" as const,
                amount: entry.amount,
                description:
                    entry.description ||
                    (entry.funding_source === "received" ||
                    entry.funding_source === "settled" ||
                    entry.funding_source === "settledAndAdded" ||
                    entry.funding_source === "added"
                        ? t("ledger.credit")
                        : t("ledger.debit")),
                date: entry.created_at,
                fundingSource: entry.funding_source,
                balanceFundedAmount: entry.balance_funded_amount,
                pocketFundedAmount: entry.pocket_funded_amount,
                customerName: entry.customer_name || t("ledger.unknown"),
                accountNumber: entry.account_number || t("ledger.notAvailable"),
            }));
    }, [transactionEntries, dateRange, t]);

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
        ({ item }: { item: LedgerEntry }) => {
            const isReceived = item.fundingSource === "received";
            const isSettled = item.fundingSource === "settled";
            const isSettledAndAdded = item.fundingSource === "settledAndAdded";
            const isAddedBalance = item.fundingSource === "added";
            const isBalanceFunded = item.fundingSource === "balance";
            const isMixedFunded = item.fundingSource === "mixed";

            const label = isSettled
                ? t("ledger.settled")
                : isSettledAndAdded
                  ? t("ledger.settledAndAdded")
                  : isAddedBalance
                    ? t("ledger.addedBalance")
                    : isReceived
                      ? t("ledger.received")
                      : isBalanceFunded
                        ? t("ledger.paidFromBalance")
                        : isMixedFunded
                          ? t("ledger.paidFromBalanceAndPocket")
                          : t("ledger.paidFromPocket");

            const isCreditVariant =
                isReceived || isSettled || isSettledAndAdded || isAddedBalance;

            const semanticColor: "success" | "danger" | "warning" =
                isCreditVariant
                    ? "success"
                    : isMixedFunded
                      ? "warning"
                      : "danger";

            const colorValue =
                semanticColor === "success"
                    ? colors.success
                    : semanticColor === "warning"
                      ? colors.warning
                      : colors.danger;

            const typeIcon = isCreditVariant
                ? ("arrow-down-circle" as const)
                : isMixedFunded
                  ? ("git-merge-outline" as const)
                  : ("arrow-up-circle" as const);

            return (
                <View
                    style={[
                        styles.entryRow,
                        { backgroundColor: colors.surface },
                    ]}
                >
                    <View
                        style={[
                            styles.typeIconWrap,
                            { backgroundColor: `${colorValue}18` },
                        ]}
                    >
                        <Ionicons
                            name={typeIcon}
                            size={18}
                            color={colorValue}
                        />
                    </View>
                    <View style={styles.rowCenter}>
                        <View style={styles.rowTop}>
                            <Typography
                                variant="body-medium"
                                color={semanticColor}
                                numberOfLines={1}
                                style={styles.rowLabel}
                            >
                                {label}
                            </Typography>
                            {(isMixedFunded || isSettledAndAdded) && (
                                <View
                                    style={[
                                        styles.splitPill,
                                        { backgroundColor: `${colorValue}18` },
                                    ]}
                                >
                                    <Ionicons
                                        name="layers-outline"
                                        size={9}
                                        color={colorValue}
                                    />
                                </View>
                            )}
                        </View>
                        <View style={styles.rowMeta}>
                            <Typography
                                variant="small-small"
                                numberOfLines={1}
                                style={styles.customerNameText}
                            >
                                {item.customerName}
                            </Typography>
                            <Typography
                                variant="small-small"
                                color="muted"
                                numberOfLines={1}
                            >
                                {formatDateTime(item.date)}
                            </Typography>
                        </View>
                    </View>
                    <View style={styles.rowRight}>
                        <TouchableAmount
                            amount={item.amount}
                            variant="body-medium"
                            color={semanticColor}
                        />
                    </View>
                </View>
            );
        },
        [colors, t],
    );

    // --- NEW: Evaluate Initial Load Status ---
    if (!loadingEntries) {
        initialLoadDone.current = true;
    }

    if (!db || (!initialLoadDone.current && loadingEntries)) {
        return <LoadingScreen />;
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
                    ]}
                >
                    <View style={styles.headerTopRow}>
                        <View style={styles.headerTitleRow}>
                            {!isSearchActive && (
                                <View>
                                    <Typography
                                        variant="heading-large"
                                        color="primary"
                                    >
                                        {t("ledger.title")}
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
                                { backgroundColor: `${colors.primary}18` },
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

                <DateFilter
                    selectedFilter={selectedFilter}
                    onFilterChange={handleFilterChange}
                    customRange={customRange}
                />

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
                    extraData={colors}
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
                    onEndReached={hasMore ? nextPage : undefined}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingEntries && filteredEntries.length > 0 ? (
                            <View style={styles.footer}>
                                <Typography variant="body-small" color="muted">
                                    Loading more...
                                </Typography>
                            </View>
                        ) : !hasMore && filteredEntries.length > 0 ? (
                            <View style={styles.footer}>
                                <Typography variant="body-small" color="muted">
                                    All entries loaded
                                </Typography>
                            </View>
                        ) : null
                    }
                />
            </View>
        </ErrorScreen>
    );
};

// ... Styles remain exactly the same as your previous version ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: Spacing.lg, paddingVertical: 10 },
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
    searchInputContainer: { flex: 1, height: 48, justifyContent: "center" },
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
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: Spacing.sm,
    },
    searchContainer: { padding: Spacing.md },
    list: {
        flexGrow: 1,
        paddingHorizontal: Spacing.sm,
        paddingTop: Spacing.md,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xxl,
    },
    emptyStateMessage: { textAlign: "center" },
    entryRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        marginBottom: 6,
        gap: Spacing.sm,
    },
    typeIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    rowCenter: { flex: 1, gap: 2, minWidth: 0 },
    rowTop: { flexDirection: "row", alignItems: "center", gap: 5 },
    rowLabel: { flexShrink: 1 },
    splitPill: {
        width: 16,
        height: 16,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    rowMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        minWidth: 0,
    },
    customerNameText: { flexShrink: 1, maxWidth: "50%" },
    rowRight: { alignItems: "flex-end", flexShrink: 0 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    footer: { padding: Spacing.md, alignItems: "center" },
});
