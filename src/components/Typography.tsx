import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, TextProps } from "react-native";
import { Typography as TypographySizes } from "../constants";
import { useTheme } from "../store";

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

interface TypographyProps extends TextProps {
    children: React.ReactNode;
    variant?: TypographyVariant;
    color?:
        | "primary"
        | "secondary"
        | "muted"
        | "success"
        | "danger"
        | "warning";
}

export const Typography: React.FC<TypographyProps> = React.memo(
    ({
        children,
        variant = "body-medium",
        color = "primary",
        style,
        ...rest
    }) => {
        const { colors } = useTheme();

        const getFontSize = (): number => {
            switch (variant) {
                case "heading-large":
                    return TypographySizes.heading.large;
                case "heading-medium":
                    return TypographySizes.heading.medium;
                case "heading-small":
                    return TypographySizes.heading.small;
                case "subheading-large":
                    return TypographySizes.subheading.large;
                case "subheading-small":
                    return TypographySizes.subheading.small;
                case "body-large":
                    return TypographySizes.body.large;
                case "body-medium":
                    return TypographySizes.body.medium;
                case "body-small":
                    return TypographySizes.body.small;
                case "small-large":
                    return TypographySizes.small.large;
                case "small-small":
                    return TypographySizes.small.small;
                default:
                    return TypographySizes.body.medium;
            }
        };

        const getFontWeight = (): "400" | "500" | "600" | "700" => {
            if (variant.startsWith("heading")) {
                return "700";
            }
            if (variant.startsWith("subheading")) {
                return "600";
            }
            return "400";
        };

        return (
            <Text
                style={[
                    styles.text,
                    {
                        fontSize: getFontSize(),
                        fontWeight: getFontWeight(),
                        color: colors.text[color],
                    },
                    style,
                ]}
                {...rest}
            >
                {children}
            </Text>
        );
    },
);

Typography.displayName = "Typography";

const styles = StyleSheet.create({
    text: {
        flexWrap: "wrap",
    },
});
