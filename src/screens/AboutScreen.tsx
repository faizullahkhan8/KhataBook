import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";

export const AboutScreen: React.FC = () => {
    const insets = useSafeAreaInsets();

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerIconContainer}>
                    <Ionicons
                        name="information-circle"
                        size={32}
                        color={Colors.primary}
                    />
                </View>
                <Typography variant="heading-large" color="primary">
                    About
                </Typography>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
            >
                {/* App Info */}
                <Card style={styles.card}>
                    <View style={styles.appIconContainer}>
                        <Ionicons
                            name="calculator"
                            size={48}
                            color={Colors.primary}
                        />
                    </View>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={styles.centerText}
                    >
                        KhataBook
                    </Typography>
                    <Typography
                        variant="body-small"
                        color="muted"
                        style={styles.centerText}
                    >
                        Version 1.0.0
                    </Typography>
                    <Typography
                        variant="body-medium"
                        color="secondary"
                        style={styles.description}
                    >
                        A comprehensive credit management solution for tracking
                        customer accounts, transactions, and maintaining digital
                        ledgers. Simplify your business accounting with ease.
                    </Typography>
                </Card>

                {/* Developer Info */}
                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={styles.sectionTitle}
                    >
                        Developer
                    </Typography>

                    <View style={styles.developerHeader}>
                        <View style={styles.avatarContainer}>
                            <Ionicons
                                name="person"
                                size={40}
                                color={Colors.primary}
                            />
                        </View>
                        <View>
                            <Typography variant="heading-small" color="primary">
                                Faiz Ullah Khan
                            </Typography>
                            <Typography variant="body-small" color="muted">
                                Full Stack Developer (MERN)
                            </Typography>
                        </View>
                    </View>

                    {/* Contact Info */}
                    <View style={styles.contactSection}>
                        <Typography
                            variant="body-small"
                            color="secondary"
                            style={styles.contactLabel}
                        >
                            Phone Numbers
                        </Typography>
                        <Pressable
                            onPress={() => handleCall("+92 332 8753452")}
                            style={styles.contactRow}
                        >
                            <Ionicons
                                name="call"
                                size={18}
                                color={Colors.primary}
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
                                color={Colors.primary}
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
                            style={styles.contactLabel}
                        >
                            Email Addresses
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
                                color={Colors.primary}
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
                                color={Colors.primary}
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
                            color={Colors.primary}
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
                        style={styles.sectionTitle}
                    >
                        Experience & Skills
                    </Typography>

                    <View style={styles.skillRow}>
                        <Ionicons
                            name="code-slash"
                            size={18}
                            color={Colors.success}
                        />
                        <Typography variant="body-medium" color="secondary">
                            Full Stack Developer (MERN Stack)
                        </Typography>
                    </View>
                    <View style={styles.skillRow}>
                        <Ionicons
                            name="phone-portrait"
                            size={18}
                            color={Colors.success}
                        />
                        <Typography variant="body-medium" color="secondary">
                            React Native Development
                        </Typography>
                    </View>
                    <View style={styles.skillRow}>
                        <Ionicons
                            name="time"
                            size={18}
                            color={Colors.success}
                        />
                        <Typography variant="body-medium" color="secondary">
                            3+ Years Industry Experience
                        </Typography>
                    </View>
                </Card>

                {/* Work History */}
                <Card style={styles.card}>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={styles.sectionTitle}
                    >
                        Work History
                    </Typography>

                    {[
                        "Elite Tech Solution",
                        "Heckta Connects",
                        "Developers Hub Co.",
                        "Syed Software Institute Bannu (Current)",
                    ].map((company, index) => (
                        <View key={index} style={styles.companyRow}>
                            <Ionicons
                                name="business"
                                size={16}
                                color={Colors.primary}
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
                        style={styles.sectionTitle}
                    >
                        Education
                    </Typography>
                    <View style={styles.educationRow}>
                        <Ionicons
                            name="school"
                            size={18}
                            color={Colors.primary}
                        />
                        <View>
                            <Typography variant="body-medium" color="secondary">
                                BS Computer Science
                            </Typography>
                            <Typography variant="body-small" color="muted">
                                Graduated with 3.7 GPA
                            </Typography>
                        </View>
                    </View>
                </Card>

                {/* Business Message */}
                <Card style={styles.highlightCard}>
                    <Ionicons
                        name="briefcase"
                        size={32}
                        color={Colors.primary}
                        style={styles.businessIcon}
                    />
                    <Typography
                        variant="heading-small"
                        color="primary"
                        style={styles.centerText}
                    >
                        Need Custom Solutions?
                    </Typography>
                    <Typography
                        variant="body-medium"
                        color="secondary"
                        style={styles.businessMessageText}
                    >
                        You can contact us for any business problems or custom
                        software development needs. We provide tailored
                        solutions for your specific requirements.
                    </Typography>
                    <View style={styles.businessContact}>
                        <Pressable
                            onPress={() => handleCall("+92 332 8753452")}
                            style={styles.businessButton}
                        >
                            <Ionicons
                                name="call"
                                size={20}
                                color={Colors.text.primary}
                            />
                            <Typography
                                variant="body-small"
                                color="primary"
                                style={styles.buttonText}
                            >
                                Call Now
                            </Typography>
                        </Pressable>
                        <Pressable
                            onPress={() =>
                                handleEmail("faizullahofficial0@gmail.com")
                            }
                            style={styles.businessButton}
                        >
                            <Ionicons
                                name="mail"
                                size={20}
                                color={Colors.text.primary}
                            />
                            <Typography
                                variant="body-small"
                                color="primary"
                                style={styles.buttonText}
                            >
                                Email Us
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
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
        gap: Spacing.md,
    },
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: `${Colors.primary}20`,
        justifyContent: "center",
        alignItems: "center",
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
