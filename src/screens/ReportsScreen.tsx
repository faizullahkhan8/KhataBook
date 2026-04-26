import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
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
import { Card, TouchableAmount, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useFinancialMetrics } from "../hooks";
import { useDatabaseContext, useLanguage, useTheme } from "../store";

export const ReportsScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchText, setSearchText] = useState("");
    const searchInputRef = useRef<TextInput>(null);
    const {
        metrics,
        loading: loadingMetrics,
        refresh: refreshMetrics,
    } = useFinancialMetrics(db);
    const isRefreshing = loadingMetrics;

    const handleRefresh = async () => {
        await refreshMetrics();
    };

    const {
        totalCreditLimit,
        totalCurrentBalance,
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
                                <Typography variant="body-small" color="muted">
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
                                            backgroundColor: colors.background,
                                            color: colors.text.primary,
                                        },
                                    ]}
                                    placeholder={t("reports.searchPlaceholder")}
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
                            isRTL
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
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            {t("reports.totalCustomers")}
                        </Typography>
                        <Typography variant="heading-medium" color="primary">
                            {totalCustomers}
                        </Typography>
                    </View>
                    <View
                        style={[
                            styles.statRow,
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            {t("reports.totalAccounts")}
                        </Typography>
                        <Typography variant="heading-medium" color="primary">
                            {totalAccounts}
                        </Typography>
                    </View>
                    <View
                        style={[
                            styles.statRow,
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            {t("reports.totalTransactions")}
                        </Typography>
                        <Typography variant="heading-medium" color="primary">
                            {totalTransactions}
                        </Typography>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={
                            isRTL
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
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                            style={
                                isRTL
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
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                            style={
                                isRTL
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
                                totalCurrentBalance > 0 ? "danger" : "primary"
                            }
                            style={styles.statValue}
                        />
                    </View>
                    <View
                        style={[
                            styles.statRow,
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                            style={
                                isRTL
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
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                            style={
                                isRTL
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
                            isRTL
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
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            {t("reports.activeAccounts")}
                        </Typography>
                        <Typography variant="heading-medium" color="success">
                            {activeAccounts}
                        </Typography>
                    </View>
                    <View
                        style={[
                            styles.statRow,
                            isRTL && { flexDirection: "row-reverse" },
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
                            isRTL && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Typography
                            variant="subheading-small"
                            color="secondary"
                        >
                            {t("reports.suspendedAccounts")}
                        </Typography>
                        <Typography variant="heading-medium" color="warning">
                            {suspendedAccounts}
                        </Typography>
                    </View>
                    <View
                        style={[
                            styles.statRow,
                            isRTL && { flexDirection: "row-reverse" },
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
    statLabel: {
        flexShrink: 1,
    },
    statValue: {
        flexShrink: 0,
        marginLeft: Spacing.sm,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
