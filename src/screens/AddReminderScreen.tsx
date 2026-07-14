import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Typography } from "../components";
import { Spacing } from "../constants";
import { useCustomerById } from "../hooks";
import { CustomerId, Transaction, TransactionId } from "../models";
import { ReminderStatus } from "../models/Reminder";
import { ReminderService } from "../services/ReminderService";
import { TransactionService } from "../services/TransactionService";
import { useDatabaseContext, useTheme } from "../store";
import { formatCurrency } from "../utils";

export default function AddReminderScreen() {
    const router = useRouter();
    const { customerId, transactionId } = useLocalSearchParams<{
        customerId?: string;
        transactionId?: string;
    }>();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { db } = useDatabaseContext();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
    ); // Default to tomorrow
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transaction, setTransaction] = useState<Transaction | null>(null);

    const reminderService = useMemo(
        () => (db ? new ReminderService(db) : null),
        [db],
    );
    const transactionService = useMemo(
        () => (db ? new TransactionService(db) : null),
        [db],
    );
    const { customer } = useCustomerById(
        db,
        parseInt(customerId || "0", 10) as CustomerId,
    );

    useEffect(() => {
        if (transactionService && transactionId) {
            transactionService.getTransactionById(parseInt(transactionId, 10) as TransactionId).then(setTransaction).catch(console.error);
        }
    }, [transactionService, transactionId]);

    useEffect(() => {
        if (customer && !title) {
            let defaultTitle = `Follow-up: ${customer.name}`;
            let defaultDesc = "";
            const dueAmount = customer.accounts?.[0]?.current_balance || 0;
            
            if (dueAmount > 0) {
                 defaultDesc += `Current Due: ${formatCurrency(dueAmount)}\n\n`;
            } else if (dueAmount < 0) {
                 defaultDesc += `Advance: ${formatCurrency(Math.abs(dueAmount))}\n\n`;
            }

            if (transaction) {
                 const txDate = new Date((transaction.created_at || Date.now()/1000) * 1000).toLocaleDateString();
                 defaultDesc += `Regarding transaction of ${formatCurrency(transaction.amount)} on ${txDate}`;
                 if (transaction.description) {
                     defaultDesc += `\nNote: ${transaction.description}`;
                 }
            }
            
            setTitle(defaultTitle);
            if (!description && defaultDesc) {
                setDescription(defaultDesc.trim());
            }
        }
    }, [customer, transaction]);

    const presets = [
        { label: "Tomorrow", offsetHours: 24 },
        { label: "In 3 Days", offsetHours: 72 },
        { label: "Next Week", offsetHours: 168 },
        { label: "Next Month", offsetHours: 30 * 24 },
    ];

    const applyPreset = (offsetHours: number) => {
        const newDate = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
        if (offsetHours >= 24) {
            newDate.setHours(9, 0, 0, 0); // Default preset to 9 AM
        }
        setDate(newDate);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Error", "Please enter a reminder title");
            return;
        }
        if (date.getTime() <= Date.now()) {
            Alert.alert("Error", "Due date must be in the future");
            return;
        }
        if (!reminderService) return;

        setLoading(true);
        try {
            await reminderService.createReminder({
                title: title.trim(),
                description: description.trim(),
                due_date: Math.floor(date.getTime() / 1000),
                status: ReminderStatus.PENDING,
                customer_id: customerId ? parseInt(customerId, 10) : undefined,
                transaction_id: transactionId
                    ? parseInt(transactionId, 10)
                    : undefined,
            });
            Alert.alert("Success", "Reminder set successfully!", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (error) {
            Alert.alert("Error", "Failed to create reminder");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d: Date) => {
        return d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (d: Date) => {
        return d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: colors.background },
            ]}
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
                >
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <Typography
                    variant="heading-large"
                    color="primary"
                >
                    New Reminder
                </Typography>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View
                    style={[styles.card, { backgroundColor: colors.surface }]}
                >
                    <Typography variant="body-medium" color="muted">
                        Title
                    </Typography>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: colors.text.primary,
                                borderColor: colors.border,
                            },
                        ]}
                        placeholder="e.g. Follow up on payment"
                        placeholderTextColor={colors.text.muted}
                        value={title}
                        onChangeText={setTitle}
                        autoFocus
                    />

                    <Typography
                        variant="body-medium"
                        color="muted"
                        style={{ marginTop: Spacing.md }}
                    >
                        Description (Optional)
                    </Typography>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: colors.text.primary,
                                borderColor: colors.border,
                                minHeight: 80,
                            },
                        ]}
                        placeholder="Additional details..."
                        placeholderTextColor={colors.text.muted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <View
                    style={[styles.card, { backgroundColor: colors.surface }]}
                >
                    <Typography variant="body-medium" color="muted">
                        Quick Select
                    </Typography>
                    <View style={styles.presetsRow}>
                        {presets.map((preset) => (
                            <Pressable
                                key={preset.label}
                                onPress={() => applyPreset(preset.offsetHours)}
                                style={[
                                    styles.presetChip,
                                    { backgroundColor: `${colors.primary}18` },
                                ]}
                            >
                                <Typography
                                    variant="small-small"
                                    color="primary"
                                >
                                    {preset.label}
                                </Typography>
                            </Pressable>
                        ))}
                    </View>

                    <Typography
                        variant="body-medium"
                        color="muted"
                        style={{
                            marginTop: Spacing.md,
                            marginBottom: Spacing.xs,
                        }}
                    >
                        Custom Date & Time
                    </Typography>
                    <View style={styles.dateTimeRow}>
                        <Pressable
                            onPress={() => setShowDatePicker(true)}
                            style={[
                                styles.dateTimeButton,
                                { borderColor: colors.border },
                            ]}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={20}
                                color={colors.primary}
                            />
                            <Typography
                                variant="body-medium"
                                color="primary"
                                style={{ marginLeft: Spacing.xs }}
                            >
                                {formatDate(date)}
                            </Typography>
                        </Pressable>

                        <Pressable
                            onPress={() => setShowTimePicker(true)}
                            style={[
                                styles.dateTimeButton,
                                { borderColor: colors.border },
                            ]}
                        >
                            <Ionicons
                                name="time-outline"
                                size={20}
                                color={colors.primary}
                            />
                            <Typography
                                variant="body-medium"
                                color="primary"
                                style={{ marginLeft: Spacing.xs }}
                            >
                                {formatTime(date)}
                            </Typography>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            <View
                style={[
                    styles.footer,
                    {
                        backgroundColor: colors.surface,
                        borderTopColor: colors.border,
                        paddingBottom: Math.max(insets.bottom, Spacing.sm) + Spacing.sm,
                    },
                ]}
            >
                <Pressable
                    onPress={handleSave}
                    disabled={loading}
                    style={[
                        styles.footerButton,
                        {
                            backgroundColor: colors.primary,
                            opacity: loading ? 0.6 : 1,
                        },
                    ]}
                >
                    <Typography
                        variant="body-medium"
                        style={{ color: "#FFFFFF", fontWeight: 'bold' }}
                    >
                        {loading ? "Saving..." : "Save Reminder"}
                    </Typography>
                </Pressable>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            const newD = new Date(date);
                            newD.setFullYear(
                                selectedDate.getFullYear(),
                                selectedDate.getMonth(),
                                selectedDate.getDate(),
                            );
                            setDate(newD);
                        }
                    }}
                />
            )}

            {showTimePicker && (
                <DateTimePicker
                    value={date}
                    mode="time"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) {
                            const newD = new Date(date);
                            newD.setHours(
                                selectedDate.getHours(),
                                selectedDate.getMinutes(),
                                0,
                                0,
                            );
                            setDate(newD);
                        }
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    placeholder: {
        width: 34,
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    footer: {
        padding: Spacing.md,
        borderTopWidth: 1,
    },
    footerButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    card: {
        borderRadius: 12,
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.sm,
        marginTop: Spacing.xs,
        fontSize: 16,
    },
    presetsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    presetChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: 20,
    },
    dateTimeRow: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: Spacing.sm,
    },
});
