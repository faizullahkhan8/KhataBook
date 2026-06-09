import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Spacing } from "../constants";
import { PasscodeLength, usePasscode, useTheme } from "../store";
import { Button } from "./Button";
import { Input } from "./Input";
import { PasscodePinInput } from "./PasscodePinInput";
import { PasscodeLengthSelector } from "./PasscodeLengthSelector";
import { Typography } from "./Typography";

type RecoveryStep = "pin" | "answer" | "newPin";

export const PasscodeGate: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const {
        isReady,
        isSupported,
        isEnabled,
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
    const [selectedLength, setSelectedLength] = useState<PasscodeLength>(4);
    const [pinHasError, setPinHasError] = useState(false);
    const [shakeTrigger, setShakeTrigger] = useState(0);
    const isSubmittingPin = useRef(false);
    const biometricPromptedForLock = useRef(false);

    useEffect(() => {
        if (isLocked) {
            setStep("pin");
            setValue("");
            setConfirmPin("");
            setError("");
            setSelectedLength(4);
            setPinHasError(false);
            isSubmittingPin.current = false;
            biometricPromptedForLock.current = false;
        }
    }, [isLocked]);

    const unlockWithBiometrics = useCallback(async () => {
        if (isBiometricAuthenticating) return;
        const result = await authenticateWithBiometrics(t("passcode.biometricPrompt"));
        if (result.success) {
            setValue("");
            setConfirmPin("");
            setError("");
            setPinHasError(false);
        }
    }, [authenticateWithBiometrics, isBiometricAuthenticating, t]);

    useEffect(() => {
        if (
            isLocked &&
            step === "pin" &&
            biometricEnabled &&
            biometricAvailable &&
            !biometricPromptedForLock.current
        ) {
            biometricPromptedForLock.current = true;
            unlockWithBiometrics();
        }
    }, [
        biometricAvailable,
        biometricEnabled,
        isLocked,
        step,
        unlockWithBiometrics,
    ]);

    useEffect(() => {
        const update = () =>
            setSecondsLeft(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
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
            const result = await verifyPin(value);
            if (result.success) {
                setValue("");
                setConfirmPin("");
                setError("");
                setPinHasError(false);
            } else {
                setError(t("passcode.incorrectPin"));
                setPinHasError(true);
                setShakeTrigger((trigger) => trigger + 1);
                setTimeout(() => {
                    setValue("");
                    setPinHasError(false);
                    isSubmittingPin.current = false;
                }, 350);
            }
            if (result.success) isSubmittingPin.current = false;
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
            submit();
        }
    }, [pinHasError, pinLength, secondsLeft, step, submit, value]);

    if (!isReady) return null;
    if (!isSupported || !isEnabled || !isLocked) return <>{children}</>;

    const isPinStep = step === "pin" || step === "newPin";

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
            <View style={[styles.icon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="lock-closed" size={42} color={colors.primary} />
            </View>
            <Typography variant="heading-large" style={styles.center}>
                {step === "pin" ? t("passcode.unlockTitle") : t("passcode.recoverTitle")}
            </Typography>
            <Typography color="muted" style={styles.center}>
                {step === "answer" ? recoveryQuestion : t("passcode.unlockSubtitle")}
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
                            length={step === "pin" ? pinLength ?? 8 : selectedLength}
                            value={value}
                            onChangeText={(text) => setValue(text.replace(/\D/g, ""))}
                            placeholder={t("passcode.pinPlaceholder")}
                            autoFocus
                            error={step === "pin" && pinHasError}
                            shakeTrigger={step === "pin" ? shakeTrigger : 0}
                        />
                    </>
                ) : (
                    <Input
                        value={value}
                        onChangeText={setValue}
                        placeholder={t("passcode.answerPlaceholder")}
                        autoFocus
                    />
                )}
                {step === "newPin" && (
                    <PasscodePinInput
                        length={selectedLength}
                        value={confirmPin}
                        onChangeText={(text) => setConfirmPin(text.replace(/\D/g, ""))}
                        placeholder={t("passcode.confirmPin")}
                    />
                )}
                {Boolean(error) && <Typography color="danger">{error}</Typography>}
                {secondsLeft > 0 && (
                    <Typography color="warning">
                        {t("passcode.tryAgainIn", { seconds: secondsLeft })}
                    </Typography>
                )}
                {step === "pin" && biometricEnabled && biometricAvailable && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("passcode.useBiometric")}
                        disabled={isBiometricAuthenticating}
                        onPress={unlockWithBiometrics}
                        style={[
                            styles.biometricButton,
                            { borderColor: colors.border },
                            isBiometricAuthenticating && styles.disabled,
                        ]}
                    >
                        <Ionicons name="finger-print-outline" size={24} color={colors.primary} />
                        <Typography color="primary">{t("passcode.useBiometric")}</Typography>
                    </Pressable>
                )}
                {step !== "pin" && (
                    <Button title={step === "newPin" ? t("passcode.resetPin") : t("passcode.continue")} onPress={submit} disabled={!value || secondsLeft > 0} />
                )}
                {step === "pin" && (
                    <Pressable onPress={() => {
                        setStep("answer");
                        setValue("");
                        setError("");
                    }}>
                        <Typography color="primary" style={styles.link}>
                            {t("passcode.forgot")}
                        </Typography>
                    </Pressable>
                )}
                {step !== "pin" && (
                    <Pressable onPress={() => {
                        setStep("pin");
                        setValue("");
                        setConfirmPin("");
                        setError("");
                    }}>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flexGrow: 1, alignItems: "center", paddingHorizontal: Spacing.xl },
    icon: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: Spacing.xl },
    center: { textAlign: "center", marginBottom: Spacing.md },
    form: { width: "100%", maxWidth: 420, marginTop: Spacing.xl, gap: Spacing.md },
    link: { textAlign: "center", padding: Spacing.md },
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
