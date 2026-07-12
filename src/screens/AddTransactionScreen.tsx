import { Ionicons } from "@expo/vector-icons";
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    BackHandler,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalculatorKeyboard, LoadingScreen, Typography } from "../components";
import { Spacing } from "../constants";
import { useCustomerById } from "../hooks";
import { useTransactions } from "../hooks/useTransactions";
import { CustomerId, TransactionId, TransactionType } from "../models";
import { TransactionService } from "../services/TransactionService";
import { useDatabaseContext, useTheme } from "../store";
import { formatCurrency, toInteger } from "../utils/currencyUtils";
import { deleteFromStorage, saveToPermanentStorage } from "../utils/fileUtils";

export const AddTransactionScreen: React.FC = () => {
    const { customerId, type, transactionId } = useLocalSearchParams<{
        customerId: string;
        type: string;
        transactionId: string;
    }>();
    const { db } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();

    const { customer, loading: customerLoading } = useCustomerById(
        db,
        parseInt(customerId || "0") as CustomerId,
    );
    const { createTransaction, updateTransaction, fetchTransactionsByAccount } =
        useTransactions(db);

    const isReceive = type === "receive";

    const [amountState, setAmountState] = useState({
        amount: 0,
        displayAmount: "",
        previewAmount: null as string | null,
    });
    const { amount, displayAmount, previewAmount } = amountState;
    const [description, setDescription] = useState("");
    const [descFocused, setDescFocused] = useState(false);
    const [nativeKeyboardVisible, setNativeKeyboardVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    const [imageUri, setImageUri] = useState<string | null>(null);

    const audioRecorder = useAudioRecorder({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
    });
    const recorderState = useAudioRecorderState(audioRecorder, 60);

    type VoiceState = "idle" | "recording" | "playback";
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    const [voiceUri, setVoiceUri] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
    const [voiceDuration, setVoiceDuration] = useState(0);
    const [micLevel, setMicLevel] = useState(0);
    // waveformHistory keeps the last N mic levels to draw a scrolling waveform
    const waveformHistory = useRef<number[]>(new Array(30).fill(0));
    const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );

    const originalImageUri = useRef<string | null>(null);
    const originalVoiceUri = useRef<string | null>(null);

    const isEditing = Boolean(transactionId);
    const [transactionLoading, setTransactionLoading] = useState(isEditing);
    const transactionService = useMemo(
        () => (db ? new TransactionService(db) : null),
        [db],
    );

    useEffect(() => {
        if (!isEditing || !transactionService) return;

        let cancelled = false;
        const load = async () => {
            setTransactionLoading(true);
            try {
                const tx = await transactionService.getTransactionById(
                    parseInt(transactionId, 10) as TransactionId,
                );
                if (!tx || cancelled) return;

                setDescription(tx.description || "");
                setImageUri(tx.image_uri || null);
                setVoiceUri(tx.voice_uri || null);
                originalImageUri.current = tx.image_uri || null;
                originalVoiceUri.current = tx.voice_uri || null;
                if (tx.voice_uri) {
                    setVoiceState("playback");
                }
                const parsed = parseFloat((tx.amount / 100).toFixed(2));
                setAmountState({
                    amount: parsed,
                    displayAmount: parsed.toLocaleString("en-PK"),
                    previewAmount: null,
                });
            } catch {
                Alert.alert(
                    t("addTransaction.error"),
                    t("addTransaction.loadError"),
                );
            } finally {
                setTransactionLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [isEditing, transactionId, transactionService]);

    useEffect(() => {
        if (!descFocused) return;

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                Keyboard.dismiss();
                return true;
            },
        );

        return () => subscription.remove();
    }, [descFocused]);

    useEffect(() => {
        const showEvent =
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const showSubscription = Keyboard.addListener(showEvent, () => {
            setNativeKeyboardVisible(true);
        });
        const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
            setNativeKeyboardVisible(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [descFocused]);

    const previousVoiceState = useRef<VoiceState>(voiceState);
    useEffect(() => {
        if (previousVoiceState.current !== voiceState) {
            LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
            );
            previousVoiceState.current = voiceState;
        }
    }, [voiceState]);

    const voicePlayer = useAudioPlayer(voiceUri ? { uri: voiceUri } : null);
    const playerStatus = useAudioPlayerStatus(voicePlayer);

    useEffect(() => {
        if (voiceState === "recording" && recorderState.metering != null) {
            const level = Math.min(
                1,
                Math.max(0, (recorderState.metering + 160) / 160),
            );
            setMicLevel(level);
            waveformHistory.current = [
                ...waveformHistory.current.slice(1),
                level,
            ];
        } else if (voiceState !== "recording") {
            setMicLevel(0);
        }
    }, [recorderState.metering, voiceState]);

    useEffect(() => {
        if (isPlaying && playerStatus) {
            if (playerStatus.duration > 0) {
                setPlaybackProgress(
                    playerStatus.currentTime / playerStatus.duration,
                );
                setPlaybackCurrentTime(playerStatus.currentTime);
                setVoiceDuration(playerStatus.duration);
            }
            if (playerStatus.didJustFinish) {
                setIsPlaying(false);
                setPlaybackProgress(0);
                setPlaybackCurrentTime(0);
            }
        }
    }, [playerStatus, isPlaying]);

    const currentBalance = customer?.accounts?.[0]?.current_balance || 0;
    const creditLimit = customer?.accounts?.[0]?.credit_limit || 0;

    const handleAmountChange = useCallback(
        (val: number, dsp: string, prev: string | null) => {
            setAmountState((current) => {
                if (
                    current.amount === val &&
                    current.displayAmount === dsp &&
                    current.previewAmount === prev
                ) {
                    return current;
                }

                return {
                    amount: val,
                    displayAmount: dsp,
                    previewAmount: prev,
                };
            });
        },
        [],
    );

    const pickFromCamera = async () => {
        try {
            const { status } =
                await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    t("addCustomer.permissionRequired"),
                    t("addCustomer.cameraPermission"),
                );
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
            }
        } finally {
        }
    };

    const pickFromGallery = async () => {
        try {
            const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    t("addCustomer.permissionRequired"),
                    t("addCustomer.galleryPermission"),
                );
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
            }
        } finally {
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            t("addCustomer.selectPhoto"),
            t("addCustomer.selectPhotoMessage"),
            [
                {
                    text: t("addCustomer.cancel"),
                    style: "cancel",
                },
                { text: t("addCustomer.camera"), onPress: pickFromCamera },
                { text: t("addCustomer.gallery"), onPress: pickFromGallery },
            ],
            {},
        );
    };

    const startRecording = async () => {
        try {
            const permission = await requestRecordingPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(
                    t("addTransaction.micPermissionRequired"),
                    t("addTransaction.micPermissionMessage"),
                );
                return;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            waveformHistory.current = new Array(30).fill(0);
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
            setVoiceState("recording");
            setVoiceUri(null);
            setRecordingDuration(0);
            durationTimerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Could not start recording", error);
            Alert.alert(
                t("addTransaction.error"),
                t("addTransaction.startRecordError"),
            );
        }
    };

    const stopRecording = async () => {
        try {
            await audioRecorder.stop();
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            const uri = audioRecorder.uri ?? null;
            setVoiceUri(uri);
            setVoiceState(uri ? "playback" : "idle");
            setPlaybackProgress(0);
            setPlaybackCurrentTime(0);
        } catch {
            Alert.alert(
                t("addTransaction.error"),
                t("addTransaction.stopRecordError"),
            );
        } finally {
        }
    };

    const discardRecording = async () => {
        try {
            if (voiceState === "recording") {
                await audioRecorder.stop();
                if (durationTimerRef.current) {
                    clearInterval(durationTimerRef.current);
                    durationTimerRef.current = null;
                }
            } else {
                voicePlayer.pause();
            }
        } catch {
            // ignore
        }
        setVoiceUri(null);
        setVoiceState("idle");
        setIsPlaying(false);
        setPlaybackProgress(0);
        setPlaybackCurrentTime(0);
        setRecordingDuration(0);
        waveformHistory.current = new Array(30).fill(0);
    };

    const playVoice = () => {
        if (isPlaying) {
            voicePlayer.pause();
            setIsPlaying(false);
        } else {
            voicePlayer.play();
            setIsPlaying(true);
        }
    };

    const stopPlayback = () => {
        voicePlayer.pause();
        voicePlayer.seekTo(0);
        setIsPlaying(false);
        setPlaybackProgress(0);
        setPlaybackCurrentTime(0);
    };

    const handleSave = useCallback(async () => {
        if (!customer?.accounts?.[0]?.id || amount <= 0 || saving) return;
        setSaving(true);

        const accountId = customer.accounts[0].id;
        const transactionType = isReceive
            ? TransactionType.CREDIT
            : TransactionType.DEBIT;
        const transactionAmount = toInteger(amount);

        if (
            !isEditing &&
            transactionType === TransactionType.DEBIT &&
            creditLimit > 0
        ) {
            const newBalance = currentBalance + transactionAmount;
            if (newBalance > creditLimit) {
                const remaining = Math.max(0, creditLimit - currentBalance);
                Alert.alert(
                    t("addTransaction.creditLimitExceeded"),
                    `${t("addTransaction.transactionCannotBeCompleted")}\n\n` +
                        `${t("addTransaction.creditLimit")}: ${formatCurrency(creditLimit)}\n` +
                        `${t("addTransaction.currentBalance")}: ${formatCurrency(currentBalance)}\n` +
                        `${t("addTransaction.transactionAmount")}: ${formatCurrency(transactionAmount)}\n` +
                        `${t("addTransaction.newBalanceWouldBe")}: ${formatCurrency(newBalance)}\n\n` +
                        `${t("addTransaction.remainingAvailable")}: ${formatCurrency(remaining)}`,
                    [{ text: t("addTransaction.ok"), style: "cancel" }],
                );
                setSaving(false);
                return;
            }
        }

        try {
            const finalImageUri = await saveToPermanentStorage(imageUri);
            const finalVoiceUri = await saveToPermanentStorage(voiceUri);

            if (isEditing) {
                await updateTransaction(
                    parseInt(transactionId, 10) as TransactionId,
                    {
                        amount: transactionAmount,
                        type: transactionType,
                        description: description || "",
                        image_uri: finalImageUri || "",
                        voice_uri: finalVoiceUri || "",
                    },
                );

                if (
                    originalImageUri.current &&
                    originalImageUri.current !== finalImageUri
                ) {
                    await deleteFromStorage(originalImageUri.current);
                }
                if (
                    originalVoiceUri.current &&
                    originalVoiceUri.current !== finalVoiceUri
                ) {
                    await deleteFromStorage(originalVoiceUri.current);
                }
            } else {
                await createTransaction({
                    account_id: accountId,
                    amount: transactionAmount,
                    type: transactionType,
                    description: description || undefined,
                    image_uri: finalImageUri || undefined,
                    voice_uri: finalVoiceUri || undefined,
                });
            }

            await fetchTransactionsByAccount(accountId);
            router.back();
        } catch {
            Alert.alert(
                t("addTransaction.error"),
                isEditing
                    ? t("addTransaction.updateError")
                    : t("addTransaction.createError"),
            );
        } finally {
            setSaving(false);
        }
    }, [
        customer,
        amount,
        saving,
        isReceive,
        isEditing,
        creditLimit,
        currentBalance,
        description,
        imageUri,
        voiceUri,
        transactionId,
        createTransaction,
        updateTransaction,
        fetchTransactionsByAccount,
        router,
    ]);

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    if (customerLoading || transactionLoading || !customer) {
        return <LoadingScreen />;
    }

    const amountSemanticColor = isReceive ? colors.success : colors.danger;
    const calculatorHidden = descFocused || nativeKeyboardVisible;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top,
                        backgroundColor: colors.background,
                    },
                ]}
            >
                {/* Header */}
                <View
                    style={[
                        styles.header,
                        {
                            marginTop: Spacing.sm,
                            marginHorizontal: Spacing.md,
                            marginBottom: Spacing.sm,
                            borderRadius: 10,
                            overflow: "hidden",
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.06,
                            shadowRadius: 4,
                            elevation: 2,
                        },
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
                            name="chevron-back"
                            size={20}
                            color={colors.primary}
                        />
                    </Pressable>
                    <View style={styles.headerInfo}>
                        <Typography variant="heading-medium" color="primary">
                            {customer.name}
                        </Typography>
                        <Typography variant="body-small" color="muted">
                            {t("customerProfile.currentBalance")}:{" "}
                            <Typography
                                variant="body-small"
                                color={
                                    currentBalance > 0
                                        ? "danger"
                                        : currentBalance < 0
                                          ? "success"
                                          : "muted"
                                }
                            >
                                {formatCurrency(currentBalance)}
                            </Typography>
                        </Typography>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.topContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Amount Display — semantic card matching summary-card language */}
                    <View
                        style={[
                            styles.amountCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: `${amountSemanticColor}30`,
                                shadowColor: amountSemanticColor,
                            },
                        ]}
                    >
                        <Typography
                            variant="heading-large"
                            style={[
                                styles.amountCardValue,
                                { color: amountSemanticColor },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {displayAmount || "0"}
                        </Typography>
                        {previewAmount && (
                            <Typography
                                variant="body-small"
                                color="muted"
                                style={styles.previewText}
                            >
                                = {previewAmount}
                            </Typography>
                        )}
                    </View>

                    {/* Description */}
                    <View style={styles.descriptionActionRow}>
                        <View
                            style={[
                                styles.descRow,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: descFocused
                                        ? `${colors.primary}60`
                                        : colors.border,
                                },
                            ]}
                        >
                            <TextInput
                                style={[
                                    styles.descInput,
                                    { color: colors.text.primary },
                                ]}
                                placeholder={t(
                                    "addTransaction.descriptionPlaceholder",
                                )}
                                placeholderTextColor={colors.text.muted}
                                value={description}
                                onFocus={() => setDescFocused(true)}
                                onBlur={() => setDescFocused(false)}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.attachmentRow}>
                            <Pressable
                                onPressIn={() => {
                                    if (voiceState === "idle" && !voiceUri) {
                                        startRecording();
                                    }
                                }}
                                onPressOut={() => {
                                    if (voiceState === "recording") {
                                        stopRecording();
                                    }
                                }}
                                style={({ pressed }) => [
                                    styles.attachmentButton,
                                    {
                                        backgroundColor:
                                            voiceState === "recording" || pressed
                                                ? `${colors.danger}15`
                                                : colors.surface,
                                        borderColor:
                                            voiceState === "recording" || pressed
                                                ? `${colors.danger}35`
                                                : colors.border,
                                    },
                                    pressed && styles.attachmentButtonPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={t("addTransaction.voice")}
                            >
                                <Ionicons
                                    name={
                                        voiceState === "recording"
                                            ? "mic"
                                            : voiceUri
                                              ? "checkmark-circle"
                                              : "mic-outline"
                                    }
                                    size={20}
                                    color={
                                        voiceState === "recording"
                                            ? colors.danger
                                            : colors.primary
                                    }
                                />
                            </Pressable>

                            <Pressable
                                onPress={showImagePickerOptions}
                                style={({ pressed }) => [
                                    styles.attachmentButton,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: imageUri
                                            ? `${colors.primary}40`
                                            : colors.border,
                                    },
                                    pressed && styles.attachmentButtonPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={t("addTransaction.photo")}
                            >
                                {imageUri ? (
                                    <>
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={styles.attachmentThumb}
                                            contentFit="cover"
                                        />
                                        <Pressable
                                            onPress={(e) => {
                                                e.stopPropagation?.();
                                                setImageUri(null);
                                            }}
                                            hitSlop={8}
                                            style={[
                                                styles.attachmentRemoveButton,
                                                {
                                                    backgroundColor:
                                                        colors.background,
                                                },
                                            ]}
                                            accessibilityRole="button"
                                            accessibilityLabel="Remove photo"
                                        >
                                            <Ionicons
                                                name="close-circle"
                                                size={16}
                                                color={colors.danger}
                                            />
                                        </Pressable>
                                    </>
                                ) : (
                                    <Ionicons
                                        name="camera-outline"
                                        size={20}
                                        color={colors.primary}
                                    />
                                )}
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>

                <View
                    style={[
                        {
                            borderTopColor: colors.border,
                            paddingBottom: calculatorHidden
                                ? Spacing.sm
                                : Math.max(insets.bottom, Spacing.sm) +
                                  Spacing.sm,
                        },
                    ]}
                >
                    {/* Voice Note bars */}
                    {voiceState === "recording" && (
                        <View
                            style={[
                                styles.voiceBar,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: `${colors.danger}30`,
                                    marginHorizontal: Spacing.md,
                                    marginBottom: Spacing.md,
                                },
                            ]}
                        >
                            {/* Discard */}
                            <Pressable onPress={discardRecording} hitSlop={10}>
                                <Ionicons
                                    name="trash-outline"
                                    size={20}
                                    color={colors.text.muted}
                                />
                            </Pressable>

                            {/* Pulsing red dot + timer */}
                            <View style={styles.voiceRecordingLeft}>
                                <View
                                    style={[
                                        styles.recDot,
                                        { backgroundColor: colors.danger },
                                    ]}
                                />
                                <Typography
                                    variant="small-small"
                                    style={[
                                        styles.voiceTimer,
                                        { color: colors.danger },
                                    ]}
                                >
                                    {formatDuration(recordingDuration)}
                                </Typography>
                            </View>

                            {/* Live waveform */}
                            <View style={styles.voiceLiveWaveform}>
                                {waveformHistory.current.map((lvl, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.voiceWaveBar,
                                            {
                                                backgroundColor: colors.primary,
                                                height: Math.max(3, lvl * 28),
                                                opacity: 0.4 + lvl * 0.6,
                                            },
                                        ]}
                                    />
                                ))}
                            </View>

                            {/* Stop → goes to playback */}
                            <Pressable
                                onPress={stopRecording}
                                hitSlop={10}
                                style={[
                                    styles.voiceCircleBtn,
                                    { backgroundColor: colors.danger },
                                ]}
                            >
                                <Ionicons name="stop" size={16} color="#fff" />
                            </Pressable>
                        </View>
                    )}

                    {voiceState === "playback" && (
                        <View
                            style={[
                                styles.voiceBar,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: `${colors.primary}30`,
                                    marginHorizontal: Spacing.md,
                                    marginBottom: Spacing.md,
                                },
                            ]}
                        >
                            {/* Play / Pause */}
                            <Pressable
                                onPress={playVoice}
                                style={[
                                    styles.voiceCircleBtn,
                                    { backgroundColor: colors.primary },
                                ]}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={16}
                                    color="#fff"
                                />
                            </Pressable>

                            {/* Scrubber waveform */}
                            <View style={styles.voiceScrubberTrack}>
                                <View
                                    style={[
                                        styles.voiceScrubberFill,
                                        {
                                            width: `${playbackProgress * 100}%`,
                                            backgroundColor: colors.primary,
                                        },
                                    ]}
                                />
                                <View
                                    style={[
                                        styles.voiceScrubberThumb,
                                        {
                                            left: `${playbackProgress * 100}%`,
                                            backgroundColor: colors.primary,
                                        },
                                    ]}
                                />
                            </View>

                            {/* Time */}
                            <Typography
                                variant="small-small"
                                color="muted"
                                style={styles.voiceTimer}
                            >
                                {isPlaying
                                    ? formatDuration(
                                          Math.floor(playbackCurrentTime),
                                      )
                                    : formatDuration(Math.round(voiceDuration))}
                            </Typography>

                            {/* Discard */}
                            <Pressable onPress={discardRecording} hitSlop={10}>
                                <Ionicons
                                    name="close-circle-outline"
                                    size={20}
                                    color={colors.text.muted}
                                />
                            </Pressable>
                        </View>
                    )}

                    {/* Save Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.saveButton,
                            {
                                marginHorizontal: Spacing.md,
                                marginBottom: Spacing.md,
                            },
                            {
                                backgroundColor: amountSemanticColor,
                                shadowColor: amountSemanticColor,
                                opacity:
                                    amount <= 0 || saving
                                        ? 0.5
                                        : pressed
                                          ? 0.9
                                          : 1,
                            },
                        ]}
                        onPress={handleSave}
                        disabled={amount <= 0 || saving}
                    >
                        <Typography
                            variant="body-medium"
                            color="primary"
                            style={[
                                styles.saveButtonText,
                                { color: "#FFFFFF" },
                            ]}
                        >
                            {saving
                                ? isEditing
                                    ? t("addTransaction.updating")
                                    : t("addTransaction.saving")
                                : isEditing
                                  ? t("addTransaction.update")
                                  : isReceive
                                    ? t("addTransaction.saveReceipt")
                                    : t("addTransaction.savePayment")}
                        </Typography>
                    </Pressable>

                    {/* Calculator Keyboard */}
                    <CalculatorKeyboard
                        hidden={calculatorHidden}
                        onAmountChange={handleAmountChange}
                        initialValue={isEditing ? amount : undefined}
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        gap: Spacing.md,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    headerInfo: { flex: 1 },
    headerSpacer: { width: 44 },
    // ── Amount card — semantic card matching CustomersScreen summary cards ──
    amountCard: {
        marginTop: Spacing.md,
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    amountCardValue: {
        textAlign: "right",
        fontSize: 36,
        fontWeight: "700",
    },
    previewText: {
        textAlign: "right",
        marginTop: Spacing.xs,
    },
    // Description input
    descriptionActionRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    descRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-start",
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
        minHeight: 104,
    },
    descInput: {
        flex: 1,
        fontSize: 15,
        paddingTop: 4,
        minHeight: 78,
    },
    // ── Voice bar (WhatsApp-style) ──
    voiceBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        minHeight: 52,
    },
    voiceCircleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    voiceRecordingLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    recDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    voiceTimer: {
        minWidth: 36,
        fontVariant: ["tabular-nums"],
    },
    voiceLiveWaveform: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        height: 32,
        overflow: "hidden",
    },
    voiceWaveBar: {
        flex: 1,
        borderRadius: 2,
        minHeight: 3,
    },
    voiceScrubberTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: "transparent",
        overflow: "visible",
        position: "relative",
        justifyContent: "center",
    },
    voiceScrubberFill: {
        position: "absolute",
        left: 0,
        height: 4,
        borderRadius: 2,
    },
    voiceScrubberThumb: {
        position: "absolute",
        width: 12,
        height: 12,
        borderRadius: 6,
        marginLeft: -6,
        top: -4,
    },
    attachmentRow: {
        flexDirection: "column",
        gap: Spacing.xs,
        flexShrink: 0,
    },
    attachmentButton: {
        width: 48,
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
    },
    attachmentButtonPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.88,
    },
    attachmentThumb: {
        width: 42,
        height: 42,
        borderRadius: 8,
    },
    attachmentRemoveButton: {
        position: "absolute",
        top: -6,
        right: -6,
        borderRadius: 9,
    },
    saveButton: {
        paddingVertical: Spacing.md,
        borderRadius: 12,
        alignItems: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        fontWeight: "600",
    },
});
