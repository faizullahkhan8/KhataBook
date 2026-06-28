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
import { AppState, AppStateStatus, Platform } from "react-native";
import { ARGON2_PARAMETERS, hashStrongValue } from "../security/kdf";
import { logger } from "../services/LogService";
import { useDatabaseContext } from "./DatabaseContext";

const STORAGE_KEY = "khatabook.passcode";
const FAILURE_LIMIT = 5;

type KdfType = "argon2id" | "legacy_sha256";
export type PasscodeLength = 4 | 6;
type StoredPasscodeLength = PasscodeLength | 8;
export type AutoLockDelay = 3000 | 60_000 | 180_000 | 300_000 | 600_000;

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

    const storedRef = useRef<StoredPasscode | null>(null);
    const autoLockSuspensionCount = useRef(0);
    const biometricPromptActive = useRef(false);
    const biometricAttemptGeneration = useRef<number | null>(null);
    const lockGeneration = useRef(0);
    const lockOnNextActive = useRef(false);
    const forceLockOnNextActive = useRef(false);
    const lockScheduledAt = useRef<number | null>(null);
    const appState = useRef(AppState.currentState);
    const refreshBiometricAvailabilityRef = useRef<() => Promise<boolean>>(
        async () => false,
    );

    const isAutoLockSuspended = () => autoLockSuspensionCount.current > 0;

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

            storedRef.current = next;
            setStored(next);
        },
        [db, isSupported],
    );

    useEffect(() => {
        storedRef.current = stored;
    }, [stored]);

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
                    const loaded: StoredPasscode = {
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

                    storedRef.current = loaded;
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

                const legacyValue = await SecureStore.getItemAsync(STORAGE_KEY);

                if (legacyValue) {
                    const legacy = JSON.parse(legacyValue) as StoredPasscode;
                    const migrated: StoredPasscode = {
                        ...legacy,
                        pinKdf: "legacy_sha256",
                        answerKdf: "legacy_sha256",
                    };

                    await persist(migrated);
                    await retainLegacyVerifiers(migrated);
                    setIsLocked(true);
                } else {
                    storedRef.current = null;
                    setStored(null);
                }
            } catch (error) {
                void logger.error("passcode", "Failed to load passcode", error);
            } finally {
                setIsReady(true);
            }
        };

        void load();
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

            const available = hasHardware && isEnrolled;
            setBiometricAvailable(available);
            setBiometricHardwareAvailable(hasHardware);
            setBiometricEnrolled(isEnrolled);
            setBiometricTypes(types);

            const current = storedRef.current;
            if (!available && current?.biometricEnabled) {
                await persist({ ...current, biometricEnabled: false });
            }

            return available;
        } catch (error) {
            void logger.error(
                "security",
                "Failed to check biometric availability",
                error,
            );
            setBiometricAvailable(false);
            setBiometricHardwareAvailable(false);
            setBiometricEnrolled(false);
            setBiometricTypes([]);
            return false;
        }
    }, [isSupported, persist]);

    useEffect(() => {
        refreshBiometricAvailabilityRef.current = refreshBiometricAvailability;
    }, [refreshBiometricAvailability]);

    const clearScheduledLock = useCallback(() => {
        lockOnNextActive.current = false;
        forceLockOnNextActive.current = false;
        lockScheduledAt.current = null;
    }, []);

    const scheduleLock = useCallback((force: boolean) => {
        const current = storedRef.current;
        if (!current) return;

        if (
            !force &&
            (isAutoLockSuspended() || biometricPromptActive.current)
        ) {
            return;
        }

        if (force) {
            if (!forceLockOnNextActive.current) {
                lockGeneration.current += 1;
            }
            forceLockOnNextActive.current = true;
        }

        lockOnNextActive.current = true;
        lockScheduledAt.current ??= Date.now();

        if (force && (current.autoLockDelay ?? 0) === 0) {
            setIsLocked(true);
        }
    }, []);

    const applyScheduledLock = useCallback(() => {
        void refreshBiometricAvailabilityRef.current();

        const current = storedRef.current;
        if (!current) {
            clearScheduledLock();
            return;
        }

        if (!lockOnNextActive.current || biometricPromptActive.current) {
            return;
        }

        if (isAutoLockSuspended() && !forceLockOnNextActive.current) {
            return;
        }

        const delay = current.autoLockDelay ?? 0;
        const elapsed = Date.now() - (lockScheduledAt.current ?? Date.now());
        const shouldLock = elapsed >= delay;

        clearScheduledLock();

        if (shouldLock) {
            setIsLocked(true);
        }
    }, [clearScheduledLock]);

    const isUnlockAttemptCurrent = useCallback((generation: number) => {
        return (
            generation === lockGeneration.current &&
            AppState.currentState === "active" &&
            !lockOnNextActive.current
        );
    }, []);

    useEffect(() => {
        if (!isSupported) return;

        const cancelAndroidBiometricPrompt = () => {
            if (Platform.OS === "android" && biometricPromptActive.current) {
                void LocalAuthentication.cancelAuthenticate().catch((error) => {
                    void logger.error(
                        "security",
                        "Failed to cancel biometric authentication",
                        error,
                    );
                });
            }
        };

        const handleAppStateChange = (nextState: AppStateStatus) => {
            const previousState = appState.current;
            appState.current = nextState;

            if (nextState === "background") {
                scheduleLock(true);
                cancelAndroidBiometricPrompt();
                return;
            }

            if (
                nextState === "inactive" &&
                previousState === "active" &&
                !biometricPromptActive.current
            ) {
                // Use force=false when auto-lock is suspended: the inactive
                // transition is likely caused by an in-app Alert or system
                // sheet (image picker, permission dialog), not a real app
                // backgrounding. force=true bypasses the suspension check
                // and locks the app even though the user never left it.
                scheduleLock(!isAutoLockSuspended());
                return;
            }

            if (nextState === "active") {
                applyScheduledLock();
            }
        };

        const changeSubscription = AppState.addEventListener(
            "change",
            handleAppStateChange,
        );

        const blurSubscription =
            Platform.OS === "android"
                ? AppState.addEventListener("blur", () => {
                      if (AppState.currentState !== "active") {
                          scheduleLock(true);
                          cancelAndroidBiometricPrompt();
                          return;
                      }

                      scheduleLock(false);
                  })
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
    }, [applyScheduledLock, isSupported, scheduleLock]);

    useEffect(() => {
        if (isReady) {
            void refreshBiometricAvailability();
        }
    }, [isReady, refreshBiometricAvailability]);

    const registerFailure = useCallback(async (): Promise<OperationResult> => {
        const current = storedRef.current;
        if (!current) return { success: false };

        const failures = current.failures + 1;
        const reachedLimit = failures >= FAILURE_LIMIT;
        const cooldownLevel = reachedLimit
            ? current.cooldownLevel + 1
            : current.cooldownLevel;
        const lockedUntil = reachedLimit
            ? Date.now() + 30_000 * cooldownLevel
            : current.lockedUntil;

        await persist({
            ...current,
            failures: reachedLimit ? 0 : failures,
            cooldownLevel,
            lockedUntil,
        });

        void logger.warning("passcode", "Incorrect passcode attempt", {
            failures: reachedLimit ? FAILURE_LIMIT : failures,
            cooldownLevel,
            lockedUntil,
        });

        return { success: false, cooldownUntil: lockedUntil };
    }, [persist]);

    const clearFailures = useCallback(async () => {
        const current = storedRef.current;
        if (!current) return;

        await persist({
            ...current,
            failures: 0,
            cooldownLevel: 0,
            lockedUntil: 0,
        });
    }, [persist]);

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

            const attemptGeneration = lockGeneration.current;
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
                autoLockDelay: 3000,
                requireDeleteAuth: false,
            });

            setIsLocked(!isUnlockAttemptCurrent(attemptGeneration));
            void logger.info("passcode", "Passcode set up successfully");
        },
        [isUnlockAttemptCurrent, persist],
    );

    const verifyPin = useCallback(
        async (pin: string): Promise<OperationResult> => {
            const current = storedRef.current;
            if (!current || Date.now() < current.lockedUntil) {
                return {
                    success: false,
                    cooldownUntil: current?.lockedUntil,
                };
            }

            const attemptGeneration = lockGeneration.current;
            const pinKdf = current.pinKdf ?? "legacy_sha256";
            const matches = await verifyValue(
                pin,
                current.pinSalt,
                current.pinHash,
                pinKdf,
            );

            if (!matches) return registerFailure();

            if (pinKdf === "legacy_sha256") {
                const pinSalt = await createSalt();
                const latest = storedRef.current;
                if (!latest) return { success: false };

                await persist({
                    ...latest,
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

            if (!isUnlockAttemptCurrent(attemptGeneration)) {
                return { success: false };
            }

            void logger.info("passcode", "Passcode verified successfully");
            setIsLocked(false);
            return { success: true };
        },
        [clearFailures, isUnlockAttemptCurrent, persist, registerFailure],
    );

    const verifyRecoveryAnswer = useCallback(
        async (answer: string): Promise<OperationResult> => {
            const current = storedRef.current;
            if (!current || Date.now() < current.lockedUntil) {
                return {
                    success: false,
                    cooldownUntil: current?.lockedUntil,
                };
            }

            const attemptGeneration = lockGeneration.current;
            const answerKdf = current.answerKdf ?? "legacy_sha256";
            const normalized = normalizeAnswer(answer);
            const matches = await verifyValue(
                normalized,
                current.answerSalt,
                current.answerHash,
                answerKdf,
            );

            if (!matches) return registerFailure();

            if (answerKdf === "legacy_sha256") {
                const answerSalt = await createSalt();
                const latest = storedRef.current;
                if (!latest) return { success: false };

                await persist({
                    ...latest,
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

            if (!isUnlockAttemptCurrent(attemptGeneration)) {
                return { success: false };
            }

            void logger.info(
                "passcode",
                "Recovery answer verified successfully",
            );
            return { success: true };
        },
        [clearFailures, isUnlockAttemptCurrent, persist, registerFailure],
    );

    const resetPinAfterRecovery = useCallback(
        async (pin: string, pinLength: PasscodeLength) => {
            const current = storedRef.current;
            if (!current) return;
            if (pinLength !== 6 || pin.length !== 6) {
                throw new Error("New PINs must contain exactly 6 digits");
            }

            const attemptGeneration = lockGeneration.current;
            const pinSalt = await createSalt();
            const latest = storedRef.current;
            if (!latest) return;

            await persist({
                ...latest,
                pinHash: await hashStrongValue(pin, pinSalt),
                pinSalt,
                pinKdf: "argon2id",
                pinLength,
                failures: 0,
                cooldownLevel: 0,
                lockedUntil: 0,
            });

            setIsLocked(!isUnlockAttemptCurrent(attemptGeneration));
        },
        [isUnlockAttemptCurrent, persist],
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
            const current = storedRef.current;
            if (!result.success || !current) return result;
            if (pinLength !== 6 || newPin.length !== 6) {
                throw new Error("New PINs must contain exactly 6 digits");
            }

            const pinSalt = await createSalt();
            const hasNewAnswer = Boolean(answer?.trim());
            const answerSalt = hasNewAnswer
                ? await createSalt()
                : current.answerSalt;
            const latest = storedRef.current;
            if (!latest) return { success: false };

            await persist({
                ...latest,
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
                    : latest.answerHash,
                answerSalt,
                answerKdf: hasNewAnswer ? "argon2id" : latest.answerKdf,
                failures: 0,
                cooldownLevel: 0,
                lockedUntil: 0,
            });

            return { success: true };
        },
        [persist, verifyPin],
    );

    const disablePasscode = useCallback(
        async (currentPin: string): Promise<OperationResult> => {
            const result = await verifyPin(currentPin);
            if (!result.success) return result;

            await persist(null);
            clearScheduledLock();
            setIsLocked(false);
            void logger.info("passcode", "Passcode disabled");
            return { success: true };
        },
        [clearScheduledLock, persist, verifyPin],
    );

    const runBiometricPrompt = useCallback(
        async (
            promptMessage = "Unlock KhataBook",
        ): Promise<BiometricOperationResult> => {
            if (biometricPromptActive.current) {
                return { success: false, error: "not_available" };
            }

            const attemptGeneration = lockGeneration.current;
            biometricAttemptGeneration.current = attemptGeneration;
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
                    const isCurrentAttempt =
                        biometricAttemptGeneration.current ===
                            attemptGeneration &&
                        isUnlockAttemptCurrent(attemptGeneration);

                    if (!isCurrentAttempt) {
                        return { success: false, error: "app_cancel" };
                    }

                    void logger.info(
                        "security",
                        "Biometric authentication succeeded",
                    );
                    setIsLocked(false);
                    return { success: true };
                }

                void logger.warning(
                    "security",
                    "Biometric authentication failed",
                    { error: result.error },
                );
                return { success: false, error: result.error };
            } catch (error) {
                void logger.error(
                    "security",
                    "Biometric authentication failed",
                    error,
                );
                return { success: false, error: "unknown" };
            } finally {
                biometricAttemptGeneration.current = null;
                biometricPromptActive.current = false;
                setIsBiometricAuthenticating(false);

                if (AppState.currentState === "active") {
                    applyScheduledLock();
                }
            }
        },
        [applyScheduledLock, isUnlockAttemptCurrent],
    );

    const authenticateWithBiometrics = useCallback(
        async (promptMessage?: string): Promise<BiometricOperationResult> => {
            const current = storedRef.current;
            if (!current?.biometricEnabled || !biometricAvailable) {
                return { success: false, error: "not_available" };
            }

            const result = await runBiometricPrompt(promptMessage);

            if (
                !result.success &&
                (result.error === "not_enrolled" ||
                    result.error === "passcode_not_set")
            ) {
                const latest = storedRef.current;
                if (latest) {
                    await persist({ ...latest, biometricEnabled: false });
                }
            }

            return result;
        },
        [biometricAvailable, persist, runBiometricPrompt],
    );

    const setBiometricEnabled = useCallback(
        async (
            enabled: boolean,
            promptMessage?: string,
        ): Promise<BiometricOperationResult> => {
            const current = storedRef.current;
            if (!current) {
                return { success: false, error: "not_available" };
            }

            if (!enabled) {
                await persist({ ...current, biometricEnabled: false });
                void logger.info(
                    "security",
                    "Biometric authentication disabled",
                );
                return { success: true };
            }

            const available = await refreshBiometricAvailability();
            if (!available) {
                return { success: false, error: "not_available" };
            }

            const result = await runBiometricPrompt(promptMessage);
            if (!result.success) return result;

            const latest = storedRef.current;
            if (!latest) {
                return { success: false, error: "not_available" };
            }

            await persist({ ...latest, biometricEnabled: true });
            void logger.info("security", "Biometric authentication enabled");
            return { success: true };
        },
        [persist, refreshBiometricAvailability, runBiometricPrompt],
    );

    const setAutoLockSuspended = useCallback(
        (suspended: boolean) => {
            if (suspended) {
                autoLockSuspensionCount.current += 1;
                return;
            }

            autoLockSuspensionCount.current = Math.max(
                0,
                autoLockSuspensionCount.current - 1,
            );

            if (
                autoLockSuspensionCount.current === 0 &&
                AppState.currentState === "active"
            ) {
                if (
                    lockOnNextActive.current &&
                    !forceLockOnNextActive.current
                ) {
                    clearScheduledLock();
                    return;
                }

                applyScheduledLock();
            }
        },
        [applyScheduledLock, clearScheduledLock],
    );

    const setAutoLockDelay = useCallback(
        async (delay: AutoLockDelay) => {
            const current = storedRef.current;
            if (!current) return;
            await persist({ ...current, autoLockDelay: delay });
            void logger.info("security", "Auto-lock delay changed", { delay });
        },
        [persist],
    );

    const setRequireDeleteAuth = useCallback(
        async (enabled: boolean) => {
            const current = storedRef.current;
            if (!current) return;
            await persist({ ...current, requireDeleteAuth: enabled });
            void logger.info(
                "security",
                "Delete authentication requirement changed",
                { enabled },
            );
        },
        [persist],
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
            autoLockDelay: stored?.autoLockDelay ?? 3000,
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
            authenticateWithBiometrics,
            biometricAvailable,
            biometricEnrolled,
            biometricHardwareAvailable,
            biometricTypes,
            changePin,
            disablePasscode,
            isBiometricAuthenticating,
            isLocked,
            isReady,
            isSupported,
            refreshBiometricAvailability,
            resetPinAfterRecovery,
            setAutoLockDelay,
            setAutoLockSuspended,
            setBiometricEnabled,
            setRequireDeleteAuth,
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
    if (!context) {
        throw new Error("usePasscode must be used within PasscodeProvider");
    }
    return context;
};
