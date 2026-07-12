import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography, ViewPhoto } from "../components";
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
                        marginTop: Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                    },
                    false && { flexDirection: "row-reverse" },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={[
                        styles.backButton,
                        { backgroundColor: `${colors.primary}18` },
                        false && { marginRight: 0, marginLeft: Spacing.sm },
                    ]}
                >
                    <Ionicons
                        name={false ? "chevron-forward" : "chevron-back"}
                        size={20}
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
                        <Image
                            source={require("../../assets/images/app-logo-without-bg.png")}
                            style={styles.appLogo}
                            contentFit="contain"
                            transition={200}
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
                        <ViewPhoto
                            source={require("../../assets/images/developer_profile.jpg")}
                            accessibilityLabel={t("photoViewer.openDeveloper")}
                            closeAccessibilityLabel={t("photoViewer.close")}
                        >
                            <View
                                style={[
                                    styles.avatarContainer,
                                    {
                                        backgroundColor: `${colors.primary}15`,
                                        borderColor: colors.primary,
                                    },
                                ]}
                            >
                                <Image
                                    source={require("../../assets/images/developer_profile.jpg")}
                                    style={styles.developerImage}
                                    contentFit="cover"
                                    transition={200}
                                />
                            </View>
                        </ViewPhoto>
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
                                color={colors.warning}
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
                            color={colors.danger}
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
                                { backgroundColor: colors.warning },
                            ]}
                        >
                            <Ionicons
                                name="call"
                                size={20}
                                color="#FFFFFF"
                            />
                            <Typography
                                variant="body-small"
                                style={[styles.buttonText, { color: "#FFFFFF" }]}
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
                                { backgroundColor: colors.success },
                            ]}
                        >
                            <Ionicons
                                name="mail"
                                size={20}
                                color="#FFFFFF"
                            />
                            <Typography
                                variant="body-small"
                                style={[styles.buttonText, { color: "#FFFFFF" }]}
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
        gap: Spacing.sm,
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
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
    appLogo: {
        width: 64,
        height: 64,
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
        borderWidth: 2,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    developerImage: { width: "100%", height: "100%" },
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
