import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    BackHandler,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Button,
    Card,
    Input,
    PasscodeLengthSelector,
    PasscodePinInput,
    PasscodeUnlockScreen,
    Typography,
} from "../components";
import { Spacing } from "../constants";
import { PasscodeLength, usePasscode, useTheme } from "../store";

type Mode = "enable" | "authenticate" | "menu" | "change" | "disable";
type SetupStep = 1 | 2 | 3;

export const PasscodeScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ returnTo?: string }>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const {
        isSupported,
        isEnabled,
        recoveryQuestion,
        biometricEnabled,
        biometricAvailable,
        biometricTypes,
        isBiometricAuthenticating,

        requireDeleteAuth,
        setupPasscode,
        changePin,
        disablePasscode,
        refreshBiometricAvailability,
        setBiometricEnabled,

        setRequireDeleteAuth,
    } = usePasscode();
    const [mode, setMode] = useState<Mode>(
        isEnabled ? "authenticate" : "enable",
    );
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [currentPin, setCurrentPin] = useState("");
    const [questionChoice, setQuestionChoice] = useState("firstSchool");
    const [customQuestion, setCustomQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [error, setError] = useState("");
    const [selectedLength, setSelectedLength] = useState<PasscodeLength>(6);
    const [setupStep, setSetupStep] = useState<SetupStep>(1);

    const isWizardMode = mode === "enable" || mode === "change";

    const handleBack = useCallback(() => {
        Keyboard.dismiss();
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/");
        }
    }, [router]);

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
        if (mode === "menu") refreshBiometricAvailability();
    }, [mode, refreshBiometricAvailability]);

    const resetEditFields = () => {
        setPin("");
        setConfirmPin("");
        setSelectedLength(6);
        setSetupStep(1);
        setQuestionChoice("firstSchool");
        setCustomQuestion("");
        setAnswer("");
        setError("");
    };

    const startChangeWizard = () => {
        resetEditFields();
        setSelectedLength(6);
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
        const question =
            questionChoice === "custom"
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
        if (params.returnTo === "onboarding") {
            router.replace("/onboarding?step=security" as any);
            return;
        }
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
        const question =
            questionChoice === "custom"
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
                result.error === "not_available" ||
                    result.error === "not_enrolled"
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
        : biometricTypes.includes(
                LocalAuthentication.AuthenticationType.FINGERPRINT,
            )
          ? Platform.OS === "ios"
              ? t("passcode.touchIdUnlock")
              : t("passcode.fingerprintUnlock")
          : t("passcode.biometricUnlock");

    const setupPinInput = (
        <View style={styles.setupPanel}>
            <View style={styles.fieldGroup}>
                <Typography variant="subheading-small">
                    {t("passcode.newPin")}
                </Typography>
                <Typography variant="small-small" color="muted">
                    {t("passcode.newPinMessage")}
                </Typography>
            </View>
            <PasscodePinInput
                length={selectedLength}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/\D/g, ""))}
                placeholder={t("passcode.newPin")}
                visibleByDefault
                showVisibilityToggle={false}
                autoFocus
            />
            <View style={styles.fieldGroup}>
                <Typography variant="subheading-small">
                    {t("passcode.confirmPin")}
                </Typography>
                <Typography variant="small-small" color="muted">
                    {t("passcode.confirmPinMessage")}
                </Typography>
            </View>
            <PasscodePinInput
                length={selectedLength}
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/\D/g, ""))}
                placeholder={t("passcode.confirmPin")}
                visibleByDefault
                showVisibilityToggle={false}
            />
        </View>
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
        <View
            style={[
                styles.container,
                { backgroundColor: colors.background, paddingTop: insets.top },
            ]}
        >
            <View
                style={[
                    styles.header,
                    {
                        marginTop: Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                    },
                ]}
            >
                <Pressable
                    onPress={handleBack}
                    style={[
                        styles.backButton,
                        { backgroundColor: `${colors.primary}18` },
                    ]}
                    hitSlop={Spacing.md}
                >
                    <Ionicons
                        name="chevron-back"
                        size={20}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography variant="heading-medium">
                    {t("passcode.title")}
                </Typography>
            </View>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={insets.top}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        { paddingBottom: insets.bottom + Spacing.xxxl },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets
                >
                    {!isSupported ? (
                        <Card style={styles.card}>
                            <Typography variant="heading-small">
                                {t("passcode.unavailableTitle")}
                            </Typography>
                            <Typography color="muted">
                                {t("passcode.unavailableMessage")}
                            </Typography>
                        </Card>
                    ) : mode === "menu" ? (
                        <Card style={styles.card}>
                            <View
                                style={[
                                    styles.statusIcon,
                                    { backgroundColor: `${colors.success}20` },
                                ]}
                            >
                                <Ionicons
                                    name="shield-checkmark"
                                    size={36}
                                    color={colors.success}
                                />
                            </View>
                            <Typography
                                variant="heading-small"
                                style={styles.center}
                            >
                                {t("passcode.enabledTitle")}
                            </Typography>
                            <Typography color="muted" style={styles.center}>
                                {t("passcode.enabledMessage")}
                            </Typography>
                            <View
                                style={[
                                    styles.biometricRow,
                                    { borderColor: colors.border },
                                ]}
                            >
                                <View style={styles.biometricCopy}>
                                    <Typography variant="subheading-small">
                                        {biometricLabel}
                                    </Typography>
                                    <Typography
                                        color="muted"
                                        variant="small-small"
                                    >
                                        {biometricAvailable
                                            ? t(
                                                  "passcode.biometricAvailableMessage",
                                              )
                                            : t(
                                                  "passcode.biometricUnavailableMessage",
                                              )}
                                    </Typography>
                                </View>
                                <Switch
                                    value={biometricEnabled}
                                    onValueChange={handleBiometricToggle}
                                    disabled={
                                        isBiometricAuthenticating ||
                                        (!biometricAvailable &&
                                            !biometricEnabled)
                                    }
                                    trackColor={{
                                        false: colors.border,
                                        true: colors.primary,
                                    }}
                                />
                            </View>
                            <View
                                style={[
                                    styles.biometricRow,
                                    { borderColor: colors.border },
                                ]}
                            >
                                <View style={styles.biometricCopy}>
                                    <Typography variant="subheading-small">
                                        {t("passcode.requireDeleteAuth")}
                                    </Typography>
                                    <Typography
                                        color="muted"
                                        variant="small-small"
                                    >
                                        {t("passcode.requireDeleteAuthMessage")}
                                    </Typography>
                                </View>
                                <Switch
                                    value={requireDeleteAuth}
                                    onValueChange={setRequireDeleteAuth}
                                    trackColor={{
                                        false: colors.border,
                                        true: colors.primary,
                                    }}
                                />
                            </View>

                            <Button
                                title={t("passcode.change")}
                                onPress={startChangeWizard}
                            />
                            <Button
                                title={t("passcode.disable")}
                                variant="danger"
                                onPress={() => {
                                    resetEditFields();
                                    setMode("disable");
                                }}
                            />
                        </Card>
                    ) : (
                        <Card style={styles.card}>
                            {isWizardMode && (
                                <>
                                    <View
                                        style={[
                                            styles.wizardIcon,
                                            {
                                                backgroundColor: `${colors.primary}18`,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="shield-checkmark-outline"
                                            size={30}
                                            color={colors.primary}
                                        />
                                    </View>
                                    <Typography
                                        variant="heading-medium"
                                        style={styles.center}
                                    >
                                        {mode === "enable"
                                            ? t("passcode.enableTitle")
                                            : t("passcode.changeTitle")}
                                    </Typography>
                                    <View style={styles.stepIndicator}>
                                        {([1, 2, 3] as SetupStep[]).map(
                                            (step) => {
                                                const active =
                                                    setupStep === step;
                                                const complete =
                                                    setupStep > step;
                                                return (
                                                    <React.Fragment key={step}>
                                                        <View
                                                            style={
                                                                styles.stepItem
                                                            }
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.stepCircle,
                                                                    {
                                                                        borderColor:
                                                                            active ||
                                                                            complete
                                                                                ? colors.primary
                                                                                : colors.border,
                                                                        backgroundColor:
                                                                            active ||
                                                                            complete
                                                                                ? colors.primary
                                                                                : colors.surface,
                                                                    },
                                                                ]}
                                                            >
                                                                <Ionicons
                                                                    name={
                                                                        complete
                                                                            ? "checkmark"
                                                                            : step ===
                                                                                1
                                                                              ? "keypad-outline"
                                                                              : step ===
                                                                                  2
                                                                                ? "lock-closed-outline"
                                                                                : "help-circle-outline"
                                                                    }
                                                                    size={16}
                                                                    color={
                                                                        active ||
                                                                        complete
                                                                            ? "#FFFFFF"
                                                                            : colors
                                                                                  .text
                                                                                  .muted
                                                                    }
                                                                />
                                                            </View>
                                                            <Typography
                                                                variant="small-small"
                                                                color={
                                                                    active ||
                                                                    complete
                                                                        ? "primary"
                                                                        : "muted"
                                                                }
                                                                style={
                                                                    styles.stepLabel
                                                                }
                                                            >
                                                                {t(
                                                                    `passcode.setupSteps.${step}`,
                                                                )}
                                                            </Typography>
                                                        </View>
                                                        {step < 3 && (
                                                            <View
                                                                style={[
                                                                    styles.stepLine,
                                                                    {
                                                                        backgroundColor:
                                                                            complete
                                                                                ? colors.primary
                                                                                : colors.border,
                                                                    },
                                                                ]}
                                                            />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            },
                                        )}
                                    </View>
                                </>
                            )}
                            {mode === "disable" && (
                                <Typography variant="heading-small">
                                    {t("passcode.disableTitle")}
                                </Typography>
                            )}
                            {isWizardMode && setupStep === 1 && (
                                <View style={styles.setupPanel}>
                                    <PasscodeLengthSelector
                                        value={selectedLength}
                                        onChange={(length) => {
                                            setSelectedLength(length);
                                            setPin("");
                                            setConfirmPin("");
                                        }}
                                    />
                                </View>
                            )}
                            {isWizardMode && setupStep === 2 && setupPinInput}
                            {isWizardMode && setupStep === 3 && (
                                <View style={styles.setupPanel}>
                                    <View style={styles.fieldGroup}>
                                        <Typography variant="subheading-small">
                                            {t("passcode.recoveryQuestion")}
                                        </Typography>
                                        <Typography
                                            variant="small-small"
                                            color="muted"
                                        >
                                            {t(
                                                "passcode.recoveryQuestionMessage",
                                            )}
                                        </Typography>
                                    </View>
                                    <View style={styles.questions}>
                                        {(
                                            [
                                                "firstSchool",
                                                "childhoodFriend",
                                                "favoriteTeacher",
                                                "custom",
                                            ] as const
                                        ).map((choice) => (
                                            <Pressable
                                                key={choice}
                                                onPress={() =>
                                                    setQuestionChoice(choice)
                                                }
                                                style={[
                                                    styles.question,
                                                    {
                                                        borderColor:
                                                            questionChoice ===
                                                            choice
                                                                ? colors.primary
                                                                : colors.border,
                                                    },
                                                    questionChoice ===
                                                        choice && {
                                                        backgroundColor: `${colors.primary}10`,
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={
                                                        questionChoice ===
                                                        choice
                                                            ? "checkmark-circle"
                                                            : "ellipse-outline"
                                                    }
                                                    size={20}
                                                    color={
                                                        questionChoice ===
                                                        choice
                                                            ? colors.primary
                                                            : colors.text.muted
                                                    }
                                                />
                                                <Typography
                                                    variant="body-small"
                                                    style={styles.questionText}
                                                >
                                                    {t(
                                                        `passcode.questions.${choice}`,
                                                    )}
                                                </Typography>
                                            </Pressable>
                                        ))}
                                    </View>
                                    {questionChoice === "custom" && (
                                        <Input
                                            value={customQuestion}
                                            onChangeText={setCustomQuestion}
                                            placeholder={t(
                                                "passcode.customQuestion",
                                            )}
                                        />
                                    )}
                                    <Input
                                        value={answer}
                                        onChangeText={setAnswer}
                                        placeholder={t(
                                            "passcode.answerPlaceholder",
                                        )}
                                    />
                                    {mode === "change" && (
                                        <Typography
                                            color="muted"
                                            variant="small-small"
                                        >
                                            {t(
                                                "passcode.keepRecoveryAnswerHint",
                                            )}
                                        </Typography>
                                    )}
                                    <Typography
                                        color="warning"
                                        variant="small-small"
                                    >
                                        {t("passcode.recoveryWarning")}
                                    </Typography>
                                </View>
                            )}
                            {Boolean(error) && (
                                <Typography color="danger">{error}</Typography>
                            )}
                            {mode === "disable" && (
                                <Button
                                    title={t("passcode.disable")}
                                    variant="danger"
                                    onPress={handleDisable}
                                />
                            )}
                            {mode === "disable" && (
                                <Button
                                    title={t("customers.cancel")}
                                    variant="secondary"
                                    onPress={() => {
                                        resetEditFields();
                                        setMode("menu");
                                    }}
                                />
                            )}
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
                                paddingBottom: Math.max(
                                    insets.bottom,
                                    Spacing.md,
                                ),
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
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    content: { padding: Spacing.lg },
    card: { gap: Spacing.lg, padding: Spacing.lg },
    statusIcon: {
        alignSelf: "center",
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    center: { textAlign: "center" },
    wizardIcon: {
        alignSelf: "center",
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: "center",
        justifyContent: "center",
    },
    stepIndicator: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
    },
    stepItem: { width: 72, alignItems: "center", gap: Spacing.xs },
    stepCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    stepLabel: { textAlign: "center" },
    stepLine: { flex: 1, height: 2, marginTop: 16, marginHorizontal: -14 },
    setupPanel: {
        borderRadius: 12,
        gap: Spacing.md,
    },
    fieldGroup: { gap: Spacing.xs },
    questions: { gap: Spacing.sm },
    question: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
    },
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
    settingValue: {
        maxWidth: "42%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: Spacing.xs,
    },
    setupFooter: {
        flexDirection: "row",
        gap: Spacing.sm,
        borderTopWidth: 1,
        paddingTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    stepButton: { flex: 1 },
});
