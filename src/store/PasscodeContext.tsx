import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState, Platform } from "react-native";

const STORAGE_KEY = "khatabook.passcode";
const FAILURE_LIMIT = 5;
export type PasscodeLength = 4 | 6;
type StoredPasscodeLength = PasscodeLength | 8;

interface StoredPasscode {
    pinHash: string;
    pinSalt: string;
    pinLength?: StoredPasscodeLength;
    question: string;
    answerHash: string;
    answerSalt: string;
    failures: number;
    cooldownLevel: number;
    lockedUntil: number;
    biometricEnabled?: boolean;
}

interface OperationResult {
    success: boolean;
    cooldownUntil?: number;
}

interface BiometricOperationResult {
    success: boolean;
    error?: LocalAuthentication.LocalAuthenticationError;
}

interface PasscodeContextType {
    isReady: boolean;
    isSupported: boolean;
    isEnabled: boolean;
    isLocked: boolean;
    recoveryQuestion: string | null;
    cooldownUntil: number;
    pinLength: StoredPasscodeLength | null;
    biometricEnabled: boolean;
    biometricAvailable: boolean;
    biometricHardwareAvailable: boolean;
    biometricEnrolled: boolean;
    biometricTypes: LocalAuthentication.AuthenticationType[];
    isBiometricAuthenticating: boolean;
    setupPasscode: (pin: string, pinLength: PasscodeLength, question: string, answer: string) => Promise<void>;
    verifyPin: (pin: string) => Promise<OperationResult>;
    verifyRecoveryAnswer: (answer: string) => Promise<OperationResult>;
    resetPinAfterRecovery: (pin: string, pinLength: PasscodeLength) => Promise<void>;
    changePin: (
        currentPin: string,
        newPin: string,
        pinLength: PasscodeLength,
        question: string,
        answer?: string,
    ) => Promise<OperationResult>;
    disablePasscode: (currentPin: string) => Promise<OperationResult>;
    refreshBiometricAvailability: () => Promise<boolean>;
    setBiometricEnabled: (
        enabled: boolean,
        promptMessage?: string,
    ) => Promise<BiometricOperationResult>;
    authenticateWithBiometrics: (
        promptMessage?: string,
    ) => Promise<BiometricOperationResult>;
    setAutoLockSuspended: (suspended: boolean) => void;
}

const PasscodeContext = createContext<PasscodeContextType | undefined>(undefined);

const createSalt = async () => {
    const bytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const hashValue = (value: string, salt: string) =>
    Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${salt}:${value}`,
    );

const normalizeAnswer = (answer: string) => answer.trim().toLocaleLowerCase();

export const PasscodeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const isSupported = Platform.OS !== "web";
    const [stored, setStored] = useState<StoredPasscode | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricHardwareAvailable, setBiometricHardwareAvailable] = useState(false);
    const [biometricEnrolled, setBiometricEnrolled] = useState(false);
    const [biometricTypes, setBiometricTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);
    const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);
    const autoLockSuspended = useRef(false);
    const biometricPromptActive = useRef(false);
    const lockOnNextActive = useRef(false);
    const appState = useRef(AppState.currentState);

    const persist = useCallback(async (next: StoredPasscode | null) => {
        setStored(next);
        if (!isSupported) return;
        if (next) {
            await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
        } else {
            await SecureStore.deleteItemAsync(STORAGE_KEY);
        }
    }, [isSupported]);

    useEffect(() => {
        const load = async () => {
            if (!isSupported) {
                setIsReady(true);
                return;
            }
            try {
                const value = await SecureStore.getItemAsync(STORAGE_KEY);
                if (value) {
                    setStored(JSON.parse(value));
                    setIsLocked(true);
                }
            } catch (error) {
                console.error("Failed to load passcode", error);
            } finally {
                setIsReady(true);
            }
        };
        load();
    }, [isSupported]);

    const refreshBiometricAvailability = useCallback(async () => {
        if (!isSupported) {
            setBiometricAvailable(false);
            setBiometricHardwareAvailable(false);
            setBiometricEnrolled(false);
            setBiometricTypes([]);
            return false;
        }
        try {
            const [hasHardware, isEnrolled, types] = await Promise.all([
                LocalAuthentication.hasHardwareAsync(),
                LocalAuthentication.isEnrolledAsync(),
                LocalAuthentication.supportedAuthenticationTypesAsync(),
            ]);
            // Android can report the overall enrolled level as weak when both weak and
            // strong methods exist. The authentication prompt itself enforces Class 3.
            const available = hasHardware && isEnrolled;
            setBiometricAvailable(available);
            setBiometricHardwareAvailable(hasHardware);
            setBiometricEnrolled(isEnrolled);
            setBiometricTypes(types);
            if (!available && stored?.biometricEnabled) {
                await persist({ ...stored, biometricEnabled: false });
            }
            return available;
        } catch (error) {
            console.error("Failed to check biometric availability", error);
            setBiometricAvailable(false);
            setBiometricHardwareAvailable(false);
            setBiometricEnrolled(false);
            setBiometricTypes([]);
            return false;
        }
    }, [isSupported, persist, stored]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            const leavingForeground =
                nextState !== "active" &&
                appState.current !== nextState;

            if (
                leavingForeground &&
                stored &&
                !autoLockSuspended.current &&
                !biometricPromptActive.current
            ) {
                lockOnNextActive.current = true;
            }

            if (nextState === "active") {
                refreshBiometricAvailability();
                if (lockOnNextActive.current && stored) {
                    lockOnNextActive.current = false;
                    setIsLocked(true);
                }
            }
            appState.current = nextState;
        });
        return () => subscription.remove();
    }, [refreshBiometricAvailability, stored]);

    useEffect(() => {
        if (isReady) refreshBiometricAvailability();
    }, [isReady, refreshBiometricAvailability]);

    const registerFailure = useCallback(async (): Promise<OperationResult> => {
        if (!stored) return { success: false };
        const failures = stored.failures + 1;
        const reachedLimit = failures >= FAILURE_LIMIT;
        const cooldownLevel = reachedLimit
            ? stored.cooldownLevel + 1
            : stored.cooldownLevel;
        const lockedUntil = reachedLimit
            ? Date.now() + 30_000 * cooldownLevel
            : stored.lockedUntil;
        await persist({
            ...stored,
            failures: reachedLimit ? 0 : failures,
            cooldownLevel,
            lockedUntil,
        });
        return { success: false, cooldownUntil: lockedUntil };
    }, [persist, stored]);

    const clearFailures = useCallback(async () => {
        if (!stored) return;
        await persist({ ...stored, failures: 0, cooldownLevel: 0, lockedUntil: 0 });
    }, [persist, stored]);

    const setupPasscode = useCallback(async (
        pin: string,
        pinLength: PasscodeLength,
        question: string,
        answer: string,
    ) => {
        const pinSalt = await createSalt();
        const answerSalt = await createSalt();
        await persist({
            pinHash: await hashValue(pin, pinSalt),
            pinSalt,
            pinLength,
            question: question.trim(),
            answerHash: await hashValue(normalizeAnswer(answer), answerSalt),
            answerSalt,
            failures: 0,
            cooldownLevel: 0,
            lockedUntil: 0,
            biometricEnabled: false,
        });
        setIsLocked(false);
    }, [persist]);

    const verifyPin = useCallback(async (pin: string): Promise<OperationResult> => {
        if (!stored || Date.now() < stored.lockedUntil) {
            return { success: false, cooldownUntil: stored?.lockedUntil };
        }
        const matches = (await hashValue(pin, stored.pinSalt)) === stored.pinHash;
        if (!matches) return registerFailure();
        await clearFailures();
        setIsLocked(false);
        return { success: true };
    }, [clearFailures, registerFailure, stored]);

    const verifyRecoveryAnswer = useCallback(async (
        answer: string,
    ): Promise<OperationResult> => {
        if (!stored || Date.now() < stored.lockedUntil) {
            return { success: false, cooldownUntil: stored?.lockedUntil };
        }
        const matches =
            (await hashValue(normalizeAnswer(answer), stored.answerSalt)) ===
            stored.answerHash;
        if (!matches) return registerFailure();
        await clearFailures();
        return { success: true };
    }, [clearFailures, registerFailure, stored]);

    const resetPinAfterRecovery = useCallback(async (pin: string, pinLength: PasscodeLength) => {
        if (!stored) return;
        const pinSalt = await createSalt();
        await persist({
            ...stored,
            pinHash: await hashValue(pin, pinSalt),
            pinSalt,
            pinLength,
            failures: 0,
            cooldownLevel: 0,
            lockedUntil: 0,
        });
        setIsLocked(false);
    }, [persist, stored]);

    const changePin = useCallback(async (
        currentPin: string,
        newPin: string,
        pinLength: PasscodeLength,
        question: string,
        answer?: string,
    ): Promise<OperationResult> => {
        const result = await verifyPin(currentPin);
        if (!result.success || !stored) return result;
        const pinSalt = await createSalt();
        const hasNewAnswer = Boolean(answer?.trim());
        const answerSalt = hasNewAnswer ? await createSalt() : stored.answerSalt;
        await persist({
            ...stored,
            pinHash: await hashValue(newPin, pinSalt),
            pinSalt,
            pinLength,
            question: question.trim(),
            answerHash: hasNewAnswer
                ? await hashValue(normalizeAnswer(answer!), answerSalt)
                : stored.answerHash,
            answerSalt,
            failures: 0,
            cooldownLevel: 0,
            lockedUntil: 0,
        });
        return { success: true };
    }, [persist, stored, verifyPin]);

    const disablePasscode = useCallback(async (
        currentPin: string,
    ): Promise<OperationResult> => {
        const result = await verifyPin(currentPin);
        if (!result.success) return result;
        await persist(null);
        setIsLocked(false);
        return { success: true };
    }, [persist, verifyPin]);

    const runBiometricPrompt = useCallback(async (
        promptMessage = "Unlock KhataBook",
    ): Promise<BiometricOperationResult> => {
        if (biometricPromptActive.current) {
            return { success: false, error: "not_available" };
        }
        biometricPromptActive.current = true;
        setIsBiometricAuthenticating(true);
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage,
                cancelLabel: "Use PIN",
                fallbackLabel: "",
                disableDeviceFallback: true,
                biometricsSecurityLevel: "strong",
            });
            if (result.success) {
                setIsLocked(false);
                return { success: true };
            }
            return { success: false, error: result.error };
        } catch (error) {
            console.error("Biometric authentication failed", error);
            return { success: false, error: "unknown" };
        } finally {
            biometricPromptActive.current = false;
            setIsBiometricAuthenticating(false);
        }
    }, []);

    const authenticateWithBiometrics = useCallback(async (
        promptMessage?: string,
    ): Promise<BiometricOperationResult> => {
        if (!stored?.biometricEnabled || !biometricAvailable) {
            return { success: false, error: "not_available" };
        }
        const result = await runBiometricPrompt(promptMessage);
        if (
            !result.success &&
            (result.error === "not_available" ||
                result.error === "not_enrolled" ||
                result.error === "passcode_not_set")
        ) {
            await persist({ ...stored, biometricEnabled: false });
        }
        return result;
    }, [biometricAvailable, persist, runBiometricPrompt, stored]);

    const setBiometricEnabled = useCallback(async (
        enabled: boolean,
        promptMessage?: string,
    ): Promise<BiometricOperationResult> => {
        if (!stored) return { success: false, error: "not_available" };
        if (!enabled) {
            await persist({ ...stored, biometricEnabled: false });
            return { success: true };
        }
        const available = await refreshBiometricAvailability();
        if (!available) return { success: false, error: "not_available" };
        const result = await runBiometricPrompt(promptMessage);
        if (!result.success) return result;
        await persist({ ...stored, biometricEnabled: true });
        return { success: true };
    }, [persist, refreshBiometricAvailability, runBiometricPrompt, stored]);

    const value = useMemo(() => ({
        isReady,
        isSupported,
        isEnabled: Boolean(stored),
        isLocked,
        recoveryQuestion: stored?.question ?? null,
        cooldownUntil: stored?.lockedUntil ?? 0,
        pinLength: stored?.pinLength ?? null,
        biometricEnabled: Boolean(stored?.biometricEnabled),
        biometricAvailable,
        biometricHardwareAvailable,
        biometricEnrolled,
        biometricTypes,
        isBiometricAuthenticating,
        setupPasscode,
        verifyPin,
        verifyRecoveryAnswer,
        resetPinAfterRecovery,
        changePin,
        disablePasscode,
        refreshBiometricAvailability,
        setBiometricEnabled,
        authenticateWithBiometrics,
        setAutoLockSuspended: (suspended: boolean) => {
            autoLockSuspended.current = suspended;
        },
    }), [
        changePin,
        authenticateWithBiometrics,
        biometricAvailable,
        biometricEnrolled,
        biometricHardwareAvailable,
        biometricTypes,
        disablePasscode,
        isBiometricAuthenticating,
        isLocked,
        isReady,
        isSupported,
        resetPinAfterRecovery,
        refreshBiometricAvailability,
        setBiometricEnabled,
        setupPasscode,
        stored,
        verifyPin,
        verifyRecoveryAnswer,
    ]);

    return (
        <PasscodeContext.Provider value={value}>
            {children}
        </PasscodeContext.Provider>
    );
};

export const usePasscode = () => {
    const context = useContext(PasscodeContext);
    if (!context) throw new Error("usePasscode must be used within PasscodeProvider");
    return context;
};
