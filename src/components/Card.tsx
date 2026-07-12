import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Spacing } from "../constants";
import { useTheme } from "../store";

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
}

export const Card: React.FC<CardProps> = React.memo(({ children, style }) => {
    const { colors } = useTheme();

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
});

Card.displayName = "Card";

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: Spacing.lg,
        borderWidth: 1,
    },
});
