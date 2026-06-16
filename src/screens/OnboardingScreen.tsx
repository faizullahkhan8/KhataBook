import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Typography } from "../components";
import { Spacing, STORAGE_KEYS } from "../constants";
import { ThemeMode, useLanguage, usePasscode, useTheme } from "../store";

type OnboardingStep = "welcome" | "security" | "legal";

const THEME_OPTIONS: {
    mode: ThemeMode;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { mode: "light", icon: "sunny-outline" },
    { mode: "dark", icon: "moon-outline" },
    { mode: "system", icon: "phone-portrait-outline" },
];

export const OnboardingScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ step?: string }>();
    const { t } = useTranslation();
    const { colors, mode, setMode } = useTheme();
    const { language, setLanguage } = useLanguage();
    const {
        isEnabled: isPasscodeEnabled,
        biometricEnabled,
        biometricAvailable,
        isBiometricAuthenticating,
        setBiometricEnabled,
    } = usePasscode();
    const [step, setStep] = useState<OnboardingStep>("welcome");
    const [acceptedAgreement, setAcceptedAgreement] = useState(false);

    useEffect(() => {
        if (params.step === "security") {
            setStep("security");
        } else if (params.step === "legal") {
            setStep("legal");
        }
    }, [params.step]);

    const canStart = acceptedAgreement;

    const completeOnboarding = async () => {
        if (!canStart) return;
        await AsyncStorage.setItem(STORAGE_KEYS.onboardingCompleted, "true");
        router.replace("/" as any);
    };

    const handleBiometricToggle = async (enabled: boolean) => {
        await setBiometricEnabled(enabled, t("passcode.biometricEnablePrompt"));
    };

    const openPasscodeSetup = () => {
        router.push("/passcode?returnTo=onboarding" as any);
    };

    const languageOptions = useMemo(
        () => [
            { value: "en" as const, label: t("settings.english") },
            { value: "ur" as const, label: t("settings.urdu") },
        ],
        [t],
    );

    const renderThemeSelector = () => (
        <View style={styles.themeSection}>
            <Typography
                variant="subheading-small"
                color="primary"
                style={styles.startText}
            >
                {t("onboarding.appearance")}
            </Typography>
            <View style={styles.themeRow}>
                {THEME_OPTIONS.map((option) => {
                    const selected = mode === option.mode;
                    return (
                        <Pressable
                            key={option.mode}
                            onPress={() => setMode(option.mode)}
                            style={[
                                styles.themeButton,
                                {
                                    borderColor: selected
                                        ? colors.primary
                                        : colors.border,
                                    backgroundColor: selected
                                        ? `${colors.primary}12`
                                        : colors.surface,
                                },
                            ]}
                        >
                            <Ionicons
                                name={option.icon}
                                size={22}
                                color={
                                    selected
                                        ? colors.primary
                                        : colors.text.muted
                                }
                            />
                            <Typography
                                variant="small-small"
                                color={selected ? "primary" : "muted"}
                                style={styles.themeText}
                            >
                                {t(`settings.theme_${option.mode}`)}
                            </Typography>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );

    const renderWelcome = () => (
        <View style={styles.screenContent}>
            <View style={styles.hero}>
                <Image
                    source={require("../../assets/images/app-logo.png")}
                    style={styles.logo}
                    contentFit="contain"
                />
                <Typography
                    variant="heading-large"
                    color="primary"
                    style={styles.centerText}
                >
                    {t("onboarding.welcomeTitle")}
                </Typography>
                <Typography
                    variant="body-medium"
                    color="muted"
                    style={styles.centerText}
                >
                    {t("onboarding.welcomeTagline")}
                </Typography>
            </View>

            <View style={styles.welcomeControls}>
                {renderThemeSelector()}
                <View style={styles.languageRow}>
                    {languageOptions.map((option) => {
                        const selected = language === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => void setLanguage(option.value)}
                                style={[
                                    styles.languageButton,
                                    {
                                        borderColor: selected
                                            ? colors.primary
                                            : colors.border,
                                        backgroundColor: selected
                                            ? `${colors.primary}12`
                                            : colors.surface,
                                    },
                                ]}
                            >
                                <Typography
                                    variant="body-medium"
                                    color={selected ? "primary" : "secondary"}
                                >
                                    {option.label}
                                </Typography>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <Button
                title={t("onboarding.getStarted")}
                onPress={() => setStep("security")}
            />
        </View>
    );

    const renderSecurity = () => (
        <View style={styles.screenContent}>
            <View style={styles.securityTopContent}>
                <View style={styles.securityHeaderRow}>
                    <View style={styles.securityHeaderCopy}>
                        <Typography
                            variant="heading-large"
                            color="primary"
                            style={styles.startText}
                        >
                            {t("onboarding.passcodeStepTitle")}
                        </Typography>
                    </View>
                    <Pressable
                        onPress={() => setStep("legal")}
                        style={[
                            styles.skipButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                            },
                        ]}
                    >
                        <Typography variant="small-small" color="primary">
                            {isPasscodeEnabled
                                ? t("passcode.continue")
                                : t("onboarding.skip")}
                        </Typography>
                    </Pressable>
                </View>

                <Card style={[styles.sectionCard, styles.securityCard]}>
                    <View
                        style={[
                            styles.securityIconLarge,
                            { backgroundColor: `${colors.primary}14` },
                        ]}
                    >
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={44}
                            color={colors.primary}
                        />
                    </View>

                    <View style={styles.securityIntro}>
                        <Typography
                            variant="subheading-large"
                            color="primary"
                            style={styles.centerText}
                        >
                            {t("onboarding.passcodeTitle")}
                        </Typography>
                        <Typography
                            variant="body-small"
                            color="muted"
                            style={styles.centerText}
                        >
                            {t("onboarding.passcodeSubtitle")}
                        </Typography>
                    </View>

                    <View style={styles.securityBenefitList}>
                        <View style={styles.securityBenefitRow}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={20}
                                color={colors.primary}
                            />
                            <Typography
                                variant="body-small"
                                color="secondary"
                                style={styles.securityBenefitText}
                            >
                                {t("onboarding.passcodeBenefitLock")}
                            </Typography>
                        </View>
                        <View style={styles.securityBenefitRow}>
                            <Ionicons
                                name="finger-print-outline"
                                size={20}
                                color={colors.primary}
                            />
                            <Typography
                                variant="body-small"
                                color="secondary"
                                style={styles.securityBenefitText}
                            >
                                {t("onboarding.passcodeBenefitBiometric")}
                            </Typography>
                        </View>
                    </View>

                    {isPasscodeEnabled && (
                        <View style={styles.statusRow}>
                            <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={colors.success}
                            />
                            <Typography variant="body-small" color="success">
                                {t("onboarding.passcodeEnabled")}
                            </Typography>
                        </View>
                    )}

                    {isPasscodeEnabled && biometricAvailable && (
                        <View
                            style={[
                                styles.biometricRow,
                                { borderColor: colors.border },
                            ]}
                        >
                            <View style={styles.securityCopy}>
                                <Typography
                                    variant="body-small"
                                    color="primary"
                                >
                                    {t("onboarding.biometricUnlock")}
                                </Typography>
                                <Typography variant="small-small" color="muted">
                                    {t("onboarding.biometricSubtitle")}
                                </Typography>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                disabled={isBiometricAuthenticating}
                                onValueChange={handleBiometricToggle}
                                trackColor={{
                                    false: colors.border,
                                    true: colors.primary,
                                }}
                            />
                        </View>
                    )}
                </Card>
            </View>

            <View style={styles.footerActions}>
                <Button
                    title={t("passcode.back")}
                    variant="secondary"
                    onPress={() => setStep("welcome")}
                    style={styles.actionButton}
                />
                <Button
                    title={
                        isPasscodeEnabled
                            ? t("passcode.continue")
                            : t("onboarding.setupPasscode")
                    }
                    onPress={
                        isPasscodeEnabled
                            ? () => setStep("legal")
                            : openPasscodeSetup
                    }
                    style={styles.actionButton}
                />
            </View>
        </View>
    );

    const renderLegal = () => (
        <View style={styles.screenContent}>
            <View style={styles.sectionHeader}>
                <Typography
                    variant="heading-large"
                    color="primary"
                    style={styles.startText}
                >
                    {t("onboarding.legalTitle")}
                </Typography>
                <Typography
                    variant="body-small"
                    color="muted"
                    style={styles.startText}
                >
                    {t("onboarding.legalSubtitle")}
                </Typography>
            </View>

            <View style={styles.legalFooter}>
                <View
                    style={[
                        styles.agreement,
                        {
                            borderColor: acceptedAgreement
                                ? colors.primary
                                : colors.border,
                            backgroundColor: acceptedAgreement
                                ? `${colors.primary}10`
                                : colors.surface,
                        },
                    ]}
                >
                    <Pressable
                        onPress={() =>
                            setAcceptedAgreement((accepted) => !accepted)
                        }
                        style={styles.agreementCheck}
                    >
                        <Ionicons
                            name={
                                acceptedAgreement
                                    ? "checkbox"
                                    : "square-outline"
                            }
                            size={24}
                            color={
                                acceptedAgreement
                                    ? colors.primary
                                    : colors.text.muted
                            }
                        />
                    </Pressable>
                    <View style={styles.agreementText}>
                        <Typography variant="body-small" color="primary">
                            {t("onboarding.agreement")}
                        </Typography>
                        <View style={styles.linkRow}>
                            <Pressable
                                onPress={() =>
                                    router.push("/privacy-policy" as any)
                                }
                            >
                                <Typography
                                    variant="small-small"
                                    color="primary"
                                >
                                    {t("onboarding.privacyPolicyLink")}
                                </Typography>
                            </Pressable>
                            <Typography variant="small-small" color="muted">
                                {t("onboarding.and")}
                            </Typography>
                            <Pressable
                                onPress={() =>
                                    router.push("/terms-of-use" as any)
                                }
                            >
                                <Typography
                                    variant="small-small"
                                    color="primary"
                                >
                                    {t("onboarding.termsOfUseLink")}
                                </Typography>
                            </Pressable>
                        </View>
                    </View>
                </View>

                <View style={styles.footerActions}>
                    <Button
                        title={t("passcode.back")}
                        variant="secondary"
                        onPress={() => setStep("security")}
                        style={styles.actionButton}
                    />
                    <Button
                        title={t("onboarding.startUsing")}
                        onPress={completeOnboarding}
                        disabled={!canStart}
                        style={styles.actionButton}
                    />
                </View>
            </View>
        </View>
    );

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + Spacing.xl,
                        paddingBottom: insets.bottom + Spacing.xl,
                    },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                {step === "welcome"
                    ? renderWelcome()
                    : step === "security"
                      ? renderSecurity()
                      : renderLegal()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.lg,
    },
    screenContent: {
        flex: 1,
        justifyContent: "space-between",
        gap: Spacing.xl,
    },
    securityTopContent: {
        gap: Spacing.lg,
    },
    hero: {
        flex: 1,
        minHeight: 320,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.md,
    },
    logo: {
        width: 132,
        height: 132,
    },
    centerText: {
        textAlign: "center",
    },
    startText: {
        textAlign: "left",
    },
    languageRow: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    languageButton: {
        flex: 1,
        minHeight: 52,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    welcomeControls: {
        gap: Spacing.md,
    },
    sectionHeader: {
        gap: Spacing.xs,
    },
    sectionCard: {
        gap: Spacing.md,
    },
    themeSection: {
        gap: Spacing.sm,
    },
    themeRow: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    themeButton: {
        flex: 1,
        minHeight: 78,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.sm,
    },
    themeText: {
        marginTop: Spacing.xs,
        textAlign: "center",
    },
    securityHeaderRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.md,
    },
    securityHeaderCopy: {
        flex: 1,
        gap: Spacing.xs,
    },
    skipButton: {
        minHeight: 36,
        minWidth: 72,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: Spacing.md,
    },
    securityCard: {
        alignItems: "center",
        paddingVertical: Spacing.xl,
    },
    securityIconLarge: {
        width: 92,
        height: 92,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    securityIntro: {
        gap: Spacing.xs,
    },
    securityCopy: {
        flex: 1,
        gap: Spacing.xs,
    },
    securityBenefitList: {
        width: "100%",
        gap: Spacing.sm,
    },
    securityBenefitRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    securityBenefitText: {
        flex: 1,
    },
    actionButton: { flex: 1 },
    footerActions: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    legalFooter: {
        gap: Spacing.md,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    biometricRow: {
        minHeight: 64,
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    agreement: {
        minHeight: 74,
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.md,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.sm,
    },
    agreementText: {
        flex: 1,
        gap: Spacing.xs,
    },
    agreementCheck: {
        paddingTop: 1,
    },
    linkRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.xs,
    },
});
