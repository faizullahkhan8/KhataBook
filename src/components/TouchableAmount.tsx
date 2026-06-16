import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { LayoutAnimation, Pressable, TextStyle } from "react-native";
import { Colors } from "../constants";
import { formatCompactCurrency, formatCurrency, fromInteger } from "../utils";
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

const TouchableAmountComponent: React.FC<TouchableAmountProps> = ({
    amount,
    variant = "body-medium",
    color = "primary",
    style,
    numberOfLines = 1,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const decimal = useMemo(() => fromInteger(amount), [amount]);
    const absAmount = useMemo(() => Math.abs(decimal), [decimal]);
    const shouldAllowToggle = absAmount >= 1_000_000;

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const handlePress = useCallback(() => {
        if (!shouldAllowToggle) return;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(true);

        timerRef.current = setTimeout(() => {
            LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
            );
            setIsExpanded(false);
            timerRef.current = null;
        }, 5000);
    }, [shouldAllowToggle]);

    const displayValue = useMemo(
        () =>
            isExpanded ? formatCurrency(amount) : formatCompactCurrency(amount),
        [amount, isExpanded],
    );

    return (
        <Pressable
            onPress={handlePress}
            disabled={!shouldAllowToggle}
            accessibilityRole={shouldAllowToggle ? "button" : undefined}
        >
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

TouchableAmountComponent.displayName = "TouchableAmount";

export const TouchableAmount = React.memo(TouchableAmountComponent);

TouchableAmount.displayName = "TouchableAmount";
