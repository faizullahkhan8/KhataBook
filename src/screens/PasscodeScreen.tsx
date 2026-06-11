import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button, Card, Input, PasscodeLengthSelector, PasscodePinInput, PasscodeUnlockScreen, Typography } from "../components";
import { Spacing } from "../constants";
import { AutoLockDelay, PasscodeLength, usePasscode, useTheme } from "../store";

type Mode = "enable" | "authenticate" | "menu" | "change" | "disable";
type SetupStep = 1 | 2 | 3;
const AUTO_LOCK_OPTIONS: AutoLockDelay[] = [0, 60_000, 180_000, 300_000, 600_000];

export const PasscodeScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const {
        isSupported,
        isEnabled,
        pinLength,
        recoveryQuestion,
        biometricEnabled,
        biometricAvailable,
        biometricTypes,
        isBiometricAuthenticating,
        autoLockDelay,
        setupPasscode,
        changePin,
        disablePasscode,
        refreshBiometricAvailability,
        setBiometricEnabled,
        setAutoLockSuspended,
        setAutoLockDelay,
    } = usePasscode();
    const [mode, setMode] = useState<Mode>(isEnabled ? "authenticate" : "enable");
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [currentPin, setCurrentPin] = useState("");
    const [questionChoice, setQuestionChoice] = useState("firstSchool");
    const [customQuestion, setCustomQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [error, setError] = useState("");
    const [selectedLength, setSelectedLength] = useState<PasscodeLength>(4);
    const [setupStep, setSetupStep] = useState<SetupStep>(1);
    const isWizardMode = mode === "enable" || mode === "change";

    const handleBack = useCallback(() => {
        Keyboard.dismiss();
        setAutoLockSuspended(false);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/");
        }
    }, [router, setAutoLockSuspended]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                handleBack();
                return true;
            },
        );
        return () => subscription.remove();
    }, [handleBack]);

    useEffect(() => {
        setAutoLockSuspended(mode !== "menu");
        return () => setAutoLockSuspended(false);
    }, [mode, setAutoLockSuspended]);

    useEffect(() => {
        if (mode === "menu") refreshBiometricAvailability();
    }, [mode, refreshBiometricAvailability]);

    const resetEditFields = () => {
        setPin("");
        setConfirmPin("");
        setSelectedLength(4);
        setSetupStep(1);
        setQuestionChoice("firstSchool");
        setCustomQuestion("");
        setAnswer("");
        setError("");
    };

    const startChangeWizard = () => {
        resetEditFields();
        setSelectedLength(pinLength === 6 ? 6 : 4);
        if (recoveryQuestion) {
            setQuestionChoice("custom");
            setCustomQuestion(recoveryQuestion);
        }
        setMode("change");
    };

    const validateNewPin = () => {
        if (pin.length !== selectedLength) {
            setError(t("passcode.pinExactLength", { count: selectedLength }));
            return false;
        }
        if (pin !== confirmPin) {
            setError(t("passcode.pinMismatch"));
            return false;
        }
        return true;
    };

    const handleEnable = async () => {
        setError("");
        const question = questionChoice === "custom"
            ? customQuestion.trim()
            : t(`passcode.questions.${questionChoice}`);
        if (!validateNewPin()) return;
        if (!question || !answer.trim()) {
            setError(t("passcode.recoveryRequired"));
            return;
        }
        await setupPasscode(pin, selectedLength, question, answer);
        setCurrentPin(pin);
        resetEditFields();
        setMode("menu");
    };

    const handleSetupNext = () => {
        setError("");
        if (setupStep === 1) {
            setSetupStep(2);
            return;
        }
        if (setupStep === 2 && validateNewPin()) {
            Keyboard.dismiss();
            setSetupStep(3);
        }
    };

    const handleSetupBack = () => {
        setError("");
        if (setupStep === 1) {
            if (mode === "change") {
                resetEditFields();
                setMode("menu");
            } else {
                handleBack();
            }
        } else {
            setSetupStep((setupStep - 1) as SetupStep);
        }
    };

    const handleChange = async () => {
        setError("");
        const question = questionChoice === "custom"
            ? customQuestion.trim()
            : t(`passcode.questions.${questionChoice}`);
        if (!validateNewPin()) return;
        if (!question) {
            setError(t("passcode.recoveryQuestionRequired"));
            return;
        }
        const result = await changePin(
            currentPin,
            pin,
            selectedLength,
            question,
            answer,
        );
        if (!result.success) {
            setError(t("passcode.incorrectPin"));
            return;
        }
        setCurrentPin(pin);
        resetEditFields();
        setMode("menu");
    };

    const handleDisable = () => {
        setError("");
        Alert.alert(t("passcode.disableTitle"), t("passcode.disableWarning"), [
            { text: t("customers.cancel"), style: "cancel" },
            {
                text: t("passcode.disable"),
                style: "destructive",
                onPress: async () => {
                    const result = await disablePasscode(currentPin);
                    if (!result.success) {
                        setError(t("passcode.incorrectPin"));
                        return;
                    }
                    setCurrentPin("");
                    resetEditFields();
                    setMode("enable");
                },
            },
        ]);
    };

    const handleBiometricToggle = async (enabled: boolean) => {
        const result = await setBiometricEnabled(
            enabled,
            t("passcode.biometricEnablePrompt"),
        );
        if (!result.success && enabled) {
            Alert.alert(
                t("passcode.biometricEnableFailedTitle"),
                result.error === "not_available" || result.error === "not_enrolled"
                    ? t("passcode.biometricUnavailableMessage")
                    : t("passcode.biometricEnableFailedMessage"),
            );
        }
    };

    const biometricLabel = biometricTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    )
        ? Platform.OS === "ios"
            ? t("passcode.faceIdUnlock")
            : t("passcode.faceUnlock")
        : biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
            ? Platform.OS === "ios"
                ? t("passcode.touchIdUnlock")
                : t("passcode.fingerprintUnlock")
            : t("passcode.biometricUnlock");

    const setupPinInput = (
        <>
            <PasscodePinInput
                length={selectedLength}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/\D/g, ""))}
                placeholder={t("passcode.newPin")}
                visibleByDefault
                showVisibilityToggle={false}
                autoFocus
            />
            <PasscodePinInput
                length={selectedLength}
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/\D/g, ""))}
                placeholder={t("passcode.confirmPin")}
                visibleByDefault
                showVisibilityToggle={false}
            />
        </>
    );

    if (isSupported && mode === "authenticate") {
        return (
            <PasscodeUnlockScreen
                requirePinOnly
                onVerified={(verifiedPin) => {
                    setCurrentPin(verifiedPin);
                    setError("");
                    setMode("menu");
                }}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Pressable onPress={handleBack} style={styles.backButton} hitSlop={Spacing.md}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </Pressable>
                <Typography variant="heading-medium">{t("passcode.title")}</Typography>
            </View>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={insets.top}
            >
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
            >
                {!isSupported ? (
                    <Card style={styles.card}>
                        <Typography variant="heading-small">{t("passcode.unavailableTitle")}</Typography>
                        <Typography color="muted">{t("passcode.unavailableMessage")}</Typography>
                    </Card>
                ) : mode === "menu" ? (
                    <Card style={styles.card}>
                        <View style={[styles.statusIcon, { backgroundColor: `${colors.success}20` }]}>
                            <Ionicons name="shield-checkmark" size={36} color={colors.success} />
                        </View>
                        <Typography variant="heading-small" style={styles.center}>{t("passcode.enabledTitle")}</Typography>
                        <Typography color="muted" style={styles.center}>{t("passcode.enabledMessage")}</Typography>
                        <View style={[styles.biometricRow, { borderColor: colors.border }]}>
                            <View style={styles.biometricCopy}>
                                <Typography variant="subheading-small">{biometricLabel}</Typography>
                                <Typography color="muted" variant="small-small">
                                    {biometricAvailable
                                        ? t("passcode.biometricAvailableMessage")
                                        : t("passcode.biometricUnavailableMessage")}
                                </Typography>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                onValueChange={handleBiometricToggle}
                                disabled={
                                    isBiometricAuthenticating ||
                                    (!biometricAvailable && !biometricEnabled)
                                }
                                trackColor={{ false: colors.border, true: colors.primary }}
                            />
                        </View>
                        <View style={styles.autoLockSection}>
                            <Typography variant="subheading-small">
                                {t("passcode.autoLock")}
                            </Typography>
                            <Typography color="muted" variant="small-small">
                                {t("passcode.autoLockMessage")}
                            </Typography>
                            <View style={styles.autoLockOptions}>
                                {AUTO_LOCK_OPTIONS.map((delay) => {
                                    const selected = autoLockDelay === delay;
                                    return (
                                        <Pressable
                                            key={delay}
                                            onPress={() => setAutoLockDelay(delay)}
                                            style={[
                                                styles.autoLockOption,
                                                {
                                                    borderColor: selected
                                                        ? colors.primary
                                                        : colors.border,
                                                    backgroundColor: selected
                                                        ? `${colors.primary}10`
                                                        : colors.surface,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={selected ? "radio-button-on" : "radio-button-off"}
                                                size={18}
                                                color={selected ? colors.primary : colors.text.muted}
                                            />
                                            <Typography
                                                variant="body-small"
                                                color={selected ? "primary" : "muted"}
                                            >
                                                {delay === 0
                                                    ? t("passcode.autoLockImmediate")
                                                    : delay === 60_000
                                                      ? t("passcode.autoLockMinute")
                                                      : t("passcode.autoLockMinutes", {
                                                            count: delay / 60_000,
                                                        })}
                                            </Typography>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        <Button title={t("passcode.change")} onPress={startChangeWizard} />
                        <Button title={t("passcode.disable")} variant="danger" onPress={() => { resetEditFields(); setMode("disable"); }} />
                    </Card>
                ) : (
                    <Card style={styles.card}>
                        <Typography variant="heading-small">
                            {mode === "enable" ? t("passcode.enableTitle") : mode === "change" ? t("passcode.changeTitle") : t("passcode.disableTitle")}
                        </Typography>
                        {isWizardMode && setupStep === 1 && (
                            <PasscodeLengthSelector
                                value={selectedLength}
                                onChange={(length) => {
                                    setSelectedLength(length);
                                    setPin("");
                                    setConfirmPin("");
                                }}
                            />
                        )}
                        {isWizardMode && setupStep === 2 && setupPinInput}
                        {isWizardMode && setupStep === 3 && (
                            <>
                                <Typography variant="subheading-small">{t("passcode.recoveryQuestion")}</Typography>
                                <View style={styles.questions}>
                                    {(["firstSchool", "childhoodFriend", "favoriteTeacher", "custom"] as const).map((choice) => (
                                        <Pressable
                                            key={choice}
                                            onPress={() => setQuestionChoice(choice)}
                                            style={[
                                                styles.question,
                                                { borderColor: questionChoice === choice ? colors.primary : colors.border },
                                                questionChoice === choice && { backgroundColor: `${colors.primary}10` },
                                            ]}
                                        >
                                            <Ionicons
                                                name={questionChoice === choice ? "radio-button-on" : "radio-button-off"}
                                                size={18}
                                                color={questionChoice === choice ? colors.primary : colors.text.muted}
                                            />
                                            <Typography variant="body-small" style={styles.questionText}>
                                                {t(`passcode.questions.${choice}`)}
                                            </Typography>
                                        </Pressable>
                                    ))}
                                </View>
                                {questionChoice === "custom" && (
                                    <Input value={customQuestion} onChangeText={setCustomQuestion} placeholder={t("passcode.customQuestion")} />
                                )}
                                <Input value={answer} onChangeText={setAnswer} placeholder={t("passcode.answerPlaceholder")} />
                                {mode === "change" && (
                                    <Typography color="muted" variant="small-small">
                                        {t("passcode.keepRecoveryAnswerHint")}
                                    </Typography>
                                )}
                                <Typography color="warning" variant="small-small">{t("passcode.recoveryWarning")}</Typography>
                            </>
                        )}
                        {Boolean(error) && <Typography color="danger">{error}</Typography>}
                        {mode === "disable" && (
                            <Button
                                title={t("passcode.disable")}
                                variant="danger"
                                onPress={handleDisable}
                            />
                        )}
                        {mode === "disable" && <Button title={t("customers.cancel")} variant="secondary" onPress={() => { resetEditFields(); setMode("menu"); }} />}
                    </Card>
                )}
            </ScrollView>
            {isWizardMode && isSupported && (
                <View
                    style={[
                        styles.setupFooter,
                        {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.border,
                            paddingBottom: insets.bottom + Spacing.md,
                        },
                    ]}
                >
                    <Button
                        title={t("passcode.back")}
                        variant="secondary"
                        onPress={handleSetupBack}
                        style={styles.stepButton}
                    />
                    <Button
                        title={
                            setupStep === 3
                                ? mode === "enable"
                                    ? t("passcode.enable")
                                    : t("passcode.saveNewPin")
                                : t("passcode.next")
                        }
                        onPress={
                            setupStep === 3
                                ? mode === "enable"
                                    ? handleEnable
                                    : handleChange
                                : handleSetupNext
                        }
                        style={styles.stepButton}
                    />
                </View>
            )}
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardAvoiding: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, padding: Spacing.lg, gap: Spacing.md },
    backButton: { padding: Spacing.xs },
    content: { padding: Spacing.lg },
    card: { gap: Spacing.lg, padding: Spacing.lg },
    statusIcon: { alignSelf: "center", width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
    center: { textAlign: "center" },
    questions: { gap: Spacing.sm },
    question: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, padding: Spacing.md },
    questionText: { flex: 1, marginLeft: Spacing.sm },
    biometricRow: {
        minHeight: 72,
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    biometricCopy: { flex: 1, gap: Spacing.xs },
    autoLockSection: { gap: Spacing.sm },
    autoLockOptions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    autoLockOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    setupFooter: {
        flexDirection: "row",
        gap: Spacing.sm,
        borderTopWidth: 1,
        paddingTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    stepButton: { flex: 1 },
});
