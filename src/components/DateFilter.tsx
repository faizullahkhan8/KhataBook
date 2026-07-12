import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Spacing } from "../constants";
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
        <View style={styles.wrapper}>
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
                                isSelected
                                    ? [
                                          styles.chipSelected,
                                          {
                                              backgroundColor: colors.primary,
                                              shadowColor: colors.primary,
                                              borderColor: colors.primary,
                                          },
                                      ]
                                    : [
                                          styles.chipUnselected,
                                          {
                                              backgroundColor: `${colors.primary}10`,
                                              borderColor: `${colors.primary}25`,
                                          },
                                      ],
                            ]}
                        >
                            {filter.icon && (
                                <Ionicons
                                    name={filter.icon}
                                    size={13}
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
                                        : colors.text.secondary,
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
    wrapper: {
        marginHorizontal: Spacing.md,
        marginBottom: 0,
    },
    scrollContent: {
        paddingVertical: Spacing.xs,
        gap: Spacing.xs,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
    },
    chipSelected: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    chipUnselected: {},
    chipIcon: {
        marginRight: 5,
    },
    chipText: {
        fontWeight: "600",
        fontSize: 13,
    },
});
