import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    Pressable,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { Spacing } from "../constants";
import { useTheme } from "../store";
import { Button } from "./Button";
import { Card } from "./Card";
import { Typography } from "./Typography";

export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

interface DateRangePickerProps {
    visible: boolean;
    onClose: () => void;
    onApply: (range: DateRange) => void;
    initialRange?: DateRange;
}

type PickerMode = "start" | "end" | null;

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    visible,
    onClose,
    onApply,
    initialRange,
}) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [activePicker, setActivePicker] = useState<PickerMode>(null);

    // Reset state when modal opens with initial values
    useEffect(() => {
        if (visible) {
            setStartDate(initialRange?.startDate || null);
            setEndDate(initialRange?.endDate || null);
        }
    }, [visible, initialRange]);

    const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
        setActivePicker(null);
        if (event.type === "set" && date) {
            setStartDate(date);
            // If end date is before new start date, clear it
            if (endDate && date > endDate) {
                setEndDate(null);
            }
        }
    };

    const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
        setActivePicker(null);
        if (event.type === "set" && date) {
            setEndDate(date);
        }
    };

    const handleApply = () => {
        if (startDate && endDate) {
            onApply({ startDate, endDate });
            onClose();
        }
    };

    const handleClear = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const formatDate = (date: Date | null): string => {
        if (!date) return t("reports.selectDate");
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const isValid = startDate && endDate;

    const handleQuickSelect = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.overlay, ,]}>
                    <TouchableWithoutFeedback
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View>
                            <Card
                                style={[
                                    styles.container,
                                    { backgroundColor: colors.surface },
                                ]}
                            >
                                {/* Header */}
                                <View style={styles.header}>
                                    <Typography
                                        variant="heading-medium"
                                        color="primary"
                                    >
                                        {t("reports.dateRange")}
                                    </Typography>
                                    <Pressable
                                        onPress={onClose}
                                        style={[
                                            styles.closeButton,
                                            {
                                                backgroundColor: `${colors.primary}15`,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="close"
                                            size={20}
                                            color={colors.primary}
                                        />
                                    </Pressable>
                                </View>

                                {/* Date Selection */}
                                <View style={styles.dateSection}>
                                    {/* Start Date */}
                                    <View style={styles.dateColumn}>
                                        <View style={styles.dateLabelRowTop}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={14}
                                                color={colors.text.muted}
                                            />
                                            <Typography
                                                variant="small-small"
                                                color="muted"
                                            >
                                                {t("reports.from")}
                                            </Typography>
                                        </View>
                                        <Pressable
                                            onPress={() =>
                                                setActivePicker("start")
                                            }
                                            style={[
                                                styles.dateButton,
                                                {
                                                    backgroundColor:
                                                        colors.input.background,
                                                    borderColor: startDate
                                                        ? colors.primary
                                                        : colors.input.border,
                                                },
                                            ]}
                                        >
                                            <Typography
                                                variant="body-medium"
                                                color={
                                                    startDate
                                                        ? "primary"
                                                        : "muted"
                                                }
                                                style={styles.dateText}
                                            >
                                                {formatDate(startDate)}
                                            </Typography>
                                        </Pressable>
                                    </View>

                                    {/* Arrow */}
                                    <View style={styles.arrowContainer}>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={18}
                                            color={colors.text.muted}
                                        />
                                    </View>

                                    {/* End Date */}
                                    <View style={styles.dateColumn}>
                                        <View style={styles.dateLabelRowTop}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={14}
                                                color={colors.text.muted}
                                            />
                                            <Typography
                                                variant="small-small"
                                                color="muted"
                                            >
                                                {t("reports.to")}
                                            </Typography>
                                        </View>
                                        <Pressable
                                            onPress={() =>
                                                setActivePicker("end")
                                            }
                                            style={[
                                                styles.dateButton,
                                                {
                                                    backgroundColor:
                                                        colors.input.background,
                                                    borderColor: endDate
                                                        ? colors.primary
                                                        : colors.input.border,
                                                },
                                            ]}
                                        >
                                            <Typography
                                                variant="body-medium"
                                                color={
                                                    endDate
                                                        ? "primary"
                                                        : "muted"
                                                }
                                                style={styles.dateText}
                                            >
                                                {formatDate(endDate)}
                                            </Typography>
                                        </Pressable>
                                    </View>
                                </View>

                                {/* Date Pickers */}
                                {activePicker === "start" && (
                                    <DateTimePicker
                                        value={startDate || new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={handleStartDateChange}
                                        maximumDate={new Date()}
                                    />
                                )}
                                {activePicker === "end" && (
                                    <DateTimePicker
                                        value={endDate || new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={handleEndDateChange}
                                        minimumDate={startDate || undefined}
                                        maximumDate={new Date()}
                                    />
                                )}

                                {/* Quick Presets */}
                                <View style={styles.presetsSection}>
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                        style={styles.presetsLabel}
                                    >
                                        Quick Select
                                    </Typography>
                                    <View style={styles.presetsRow}>
                                        {[
                                            {
                                                label: t(
                                                    "reports.filter.today",
                                                ),
                                                days: 0,
                                            },
                                            {
                                                label: t(
                                                    "reports.filter.last7Days",
                                                ).split(" ")[1],
                                                days: 6,
                                            },
                                            {
                                                label:
                                                    "30 " +
                                                    t(
                                                        "reports.filter.lastMonth",
                                                    ).split(" ")[1],
                                                days: 29,
                                            },
                                        ].map((preset) => (
                                            <Pressable
                                                key={preset.label}
                                                onPress={() =>
                                                    handleQuickSelect(
                                                        preset.days,
                                                    )
                                                }
                                                style={({ pressed }) => [
                                                    styles.presetButton,
                                                    {
                                                        backgroundColor: pressed
                                                            ? `${colors.primary}30`
                                                            : `${colors.primary}15`,
                                                    },
                                                ]}
                                            >
                                                <Typography
                                                    variant="body-small"
                                                    color="primary"
                                                    style={styles.presetText}
                                                >
                                                    {preset.label}
                                                </Typography>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* Actions */}
                                <View style={styles.actions}>
                                    <Button
                                        title={t("reports.clear")}
                                        onPress={handleClear}
                                        variant="secondary"
                                        style={styles.actionButton}
                                    />
                                    <Button
                                        title={t("reports.apply")}
                                        onPress={handleApply}
                                        disabled={!isValid}
                                        style={styles.actionButton}
                                    />
                                </View>
                            </Card>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    container: {
        margin: Spacing.md,
        marginBottom: Spacing.xxxl,
        padding: Spacing.lg,
        borderRadius: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    dateSection: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: Spacing.lg,
    },
    dateColumn: {
        flex: 1,
        gap: Spacing.xs,
    },
    dateButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    dateLabelRowTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
        paddingLeft: Spacing.xs,
    },
    dateText: {
        fontWeight: "700",
        fontSize: 15,
    },
    arrowContainer: {
        paddingHorizontal: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    presetsSection: {
        marginBottom: Spacing.lg,
    },
    presetsLabel: {
        marginBottom: Spacing.sm,
        fontWeight: "600",
    },
    presetsRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        flexWrap: "wrap",
    },
    presetButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
    },
    presetText: {
        fontWeight: "600",
    },
    actions: {
        flexDirection: "row",
        gap: Spacing.md,
    },
    actionButton: {
        flex: 1,
    },
});
