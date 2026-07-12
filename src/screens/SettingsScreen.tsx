import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, OptionModal, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { ThemeMode, useLanguage, usePasscode, useTheme } from "../store";

type ModalOption = "theme" | "language" | null;

interface SettingItem {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    type: "navigation" | "toggle" | "action";
    section: "General" | "Security" | "Support" | "Developer";
}

const DEVELOPER_OPTIONS_KEY = "khatabook.developerOptionsUnlocked";
const DEVELOPER_UNLOCK_HOLD_MS = 5000;

const THEME_OPTIONS = [
    { value: "light" as ThemeMode, label: "Light", icon: "sunny" as const },
    { value: "dark" as ThemeMode, label: "Dark", icon: "moon" as const },
    {
        value: "system" as ThemeMode,
        label: "System",
        icon: "settings-outline" as const,
    },
];

const LANGUAGE_OPTIONS = [
    { value: "en", label: "English", icon: "globe-outline" as const },
    { value: "ur", label: "اردو", icon: "globe-outline" as const },
];

export const SettingsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t } = useTranslation();
    const { mode, setMode, colors } = useTheme();
    const { language, setLanguage } = useLanguage();
    const { isEnabled: isPasscodeEnabled, isSupported: isPasscodeSupported } =
        usePasscode();
    const [activeModal, setActiveModal] = useState<ModalOption>(null);
    const [developerOptionsUnlocked, setDeveloperOptionsUnlocked] =
        useState(false);
    const suppressNextAboutPress = useRef(false);

    useEffect(() => {
        const loadDeveloperOptionsState = async () => {
            const stored = await AsyncStorage.getItem(DEVELOPER_OPTIONS_KEY);
            setDeveloperOptionsUnlocked(stored === "true");
        };

        void loadDeveloperOptionsState();
    }, []);

    const SETTINGS_DATA: SettingItem[] = [
        {
            id: "stores",
            title: t("settings.stores", "Stores"),
            subtitle: t("settings.storesSubtitle", "Manage your stores"),
            icon: "storefront-outline",
            type: "navigation",
            section: "General",
        },
        {
            id: "theme",
            title: t("settings.theme"),
            subtitle:
                mode === "light"
                    ? t("settings.theme_light")
                    : mode === "dark"
                      ? t("settings.theme_dark")
                      : t("settings.theme_system"),
            icon: "moon-outline",
            type: "navigation",
            section: "General",
        },
        {
            id: "language",
            title: t("settings.language"),
            subtitle:
                language === "ur" ? t("settings.urdu") : t("settings.english"),
            icon: "globe-outline",
            type: "navigation",
            section: "General",
        },
        {
            id: "trash",
            title: t("settings.trash"),
            subtitle: t("settings.trashSubtitleEmpty"),
            icon: "trash-outline",
            type: "navigation",
            section: "General",
        },
        {
            id: "passcode",
            title: t("settings.passcode"),
            subtitle: !isPasscodeSupported
                ? t("passcode.unavailableShort")
                : isPasscodeEnabled
                  ? t("settings.passcodeEnabled")
                  : t("settings.passcodeDisabled"),
            icon: "lock-closed-outline",
            type: "navigation",
            section: "Security",
        },
        {
            id: "backup",
            title: t("settings.cloudBackup"),
            subtitle: t("settings.cloudBackupSubtitle"),
            icon: "cloud-upload-outline",
            type: "navigation",
            section: "Security",
        },
        {
            id: "feedback",
            title: t("settings.feedback"),
            subtitle: t("settings.feedbackSubtitle"),
            icon: "chatbox-ellipses-outline",
            type: "navigation",
            section: "Support",
        },
        {
            id: "privacy",
            title: t("settings.privacyPolicy"),
            subtitle: t("settings.privacyPolicySubtitle"),
            icon: "shield-checkmark-outline",
            type: "navigation",
            section: "Support",
        },
        {
            id: "terms",
            title: t("settings.termsOfUse"),
            subtitle: t("settings.termsOfUseSubtitle"),
            icon: "document-text-outline",
            type: "navigation",
            section: "Support",
        },
        {
            id: "about",
            title: t("settings.aboutDeveloper"),
            subtitle: "Faiz Ullah Khan",
            icon: "person-outline",
            type: "navigation",
            section: "Support",
        },
        ...(developerOptionsUnlocked
            ? [
                  {
                      id: "developer-options",
                      title: "Developer Options",
                      subtitle: "Logs and diagnostics",
                      icon: "code-slash-outline" as const,
                      type: "navigation" as const,
                      section: "Developer" as const,
                  },
              ]
            : []),
    ];

    const unlockDeveloperOptions = async () => {
        suppressNextAboutPress.current = true;
        await AsyncStorage.setItem(DEVELOPER_OPTIONS_KEY, "true");
        setDeveloperOptionsUnlocked(true);
    };

    const handleAboutPress = () => {
        if (suppressNextAboutPress.current) {
            suppressNextAboutPress.current = false;
            return;
        }
        router.push("/about");
    };

    const handlePress = (item: SettingItem) => {
        if (item.id === "theme") {
            setActiveModal("theme");
        } else if (item.id === "language") {
            setActiveModal("language");
        } else if (item.id === "stores") {
            router.push("/settings/stores" as any);
        } else if (item.id === "about") {
            handleAboutPress();
        } else if (item.id === "feedback") {
            router.push("/feedback");
        } else if (item.id === "passcode") {
            router.push("/passcode");
        } else if (item.id === "privacy") {
            router.push("/privacy-policy");
        } else if (item.id === "terms") {
            router.push("/terms-of-use");
        } else if (item.id === "trash") {
            router.push("/settings/trash" as any);
        } else if (item.id === "developer-options") {
            router.push("/developer-options" as any);
        }
    };

    const renderItem = ({
        item,
        index,
    }: {
        item: SettingItem;
        index: number;
    }) => {
        const isFirstInSection =
            index === 0 || SETTINGS_DATA[index - 1].section !== item.section;
        const sectionTitle =
            item.section === "General"
                ? t("settings.general")
                : item.section === "Security"
                  ? t("settings.security")
                  : item.section === "Support"
                    ? t("settings.support")
                    : "DEVELOPER";

        let semanticColor = colors.primary;
        if (item.section === "Security") {
            semanticColor = colors.danger;
        } else if (item.section === "Support") {
            semanticColor = colors.success;
        } else if (item.section === "Developer") {
            semanticColor = colors.warning;
        }

        return (
            <View>
                {isFirstInSection && (
                    <Typography
                        variant="subheading-small"
                        color="muted"
                        style={[styles.sectionHeader]}
                    >
                        {sectionTitle}
                    </Typography>
                )}
                <Pressable
                    style={({ pressed }) => [
                        styles.itemContainer,
                        { backgroundColor: colors.surface },
                        pressed && styles.itemPressed,
                    ]}
                    onPress={() => handlePress(item)}
                    delayLongPress={
                        item.id === "about"
                            ? DEVELOPER_UNLOCK_HOLD_MS
                            : undefined
                    }
                    onLongPress={
                        item.id === "about" && !developerOptionsUnlocked
                            ? () => void unlockDeveloperOptions()
                            : undefined
                    }
                >
                    <View style={styles.itemContent}>
                        <View
                            style={[
                                styles.iconBox,
                                { backgroundColor: `${semanticColor}18` },
                            ]}
                        >
                            <Ionicons
                                name={item.icon}
                                size={18}
                                color={semanticColor}
                            />
                        </View>
                        <View style={styles.textContainer}>
                            <Typography
                                variant="body-medium"
                                color="primary"
                            >
                                {item.title}
                            </Typography>
                            <Typography variant="small-small" color="muted">
                                {item.subtitle}
                            </Typography>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.text.muted}
                        />
                    </View>
                </Pressable>
            </View>
        );
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
                <Typography variant="heading-large" color="primary">
                    {t("settings.title")}
                </Typography>
            </View>

            <FlatList
                data={SETTINGS_DATA}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
            />

            <OptionModal
                visible={activeModal === "theme"}
                title={t("settings.theme")}
                options={THEME_OPTIONS.map((opt) => ({
                    ...opt,
                    label: t(`settings.theme_${opt.value}`),
                }))}
                selected={mode}
                onSelect={(value) => setMode(value as ThemeMode)}
                onClose={() => setActiveModal(null)}
            />

            <OptionModal
                visible={activeModal === "language"}
                title={t("settings.language")}
                options={LANGUAGE_OPTIONS}
                selected={language}
                onSelect={(value) => setLanguage(value as "en" | "ur")}
                onClose={() => setActiveModal(null)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    listContent: {
        paddingHorizontal: Spacing.md,
    },
    sectionHeader: {
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.sm,
        letterSpacing: 1.2,
    },
    itemContainer: {
        marginBottom: 6,
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
    },
    itemPressed: {
        opacity: 0.7,
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
        flexShrink: 0,
    },
    textContainer: {
        flex: 1,
        gap: 2,
    },
});
