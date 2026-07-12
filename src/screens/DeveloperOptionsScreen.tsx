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
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[
                        styles.iconButton,
                        { backgroundColor: `${colors.primary}18` },
                    ]}
                >
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <View style={styles.headerText}>
                    <Typography variant="heading-large" color="primary">
                        Developer Options
                    </Typography>
                </View>
            </View>

            <View style={styles.content}>
                <Pressable
                    style={({ pressed }) => [
                        styles.itemContainer,
                        { backgroundColor: colors.surface },
                        pressed && styles.itemPressed,
                    ]}
                    onPress={() => router.push("/logs" as any)}
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
                                size={18}
                                color={colors.primary}
                            />
                        </View>
                        <View style={styles.itemText}>
                            <Typography variant="body-medium" color="primary">
                                Logs
                            </Typography>
                            <Typography variant="small-small" color="muted">
                                View local diagnostic logs
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    iconButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    headerText: { flex: 1 },
    content: {
        padding: Spacing.md,
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
        alignItems: "center",
        justifyContent: "center",
        marginRight: Spacing.md,
        flexShrink: 0,
    },
    itemText: { 
        flex: 1,
        gap: 2,
    },
});
