import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TextStyle,
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
import { DateRange as HookDateRange, useFinancialMetrics } from "../hooks";
import { useDatabaseContext, useTheme } from "../store";

export const ReportsScreen: React.FC = () => {
    const { db, error: dbError, initDatabase } = useDatabaseContext();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchText, setSearchText] = useState("");
    const searchInputRef = useRef<TextInput>(null);
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
                return {
                    startDate: today,
                    endDate: today,
                };
            case "yesterday": {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return {
                    startDate: yesterday,
                    endDate: yesterday,
                };
            }
            case "last7Days": {
                const last7Days = new Date(today);
                last7Days.setDate(last7Days.getDate() - 6);
                return {
                    startDate: last7Days,
                    endDate: today,
                };
            }
            case "lastMonth": {
                const lastMonth = new Date(today);
                lastMonth.setDate(lastMonth.getDate() - 29);
                return {
                    startDate: lastMonth,
                    endDate: today,
                };
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
        metrics,
        loading: loadingMetrics,
        refresh: refreshMetrics,
    } = useFinancialMetrics(db, dateRange);
    const isRefreshing = loadingMetrics;

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

    const handleRefresh = async () => {
        await refreshMetrics();
    };

    const {
        totalCreditLimit,
        totalCurrentBalance,
        receivableBalance,
        payableBalance,
        availableCredit,
        creditUtilizationRate,
        collectionRate,
        averageTransactionAmount,
        netBalanceMovement,
        highUtilizationAccounts,
        dormantCustomers,
        topReceivableCustomerName,
        topReceivableAmount,
        topPayableCustomerName,
        topPayableAmount,
        mostActiveCustomerName,
        mostActiveCustomerTransactions,
        totalCredits,
        totalDebits,
        activeAccounts,
        inactiveAccounts,
        suspendedAccounts,
        closedAccounts,
        totalCustomers,
        totalAccounts,
        totalTransactions,
    } = metrics;

    if (!db) {
        return (
            <View
                style={[styles.center, { backgroundColor: colors.background }]}
            >
                <Typography variant="body-medium" color="muted">
                    {t("reports.loading")}
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
                            false && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <View
                            style={[
                                styles.headerTitleRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <View
                                style={[
                                    styles.headerIconContainer,
                                    { backgroundColor: `${colors.primary}20` },
                                ]}
                            >
                                <Ionicons
                                    name="bar-chart"
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
                                        {t("reports.title")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                    >
                                        {t("reports.subtitle")}
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
                                            "reports.searchPlaceholder",
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

                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <Card style={styles.card}>
                        <Typography
                            variant="heading-medium"
                            color="primary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.md,
                                          textAlign: "right",
                                      }
                                    : styles.cardTitle
                            }
                        >
                            {t("reports.overview")}
                        </Typography>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                            >
                                {t("reports.totalCustomers")}
                            </Typography>
                            <Typography
                                variant="heading-medium"
                                color="primary"
                            >
                                {totalCustomers}
                            </Typography>
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                            >
                                {t("reports.totalAccounts")}
                            </Typography>
                            <Typography
                                variant="heading-medium"
                                color="primary"
                            >
                                {totalAccounts}
                            </Typography>
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                            >
                                {t("reports.totalTransactions")}
                            </Typography>
                            <Typography
                                variant="heading-medium"
                                color="primary"
                            >
                                {totalTransactions}
                            </Typography>
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Typography
                            variant="heading-medium"
                            color="primary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.md,
                                          textAlign: "right",
                                      }
                                    : styles.cardTitle
                            }
                        >
                            {t("reports.decisionInsights")}
                        </Typography>
                        <View style={styles.insightGrid}>
                            <Card
                                style={[
                                    styles.insightTile,
                                    { backgroundColor: `${colors.primary}10` },
                                ]}
                            >
                                <Ionicons
                                    name="trending-up-outline"
                                    size={22}
                                    color={
                                        netBalanceMovement > 0
                                            ? colors.danger
                                            : colors.success
                                    }
                                />
                                <Typography variant="body-small" color="muted">
                                    {t("reports.netMovement")}
                                </Typography>
                                <TouchableAmount
                                    amount={Math.abs(netBalanceMovement)}
                                    variant="heading-small"
                                    color={
                                        netBalanceMovement > 0
                                            ? "danger"
                                            : "success"
                                    }
                                />
                                <Typography variant="small-small" color="muted">
                                    {netBalanceMovement > 0
                                        ? t("reports.balanceIncreased")
                                        : t("reports.balanceReduced")}
                                </Typography>
                            </Card>
                            <Card
                                style={[
                                    styles.insightTile,
                                    { backgroundColor: `${colors.success}10` },
                                ]}
                            >
                                <Ionicons
                                    name="cash-outline"
                                    size={22}
                                    color={colors.success}
                                />
                                <Typography variant="body-small" color="muted">
                                    {t("reports.collectionRate")}
                                </Typography>
                                <Typography
                                    variant="heading-small"
                                    color={
                                        collectionRate >= 80
                                            ? "success"
                                            : "warning"
                                    }
                                >
                                    {collectionRate}%
                                </Typography>
                                <Typography variant="small-small" color="muted">
                                    {t("reports.collectionRateHint")}
                                </Typography>
                            </Card>
                            <Card
                                style={[
                                    styles.insightTile,
                                    { backgroundColor: `${colors.warning}12` },
                                ]}
                            >
                                <Ionicons
                                    name="speedometer-outline"
                                    size={22}
                                    color={
                                        creditUtilizationRate >= 80
                                            ? colors.danger
                                            : colors.warning
                                    }
                                />
                                <Typography variant="body-small" color="muted">
                                    {t("reports.creditUtilization")}
                                </Typography>
                                <Typography
                                    variant="heading-small"
                                    color={
                                        creditUtilizationRate >= 80
                                            ? "danger"
                                            : "warning"
                                    }
                                >
                                    {creditUtilizationRate}%
                                </Typography>
                                <Typography variant="small-small" color="muted">
                                    {t("reports.creditUtilizationHint")}
                                </Typography>
                            </Card>
                            <Card
                                style={[
                                    styles.insightTile,
                                    { backgroundColor: `${colors.primary}10` },
                                ]}
                            >
                                <Ionicons
                                    name="receipt-outline"
                                    size={22}
                                    color={colors.primary}
                                />
                                <Typography variant="body-small" color="muted">
                                    {t("reports.avgTransaction")}
                                </Typography>
                                <TouchableAmount
                                    amount={averageTransactionAmount}
                                    variant="heading-small"
                                    color="primary"
                                />
                                <Typography variant="small-small" color="muted">
                                    {t("reports.avgTransactionHint")}
                                </Typography>
                            </Card>
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Typography
                            variant="heading-medium"
                            color="primary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.md,
                                          textAlign: "right",
                                      }
                                    : styles.cardTitle
                            }
                        >
                            {t("reports.creditExposure")}
                        </Typography>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={styles.statLabel}
                            >
                                {t("reports.receivableBalance")}
                            </Typography>
                            <TouchableAmount
                                amount={receivableBalance}
                                variant="heading-medium"
                                color="danger"
                                style={styles.statValue}
                            />
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={styles.statLabel}
                            >
                                {t("reports.payableBalance")}
                            </Typography>
                            <TouchableAmount
                                amount={payableBalance}
                                variant="heading-medium"
                                color="success"
                                style={styles.statValue}
                            />
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={styles.statLabel}
                            >
                                {t("reports.availableCredit")}
                            </Typography>
                            <TouchableAmount
                                amount={availableCredit}
                                variant="heading-medium"
                                color="primary"
                                style={styles.statValue}
                            />
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={styles.statLabel}
                            >
                                {t("reports.highUtilizationAccounts")}
                            </Typography>
                            <Typography
                                variant="heading-medium"
                                color={
                                    highUtilizationAccounts > 0
                                        ? "warning"
                                        : "success"
                                }
                            >
                                {highUtilizationAccounts}
                            </Typography>
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Typography
                            variant="heading-medium"
                            color="primary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.md,
                                          textAlign: "right",
                                      }
                                    : styles.cardTitle
                            }
                        >
                            {t("reports.customerFocus")}
                        </Typography>
                        <View style={styles.focusList}>
                            <View
                                style={[
                                    styles.focusItem,
                                    false && { flexDirection: "row-reverse" },
                                ]}
                            >
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={22}
                                    color={colors.danger}
                                />
                                <View style={styles.focusText}>
                                    <Typography
                                        variant="body-medium"
                                        color="primary"
                                    >
                                        {t("reports.topReceivable")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                    >
                                        {topReceivableCustomerName ||
                                            t("reports.noCustomerInsight")}
                                    </Typography>
                                </View>
                                <TouchableAmount
                                    amount={topReceivableAmount}
                                    variant="body-medium"
                                    color="danger"
                                />
                            </View>
                            <View
                                style={[
                                    styles.focusItem,
                                    false && { flexDirection: "row-reverse" },
                                ]}
                            >
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={22}
                                    color={colors.success}
                                />
                                <View style={styles.focusText}>
                                    <Typography
                                        variant="body-medium"
                                        color="primary"
                                    >
                                        {t("reports.topPayable")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                    >
                                        {topPayableCustomerName ||
                                            t("reports.noCustomerInsight")}
                                    </Typography>
                                </View>
                                <TouchableAmount
                                    amount={topPayableAmount}
                                    variant="body-medium"
                                    color="success"
                                />
                            </View>
                            <View
                                style={[
                                    styles.focusItem,
                                    false && { flexDirection: "row-reverse" },
                                ]}
                            >
                                <Ionicons
                                    name="pulse-outline"
                                    size={22}
                                    color={colors.primary}
                                />
                                <View style={styles.focusText}>
                                    <Typography
                                        variant="body-medium"
                                        color="primary"
                                    >
                                        {t("reports.mostActiveCustomer")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                    >
                                        {mostActiveCustomerName ||
                                            t("reports.noCustomerInsight")}
                                    </Typography>
                                </View>
                                <Typography variant="body-medium" color="primary">
                                    {t("reports.transactionCountShort", {
                                        count: mostActiveCustomerTransactions,
                                    })}
                                </Typography>
                            </View>
                            <View
                                style={[
                                    styles.focusItem,
                                    false && { flexDirection: "row-reverse" },
                                ]}
                            >
                                <Ionicons
                                    name="time-outline"
                                    size={22}
                                    color={colors.warning}
                                />
                                <View style={styles.focusText}>
                                    <Typography
                                        variant="body-medium"
                                        color="primary"
                                    >
                                        {t("reports.dormantCustomers")}
                                    </Typography>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                    >
                                        {t("reports.dormantCustomersHint")}
                                    </Typography>
                                </View>
                                <Typography
                                    variant="body-medium"
                                    color={
                                        dormantCustomers > 0
                                            ? "warning"
                                            : "success"
                                    }
                                >
                                    {dormantCustomers}
                                </Typography>
                            </View>
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Typography
                            variant="heading-medium"
                            color="primary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.md,
                                          textAlign: "right",
                                      }
                                    : styles.cardTitle
                            }
                        >
                            {t("reports.financialSummary")}
                        </Typography>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={
                                    false
                                        ? ({
                                              flexShrink: 1,
                                              textAlign: "right",
                                          } as TextStyle)
                                        : styles.statLabel
                                }
                            >
                                {t("reports.totalCreditLimit")}
                            </Typography>
                            <TouchableAmount
                                amount={totalCreditLimit}
                                variant="heading-medium"
                                color="primary"
                                style={styles.statValue}
                            />
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={
                                    false
                                        ? ({
                                              flexShrink: 1,
                                              textAlign: "right",
                                          } as TextStyle)
                                        : styles.statLabel
                                }
                            >
                                {t("reports.totalCurrentBalance")}
                            </Typography>
                            <TouchableAmount
                                amount={totalCurrentBalance}
                                variant="heading-medium"
                                color={
                                    totalCurrentBalance > 0
                                        ? "danger"
                                        : "primary"
                                }
                                style={styles.statValue}
                            />
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={
                                    false
                                        ? ({
                                              flexShrink: 1,
                                              textAlign: "right",
                                          } as TextStyle)
                                        : styles.statLabel
                                }
                            >
                                {t("reports.totalCredits")}
                            </Typography>
                            <TouchableAmount
                                amount={totalCredits}
                                variant="heading-medium"
                                color="success"
                                style={styles.statValue}
                            />
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                                style={
                                    false
                                        ? ({
                                              flexShrink: 1,
                                              textAlign: "right",
                                          } as TextStyle)
                                        : styles.statLabel
                                }
                            >
                                {t("reports.totalDebits")}
                            </Typography>
                            <TouchableAmount
                                amount={totalDebits}
                                variant="heading-medium"
                                color="danger"
                                style={styles.statValue}
                            />
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Typography
                            variant="heading-medium"
                            color="primary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.md,
                                          textAlign: "right",
                                      }
                                    : styles.cardTitle
                            }
                        >
                            {t("reports.accountStatus")}
                        </Typography>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                            >
                                {t("reports.activeAccounts")}
                            </Typography>
                            <Typography
                                variant="heading-medium"
                                color="success"
                            >
                                {activeAccounts}
                            </Typography>
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                            >
                                {t("reports.inactiveAccounts")}
                            </Typography>
                            <Typography variant="heading-medium" color="muted">
                                {inactiveAccounts}
                            </Typography>
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                            >
                                {t("reports.suspendedAccounts")}
                            </Typography>
                            <Typography
                                variant="heading-medium"
                                color="warning"
                            >
                                {suspendedAccounts}
                            </Typography>
                        </View>
                        <View
                            style={[
                                styles.statRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Typography
                                variant="subheading-small"
                                color="secondary"
                            >
                                {t("reports.closedAccounts")}
                            </Typography>
                            <Typography variant="heading-medium" color="danger">
                                {closedAccounts}
                            </Typography>
                        </View>
                    </Card>
                </ScrollView>
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
        borderBottomColor: `${Colors.primary}15`,
    },
    statLabel: {
        flexShrink: 1,
    },
    statValue: {
        flexShrink: 0,
        marginLeft: Spacing.sm,
    },
    insightGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
    },
    insightTile: {
        width: "48%",
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    focusList: {
        gap: Spacing.sm,
    },
    focusItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: `${Colors.primary}15`,
    },
    focusText: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
