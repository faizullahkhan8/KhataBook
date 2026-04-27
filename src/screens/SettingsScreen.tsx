import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useLanguage, useTheme } from "../store";

import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
} from "@react-native-google-signin/google-signin";

interface SettingItem {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    type: "navigation" | "toggle" | "action";
    section: "General" | "Security" | "Support";
}

export const SettingsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t } = useTranslation();
    const { theme, mode, setMode, colors } = useTheme();
    const { language, setLanguage, isRTL } = useLanguage();
    const [showThemeOptions, setShowThemeOptions] = useState(false);
    const [showLanguageOptions, setShowLanguageOptions] = useState(false);

    const handleGoogleSignIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            if (isSuccessResponse(response)) {
                console.log(response.data);
            } else {
                console.log("Sign is cencelled by the user.");
            }
        } catch (error) {
            if (isErrorWithCode(error)) {
                console.log(error);
            }
        }
    };

    const SETTINGS_DATA: SettingItem[] = [
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
            id: "passcode",
            title: t("settings.passcode"),
            subtitle: t("settings.passcodeSubtitle"),
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
            id: "about",
            title: t("settings.aboutDeveloper"),
            subtitle: "Faiz Ullah Khan",
            icon: "person-outline",
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
    ];

    const handlePress = (item: SettingItem) => {
        if (item.id === "theme") {
            setShowThemeOptions(!showThemeOptions);
            setShowLanguageOptions(false);
        } else if (item.id === "language") {
            setShowLanguageOptions(!showLanguageOptions);
            setShowThemeOptions(false);
        } else if (item.id === "about") {
            router.push("/about");
        } else if (item.id === "backup") {
            router.push("/backup");
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
                  : t("settings.support");

        return (
            <View>
                {isFirstInSection && (
                    <Typography
                        variant="subheading-small"
                        color="muted"
                        style={[
                            styles.sectionHeader,
                            isRTL && {
                                textAlign: "right",
                                marginRight: Spacing.sm,
                            },
                        ]}
                    >
                        {sectionTitle}
                    </Typography>
                )}
                <Pressable
                    style={({ pressed }) => [
                        styles.itemContainer,
                        pressed && styles.itemPressed,
                    ]}
                    onPress={() => handlePress(item)}
                >
                    <Card
                        style={[
                            styles.itemCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.itemContent}>
                            <View
                                style={[
                                    styles.iconBox,
                                    { backgroundColor: `${colors.primary}25` },
                                ]}
                            >
                                <Ionicons
                                    name={item.icon}
                                    size={22}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.textContainer}>
                                <Typography
                                    variant="body-large"
                                    color="primary"
                                >
                                    {item.title}
                                </Typography>
                                <Typography variant="small-small" color="muted">
                                    {item.subtitle}
                                </Typography>
                            </View>
                            <Ionicons
                                name={
                                    item.id === "theme" && showThemeOptions
                                        ? "chevron-down"
                                        : item.id === "language" &&
                                            showLanguageOptions
                                          ? "chevron-down"
                                          : isRTL
                                            ? "chevron-back"
                                            : "chevron-forward"
                                }
                                size={20}
                                color={colors.border}
                            />
                        </View>
                    </Card>
                </Pressable>
                {item.id === "theme" && showThemeOptions && (
                    <View style={styles.themeOptionsContainer}>
                        {(["light", "dark", "system"] as const).map(
                            (option) => (
                                <Pressable
                                    key={option}
                                    style={[
                                        styles.themeOptionButton,
                                        {
                                            borderColor:
                                                mode === option
                                                    ? colors.primary
                                                    : colors.border,
                                        },
                                        mode === option
                                            ? {
                                                  backgroundColor: `${colors.primary}10`,
                                              }
                                            : null,
                                    ]}
                                    onPress={() => setMode(option)}
                                >
                                    <Ionicons
                                        name={
                                            option === "light"
                                                ? "sunny"
                                                : option === "dark"
                                                  ? "moon"
                                                  : "settings-outline"
                                        }
                                        size={20}
                                        color={
                                            mode === option
                                                ? colors.primary
                                                : colors.text.muted
                                        }
                                    />
                                    <Typography
                                        variant="body-small"
                                        color={
                                            mode === option
                                                ? "primary"
                                                : "muted"
                                        }
                                        style={styles.themeOptionText}
                                    >
                                        {t(`settings.theme_${option}`)}
                                    </Typography>
                                </Pressable>
                            ),
                        )}
                    </View>
                )}
                {item.id === "language" && showLanguageOptions && (
                    <View style={styles.themeOptionsContainer}>
                        {(["en", "ur"] as const).map((option) => (
                            <Pressable
                                key={option}
                                style={[
                                    styles.themeOptionButton,
                                    {
                                        borderColor:
                                            language === option
                                                ? colors.primary
                                                : colors.border,
                                    },
                                    language === option
                                        ? {
                                              backgroundColor: `${colors.primary}10`,
                                          }
                                        : null,
                                ]}
                                onPress={() => {
                                    setLanguage(option);
                                }}
                            >
                                <Typography
                                    variant="body-small"
                                    color={
                                        language === option
                                            ? "primary"
                                            : "muted"
                                    }
                                    style={styles.themeOptionText}
                                >
                                    {option === "en" ? "English" : "اردو"}
                                </Typography>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <FlatList
                data={SETTINGS_DATA}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + Spacing.xl },
                ]}
                ListHeaderComponent={
                    <View
                        style={[
                            styles.header,
                            {
                                paddingTop: insets.top + Spacing.lg,
                                alignItems: isRTL ? "flex-end" : "flex-start",
                            },
                        ]}
                    >
                        <Typography variant="heading-large" color="primary">
                            {t("settings.title")}
                        </Typography>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    listContent: {
        paddingHorizontal: Spacing.md,
    },
    sectionHeader: {
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.sm,
        letterSpacing: 1.2,
    },
    itemContainer: {
        marginBottom: Spacing.sm,
    },
    itemPressed: {
        opacity: 0.7,
    },
    itemCard: {
        padding: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        // Elevation 0 as requested
        shadowOpacity: 0,
        elevation: 0,
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: `${Colors.primary}25`, // 15% opacity tint
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: Spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    themeOptionsContainer: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginTop: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    themeOptionButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: Spacing.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    themeOptionText: {
        marginTop: 4,
        textTransform: "capitalize",
    },
});
