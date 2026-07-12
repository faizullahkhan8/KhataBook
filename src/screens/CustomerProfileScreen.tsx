import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Card, LoadingScreen, TouchableAmount, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomerById } from "../hooks";
import { AccountStatus, AccountType, CustomerId } from "../models";
import { useDatabaseContext, useTheme } from "../store";
import { formatDateTime } from "../utils";

export const CustomerProfileScreen: React.FC = () => {
    const { customerId } = useLocalSearchParams<{ customerId: string }>();
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();    const { t } = useTranslation();
    const parsedCustomerId = parseInt(customerId || "0") as CustomerId;
    const { customer, loading, error } = useCustomerById(db, parsedCustomerId);
    const account = customer?.accounts?.[0];
    const fallback = t("customerProfile.notAvailable");

    const getAccountTypeLabel = useCallback(
        (type?: AccountType) => {
            switch (type) {
                case AccountType.CREDIT:
                    return t("customerProfile.accountTypeCredit");
                case AccountType.DEBIT:
                    return t("customerProfile.accountTypeDebit");
                default:
                    return fallback;
            }
        },
        [fallback, t],
    );

    const getAccountStatusLabel = useCallback(
        (status?: AccountStatus) => {
            switch (status) {
                case AccountStatus.ACTIVE:
                    return t("customerProfile.accountStatusActive");
                case AccountStatus.INACTIVE:
                    return t("customerProfile.accountStatusInactive");
                case AccountStatus.SUSPENDED:
                    return t("customerProfile.accountStatusSuspended");
                case AccountStatus.CLOSED:
                    return t("customerProfile.accountStatusClosed");
                default:
                    return fallback;
            }
        },
        [fallback, t],
    );

    const renderInfoRow = (label: string, value: string) => (
        <View style={[styles.infoRow, false && styles.rowRTL]}>
            <Typography variant="body-small" color="muted">
                {label}
            </Typography>
            <Typography
                variant="body-medium"
                color="primary"
                style={[styles.infoValue, false && styles.textRTL]}
            >
                {value}
            </Typography>
        </View>
    );

    if (!db || (loading && !customer)) {
        return <LoadingScreen />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={[
                    styles.header,
                    {
                        marginTop: insets.top + Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                        },
                    false && styles.rowRTL,
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={[
                        styles.backButton,
                        { backgroundColor: `${colors.primary}18` },
                    ]}
                >
                    <Ionicons
                        name={false ? "chevron-forward" : "chevron-back"}
                        size={20}
                        color={colors.primary}
                    />
                </Pressable>
                {customer?.image_uri ? (
                    <Image
                        source={{ uri: customer.image_uri }}
                        style={styles.headerImage}
                    />
                ) : (
                    <View
                        style={[
                            styles.headerImagePlaceholder,
                            { backgroundColor: colors.background },
                        ]}
                    >
                        <Ionicons name="person" size={24} color={colors.text.muted} />
                    </View>
                )}
                <View style={styles.headerText}>
                    <Typography variant="body-small" color="muted">
                        {t("customerProfile.title")}
                    </Typography>
                    <Typography
                        variant="heading-large"
                        color="primary"
                        numberOfLines={1}
                    >
                        {customer?.name || t("customerProfile.customer")}
                    </Typography>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + Spacing.xxl },
                ]}
            >
                {error || !customer ? (
                    <View style={styles.emptyState}>
                        <Ionicons
                            name="person-circle-outline"
                            size={56}
                            color={colors.text.muted}
                        />
                        <Typography variant="heading-small" color="secondary">
                            {t("customerProfile.notFoundTitle")}
                        </Typography>
                        <Typography
                            variant="body-small"
                            color="muted"
                            style={styles.centerText}
                        >
                            {t("customerProfile.notFoundMessage")}
                        </Typography>
                    </View>
                ) : (
                    <>
                        <Card style={styles.profileCard}>
                            <Typography variant="heading-small" color="primary">
                                {t("customerProfile.customerDetails")}
                            </Typography>
                            {renderInfoRow(t("customerProfile.name"), customer.name)}
                            {renderInfoRow(
                                t("customerProfile.phone"),
                                customer.phone || fallback,
                            )}
                            {renderInfoRow(
                                t("customerProfile.cnic"),
                                customer.cnic || fallback,
                            )}
                            {customer.created_at &&
                                renderInfoRow(
                                    t("customerProfile.createdAt"),
                                    formatDateTime(customer.created_at),
                                )}
                            {customer.updated_at &&
                                renderInfoRow(
                                    t("customerProfile.updatedAt"),
                                    formatDateTime(customer.updated_at),
                                )}
                        </Card>

                        <Card style={styles.profileCard}>
                            <Typography variant="heading-small" color="primary">
                                {t("customerProfile.accountInformation")}
                            </Typography>
                            {account ? (
                                <>
                                    {renderInfoRow(
                                        t("customerProfile.accountNumber"),
                                        account.account_number || fallback,
                                    )}
                                    {renderInfoRow(
                                        t("customerProfile.accountType"),
                                        getAccountTypeLabel(account.account_type),
                                    )}
                                    {renderInfoRow(
                                        t("customerProfile.accountStatus"),
                                        getAccountStatusLabel(account.status),
                                    )}
                                    <View style={[styles.infoRow, false && styles.rowRTL]}>
                                        <Typography variant="body-small" color="muted">
                                            {t("customerProfile.currentBalance")}
                                        </Typography>
                                        <TouchableAmount
                                            amount={account.current_balance || 0}
                                            variant="body-medium"
                                            color={
                                                (account.current_balance || 0) > 0
                                                    ? "success"
                                                    : (account.current_balance || 0) < 0
                                                      ? "danger"
                                                      : "primary"
                                            }
                                            style={styles.infoValue}
                                        />
                                    </View>
                                    <View style={[styles.infoRow, false && styles.rowRTL]}>
                                        <Typography variant="body-small" color="muted">
                                            {t("customerProfile.creditLimit")}
                                        </Typography>
                                        <TouchableAmount
                                            amount={account.credit_limit || 0}
                                            variant="body-medium"
                                            color="primary"
                                            style={styles.infoValue}
                                        />
                                    </View>
                                </>
                            ) : (
                                <Typography variant="body-small" color="muted">
                                    {t("customerProfile.noAccount")}
                                </Typography>
                            )}
                        </Card>
                    </>
                )}
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
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    rowRTL: {
        flexDirection: "row-reverse",
    },
    textRTL: {
        textAlign: "right",
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    headerImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    headerImagePlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    headerText: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    profileCard: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: Spacing.md,
    },
    infoValue: {
        flex: 1,
        textAlign: "right",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        padding: Spacing.xxl,
    },
    centerText: {
        textAlign: "center",
    },
});
