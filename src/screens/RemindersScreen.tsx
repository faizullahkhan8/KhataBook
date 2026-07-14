import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingScreen, Typography } from "../components";
import { Spacing } from "../constants";
import { Reminder, ReminderStatus } from "../models/Reminder";
import { ReminderService } from "../services/ReminderService";
import { useDatabaseContext, useTheme } from "../store";

export default function RemindersScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { db } = useDatabaseContext();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const reminderService = useMemo(
        () => (db ? new ReminderService(db) : null),
        [db],
    );

    const fetchReminders = useCallback(async () => {
        if (!reminderService) return;
        try {
            const upcoming = await reminderService.getUpcomingReminders();
            const past = await reminderService.getPastReminders();
            const allReminders = [...upcoming, ...past].sort(
                (a, b) => b.due_date - a.due_date,
            );
            setReminders(allReminders);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [reminderService]);

    useFocusEffect(
        useCallback(() => {
            fetchReminders();
        }, [fetchReminders])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReminders();
    }, [fetchReminders]);

    const handleComplete = async (reminder: Reminder) => {
        if (!reminder.id || !reminderService) return;
        // Optimistic update
        setReminders((prev) =>
            prev.map((r) =>
                r.id === reminder.id
                    ? { ...r, status: ReminderStatus.COMPLETED }
                    : r
            )
        );
        try {
            await reminderService.updateReminderStatus(
                reminder.id,
                ReminderStatus.COMPLETED,
            );
            // We can skip fetching here as the UI is already updated,
            // or we could fetch in the background to ensure sync.
        } catch (e) {
            Alert.alert("Error", "Failed to update reminder");
            fetchReminders(); // Revert on failure
        }
    };

    const handleDelete = async (reminder: Reminder) => {
        if (!reminder.id || !reminderService) return;
        Alert.alert(
            "Delete",
            "Are you sure you want to delete this reminder?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        // Optimistic update
                        setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
                        try {
                            await reminderService.deleteReminder(reminder.id!);
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete reminder");
                            fetchReminders(); // Revert on failure
                        }
                    },
                },
            ],
        );
    };

    const formatDate = (ts: number) => {
        const d = new Date(ts * 1000);
        return d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderReminder = ({ item }: { item: Reminder }) => {
        const isUpcoming =
            item.status === ReminderStatus.PENDING &&
            item.due_date > Math.floor(Date.now() / 1000);
        const semanticColor =
            item.status === ReminderStatus.COMPLETED
                ? "success"
                : isUpcoming
                  ? "primary"
                  : "danger";
        const colorValue = colors[semanticColor];

        return (
            <View
                style={[
                    styles.reminderRow,
                    { backgroundColor: colors.surface },
                ]}
            >
                <View
                    style={[
                        styles.typeIconWrap,
                        { backgroundColor: `${colorValue}18` },
                    ]}
                >
                    <Ionicons
                        name={
                            item.status === ReminderStatus.COMPLETED
                                ? "checkmark-circle"
                                : isUpcoming
                                  ? "time"
                                  : "alert-circle"
                        }
                        size={18}
                        color={colorValue}
                    />
                </View>
                <View style={styles.rowCenter}>
                    <View style={styles.rowTop}>
                        <Typography
                            variant="body-medium"
                            color={semanticColor}
                            numberOfLines={1}
                            style={styles.rowLabel}
                        >
                            {item.title}
                        </Typography>
                    </View>
                    <View style={styles.rowMeta}>
                        <Typography
                            variant="small-small"
                            color="secondary"
                            numberOfLines={1}
                            style={styles.descriptionText}
                        >
                            {item.description || "No description"}
                        </Typography>
                        <Typography
                            variant="small-small"
                            color="muted"
                            numberOfLines={1}
                        >
                            {formatDate(item.due_date)}
                        </Typography>
                    </View>
                </View>
                <View style={styles.rowRight}>
                    {item.status === ReminderStatus.PENDING && (
                        <Pressable
                            onPress={() => handleComplete(item)}
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor: `${colors.success}18`,
                                    marginRight: Spacing.xs,
                                },
                            ]}
                        >
                            <Ionicons
                                name="checkmark"
                                size={16}
                                color={colors.success}
                            />
                        </Pressable>
                    )}
                    <Pressable
                        onPress={() => handleDelete(item)}
                        style={[
                            styles.actionButton,
                            { backgroundColor: `${colors.danger}18` },
                        ]}
                    >
                        <Ionicons
                            name="trash-outline"
                            size={16}
                            color={colors.danger}
                        />
                    </Pressable>
                </View>
            </View>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

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
                <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleRow}>
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
                        <View>
                            <Typography variant="heading-large" color="primary">
                                Reminders
                            </Typography>
                        </View>
                    </View>
                </View>
            </View>

            <FlatList
                data={reminders}
                renderItem={renderReminder}
                keyExtractor={(item) => item.id!.toString()}
                contentContainerStyle={[
                    styles.list,
                    reminders.length === 0 && {
                        flexGrow: 1,
                        justifyContent: "center",
                    },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons
                            name="notifications-outline"
                            size={72}
                            color={`${colors.primary}40`}
                        />
                        <Typography
                            variant="heading-medium"
                            color="primary"
                            style={{ marginTop: Spacing.lg }}
                        >
                            No Reminders Yet
                        </Typography>
                        <Typography
                            variant="body-medium"
                            color="muted"
                            style={styles.emptyStateMessage}
                        >
                            Keep track of your payment follow-ups by setting a
                            new reminder.
                        </Typography>
                        <Pressable
                            style={[
                                styles.emptyStateButton,
                                { backgroundColor: colors.primary },
                            ]}
                            onPress={() => router.push("/add-reminder")}
                        >
                            <Ionicons
                                name="add"
                                size={20}
                                color="#FFFFFF"
                            />
                            <Typography
                                variant="body-medium"
                                style={{
                                    color: "#FFFFFF",
                                    marginLeft: Spacing.xs,
                                    fontWeight: "bold",
                                }}
                            >
                                Add New Reminder
                            </Typography>
                        </Pressable>
                    </View>
                }
            />

            <Pressable
                onPress={() => router.push("/add-reminder")}
                style={[
                    styles.fab,
                    {
                        backgroundColor: colors.primary,
                        bottom: insets.bottom + 90,
                    },
                ]}
            >
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
    },
    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        flex: 1,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    list: {
        paddingHorizontal: Spacing.md,
        paddingBottom: 100,
        paddingTop: Spacing.sm,
    },
    reminderRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        marginBottom: 6,
        gap: Spacing.sm,
    },
    typeIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    rowCenter: {
        flex: 1,
        gap: 2,
        minWidth: 0,
    },
    rowTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    rowLabel: {
        flexShrink: 1,
    },
    rowMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
    },
    descriptionText: {
        flexShrink: 1,
        maxWidth: "60%",
    },
    rowRight: {
        alignItems: "center",
        flexDirection: "row",
        flexShrink: 0,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.xxl,
        paddingBottom: 80,
    },
    emptyStateMessage: {
        textAlign: "center",
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    emptyStateButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: Spacing.xl,
        borderRadius: 24,
        marginTop: Spacing.xl,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    fab: {
        position: "absolute",
        right: Spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});
