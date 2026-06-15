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
import { ARGON2_PARAMETERS, hashStrongValue } from "../security/kdf";
import { useDatabaseContext } from "./DatabaseContext";

const STORAGE_KEY = "khatabook.passcode";
const FAILURE_LIMIT = 5;
type KdfType = "argon2id" | "legacy_sha256";
export type PasscodeLength = 4 | 6;
type StoredPasscodeLength = PasscodeLength | 8;
export type AutoLockDelay = 0 | 60_000 | 180_000 | 300_000 | 600_000;

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
    autoLockDelay?: AutoLockDelay;
    requireDeleteAuth?: boolean;
    pinKdf?: KdfType;
    answerKdf?: KdfType;
}

interface SecuritySettingsRow {
    pin_hash: string;
    pin_salt: string;
    pin_kdf: KdfType;
    pin_length: StoredPasscodeLength;
    recovery_question: string;
    answer_hash: string;
    answer_salt: string;
    answer_kdf: KdfType;
    failures: number;
    cooldown_level: number;
    locked_until: number;
    biometric_enabled: number;
    auto_lock_delay: AutoLockDelay;
    require_delete_auth: number;
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
    autoLockDelay: AutoLockDelay;
    requireDeleteAuth: boolean;
    setupPasscode: (
        pin: string,
        pinLength: PasscodeLength,
        question: string,
        answer: string,
    ) => Promise<void>;
    verifyPin: (pin: string) => Promise<OperationResult>;
    verifyRecoveryAnswer: (answer: string) => Promise<OperationResult>;
    resetPinAfterRecovery: (
        pin: string,
        pinLength: PasscodeLength,
    ) => Promise<void>;
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
    setAutoLockDelay: (delay: AutoLockDelay) => Promise<void>;
    setRequireDeleteAuth: (enabled: boolean) => Promise<void>;
}

const PasscodeContext = createContext<PasscodeContextType | undefined>(
    undefined,
);

const createSalt = async () => {
    const bytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
    );
};

const hashLegacyValue = (value: string, salt: string) =>
    Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${salt}:${value}`,
    );

const constantTimeEqual = (left: string, right: string) => {
    let difference = left.length ^ right.length;
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        difference |=
            (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
    }
    return difference === 0;
};

const verifyValue = async (
    value: string,
    salt: string,
    expected: string,
    kdf: KdfType,
) =>
    constantTimeEqual(
        kdf === "argon2id"
            ? await hashStrongValue(value, salt)
            : await hashLegacyValue(value, salt),
        expected,
    );

const normalizeAnswer = (answer: string) => answer.trim().toLocaleLowerCase();

const retainLegacyVerifiers = (stored: StoredPasscode) =>
    SecureStore.setItemAsync(
        STORAGE_KEY,
        JSON.stringify({
            pinHash: stored.pinHash,
            pinSalt: stored.pinSalt,
            answerHash: stored.answerHash,
            answerSalt: stored.answerSalt,
        }),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );

export const PasscodeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { db } = useDatabaseContext();
    const isSupported = Platform.OS !== "web";
    const [stored, setStored] = useState<StoredPasscode | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricHardwareAvailable, setBiometricHardwareAvailable] =
        useState(false);
    const [biometricEnrolled, setBiometricEnrolled] = useState(false);
    const [biometricTypes, setBiometricTypes] = useState<
        LocalAuthentication.AuthenticationType[]
    >([]);
    const [isBiometricAuthenticating, setIsBiometricAuthenticating] =
        useState(false);
    const autoLockSuspended = useRef(false);
    const biometricPromptActive = useRef(false);
    const lockOnNextActive = useRef(false);
    const forceLockOnNextActive = useRef(false);
    const lockScheduledAt = useRef<number | null>(null);
    const appState = useRef(AppState.currentState);

    const persist = useCallback(
        async (next: StoredPasscode | null) => {
            if (!isSupported) return;
            if (!db) throw new Error("Encrypted database is not initialized");
            if (next) {
                await db.runAsync(
                    `INSERT INTO security_settings (
                        id, pin_hash, pin_salt, pin_kdf, pin_length,
                        recovery_question, answer_hash, answer_salt, answer_kdf,
                        kdf_params, failures, cooldown_level, locked_until,
                        biometric_enabled, auto_lock_delay, require_delete_auth
                    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        pin_hash = excluded.pin_hash,
                        pin_salt = excluded.pin_salt,
                        pin_kdf = excluded.pin_kdf,
                        pin_length = excluded.pin_length,
                        recovery_question = excluded.recovery_question,
                        answer_hash = excluded.answer_hash,
                        answer_salt = excluded.answer_salt,
                        answer_kdf = excluded.answer_kdf,
                        kdf_params = excluded.kdf_params,
                        failures = excluded.failures,
                        cooldown_level = excluded.cooldown_level,
                        locked_until = excluded.locked_until,
                        biometric_enabled = excluded.biometric_enabled,
                        auto_lock_delay = excluded.auto_lock_delay,
                        require_delete_auth = excluded.require_delete_auth`,
                    [
                        next.pinHash,
                        next.pinSalt,
                        next.pinKdf ?? "legacy_sha256",
                        next.pinLength ?? 8,
                        next.question,
                        next.answerHash,
                        next.answerSalt,
                        next.answerKdf ?? "legacy_sha256",
                        JSON.stringify(ARGON2_PARAMETERS),
                        next.failures,
                        next.cooldownLevel,
                        next.lockedUntil,
                        next.biometricEnabled ? 1 : 0,
                        next.autoLockDelay ?? 0,
                        next.requireDeleteAuth ? 1 : 0,
                    ],
                );
                if (
                    next.pinKdf === "argon2id" &&
                    next.answerKdf === "argon2id"
                ) {
                    await SecureStore.deleteItemAsync(STORAGE_KEY);
                }
            } else {
                await db.runAsync("DELETE FROM security_settings WHERE id = 1");
                await SecureStore.deleteItemAsync(STORAGE_KEY);
            }
            setStored(next);
        },
        [db, isSupported],
    );

    useEffect(() => {
        const load = async () => {
            if (!isSupported) {
                setIsReady(true);
                return;
            }
            try {
                if (!db) return;
                const row = await db.getFirstAsync<SecuritySettingsRow>(
                    "SELECT * FROM security_settings WHERE id = 1",
                );
                if (row) {
                    const loaded = {
                        pinHash: row.pin_hash,
                        pinSalt: row.pin_salt,
                        pinKdf: row.pin_kdf,
                        pinLength: row.pin_length,
                        question: row.recovery_question,
                        answerHash: row.answer_hash,
                        answerSalt: row.answer_salt,
                        answerKdf: row.answer_kdf,
                        failures: row.failures,
                        cooldownLevel: row.cooldown_level,
                        lockedUntil: row.locked_until,
                        biometricEnabled: Boolean(row.biometric_enabled),
                        autoLockDelay: row.auto_lock_delay,
                        requireDeleteAuth: Boolean(row.require_delete_auth),
                    };
                    setStored(loaded);
                    if (
                        row.pin_kdf === "legacy_sha256" ||
                        row.answer_kdf === "legacy_sha256"
                    ) {
                        await retainLegacyVerifiers(loaded);
                    } else {
                        await SecureStore.deleteItemAsync(STORAGE_KEY);
                    }
                    setIsLocked(true);
                    return;
                }
                const legacyValue =
                    await SecureStore.getItemAsync(STORAGE_KEY);
                if (legacyValue) {
                    const legacy = JSON.parse(legacyValue) as StoredPasscode;
                    const migrated = {
                        ...legacy,
                        pinKdf: "legacy_sha256" as const,
                        answerKdf: "legacy_sha256" as const,
                    };
                    await persist(migrated);
                    await retainLegacyVerifiers(migrated);
                    setIsLocked(true);
                }
            } catch (error) {
                console.error("Failed to load passcode", error);
            } finally {
                setIsReady(true);
            }
        };
        load();
    }, [db, isSupported, persist]);

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
        const scheduleLock = (respectSuspension = true) => {
            if (
                stored &&
                (!respectSuspension || !autoLockSuspended.current) &&
                !biometricPromptActive.current
            ) {
                lockOnNextActive.current = true;
                lockScheduledAt.current ??= Date.now();
                if (!respectSuspension) {
                    forceLockOnNextActive.current = true;
                }
            }
        };

        const applyScheduledLock = () => {
            refreshBiometricAvailability();
            if (
                lockOnNextActive.current &&
                stored &&
                (!autoLockSuspended.current || forceLockOnNextActive.current) &&
                !biometricPromptActive.current
            ) {
                const delay = stored.autoLockDelay ?? 0;
                const elapsed =
                    Date.now() - (lockScheduledAt.current ?? Date.now());
                lockOnNextActive.current = false;
                forceLockOnNextActive.current = false;
                lockScheduledAt.current = null;
                if (elapsed >= delay) {
                    setIsLocked(true);
                }
            }
        };

        const changeSubscription = AppState.addEventListener(
            "change",
            (nextState) => {
                const leavingForeground =
                    nextState !== "active" && appState.current !== nextState;

                if (leavingForeground) scheduleLock(false);
                if (nextState === "active") applyScheduledLock();
                appState.current = nextState;
            },
        );

        const blurSubscription =
            Platform.OS === "android"
                ? AppState.addEventListener("blur", () => scheduleLock())
                : null;
        const focusSubscription =
            Platform.OS === "android"
                ? AppState.addEventListener("focus", applyScheduledLock)
                : null;

        return () => {
            changeSubscription.remove();
            blurSubscription?.remove();
            focusSubscription?.remove();
        };
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
        await persist({
            ...stored,
            failures: 0,
            cooldownLevel: 0,
            lockedUntil: 0,
        });
    }, [persist, stored]);

    const setupPasscode = useCallback(
        async (
            pin: string,
            pinLength: PasscodeLength,
            question: string,
            answer: string,
        ) => {
            if (pinLength !== 6 || pin.length !== 6) {
                throw new Error("New PINs must contain exactly 6 digits");
            }
            const pinSalt = await createSalt();
            const answerSalt = await createSalt();
            await persist({
                pinHash: await hashStrongValue(pin, pinSalt),
                pinSalt,
                pinKdf: "argon2id",
                pinLength,
                question: question.trim(),
                answerHash: await hashStrongValue(
                    normalizeAnswer(answer),
                    answerSalt,
                ),
                answerSalt,
                answerKdf: "argon2id",
                failures: 0,
                cooldownLevel: 0,
                lockedUntil: 0,
                biometricEnabled: false,
                autoLockDelay: 0,
                requireDeleteAuth: false,
            });
            setIsLocked(false);
        },
        [persist],
    );

    const verifyPin = useCallback(
        async (pin: string): Promise<OperationResult> => {
            if (!stored || Date.now() < stored.lockedUntil) {
                return { success: false, cooldownUntil: stored?.lockedUntil };
            }
            const pinKdf = stored.pinKdf ?? "legacy_sha256";
            const matches = await verifyValue(
                pin,
                stored.pinSalt,
                stored.pinHash,
                pinKdf,
            );
            if (!matches) return registerFailure();
            if (pinKdf === "legacy_sha256") {
                const pinSalt = await createSalt();
                await persist({
                    ...stored,
                    pinHash: await hashStrongValue(pin, pinSalt),
                    pinSalt,
                    pinKdf: "argon2id",
                    failures: 0,
                    cooldownLevel: 0,
                    lockedUntil: 0,
                });
            } else {
                await clearFailures();
            }
            setIsLocked(false);
            return { success: true };
        },
        [clearFailures, persist, registerFailure, stored],
    );

    const verifyRecoveryAnswer = useCallback(
        async (answer: string): Promise<OperationResult> => {
            if (!stored || Date.now() < stored.lockedUntil) {
                return { success: false, cooldownUntil: stored?.lockedUntil };
            }
            const answerKdf = stored.answerKdf ?? "legacy_sha256";
            const normalized = normalizeAnswer(answer);
            const matches = await verifyValue(
                normalized,
                stored.answerSalt,
                stored.answerHash,
                answerKdf,
            );
            if (!matches) return registerFailure();
            if (answerKdf === "legacy_sha256") {
                const answerSalt = await createSalt();
                await persist({
                    ...stored,
                    answerHash: await hashStrongValue(normalized, answerSalt),
                    answerSalt,
                    answerKdf: "argon2id",
                    failures: 0,
                    cooldownLevel: 0,
                    lockedUntil: 0,
                });
            } else {
                await clearFailures();
            }
            return { success: true };
        },
        [clearFailures, persist, registerFailure, stored],
    );

    const resetPinAfterRecovery = useCallback(
        async (pin: string, pinLength: PasscodeLength) => {
            if (!stored) return;
            if (pinLength !== 6 || pin.length !== 6) {
                throw new Error("New PINs must contain exactly 6 digits");
            }
            const pinSalt = await createSalt();
            await persist({
                ...stored,
                pinHash: await hashStrongValue(pin, pinSalt),
                pinSalt,
                pinKdf: "argon2id",
                pinLength,
                failures: 0,
                cooldownLevel: 0,
                lockedUntil: 0,
            });
            setIsLocked(false);
        },
        [persist, stored],
    );

    const changePin = useCallback(
        async (
            currentPin: string,
            newPin: string,
            pinLength: PasscodeLength,
            question: string,
            answer?: string,
        ): Promise<OperationResult> => {
            const result = await verifyPin(currentPin);
            if (!result.success || !stored) return result;
            if (pinLength !== 6 || newPin.length !== 6) {
                throw new Error("New PINs must contain exactly 6 digits");
            }
            const pinSalt = await createSalt();
            const hasNewAnswer = Boolean(answer?.trim());
            const answerSalt = hasNewAnswer
                ? await createSalt()
                : stored.answerSalt;
            await persist({
                ...stored,
                pinHash: await hashStrongValue(newPin, pinSalt),
                pinSalt,
                pinKdf: "argon2id",
                pinLength,
                question: question.trim(),
                answerHash: hasNewAnswer
                    ? await hashStrongValue(
                          normalizeAnswer(answer!),
                          answerSalt,
                      )
                    : stored.answerHash,
                answerSalt,
                answerKdf: hasNewAnswer ? "argon2id" : stored.answerKdf,
                failures: 0,
                cooldownLevel: 0,
                lockedUntil: 0,
            });
            return { success: true };
        },
        [persist, stored, verifyPin],
    );

    const disablePasscode = useCallback(
        async (currentPin: string): Promise<OperationResult> => {
            const result = await verifyPin(currentPin);
            if (!result.success) return result;
            await persist(null);
            setIsLocked(false);
            return { success: true };
        },
        [persist, verifyPin],
    );

    const runBiometricPrompt = useCallback(
        async (
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
        },
        [],
    );

    const authenticateWithBiometrics = useCallback(
        async (promptMessage?: string): Promise<BiometricOperationResult> => {
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
        },
        [biometricAvailable, persist, runBiometricPrompt, stored],
    );

    const setBiometricEnabled = useCallback(
        async (
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
        },
        [persist, refreshBiometricAvailability, runBiometricPrompt, stored],
    );

    const setAutoLockSuspended = useCallback((suspended: boolean) => {
        autoLockSuspended.current = suspended;
        if (suspended && !forceLockOnNextActive.current) {
            lockOnNextActive.current = false;
            lockScheduledAt.current = null;
        }
    }, []);

    const setAutoLockDelay = useCallback(
        async (delay: AutoLockDelay) => {
            if (!stored) return;
            await persist({ ...stored, autoLockDelay: delay });
        },
        [persist, stored],
    );

    const setRequireDeleteAuth = useCallback(
        async (enabled: boolean) => {
            if (!stored) return;
            await persist({ ...stored, requireDeleteAuth: enabled });
        },
        [persist, stored],
    );

    const value = useMemo(
        () => ({
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
            autoLockDelay: stored?.autoLockDelay ?? 0,
            requireDeleteAuth: Boolean(stored?.requireDeleteAuth),
            setupPasscode,
            verifyPin,
            verifyRecoveryAnswer,
            resetPinAfterRecovery,
            changePin,
            disablePasscode,
            refreshBiometricAvailability,
            setBiometricEnabled,
            authenticateWithBiometrics,
            setAutoLockSuspended,
            setAutoLockDelay,
            setRequireDeleteAuth,
        }),
        [
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
            setAutoLockSuspended,
            setAutoLockDelay,
            setRequireDeleteAuth,
            setBiometricEnabled,
            setupPasscode,
            stored,
            verifyPin,
            verifyRecoveryAnswer,
        ],
    );

    return (
        <PasscodeContext.Provider value={value}>
            {children}
        </PasscodeContext.Provider>
    );
};

export const usePasscode = () => {
    const context = useContext(PasscodeContext);
    if (!context)
        throw new Error("usePasscode must be used within PasscodeProvider");
    return context;
};
