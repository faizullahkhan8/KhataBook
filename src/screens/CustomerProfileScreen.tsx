import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Card,
    LoadingScreen,
    TouchableAmount,
    Typography,
} from "../components";
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
    const { colors } = useTheme();
    const { t } = useTranslation();

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

    const renderInfoRow = (
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        value: string,
        iconColor: string,
    ) => (
        <View style={styles.infoRow}>
            <Ionicons
                name={icon}
                size={24}
                color={iconColor}
                style={styles.rowIcon}
            />
            <View style={styles.infoTextContainer}>
                <Typography variant="body-medium" color="primary">
                    {value}
                </Typography>
                <Typography variant="small-small" color="secondary">
                    {label}
                </Typography>
            </View>
        </View>
    );

    const renderAmountRow = (
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        amount: number,
        colorType: any,
        iconColor: string,
    ) => (
        <View style={styles.infoRow}>
            <Ionicons
                name={icon}
                size={24}
                color={iconColor}
                style={styles.rowIcon}
            />
            <View style={styles.infoTextContainer}>
                <TouchableAmount
                    amount={amount}
                    variant="body-medium"
                    color={colorType}
                />
                <Typography variant="small-small" color="secondary">
                    {label}
                </Typography>
            </View>
        </View>
    );

    if (!db || (loading && !customer)) {
        return <LoadingScreen />;
    }

    if (error || !customer) {
        return (
            <View
                style={[
                    styles.container,
                    { backgroundColor: colors.background },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={[
                        styles.absoluteBackButton,
                        {
                            backgroundColor: `${colors.primary}18`,
                            top: insets.top + Spacing.sm,
                            left: Spacing.md,
                        },
                    ]}
                >
                    <Ionicons
                        name="chevron-back"
                        size={20}
                        color={colors.primary}
                    />
                </Pressable>

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
            </View>
        );
    }

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <Pressable
                onPress={() => router.back()}
                style={[
                    styles.absoluteBackButton,
                    {
                        backgroundColor: `${colors.primary}18`,
                        top: insets.top + Spacing.sm,
                        left: Spacing.md,
                    },
                ]}
            >
                <Ionicons
                    name="chevron-back"
                    size={20}
                    color={colors.primary}
                />
            </Pressable>

            <ScrollView
                contentContainerStyle={{
                    paddingBottom: insets.bottom + Spacing.xxl,
                }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View
                    style={[
                        styles.coverPhoto,
                        { backgroundColor: `${colors.primary}25` },
                    ]}
                />

                <View
                    style={[
                        styles.profileHeroCard,
                        { backgroundColor: colors.surface },
                    ]}
                >
                    <View
                        style={[
                            styles.avatarContainer,
                            {
                                borderColor: colors.surface,
                                backgroundColor: colors.surface,
                            },
                        ]}
                    >
                        {customer.image_uri ? (
                            <Image
                                source={{ uri: customer.image_uri }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.avatarPlaceholder,
                                    { backgroundColor: `${colors.primary}15` },
                                ]}
                            >
                                <Ionicons
                                    name="person"
                                    size={50}
                                    color={colors.primary}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.heroTextContainer}>
                        <Typography
                            variant="heading-large"
                            color="primary"
                            style={styles.centerText}
                        >
                            {customer.name}
                        </Typography>
                        <Typography
                            variant="body-medium"
                            color="secondary"
                            style={styles.centerText}
                        >
                            {customer.phone || fallback}
                        </Typography>
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    <Card
                        style={[
                            styles.infoCard,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <Typography variant="heading-small" color="primary">
                                {t("customerProfile.customerDetails")}
                            </Typography>
                        </View>

                        {renderInfoRow(
                            "id-card",
                            t("customerProfile.cnic"),
                            customer.cnic || fallback,
                            colors.text.muted,
                        )}
                        {renderInfoRow(
                            "mail",
                            t("addCustomer.email"),
                            customer.email || fallback,
                            colors.text.muted,
                        )}
                        {renderInfoRow(
                            "location",
                            t("addCustomer.address"),
                            customer.address || fallback,
                            colors.text.muted,
                        )}

                        {customer.created_at &&
                            renderInfoRow(
                                "calendar",
                                t("customerProfile.createdAt"),
                                formatDateTime(customer.created_at),
                                colors.text.muted,
                            )}
                    </Card>

                    <Card
                        style={[
                            styles.infoCard,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <Typography variant="heading-small" color="primary">
                                {t("customerProfile.accountInformation")}
                            </Typography>
                        </View>

                        {account ? (
                            <>
                                {renderInfoRow(
                                    "card",
                                    t("customerProfile.accountNumber"),
                                    account.account_number || fallback,
                                    colors.success,
                                )}
                                {renderInfoRow(
                                    "pricetag",
                                    t("customerProfile.accountType"),
                                    getAccountTypeLabel(account.account_type),
                                    colors.primary,
                                )}
                                {renderInfoRow(
                                    "information-circle",
                                    t("customerProfile.accountStatus"),
                                    getAccountStatusLabel(account.status),
                                    colors.warning,
                                )}
                                {renderAmountRow(
                                    "wallet",
                                    t("customerProfile.currentBalance"),
                                    account.current_balance || 0,
                                    (account.current_balance || 0) > 0
                                        ? "success"
                                        : (account.current_balance || 0) < 0
                                          ? "danger"
                                          : "primary",
                                    colors.primary,
                                )}
                                {renderAmountRow(
                                    "cash",
                                    t("customerProfile.creditLimit"),
                                    account.credit_limit || 0,
                                    "primary",
                                    colors.text.muted,
                                )}
                            </>
                        ) : (
                            <View style={styles.noAccountContainer}>
                                <Typography variant="body-small" color="muted">
                                    {t("customerProfile.noAccount")}
                                </Typography>
                            </View>
                        )}
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    absoluteBackButton: {
        position: "absolute",
        zIndex: 10,
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginTop: Spacing.sm,
        marginLeft: Spacing.sm,
    },
    coverPhoto: {
        height: 120,
    },
    profileHeroCard: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.border,
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        alignSelf: "center",
        marginTop: -70,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        borderRadius: 66,
    },
    avatarPlaceholder: {
        width: "100%",
        height: "100%",
        borderRadius: 66,
        alignItems: "center",
        justifyContent: "center",
    },
    heroTextContainer: {
        marginTop: Spacing.sm,
        alignItems: "center",
    },
    detailsContainer: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    infoCard: {
        padding: 0,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "transparent",
        overflow: "hidden",
    },
    cardHeader: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    rowIcon: {
        marginRight: Spacing.md,
    },
    infoTextContainer: {
        flex: 1,
        justifyContent: "center",
    },
    noAccountContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
    },
    centerText: {
        textAlign: "center",
    },
});
