import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";
import { Colors, Typography as TypographySizes } from "../constants";

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

interface TypographyProps {
    children: React.ReactNode;
    variant?: TypographyVariant;
    color?: keyof typeof Colors.text;
    style?: TextStyle;
    numberOfLines?: number;
}

export const Typography: React.FC<TypographyProps> = React.memo(({
    children,
    variant = "body-medium",
    color = "primary",
    style,
    numberOfLines,
}) => {
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
                    color: Colors.text[color],
                },
                style,
            ]}
            numberOfLines={numberOfLines}
        >
            {children}
        </Text>
    );
});

const styles = StyleSheet.create({
    text: {
        flexWrap: "wrap",
    },
});
