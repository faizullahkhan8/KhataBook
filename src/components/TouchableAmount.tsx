import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, TextStyle } from "react-native";
import { Colors } from "../constants";
import { formatCompactCurrency, formatCurrency } from "../utils";
import { Typography } from "./Typography";

type TypographyVariant =
    | "heading-large"
    | "heading-medium"
    | "heading-small"
    | "subheading-large"
    | "subheading-small"
    | "body-large"
    | "body-medium"
    | "body-small"
    | "small-large"
    | "small-small";

type TextColor = keyof typeof Colors.text;

interface TouchableAmountProps {
    amount: number;
    variant?: TypographyVariant;
    color?: TextColor;
    style?: TextStyle;
    numberOfLines?: number;
}

export const TouchableAmount: React.FC<TouchableAmountProps> = ({
    amount,
    variant = "body-medium",
    color = "primary",
    style,
    numberOfLines = 1,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Only allow expansion if amount is large enough to be compacted
    const absAmount = Math.abs(amount);
    const shouldAllowToggle = absAmount >= 1_000_000;

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const handlePress = useCallback(() => {
        if (shouldAllowToggle) {
            // Clear any existing timer
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            // Expand
            setIsExpanded(true);

            // Auto-collapse after 5 seconds
            timerRef.current = setTimeout(() => {
                setIsExpanded(false);
            }, 5000);
        }
    }, [shouldAllowToggle]);

    const displayValue = isExpanded
        ? formatCurrency(amount)
        : formatCompactCurrency(amount);

    return (
        <Pressable onPressOut={handlePress} disabled={!shouldAllowToggle}>
            <Typography
                variant={variant}
                color={color}
                style={style}
                numberOfLines={isExpanded ? 2 : numberOfLines}
            >
                {displayValue}
            </Typography>
        </Pressable>
    );
};
