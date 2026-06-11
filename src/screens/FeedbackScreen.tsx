import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as SMS from "expo-sms";
import React, { useMemo, useState } from "react";
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
import { Button, Card, Input, Typography } from "../components";
import { Spacing } from "../constants";
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
    const [isOpening, setIsOpening] = useState(false);

    const diagnosticDetails = useMemo(
        () => [
            `App version: ${Constants.expoConfig?.version ?? "Unknown"}`,
            `Platform: ${Platform.OS}`,
            `OS version: ${String(Platform.Version)}`,
            `Language: ${language}`,
        ],
        [language],
    );

    const validate = () => {
        const hasCategory = Boolean(category);
        const hasDetails = Boolean(details.trim());
        setCategoryError(!hasCategory);
        setDetailsError(!hasDetails);
        return hasCategory && hasDetails;
    };

    const buildMessage = () => {
        const selectedCategory = category
            ? t(`feedback.categories.${category}`)
            : "";
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
        ].join("\n");
    };

    const showUnavailable = () =>
        Alert.alert(
            t("feedback.unavailableTitle"),
            t("feedback.unavailableMessage"),
        );

    const openWhatsApp = async () => {
        if (!validate()) return;
        setIsOpening(true);
        try {
            await Linking.openURL(
                `whatsapp://send?phone=${CONTACT_PHONE}&text=${encodeURIComponent(buildMessage())}`,
            );
        } catch {
            showUnavailable();
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
                        : "",
                });
            const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(buildMessage())}`;
            if (!(await Linking.canOpenURL(url))) {
                showUnavailable();
                return;
            }
            await Linking.openURL(url);
        } catch {
            showUnavailable();
        } finally {
            setIsOpening(false);
        }
    };

    const openSms = async () => {
        if (!validate()) return;
        setIsOpening(true);
        try {
            if (!(await SMS.isAvailableAsync())) {
                showUnavailable();
                return;
            }
            await SMS.sendSMSAsync(`+${CONTACT_PHONE}`, buildMessage());
        } catch {
            showUnavailable();
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
                        paddingTop: insets.top + Spacing.md,
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    hitSlop={Spacing.md}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography variant="heading-medium">
                    {t("feedback.title")}
                </Typography>
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
                    <Card style={styles.card}>
                        <Typography variant="subheading-small">
                            {t("feedback.category")}
                        </Typography>
                        <View style={styles.categories}>
                            {CATEGORIES.map((item) => {
                                const selected = category === item;
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
                                                    ? colors.primary
                                                    : categoryError
                                                      ? colors.danger
                                                      : colors.border,
                                                backgroundColor: selected
                                                    ? `${colors.primary}15`
                                                    : colors.surface,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={
                                                selected
                                                    ? "radio-button-on"
                                                    : "radio-button-off"
                                            }
                                            size={18}
                                            color={
                                                selected
                                                    ? colors.primary
                                                    : colors.text.muted
                                            }
                                        />
                                        <Typography
                                            variant="body-small"
                                            color={
                                                selected ? "primary" : "muted"
                                            }
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
                    <Typography variant="subheading-small">
                        {t("feedback.sendUsing")}
                    </Typography>
                    <Typography color="muted" variant="small-small">
                        {t("feedback.privacyNote")}
                    </Typography>
                    <View style={styles.actions}>
                        <Button
                            title={t("feedback.whatsapp")}
                            onPress={openWhatsApp}
                            disabled={isOpening}
                            style={styles.action}
                        />
                        <Button
                            title={t("feedback.email")}
                            onPress={openEmail}
                            disabled={isOpening}
                            variant="secondary"
                            style={styles.action}
                        />
                        <Button
                            title={t("feedback.sms")}
                            onPress={openSms}
                            disabled={isOpening}
                            variant="secondary"
                            style={styles.action}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    backButton: { padding: Spacing.xs },
    content: { flex: 1 },
    scrollContent: { padding: Spacing.lg, gap: Spacing.md },
    card: { gap: Spacing.sm, padding: Spacing.lg },
    categories: { gap: Spacing.sm },
    category: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.md,
    },
    detailsInput: { minHeight: 150, textAlignVertical: "top" },
    actions: { gap: Spacing.sm },
    action: { width: "100%" },
});
