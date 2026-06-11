import { Ionicons } from "@expo/vector-icons";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    I18nManager,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    ViewStyle,
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

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type TypographyColor = NonNullable<
    React.ComponentProps<typeof Typography>["color"]
>;
type AmountColor = NonNullable<
    React.ComponentProps<typeof TouchableAmount>["color"]
>;
type ThemeColors = typeof Colors;
type SearchValue = string | number | null | undefined;

type ReportSectionKey =
    | "overview"
    | "insights"
    | "exposure"
    | "customerFocus"
    | "financialSummary"
    | "accountStatus";

const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDateRangeForFilter = (
    selectedFilter: DateFilterType,
    customRange?: DateRange,
): HookDateRange | null => {
    const today = startOfDay(new Date());

    switch (selectedFilter) {
        case "today":
            return { startDate: today, endDate: today };

        case "yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { startDate: yesterday, endDate: yesterday };
        }

        case "last7Days": {
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 6);
            return { startDate, endDate: today };
        }

        case "lastMonth": {
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 29);
            return { startDate, endDate: today };
        }

        case "custom":
            if (customRange?.startDate && customRange?.endDate) {
                return {
                    startDate: startOfDay(customRange.startDate),
                    endDate: startOfDay(customRange.endDate),
                };
            }
            return null;

        default:
            return null;
    }
};

const sectionMatchesSearch = (searchQuery: string, values: SearchValue[]) => {
    if (!searchQuery) return true;

    return values.some((value) =>
        String(value ?? "")
            .toLowerCase()
            .includes(searchQuery),
    );
};

interface ReportsHeaderProps {
    title: string;
    subtitle: string;
    placeholder: string;
    searchText: string;
    isSearchActive: boolean;
    isRTL: boolean;
    colors: ThemeColors;
    topInset: number;
    searchInputRef: React.RefObject<TextInput>;
    onSearchTextChange: (value: string) => void;
    onToggleSearch: () => void;
}

const ReportsHeader = memo(
    ({
        title,
        subtitle,
        placeholder,
        searchText,
        isSearchActive,
        isRTL,
        colors,
        topInset,
        searchInputRef,
        onSearchTextChange,
        onToggleSearch,
    }: ReportsHeaderProps) => (
        <View
            style={[
                styles.header,
                {
                    paddingTop: topInset + Spacing.md,
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                },
            ]}
        >
            <View style={[styles.headerTopRow, isRTL && styles.rowReverse]}>
                <View
                    style={[styles.headerTitleRow, isRTL && styles.rowReverse]}
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

                    {isSearchActive ? (
                        <View style={styles.searchInputContainer}>
                            <TextInput
                                ref={searchInputRef}
                                style={[
                                    styles.headerSearchInput,
                                    isRTL && styles.textRight,
                                    {
                                        backgroundColor: colors.background,
                                        color: colors.text.primary,
                                    },
                                ]}
                                placeholder={placeholder}
                                placeholderTextColor={colors.text.muted}
                                value={searchText}
                                onChangeText={onSearchTextChange}
                                autoFocus
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                        </View>
                    ) : (
                        <View style={styles.titleBlock}>
                            <Typography
                                variant="heading-large"
                                color="primary"
                                style={isRTL ? styles.textRight : undefined}
                            >
                                {title}
                            </Typography>
                            <Typography
                                variant="body-small"
                                color="muted"
                                style={isRTL ? styles.textRight : undefined}
                            >
                                {subtitle}
                            </Typography>
                        </View>
                    )}
                </View>

                <Pressable
                    onPress={onToggleSearch}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                        isSearchActive ? "Close search" : "Search reports"
                    }
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
    ),
);
ReportsHeader.displayName = "ReportsHeader";

interface SectionCardProps {
    title: string;
    isRTL: boolean;
    children: React.ReactNode;
}

const SectionCard = memo(({ title, isRTL, children }: SectionCardProps) => (
    <Card style={styles.card}>
        <Typography
            variant="heading-medium"
            color="primary"
            style={[styles.cardTitle, isRTL && styles.textRight]}
        >
            {title}
        </Typography>
        {children}
    </Card>
));
SectionCard.displayName = "SectionCard";

interface StatRowProps {
    label: string;
    isRTL: boolean;
    amount?: number;
    value?: string | number;
    amountColor?: AmountColor;
    valueColor?: TypographyColor;
    isLast?: boolean;
}

const StatRow = memo(
    ({
        label,
        isRTL,
        amount,
        value,
        amountColor = "primary",
        valueColor = "primary",
        isLast = false,
    }: StatRowProps) => (
        <View
            style={[
                styles.statRow,
                isRTL && styles.rowReverse,
                isLast && styles.noBorder,
            ]}
        >
            <Typography
                variant="subheading-small"
                color="secondary"
                style={[styles.statLabel, isRTL && styles.textRight]}
            >
                {label}
            </Typography>

            {typeof amount === "number" ? (
                <TouchableAmount
                    amount={amount}
                    variant="heading-medium"
                    color={amountColor}
                    style={styles.statValue}
                />
            ) : (
                <Typography variant="heading-medium" color={valueColor}>
                    {value ?? 0}
                </Typography>
            )}
        </View>
    ),
);
StatRow.displayName = "StatRow";

interface InsightTileProps {
    icon: IconName;
    iconColor: string;
    backgroundColor: string;
    label: string;
    hint: string;
    amount?: number;
    value?: string | number;
    amountColor?: AmountColor;
    valueColor?: TypographyColor;
}

const InsightTile = memo(
    ({
        icon,
        iconColor,
        backgroundColor,
        label,
        hint,
        amount,
        value,
        amountColor = "primary",
        valueColor = "primary",
    }: InsightTileProps) => (
        <Card style={[styles.insightTile, { backgroundColor }]}>
            <Ionicons name={icon} size={22} color={iconColor} />
            <Typography variant="body-small" color="muted">
                {label}
            </Typography>

            {typeof amount === "number" ? (
                <TouchableAmount
                    amount={amount}
                    variant="heading-small"
                    color={amountColor}
                />
            ) : (
                <Typography variant="heading-small" color={valueColor}>
                    {value ?? 0}
                </Typography>
            )}

            <Typography variant="small-small" color="muted">
                {hint}
            </Typography>
        </Card>
    ),
);
InsightTile.displayName = "InsightTile";

interface FocusRowProps {
    icon: IconName;
    iconColor: string;
    title: string;
    subtitle: string;
    isRTL: boolean;
    amount?: number;
    value?: string | number;
    amountColor?: AmountColor;
    valueColor?: TypographyColor;
    isLast?: boolean;
}

const FocusRow = memo(
    ({
        icon,
        iconColor,
        title,
        subtitle,
        isRTL,
        amount,
        value,
        amountColor = "primary",
        valueColor = "primary",
        isLast = false,
    }: FocusRowProps) => (
        <View
            style={[
                styles.focusItem,
                isRTL && styles.rowReverse,
                isLast && styles.noBorder,
            ]}
        >
            <Ionicons name={icon} size={22} color={iconColor} />

            <View style={styles.focusText}>
                <Typography
                    variant="body-medium"
                    color="primary"
                    style={isRTL ? styles.textRight : undefined}
                >
                    {title}
                </Typography>
                <Typography
                    variant="body-small"
                    color="muted"
                    style={isRTL ? styles.textRight : undefined}
                >
                    {subtitle}
                </Typography>
            </View>

            {typeof amount === "number" ? (
                <TouchableAmount
                    amount={amount}
                    variant="body-medium"
                    color={amountColor}
                />
            ) : (
                <Typography variant="body-medium" color={valueColor}>
                    {value ?? 0}
                </Typography>
            )}
        </View>
    ),
);
FocusRow.displayName = "FocusRow";

interface EmptySearchStateProps {
    message: string;
    colors: ThemeColors;
}

const EmptySearchState = memo(({ message, colors }: EmptySearchStateProps) => (
    <Card style={styles.card}>
        <View style={styles.emptyState}>
            <View
                style={[
                    styles.emptyIcon,
                    { backgroundColor: `${colors.primary}12` },
                ]}
            >
                <Ionicons
                    name="search-outline"
                    size={28}
                    color={colors.primary}
                />
            </View>
            <Typography
                variant="body-medium"
                color="muted"
                style={styles.textCenter}
            >
                {message}
            </Typography>
        </View>
    </Card>
));
EmptySearchState.displayName = "EmptySearchState";

interface LoadingStateProps {
    message: string;
    backgroundColor: string;
}

const LoadingState = memo(({ message, backgroundColor }: LoadingStateProps) => (
    <View style={[styles.center, { backgroundColor }]}>
        <Typography variant="body-medium" color="muted">
            {message}
        </Typography>
    </View>
));
LoadingState.displayName = "LoadingState";

export const ReportsScreen: React.FC = () => {
    const { db, error: dbError, initDatabase } = useDatabaseContext();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;

    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchText, setSearchText] = useState("");
    const searchInputRef = useRef<TextInput>(null);

    const [selectedFilter, setSelectedFilter] = useState<DateFilterType>("all");
    const [customRange, setCustomRange] = useState<DateRange>();
    const [showDatePicker, setShowDatePicker] = useState(false);

    const dateRange = useMemo(
        () => getDateRangeForFilter(selectedFilter, customRange),
        [selectedFilter, customRange],
    );

    const {
        metrics,
        loading: loadingMetrics,
        refresh: refreshMetrics,
    } = useFinancialMetrics(db, dateRange);

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

    const labels = useMemo(
        () => ({
            accountStatus: t("reports.accountStatus"),
            activeAccounts: t("reports.activeAccounts"),
            availableCredit: t("reports.availableCredit"),
            avgTransaction: t("reports.avgTransaction"),
            avgTransactionHint: t("reports.avgTransactionHint"),
            balanceIncreased: t("reports.balanceIncreased"),
            balanceReduced: t("reports.balanceReduced"),
            closedAccounts: t("reports.closedAccounts"),
            collectionRate: t("reports.collectionRate"),
            collectionRateHint: t("reports.collectionRateHint"),
            creditExposure: t("reports.creditExposure"),
            creditUtilization: t("reports.creditUtilization"),
            creditUtilizationHint: t("reports.creditUtilizationHint"),
            customerFocus: t("reports.customerFocus"),
            decisionInsights: t("reports.decisionInsights"),
            dormantCustomers: t("reports.dormantCustomers"),
            dormantCustomersHint: t("reports.dormantCustomersHint"),
            financialSummary: t("reports.financialSummary"),
            highUtilizationAccounts: t("reports.highUtilizationAccounts"),
            inactiveAccounts: t("reports.inactiveAccounts"),
            loading: t("reports.loading"),
            mostActiveCustomer: t("reports.mostActiveCustomer"),
            netMovement: t("reports.netMovement"),
            noCustomerInsight: t("reports.noCustomerInsight"),
            noSearchResults: t("reports.noSearchResults", {
                defaultValue: "No matching report section found.",
            }),
            overview: t("reports.overview"),
            payableBalance: t("reports.payableBalance"),
            receivableBalance: t("reports.receivableBalance"),
            reportsSubtitle: t("reports.subtitle"),
            reportsTitle: t("reports.title"),
            searchPlaceholder: t("reports.searchPlaceholder"),
            suspendedAccounts: t("reports.suspendedAccounts"),
            topPayable: t("reports.topPayable"),
            topReceivable: t("reports.topReceivable"),
            totalAccounts: t("reports.totalAccounts"),
            totalCreditLimit: t("reports.totalCreditLimit"),
            totalCredits: t("reports.totalCredits"),
            totalCurrentBalance: t("reports.totalCurrentBalance"),
            totalCustomers: t("reports.totalCustomers"),
            totalDebits: t("reports.totalDebits"),
            totalTransactions: t("reports.totalTransactions"),
            transactionCountShort: t("reports.transactionCountShort", {
                count: mostActiveCustomerTransactions,
            }),
        }),
        [mostActiveCustomerTransactions, t],
    );

    const normalizedSearch = searchText.trim().toLowerCase();

    const visibleSections = useMemo<Record<ReportSectionKey, boolean>>(
        () => ({
            overview: sectionMatchesSearch(normalizedSearch, [
                labels.overview,
                labels.totalCustomers,
                labels.totalAccounts,
                labels.totalTransactions,
                totalCustomers,
                totalAccounts,
                totalTransactions,
            ]),
            insights: sectionMatchesSearch(normalizedSearch, [
                labels.decisionInsights,
                labels.netMovement,
                labels.collectionRate,
                labels.creditUtilization,
                labels.avgTransaction,
                netBalanceMovement,
                collectionRate,
                creditUtilizationRate,
                averageTransactionAmount,
            ]),
            exposure: sectionMatchesSearch(normalizedSearch, [
                labels.creditExposure,
                labels.receivableBalance,
                labels.payableBalance,
                labels.availableCredit,
                labels.highUtilizationAccounts,
                receivableBalance,
                payableBalance,
                availableCredit,
                highUtilizationAccounts,
            ]),
            customerFocus: sectionMatchesSearch(normalizedSearch, [
                labels.customerFocus,
                labels.topReceivable,
                labels.topPayable,
                labels.mostActiveCustomer,
                labels.dormantCustomers,
                topReceivableCustomerName,
                topPayableCustomerName,
                mostActiveCustomerName,
                dormantCustomers,
            ]),
            financialSummary: sectionMatchesSearch(normalizedSearch, [
                labels.financialSummary,
                labels.totalCreditLimit,
                labels.totalCurrentBalance,
                labels.totalCredits,
                labels.totalDebits,
                totalCreditLimit,
                totalCurrentBalance,
                totalCredits,
                totalDebits,
            ]),
            accountStatus: sectionMatchesSearch(normalizedSearch, [
                labels.accountStatus,
                labels.activeAccounts,
                labels.inactiveAccounts,
                labels.suspendedAccounts,
                labels.closedAccounts,
                activeAccounts,
                inactiveAccounts,
                suspendedAccounts,
                closedAccounts,
            ]),
        }),
        [
            activeAccounts,
            availableCredit,
            averageTransactionAmount,
            closedAccounts,
            collectionRate,
            creditUtilizationRate,
            dormantCustomers,
            highUtilizationAccounts,
            inactiveAccounts,
            labels,
            mostActiveCustomerName,
            netBalanceMovement,
            normalizedSearch,
            payableBalance,
            receivableBalance,
            suspendedAccounts,
            topPayableCustomerName,
            topReceivableCustomerName,
            totalAccounts,
            totalCreditLimit,
            totalCredits,
            totalCurrentBalance,
            totalCustomers,
            totalDebits,
            totalTransactions,
        ],
    );

    const hasVisibleSection = Object.values(visibleSections).some(Boolean);
    const netMovementColor: AmountColor =
        netBalanceMovement > 0 ? "danger" : "success";
    const collectionColor: TypographyColor =
        collectionRate >= 80 ? "success" : "warning";
    const utilizationColor: TypographyColor =
        creditUtilizationRate >= 80 ? "danger" : "warning";

    const handleToggleSearch = useCallback(() => {
        if (isSearchActive) {
            setSearchText("");
            setIsSearchActive(false);
            return;
        }

        setIsSearchActive(true);
        setTimeout(() => searchInputRef.current?.focus(), 80);
    }, [isSearchActive]);

    const handleFilterChange = useCallback((filter: DateFilterType) => {
        if (filter === "custom") {
            setShowDatePicker(true);
            return;
        }

        setSelectedFilter(filter);
        setCustomRange(undefined);
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

    const handleRefresh = useCallback(async () => {
        await refreshMetrics();
    }, [refreshMetrics]);

    return (
        <ErrorScreen
            error={dbError}
            type="database"
            isLoading={!db && !dbError}
            onRetry={initDatabase}
        >
            {!db ? (
                <LoadingState
                    message={labels.loading}
                    backgroundColor={colors.background}
                />
            ) : (
                <View
                    style={[
                        styles.container,
                        { backgroundColor: colors.background },
                    ]}
                >
                    <ReportsHeader
                        title={labels.reportsTitle}
                        subtitle={labels.reportsSubtitle}
                        placeholder={labels.searchPlaceholder}
                        searchText={searchText}
                        isSearchActive={isSearchActive}
                        isRTL={isRTL}
                        colors={colors}
                        topInset={insets.top}
                        searchInputRef={searchInputRef}
                        onSearchTextChange={setSearchText}
                        onToggleSearch={handleToggleSearch}
                    />

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

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={[
                            styles.contentContainer,
                            { paddingBottom: insets.bottom + Spacing.xl },
                        ]}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl
                                refreshing={loadingMetrics}
                                onRefresh={handleRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                    >
                        {!hasVisibleSection && (
                            <EmptySearchState
                                message={labels.noSearchResults}
                                colors={colors}
                            />
                        )}

                        {visibleSections.overview && (
                            <SectionCard title={labels.overview} isRTL={isRTL}>
                                <StatRow
                                    label={labels.totalCustomers}
                                    value={totalCustomers}
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.totalAccounts}
                                    value={totalAccounts}
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.totalTransactions}
                                    value={totalTransactions}
                                    isRTL={isRTL}
                                    isLast
                                />
                            </SectionCard>
                        )}

                        {visibleSections.insights && (
                            <SectionCard
                                title={labels.decisionInsights}
                                isRTL={isRTL}
                            >
                                <View style={styles.insightGrid}>
                                    <InsightTile
                                        icon="trending-up-outline"
                                        iconColor={
                                            netBalanceMovement > 0
                                                ? colors.danger
                                                : colors.success
                                        }
                                        backgroundColor={`${colors.primary}10`}
                                        label={labels.netMovement}
                                        amount={Math.abs(netBalanceMovement)}
                                        amountColor={netMovementColor}
                                        hint={
                                            netBalanceMovement > 0
                                                ? labels.balanceIncreased
                                                : labels.balanceReduced
                                        }
                                    />
                                    <InsightTile
                                        icon="cash-outline"
                                        iconColor={colors.success}
                                        backgroundColor={`${colors.success}10`}
                                        label={labels.collectionRate}
                                        value={`${collectionRate}%`}
                                        valueColor={collectionColor}
                                        hint={labels.collectionRateHint}
                                    />
                                    <InsightTile
                                        icon="speedometer-outline"
                                        iconColor={
                                            creditUtilizationRate >= 80
                                                ? colors.danger
                                                : colors.warning
                                        }
                                        backgroundColor={`${colors.warning}12`}
                                        label={labels.creditUtilization}
                                        value={`${creditUtilizationRate}%`}
                                        valueColor={utilizationColor}
                                        hint={labels.creditUtilizationHint}
                                    />
                                    <InsightTile
                                        icon="receipt-outline"
                                        iconColor={colors.primary}
                                        backgroundColor={`${colors.primary}10`}
                                        label={labels.avgTransaction}
                                        amount={averageTransactionAmount}
                                        amountColor="primary"
                                        hint={labels.avgTransactionHint}
                                    />
                                </View>
                            </SectionCard>
                        )}

                        {visibleSections.exposure && (
                            <SectionCard
                                title={labels.creditExposure}
                                isRTL={isRTL}
                            >
                                <StatRow
                                    label={labels.receivableBalance}
                                    amount={receivableBalance}
                                    amountColor="danger"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.payableBalance}
                                    amount={payableBalance}
                                    amountColor="success"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.availableCredit}
                                    amount={availableCredit}
                                    amountColor="primary"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.highUtilizationAccounts}
                                    value={highUtilizationAccounts}
                                    valueColor={
                                        highUtilizationAccounts > 0
                                            ? "warning"
                                            : "success"
                                    }
                                    isRTL={isRTL}
                                    isLast
                                />
                            </SectionCard>
                        )}

                        {visibleSections.customerFocus && (
                            <SectionCard
                                title={labels.customerFocus}
                                isRTL={isRTL}
                            >
                                <View style={styles.focusList}>
                                    <FocusRow
                                        icon="alert-circle-outline"
                                        iconColor={colors.danger}
                                        title={labels.topReceivable}
                                        subtitle={
                                            topReceivableCustomerName ||
                                            labels.noCustomerInsight
                                        }
                                        amount={topReceivableAmount}
                                        amountColor="danger"
                                        isRTL={isRTL}
                                    />
                                    <FocusRow
                                        icon="checkmark-circle-outline"
                                        iconColor={colors.success}
                                        title={labels.topPayable}
                                        subtitle={
                                            topPayableCustomerName ||
                                            labels.noCustomerInsight
                                        }
                                        amount={topPayableAmount}
                                        amountColor="success"
                                        isRTL={isRTL}
                                    />
                                    <FocusRow
                                        icon="pulse-outline"
                                        iconColor={colors.primary}
                                        title={labels.mostActiveCustomer}
                                        subtitle={
                                            mostActiveCustomerName ||
                                            labels.noCustomerInsight
                                        }
                                        value={labels.transactionCountShort}
                                        valueColor="primary"
                                        isRTL={isRTL}
                                    />
                                    <FocusRow
                                        icon="time-outline"
                                        iconColor={colors.warning}
                                        title={labels.dormantCustomers}
                                        subtitle={labels.dormantCustomersHint}
                                        value={dormantCustomers}
                                        valueColor={
                                            dormantCustomers > 0
                                                ? "warning"
                                                : "success"
                                        }
                                        isRTL={isRTL}
                                        isLast
                                    />
                                </View>
                            </SectionCard>
                        )}

                        {visibleSections.financialSummary && (
                            <SectionCard
                                title={labels.financialSummary}
                                isRTL={isRTL}
                            >
                                <StatRow
                                    label={labels.totalCreditLimit}
                                    amount={totalCreditLimit}
                                    amountColor="primary"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.totalCurrentBalance}
                                    amount={totalCurrentBalance}
                                    amountColor={
                                        totalCurrentBalance > 0
                                            ? "danger"
                                            : "primary"
                                    }
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.totalCredits}
                                    amount={totalCredits}
                                    amountColor="success"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.totalDebits}
                                    amount={totalDebits}
                                    amountColor="danger"
                                    isRTL={isRTL}
                                    isLast
                                />
                            </SectionCard>
                        )}

                        {visibleSections.accountStatus && (
                            <SectionCard
                                title={labels.accountStatus}
                                isRTL={isRTL}
                            >
                                <StatRow
                                    label={labels.activeAccounts}
                                    value={activeAccounts}
                                    valueColor="success"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.inactiveAccounts}
                                    value={inactiveAccounts}
                                    valueColor="muted"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.suspendedAccounts}
                                    value={suspendedAccounts}
                                    valueColor="warning"
                                    isRTL={isRTL}
                                />
                                <StatRow
                                    label={labels.closedAccounts}
                                    value={closedAccounts}
                                    valueColor="danger"
                                    isRTL={isRTL}
                                    isLast
                                />
                            </SectionCard>
                        )}
                    </ScrollView>
                </View>
            )}
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
        gap: Spacing.sm,
    },
    headerTitleRow: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    titleBlock: {
        flex: 1,
        minWidth: 0,
    },
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
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
        minHeight: 44,
        backgroundColor: Colors.background,
        borderRadius: 12,
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
    },
    content: {
        flex: 1,
    },
    contentContainer: {
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
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: `${Colors.primary}15`,
    },
    statLabel: {
        flex: 1,
        flexShrink: 1,
    },
    statValue: {
        flexShrink: 0,
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
        minWidth: 0,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.xl,
        gap: Spacing.md,
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    textRight: {
        textAlign: "right",
    } as TextStyle,
    textCenter: {
        textAlign: "center",
    } as TextStyle,
    noBorder: {
        borderBottomWidth: 0,
    } as ViewStyle,
});
