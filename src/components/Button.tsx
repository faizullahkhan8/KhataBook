import React, { useMemo } from "react";
import {
    Pressable,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from "react-native";
import { Spacing, Typography } from "../constants";
import { useTheme } from "../store";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = React.memo(({
    title,
    onPress,
    variant = "primary",
    disabled = false,
    style,
    textStyle,
}) => {
    const { colors } = useTheme();

    const backgroundColor = useMemo(() => {
        if (disabled) return colors.border;
        switch (variant) {
            case "primary":
                return colors.button.primary;
            case "secondary":
                return colors.button.secondary;
            case "danger":
                return colors.button.danger;
            default:
                return colors.button.primary;
        }
    }, [variant, disabled, colors]);

    const borderColor = useMemo(() => {
        if (variant === "secondary") return colors.primary;
        return "transparent";
    }, [variant, colors]);

    const textColor = useMemo(() => {
        if (disabled) return colors.text.muted;
        if (variant === "secondary") return colors.primary;
        return "#FFFFFF";
    }, [variant, disabled, colors]);

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.button,
                {
                    backgroundColor,
                    borderColor,
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}
        >
            <Text
                style={[
                    styles.text,
                    {
                        color: textColor,
                    },
                    textStyle,
                ]}
            >
                {title}
            </Text>
        </Pressable>
    );
});

Button.displayName = "Button";

const styles = StyleSheet.create({
    button: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
    },
    text: {
        fontSize: Typography.body.medium,
        fontWeight: Typography.weight.semibold,
    },
});
