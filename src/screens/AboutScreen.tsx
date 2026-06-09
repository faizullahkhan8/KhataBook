import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useTheme } from "../store";

export const AboutScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
    };

    const handleEmail = (email: string) => {
        Linking.openURL(`mailto:${email}`);
    };

    const handleGitHub = () => {
        Linking.openURL("https://github.com/faizullahkhan8");
    };

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top, backgroundColor: colors.background },
            ]}
        >
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                    },
                    false && { flexDirection: "row-reverse" },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={[
                        styles.backButton,
                        false && { marginRight: 0, marginLeft: Spacing.sm },
                    ]}
                >
                    <Ionicons
                        name={false ? "arrow-forward" : "arrow-back"}
                        size={24}
                        color={colors.primary}
                    />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <Typography variant="heading-large" color="primary">
                        {t("about.title")}
                    </Typography>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
            >
                {/* App Info */}
                <Card style={styles.card}>
                    <View
                        style={[
                            styles.appIconContainer,
                            { backgroundColor: `${colors.primary}15` },
                        ]}
                    >
                        <Ionicons
                            name="calculator"
                            size={48}
                            color={colors.primary}
                        />
                    </View>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={
                            false ? { textAlign: "right" } : styles.centerText
                        }
                    >
                        KhataBook
                    </Typography>
                    <Typography
                        variant="body-small"
                        color="muted"
                        style={
                            false ? { textAlign: "right" } : styles.centerText
                        }
                    >
                        {t("about.version")}
                    </Typography>
                    <Typography
                        variant="body-medium"
                        color="secondary"
                        style={
                            false
                                ? {
                                      textAlign: "right",
                                      marginTop: Spacing.md,
                                      lineHeight: 22,
                                  }
                                : styles.description
                        }
                    >
                        {t("about.description")}
                    </Typography>
                </Card>

                {/* Developer Info */}
                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={
                            false
                                ? {
                                      marginBottom: Spacing.md,
                                      textAlign: "right",
                                  }
                                : styles.sectionTitle
                        }
                    >
                        {t("about.developer")}
                    </Typography>

                    <View
                        style={[
                            styles.developerHeader,
                            false && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <View
                            style={[
                                styles.avatarContainer,
                                { backgroundColor: `${colors.primary}15` },
                            ]}
                        >
                            <Ionicons
                                name="person"
                                size={40}
                                color={colors.primary}
                            />
                        </View>
                        <View>
                            <Typography variant="heading-small" color="primary">
                                Faiz Ullah Khan
                            </Typography>
                            <Typography variant="body-small" color="muted">
                                {t("about.fullStackDeveloper")}
                            </Typography>
                        </View>
                    </View>

                    {/* Contact Info */}
                    <View style={styles.contactSection}>
                        <Typography
                            variant="body-small"
                            color="secondary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.xs,
                                          textAlign: "right",
                                      }
                                    : styles.contactLabel
                            }
                        >
                            {t("about.phoneNumbers")}
                        </Typography>
                        <Pressable
                            onPress={() => handleCall("+92 332 8753452")}
                            style={styles.contactRow}
                        >
                            <Ionicons
                                name="call"
                                size={18}
                                color={colors.primary}
                            />
                            <Typography variant="body-medium" color="primary">
                                +92 332 8753452
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={() => handleCall("+92 331 7947676")}
                            style={styles.contactRow}
                        >
                            <Ionicons
                                name="call"
                                size={18}
                                color={colors.primary}
                            />
                            <Typography variant="body-medium" color="primary">
                                +92 331 7947676
                            </Typography>
                        </Pressable>
                    </View>

                    <View style={styles.contactSection}>
                        <Typography
                            variant="body-small"
                            color="secondary"
                            style={
                                false
                                    ? {
                                          marginBottom: Spacing.xs,
                                          textAlign: "right",
                                      }
                                    : styles.contactLabel
                            }
                        >
                            {t("about.emailAddresses")}
                        </Typography>
                        <Pressable
                            onPress={() =>
                                handleEmail("faizullahofficial0@gmail.com")
                            }
                            style={styles.contactRow}
                        >
                            <Ionicons
                                name="mail"
                                size={18}
                                color={colors.primary}
                            />
                            <Typography variant="body-medium" color="primary">
                                faizullahofficial0@gmail.com
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={() =>
                                handleEmail("faizullahofficial12@gmail.com")
                            }
                            style={styles.contactRow}
                        >
                            <Ionicons
                                name="mail"
                                size={18}
                                color={colors.primary}
                            />
                            <Typography variant="body-medium" color="primary">
                                faizullahofficial12@gmail.com
                            </Typography>
                        </Pressable>
                    </View>

                    <Pressable onPress={handleGitHub} style={styles.contactRow}>
                        <Ionicons
                            name="logo-github"
                            size={18}
                            color={colors.primary}
                        />
                        <Typography variant="body-medium" color="primary">
                            github.com/faizullahkhan8
                        </Typography>
                    </Pressable>
                </Card>

                {/* Experience */}
                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={
                            false
                                ? {
                                      marginBottom: Spacing.md,
                                      textAlign: "right",
                                  }
                                : styles.sectionTitle
                        }
                    >
                        {t("about.experienceSkills")}
                    </Typography>

                    <View
                        style={[
                            styles.skillRow,
                            false && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Ionicons
                            name="code-slash"
                            size={18}
                            color={colors.success}
                        />
                        <Typography variant="body-medium" color="secondary">
                            {t("about.mernStack")}
                        </Typography>
                    </View>
                    <View
                        style={[
                            styles.skillRow,
                            false && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Ionicons
                            name="phone-portrait"
                            size={18}
                            color={colors.success}
                        />
                        <Typography variant="body-medium" color="secondary">
                            {t("about.reactNative")}
                        </Typography>
                    </View>
                    <View
                        style={[
                            styles.skillRow,
                            false && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Ionicons
                            name="time"
                            size={18}
                            color={colors.success}
                        />
                        <Typography variant="body-medium" color="secondary">
                            {t("about.yearsExperience")}
                        </Typography>
                    </View>
                </Card>

                {/* Work History */}
                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={
                            false
                                ? {
                                      marginBottom: Spacing.md,
                                      textAlign: "right",
                                  }
                                : styles.sectionTitle
                        }
                    >
                        {t("about.workHistory")}
                    </Typography>

                    {[
                        "Elite Tech Solution",
                        "Heckta Connects",
                        "Developers Hub Co.",
                        "Syed Software Institute Bannu (Current)",
                    ].map((company, index) => (
                        <View
                            key={index}
                            style={[
                                styles.companyRow,
                                false && { flexDirection: "row-reverse" },
                            ]}
                        >
                            <Ionicons
                                name="business"
                                size={16}
                                color={colors.primary}
                            />
                            <Typography variant="body-medium" color="secondary">
                                {company}
                            </Typography>
                        </View>
                    ))}
                </Card>

                {/* Education */}
                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={
                            false
                                ? {
                                      marginBottom: Spacing.md,
                                      textAlign: "right",
                                  }
                                : styles.sectionTitle
                        }
                    >
                        {t("about.education")}
                    </Typography>
                    <View
                        style={[
                            styles.educationRow,
                            false && { flexDirection: "row-reverse" },
                        ]}
                    >
                        <Ionicons
                            name="school"
                            size={18}
                            color={colors.primary}
                        />
                        <View>
                            <Typography variant="body-medium" color="secondary">
                                {t("about.bsComputerScience")}
                            </Typography>
                            <Typography variant="body-small" color="muted">
                                {t("about.gpa")}
                            </Typography>
                        </View>
                    </View>
                </Card>

                {/* Business Message */}
                <Card
                    style={[
                        styles.highlightCard,
                        { backgroundColor: `${colors.primary}10` },
                    ]}
                >
                    <Ionicons
                        name="briefcase"
                        size={32}
                        color={colors.primary}
                        style={styles.businessIcon}
                    />
                    <Typography
                        variant="heading-small"
                        color="primary"
                        style={
                            false ? { textAlign: "right" } : styles.centerText
                        }
                    >
                        {t("about.needSolutions")}
                    </Typography>
                    <Typography
                        variant="body-medium"
                        color="secondary"
                        style={
                            false
                                ? {
                                      marginTop: Spacing.sm,
                                      lineHeight: 22,
                                      textAlign: "right",
                                  }
                                : styles.businessMessageText
                        }
                    >
                        {t("about.contactMessage")}
                    </Typography>
                    <View style={styles.businessContact}>
                        <Pressable
                            onPress={() => handleCall("+92 332 8753452")}
                            style={[
                                styles.businessButton,
                                { backgroundColor: colors.primary },
                            ]}
                        >
                            <Ionicons
                                name="call"
                                size={20}
                                color={colors.text.primary}
                            />
                            <Typography
                                variant="body-small"
                                color="primary"
                                style={styles.buttonText}
                            >
                                {t("about.callNow")}
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={() =>
                                handleEmail("faizullahofficial0@gmail.com")
                            }
                            style={[
                                styles.businessButton,
                                { backgroundColor: colors.primary },
                            ]}
                        >
                            <Ionicons
                                name="mail"
                                size={20}
                                color={colors.text.primary}
                            />
                            <Typography
                                variant="body-small"
                                color="primary"
                                style={styles.buttonText}
                            >
                                {t("about.emailUs")}
                            </Typography>
                        </Pressable>
                    </View>
                </Card>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    backButton: {
        padding: Spacing.sm,
        marginRight: Spacing.sm,
    },
    headerTitleContainer: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    card: {
        marginBottom: Spacing.md,
    },
    appIconContainer: {
        alignSelf: "center",
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    centerText: {
        textAlign: "center",
    },
    description: {
        textAlign: "center",
        marginTop: Spacing.md,
        lineHeight: 22,
    },
    sectionTitle: {
        marginBottom: Spacing.md,
    },
    developerHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
    },
    contactSection: {
        marginBottom: Spacing.md,
    },
    contactLabel: {
        marginBottom: Spacing.xs,
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    skillRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    companyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    educationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    highlightCard: {
        marginBottom: Spacing.md,
        backgroundColor: `${Colors.primary}10`,
    },
    businessIcon: {
        alignSelf: "center",
        marginBottom: Spacing.md,
    },
    businessMessageText: {
        marginTop: Spacing.sm,
        lineHeight: 22,
        textAlign: "center",
    },
    businessContact: {
        flexDirection: "row",
        justifyContent: "center",
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    businessButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
    },
    buttonText: {
        color: Colors.text.primary,
        fontWeight: "600",
    },
});
