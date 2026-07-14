import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as MailComposer from "expo-mail-composer";
import { useRouter } from "expo-router";
import * as SMS from "expo-sms";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Input, OptionModal, Typography } from "../components";
import { Spacing } from "../constants";
import { formatLogEntry, logService } from "../services/LogService";
import { useLanguage, useTheme } from "../store";

type FeedbackCategory = "feedback" | "suggestion" | "bug" | "error" | "other";

const CONTACT_PHONE = "923317947676";
const CONTACT_EMAIL = "faizullahofficial0@gmail.com";

const CATEGORIES: FeedbackCategory[] = [
    "feedback",
    "suggestion",
    "bug",
    "error",
    "other",
];

export const FeedbackScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { language } = useLanguage();

    const [category, setCategory] = useState<FeedbackCategory>();
    const [subject, setSubject] = useState("");
    const [details, setDetails] = useState("");
    const [categoryError, setCategoryError] = useState(false);
    const [detailsError, setDetailsError] = useState(false);
    const [includeLogs, setIncludeLogs] = useState(true);
    const [isOpening, setIsOpening] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);

    const diagnosticDetails = useMemo(
        () => [
            `App version: ${Constants.expoConfig?.version ?? "Unknown"}`,
            `Platform: ${Platform.OS}`,
            `OS version: ${String(Platform.Version)}`,
            `Language: ${language}`,
        ],
        [language],
    );

    const buildLogsSection = useCallback(async (compact = false) => {
        const entries = await logService.getLogs();
        if (entries.length === 0) return "";

        if (compact) {
            const counts: Record<string, number> = {};
            for (const entry of entries) {
                const key = `${entry.level}/${entry.category}`;
                counts[key] = (counts[key] || 0) + 1;
            }
            const summary = Object.entries(counts)
                .sort()
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");
            return `\n\nLogs: ${entries.length} total (${summary})`;
        }

        const logText = entries.slice(0, 50).map(formatLogEntry).join("\n");
        return `\n\n---\nRecent logs (latest ${Math.min(50, entries.length)} of ${entries.length}):\n${logText}`;
    }, []);

    const validate = () => {
        const hasCategory = Boolean(category);
        const hasDetails = Boolean(details.trim());
        setCategoryError(!hasCategory);
        setDetailsError(!hasDetails);
        return hasCategory && hasDetails;
    };

    const generateLogFile = async () => {
        if (!includeLogs) return null;
        const entries = await logService.getLogs();
        if (entries.length === 0) return null;

        const logText = entries.map(formatLogEntry).join("\n");
        const directory = FileSystem.cacheDirectory;
        if (!directory) return null;

        const fileUri = directory + "app_logs.txt";
        await FileSystem.writeAsStringAsync(fileUri, logText, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        return fileUri;
    };

    const buildMessage = useCallback(
        async (compactLogs = false, forEmailAttachment = false) => {
            const selectedCategory = category
                ? t(`feedback.categories.${category}`)
                : "";

            let logsSection = "";
            if (includeLogs) {
                if (forEmailAttachment) {
                    logsSection =
                        "\n\n[Diagnostic logs are attached to this email as a file]";
                } else {
                    logsSection = await buildLogsSection(compactLogs);
                }
            }

            return [
                "KhataBook Feedback & Support",
                "",
                `Category: ${selectedCategory}`,
                ...(subject.trim() ? [`Subject: ${subject.trim()}`] : []),
                "",
                "Details:",
                details.trim(),
                "",
                "App information:",
                ...diagnosticDetails,
                logsSection,
            ].join("\n");
        },
        [
            category,
            subject,
            details,
            diagnosticDetails,
            t,
            buildLogsSection,
            includeLogs,
        ],
    );

    const showUnavailable = (platform: string) =>
        Alert.alert(
            t("feedback.unavailableTitle", `${platform} Unavailable`),
            t(
                "feedback.unavailableMessage",
                `We could not open ${platform}. Please ensure the application is installed on your device.`,
            ),
        );

    const openWhatsApp = async () => {
        if (!validate()) return;
        setIsOpening(true);
        try {
            const message = await buildMessage(true, false);
            const url = `whatsapp://send?phone=${CONTACT_PHONE}&text=${encodeURIComponent(message)}`;
            await Linking.openURL(url);
        } catch (error) {
            showUnavailable("WhatsApp");
        } finally {
            setIsOpening(false);
        }
    };

    const openEmail = async () => {
        if (!validate()) return;
        setIsOpening(true);
        try {
            const emailSubject =
                subject.trim() ||
                t("feedback.defaultEmailSubject", {
                    category: category
                        ? t(`feedback.categories.${category}`)
                        : "Feedback",
                });

            try {
                const isAvailable = await MailComposer.isAvailableAsync();
                if (isAvailable) {
                    const logFileUri = await generateLogFile();
                    const message = await buildMessage(false, !!logFileUri);

                    await MailComposer.composeAsync({
                        recipients: [CONTACT_EMAIL],
                        subject: emailSubject,
                        body: message,
                        attachments: logFileUri ? [logFileUri] : undefined,
                    });
                    setIsOpening(false);
                    return;
                }
            } catch (composerError) {}

            const fallbackMessage = await buildMessage(true, false);
            const fallbackUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(fallbackMessage)}`;

            await Linking.openURL(fallbackUrl);
        } catch (error) {
            showUnavailable("Email");
        } finally {
            setIsOpening(false);
        }
    };

    const openSms = async () => {
        if (!validate()) return;
        setIsOpening(true);
        try {
            const message = await buildMessage(true, false);

            try {
                const isAvailable = await SMS.isAvailableAsync();
                if (isAvailable) {
                    await SMS.sendSMSAsync([CONTACT_PHONE], message);
                    setIsOpening(false);
                    return;
                }
            } catch (smsError) {}

            const fallbackUrl = `sms:${CONTACT_PHONE}?body=${encodeURIComponent(message)}`;
            await Linking.openURL(fallbackUrl);
        } catch (error) {
            showUnavailable("SMS");
        } finally {
            setIsOpening(false);
        }
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View
                style={[
                    styles.header,
                    {
                        marginTop: insets.top + Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
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
                    hitSlop={Spacing.md}
                >
                    <Ionicons
                        name="chevron-back"
                        size={20}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography variant="heading-medium">
                    {t("feedback.title")}
                </Typography>
                <View style={{ width: 34 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + Spacing.xl },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets
                >
                    <Typography color="muted">
                        {t("feedback.subtitle")}
                    </Typography>

                    <Card
                        style={[
                            styles.card,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <Typography variant="subheading-small">
                            {t("feedback.category")}
                        </Typography>
                        <View style={styles.categories}>
                            {CATEGORIES.map((item) => {
                                const selected = category === item;
                                const itemColor =
                                    item === "bug"
                                        ? colors.warning
                                        : item === "error"
                                          ? colors.danger
                                          : item === "suggestion"
                                            ? colors.success
                                            : colors.primary;

                                return (
                                    <Pressable
                                        key={item}
                                        onPress={() => {
                                            setCategory(item);
                                            setCategoryError(false);
                                        }}
                                        style={[
                                            styles.category,
                                            {
                                                borderColor: selected
                                                    ? itemColor
                                                    : categoryError
                                                      ? colors.danger
                                                      : colors.border,
                                                backgroundColor: selected
                                                    ? `${itemColor}15`
                                                    : colors.surface,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={
                                                selected
                                                    ? "checkmark-circle"
                                                    : "ellipse-outline"
                                            }
                                            size={16}
                                            color={
                                                selected
                                                    ? itemColor
                                                    : colors.text.muted
                                            }
                                        />
                                        <Typography
                                            variant="body-small"
                                            style={{
                                                color: selected
                                                    ? itemColor
                                                    : colors.text.muted,
                                                fontWeight: selected
                                                    ? "600"
                                                    : "400",
                                            }}
                                        >
                                            {t(`feedback.categories.${item}`)}
                                        </Typography>
                                    </Pressable>
                                );
                            })}
                        </View>
                        {categoryError && (
                            <Typography color="danger" variant="small-small">
                                {t("feedback.categoryRequired")}
                            </Typography>
                        )}

                        <Typography variant="subheading-small">
                            {t("feedback.subject")}
                        </Typography>
                        <Input
                            value={subject}
                            onChangeText={setSubject}
                            placeholder={t("feedback.subjectPlaceholder")}
                        />

                        <Typography variant="subheading-small">
                            {t("feedback.details")}
                        </Typography>
                        <Input
                            value={details}
                            onChangeText={(value) => {
                                setDetails(value);
                                if (value.trim()) setDetailsError(false);
                            }}
                            placeholder={t("feedback.detailsPlaceholder")}
                            multiline
                            error={detailsError}
                            inputStyle={styles.detailsInput}
                        />
                        {detailsError && (
                            <Typography color="danger" variant="small-small">
                                {t("feedback.detailsRequired")}
                            </Typography>
                        )}
                    </Card>

                    <Pressable
                        onPress={() => setIncludeLogs((prev) => !prev)}
                        style={[
                            styles.logsToggle,
                            {
                                backgroundColor: includeLogs
                                    ? `${colors.primary}10`
                                    : colors.surface,
                                borderColor: includeLogs
                                    ? colors.primary
                                    : colors.border,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        <Ionicons
                            name={includeLogs ? "checkbox" : "square-outline"}
                            size={22}
                            color={
                                includeLogs ? colors.primary : colors.text.muted
                            }
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                            <Typography
                                variant="body-small"
                                color="primary"
                                style={styles.logsToggleText}
                            >
                                Include app logs for debugging
                            </Typography>
                            <Typography
                                color="muted"
                                variant="small-small"
                                style={styles.logsNote}
                            >
                                Sensitive data is redacted automatically.
                            </Typography>
                        </View>
                    </Pressable>

                    <Typography color="muted" variant="small-small">
                        {t("feedback.privacyNote")}
                    </Typography>

                    <View style={styles.actions}>
                        <Pressable
                            onPress={() => {
                                if (validate()) {
                                    setShowSendModal(true);
                                }
                            }}
                            disabled={isOpening}
                            style={[
                                styles.colorfulButton,
                                {
                                    backgroundColor: colors.primary,
                                    opacity: isOpening ? 0.6 : 1,
                                },
                            ]}
                        >
                            <Ionicons
                                name="paper-plane"
                                size={20}
                                color="#FFF"
                            />
                            <Typography
                                variant="body-medium"
                                style={styles.colorfulButtonText}
                            >
                                {t("feedback.sendUsing")}
                            </Typography>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <OptionModal
                visible={showSendModal}
                title={t("feedback.sendUsing")}
                options={[
                    {
                        value: "whatsapp",
                        label: t("feedback.whatsapp"),
                        icon: "logo-whatsapp",
                        color: "success",
                    },
                    {
                        value: "email",
                        label: t("feedback.email"),
                        icon: "mail",
                        color: "primary",
                    },
                    {
                        value: "sms",
                        label: t("feedback.sms"),
                        icon: "chatbubble",
                        color: "primary",
                    },
                ]}
                showSelectionIndicator={false}
                onSelect={(value) => {
                    setShowSendModal(false);
                    setTimeout(() => {
                        if (value === "whatsapp") {
                            void openWhatsApp();
                        } else if (value === "email") {
                            void openEmail();
                        } else {
                            void openSms();
                        }
                    }, 350);
                }}
                onClose={() => setShowSendModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    content: { flex: 1 },
    scrollContent: { padding: Spacing.lg, gap: Spacing.md },
    card: {
        gap: Spacing.sm,
        padding: Spacing.lg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "transparent",
    },
    categories: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    category: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    detailsInput: { minHeight: 120, textAlignVertical: "top" },
    logsToggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginTop: Spacing.xs,
        padding: Spacing.md,
        borderRadius: 12,
    },
    logsToggleText: {
        flex: 1,
    },
    logsNote: {
        lineHeight: 16,
    },
    actions: { gap: Spacing.sm },
    colorfulButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: 20,
        minHeight: 48,
    },
    colorfulButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
});
