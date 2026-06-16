import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Typography } from "../components";
import { Spacing } from "../constants";
import { useTheme } from "../store";

export const DeveloperOptionsScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[
                        styles.iconButton,
                        { backgroundColor: `${colors.primary}15` },
                    ]}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </Pressable>
                <View style={styles.headerText}>
                    <Typography variant="heading-large" color="primary">
                        Developer Options
                    </Typography>
                </View>
            </View>

            <View style={styles.content}>
                <Pressable onPress={() => router.push("/logs" as any)}>
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
                                    { backgroundColor: `${colors.primary}18` },
                                ]}
                            >
                                <Ionicons
                                    name="terminal-outline"
                                    size={23}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.itemText}>
                                <Typography variant="body-large" color="primary">
                                    Logs
                                </Typography>
                                <Typography variant="small-small" color="muted">
                                    View local diagnostic logs
                                </Typography>
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={colors.border}
                            />
                        </View>
                    </Card>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        minHeight: 84,
        borderBottomWidth: 1,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    headerText: { flex: 1 },
    content: {
        padding: Spacing.md,
    },
    itemCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: Spacing.md,
    },
    itemText: { flex: 1 },
});
