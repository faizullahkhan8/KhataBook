import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { PasscodeLength } from "../store/PasscodeContext";
import { useTheme } from "../store";
import { Spacing } from "../constants";
import { Typography } from "./Typography";

interface PasscodeLengthSelectorProps {
    value: PasscodeLength;
    onChange: (length: PasscodeLength) => void;
}

export const PasscodeLengthSelector: React.FC<PasscodeLengthSelectorProps> = ({
    value,
    onChange,
}) => {
    const { t } = useTranslation();
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <Typography variant="subheading-small">
                {t("passcode.chooseLength")}
            </Typography>
            <Typography variant="small-small" color="muted">
                {t("passcode.chooseLengthMessage")}
            </Typography>
            <View style={styles.options}>
                {([6] as const).map((length) => (
                    <Pressable
                        key={length}
                        onPress={() => onChange(length)}
                        style={[
                            styles.option,
                            {
                                borderColor: value === length ? colors.primary : colors.border,
                                backgroundColor: value === length ? `${colors.primary}12` : colors.surface,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.icon,
                                {
                                    backgroundColor:
                                        value === length
                                            ? `${colors.primary}18`
                                            : `${colors.text.muted}10`,
                                },
                            ]}
                        >
                            <Ionicons
                                name="keypad-outline"
                                size={22}
                                color={
                                    value === length
                                        ? colors.primary
                                        : colors.text.muted
                                }
                            />
                        </View>
                        <Typography
                            color={value === length ? "primary" : "muted"}
                            style={styles.optionText}
                        >
                            {t("passcode.digitOption", { count: length })}
                        </Typography>
                        <Ionicons
                            name={
                                value === length
                                    ? "checkmark-circle"
                                    : "ellipse-outline"
                            }
                            size={22}
                            color={
                                value === length
                                    ? colors.primary
                                    : colors.text.muted
                            }
                        />
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { gap: Spacing.sm },
    options: { gap: Spacing.sm },
    option: {
        minHeight: 68,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    optionText: { flex: 1 },
});
