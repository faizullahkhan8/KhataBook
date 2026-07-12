import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    AppState,
    AppStateStatus,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../constants";
import { PasscodeLength, usePasscode, useTheme } from "../store";
import { Button } from "./Button";
import { Input } from "./Input";
import { PasscodeLengthSelector } from "./PasscodeLengthSelector";
import { PasscodePinInput } from "./PasscodePinInput";
import { Typography } from "./Typography";

type RecoveryStep = "pin" | "answer" | "newPin";

const AUTO_BIOMETRIC_PROMPT_DELAY = Platform.OS === "android" ? 350 : 120;

interface PasscodeUnlockScreenProps {
    onVerified?: (pin: string) => void;
    requirePinOnly?: boolean;
    authenticationActive?: boolean;
    allowBiometrics?: boolean;
    allowRecovery?: boolean;
    title?: string;
    subtitle?: string;
    biometricPromptMessage?: string;
}

export const PasscodeUnlockScreen: React.FC<PasscodeUnlockScreenProps> = ({
    onVerified,
    requirePinOnly = false,
    authenticationActive,
    allowBiometrics = !requirePinOnly,
    allowRecovery = !requirePinOnly,
    title,
    subtitle,
    biometricPromptMessage,
}) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const {
        isLocked,
        recoveryQuestion,
        cooldownUntil,
        pinLength,
        biometricEnabled,
        biometricAvailable,
        isBiometricAuthenticating,
        verifyPin,
        verifyRecoveryAnswer,
        resetPinAfterRecovery,
        authenticateWithBiometrics,
    } = usePasscode();

    const [step, setStep] = useState<RecoveryStep>("pin");
    const [value, setValue] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [error, setError] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [selectedLength, setSelectedLength] = useState<PasscodeLength>(6);
    const [pinHasError, setPinHasError] = useState(false);
    const [shakeTrigger, setShakeTrigger] = useState(0);
    const [foregroundSession, setForegroundSession] = useState(0);

    const isSubmittingPin = useRef(false);
    const biometricPromptedForForeground = useRef(false);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    const isAuthenticationActive = authenticationActive ?? isLocked;
    const biometricPreferred =
        isAuthenticationActive &&
        allowBiometrics &&
        step === "pin" &&
        biometricEnabled;
    const canAutomaticallyPromptBiometrics =
        biometricPreferred && biometricAvailable;

    useEffect(() => {
        setStep("pin");
        setValue("");
        setConfirmPin("");
        setError("");
        setSelectedLength(6);
        setPinHasError(false);
        isSubmittingPin.current = false;
        biometricPromptedForForeground.current = false;
    }, [isAuthenticationActive]);

    useEffect(() => {
        const handleAppStateChange = (nextState: AppStateStatus) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextState;

            if (nextState !== "active") {
                biometricPromptedForForeground.current = false;
                return;
            }

            if (previousState !== "active") {
                biometricPromptedForForeground.current = false;
                setForegroundSession((session) => session + 1);
            }
        };

        const subscription = AppState.addEventListener(
            "change",
            handleAppStateChange,
        );

        return () => subscription.remove();
    }, []);

    const unlockWithBiometrics = useCallback(async () => {
        if (isBiometricAuthenticating || AppState.currentState !== "active") {
            return;
        }

        Keyboard.dismiss();

        const result = await authenticateWithBiometrics(
            biometricPromptMessage ?? t("passcode.biometricPrompt"),
        );

        if (result.success) {
            setValue("");
            setConfirmPin("");
            setError("");
            setPinHasError(false);
            onVerified?.("");
        }
    }, [
        authenticateWithBiometrics,
        biometricPromptMessage,
        isBiometricAuthenticating,
        onVerified,
        t,
    ]);

    useEffect(() => {
        if (
            !canAutomaticallyPromptBiometrics ||
            isBiometricAuthenticating ||
            AppState.currentState !== "active" ||
            biometricPromptedForForeground.current
        ) {
            return;
        }

        const timer = setTimeout(() => {
            if (
                AppState.currentState !== "active" ||
                biometricPromptedForForeground.current
            ) {
                return;
            }

            biometricPromptedForForeground.current = true;
            void unlockWithBiometrics();
        }, AUTO_BIOMETRIC_PROMPT_DELAY);

        return () => clearTimeout(timer);
    }, [
        canAutomaticallyPromptBiometrics,
        foregroundSession,
        isBiometricAuthenticating,
        unlockWithBiometrics,
    ]);

    useEffect(() => {
        const update = () =>
            setSecondsLeft(
                Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)),
            );

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [cooldownUntil]);

    const submit = useCallback(async () => {
        setError("");
        if (secondsLeft > 0) return;

        if (step === "pin") {
            if (isSubmittingPin.current) return;

            isSubmittingPin.current = true;
            const submittedPin = value;
            const result = await verifyPin(submittedPin);

            if (result.success) {
                setValue("");
                setConfirmPin("");
                setError("");
                setPinHasError(false);
                isSubmittingPin.current = false;
                onVerified?.(submittedPin);
                return;
            }

            setError(t("passcode.incorrectPin"));
            setPinHasError(true);
            setShakeTrigger((trigger) => trigger + 1);
            setTimeout(() => {
                setValue("");
                setPinHasError(false);
                isSubmittingPin.current = false;
            }, 350);
            return;
        }

        if (step === "answer") {
            const result = await verifyRecoveryAnswer(value);

            if (result.success) {
                setStep("newPin");
                setValue("");
            } else {
                setError(t("passcode.incorrectAnswer"));
            }
            return;
        }

        if (value.length !== selectedLength) {
            setError(t("passcode.pinExactLength", { count: selectedLength }));
        } else if (value !== confirmPin) {
            setError(t("passcode.pinMismatch"));
        } else {
            await resetPinAfterRecovery(value, selectedLength);
            setStep("pin");
            setValue("");
            setConfirmPin("");
            setError("");
        }
    }, [
        confirmPin,
        onVerified,
        resetPinAfterRecovery,
        secondsLeft,
        selectedLength,
        step,
        t,
        value,
        verifyPin,
        verifyRecoveryAnswer,
    ]);

    useEffect(() => {
        const unlockLength = pinLength ?? 8;

        if (
            step === "pin" &&
            value.length === unlockLength &&
            secondsLeft === 0 &&
            !pinHasError
        ) {
            void submit();
        }
    }, [pinHasError, pinLength, secondsLeft, step, submit, value]);

    const isPinStep = step === "pin" || step === "newPin";

    const handleBiometricPress = useCallback(() => {
        biometricPromptedForForeground.current = true;
        void unlockWithBiometrics();
    }, [unlockWithBiometrics]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingTop: insets.top + Spacing.xxxl,
                        paddingBottom: insets.bottom + Spacing.xl,
                    },
                ]}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
            >
                <View
                    style={[
                        styles.icon,
                        { backgroundColor: `${colors.primary}20` },
                    ]}
                >
                    <Ionicons
                        name="lock-closed"
                        size={42}
                        color={colors.primary}
                    />
                </View>

                <Typography variant="heading-large" style={styles.center}>
                    {step === "pin" && title
                        ? title
                        : step === "pin"
                          ? t("passcode.unlockTitle")
                          : t("passcode.recoverTitle")}
                </Typography>

                <Typography color="muted" style={styles.center}>
                    {step === "answer"
                        ? recoveryQuestion
                        : (subtitle ?? t("passcode.unlockSubtitle"))}
                </Typography>

                <View style={styles.form}>
                    {isPinStep ? (
                        <>
                            {step === "newPin" && (
                                <PasscodeLengthSelector
                                    value={selectedLength}
                                    onChange={(length) => {
                                        setSelectedLength(length);
                                        setValue("");
                                        setConfirmPin("");
                                        setError("");
                                    }}
                                />
                            )}

                            <PasscodePinInput
                                length={
                                    step === "pin"
                                        ? (pinLength ?? 8)
                                        : selectedLength
                                }
                                value={value}
                                onChangeText={(text) =>
                                    setValue(text.replace(/\D/g, ""))
                                }
                                placeholder={t("passcode.pinPlaceholder")}
                                autoFocus={!biometricPreferred}
                                error={step === "pin" && pinHasError}
                                shakeTrigger={step === "pin" ? shakeTrigger : 0}
                                disabled={secondsLeft > 0}
                            />
                        </>
                    ) : (
                        <Input
                            value={value}
                            onChangeText={setValue}
                            placeholder={t("passcode.answerPlaceholder")}
                            autoFocus
                            editable={secondsLeft === 0}
                        />
                    )}

                    {step === "newPin" && (
                        <PasscodePinInput
                            length={selectedLength}
                            value={confirmPin}
                            onChangeText={(text) =>
                                setConfirmPin(text.replace(/\D/g, ""))
                            }
                            placeholder={t("passcode.confirmPin")}
                            disabled={secondsLeft > 0}
                        />
                    )}

                    {Boolean(error) && (
                        <Typography color="danger">{error}</Typography>
                    )}

                    {secondsLeft > 0 && (
                        <Typography color="warning">
                            {t("passcode.tryAgainIn", {
                                seconds: secondsLeft,
                            })}
                        </Typography>
                    )}

                    {step === "pin" &&
                        allowBiometrics &&
                        biometricEnabled &&
                        biometricAvailable && (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("passcode.useBiometric")}
                                disabled={isBiometricAuthenticating}
                                onPress={handleBiometricPress}
                                style={[
                                    styles.biometricButton,
                                    { borderColor: colors.border },
                                    isBiometricAuthenticating &&
                                        styles.disabled,
                                ]}
                            >
                                <Ionicons
                                    name="finger-print-outline"
                                    size={24}
                                    color={colors.primary}
                                />
                                <Typography color="primary">
                                    {t("passcode.useBiometric")}
                                </Typography>
                            </Pressable>
                        )}

                    {step !== "pin" && (
                        <Button
                            title={
                                step === "newPin"
                                    ? t("passcode.resetPin")
                                    : t("passcode.continue")
                            }
                            onPress={submit}
                            disabled={!value || secondsLeft > 0}
                        />
                    )}

                    {step === "pin" && allowRecovery && (
                        <Pressable
                            onPress={() => {
                                Keyboard.dismiss();
                                setStep("answer");
                                setValue("");
                                setError("");
                            }}
                        >
                            <Typography color="primary" style={styles.link}>
                                {t("passcode.forgot")}
                            </Typography>
                        </Pressable>
                    )}

                    {step !== "pin" && (
                        <Pressable
                            onPress={() => {
                                setStep("pin");
                                setValue("");
                                setConfirmPin("");
                                setError("");
                            }}
                        >
                            <Typography color="primary" style={styles.link}>
                                {t("passcode.backToUnlock")}
                            </Typography>
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

interface PasscodeVerificationModalProps {
    visible: boolean;
    onCancel: () => void;
    onVerified: () => void | Promise<void>;
}

export const PasscodeVerificationModal: React.FC<
    PasscodeVerificationModalProps
> = ({ visible, onCancel, onVerified }) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={styles.verificationModal}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("customers.cancel")}
                    onPress={onCancel}
                    hitSlop={Spacing.md}
                    style={[
                        styles.verificationClose,
                        {
                            borderColor: colors.border,
                            top: insets.top + Spacing.md,
                        },
                    ]}
                >
                    <Ionicons
                        name="close"
                        size={24}
                        color={colors.text.primary}
                    />
                </Pressable>

                {visible && (
                    <PasscodeUnlockScreen
                        authenticationActive={visible}
                        allowRecovery={false}
                        title={t("passcode.deleteAuthTitle")}
                        subtitle={t("passcode.deleteAuthMessage")}
                        biometricPromptMessage={t("passcode.deleteAuthTitle")}
                        onVerified={() => void onVerified()}
                    />
                )}
            </View>
        </Modal>
    );
};

export const PasscodeGate: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { isReady, isSupported, isEnabled, isLocked } = usePasscode();

    if (!isReady) return null;
    if (!isSupported || !isEnabled) return <>{children}</>;

    return (
        <View style={styles.root}>
            <View
                pointerEvents={isLocked ? "none" : "auto"}
                accessibilityElementsHidden={isLocked}
                importantForAccessibility={
                    isLocked ? "no-hide-descendants" : "auto"
                }
                style={[
                    styles.protectedContent,
                    isLocked && styles.hiddenContent,
                ]}
            >
                {children}
            </View>

            {isLocked && (
                <View style={styles.lockOverlay}>
                    <PasscodeUnlockScreen />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1 },
    protectedContent: { ...StyleSheet.absoluteFillObject },
    hiddenContent: { opacity: 0 },
    container: { flex: 1 },
    lockOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
    content: {
        flexGrow: 1,
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
    },
    icon: {
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.xl,
    },
    center: { textAlign: "center", marginBottom: Spacing.md },
    form: {
        width: "100%",
        maxWidth: 420,
        marginTop: Spacing.xl,
        gap: Spacing.md,
    },
    link: { textAlign: "center", padding: Spacing.md },
    verificationModal: { flex: 1 },
    verificationClose: {
        position: "absolute",
        zIndex: 1,
        right: Spacing.lg,
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    biometricButton: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
    },
    disabled: { opacity: 0.5 },
});
