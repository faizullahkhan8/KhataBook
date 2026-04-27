import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Colors, Spacing } from "../constants";
import { useTheme } from "../store";
import { Typography } from "./Typography";

export type DateFilterType =
    | "all"
    | "today"
    | "yesterday"
    | "last7Days"
    | "lastMonth"
    | "custom";

export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

interface DateFilterProps {
    selectedFilter: DateFilterType;
    onFilterChange: (filter: DateFilterType) => void;
    customRange?: DateRange;
}

interface FilterChip {
    key: DateFilterType;
    icon?: keyof typeof Ionicons.glyphMap;
}

export const DateFilter: React.FC<DateFilterProps> = ({
    selectedFilter,
    onFilterChange,
    customRange,
}) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const filters: FilterChip[] = [
        { key: "all" },
        { key: "today" },
        { key: "yesterday" },
        { key: "last7Days" },
        { key: "lastMonth" },
        { key: "custom", icon: "calendar-outline" },
    ];

    const getFilterLabel = (key: DateFilterType): string => {
        return t(`reports.filter.${key}`);
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    const getCustomLabel = (): string => {
        if (customRange?.startDate && customRange?.endDate) {
            return `${formatDate(customRange.startDate)} - ${formatDate(customRange.endDate)}`;
        }
        return getFilterLabel("custom");
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {filters.map((filter) => {
                    const isSelected = selectedFilter === filter.key;
                    const isCustom = filter.key === "custom";
                    const showCustomLabel =
                        isCustom &&
                        customRange?.startDate &&
                        customRange?.endDate;

                    return (
                        <Pressable
                            key={filter.key}
                            onPress={() => onFilterChange(filter.key)}
                            style={[
                                styles.chip,
                                isSelected && [
                                    styles.chipSelected,
                                    { backgroundColor: colors.primary },
                                ],
                                !isSelected && [
                                    styles.chipUnselected,
                                    {
                                        backgroundColor: `${colors.primary}15`,
                                        borderColor: colors.border,
                                    },
                                ],
                                isCustom && showCustomLabel && styles.chipWide,
                            ]}
                        >
                            {filter.icon && (
                                <Ionicons
                                    name={filter.icon}
                                    size={14}
                                    color={
                                        isSelected ? "#FFFFFF" : colors.primary
                                    }
                                    style={styles.chipIcon}
                                />
                            )}
                            <Typography
                                variant="body-small"
                                style={{
                                    ...styles.chipText,
                                    color: isSelected
                                        ? "#FFFFFF"
                                        : colors.text.primary,
                                }}
                            >
                                {showCustomLabel
                                    ? getCustomLabel()
                                    : getFilterLabel(filter.key)}
                            </Typography>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: `${Colors.primary}15`,
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "transparent",
    },
    chipWide: {
        paddingHorizontal: Spacing.lg,
    },
    chipSelected: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    chipUnselected: {
        borderWidth: 1,
    },
    chipIcon: {
        marginRight: Spacing.xs,
    },
    chipText: {
        fontWeight: "600",
    },
});
