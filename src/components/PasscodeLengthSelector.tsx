import React from "react";
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
        <View>
            <Typography variant="subheading-small" style={styles.label}>
                {t("passcode.chooseLength")}
            </Typography>
            <View style={styles.options}>
                {([4, 6] as const).map((length) => (
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
                        <Typography color={value === length ? "primary" : "muted"}>
                            {t("passcode.digitOption", { count: length })}
                        </Typography>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    label: { marginBottom: Spacing.sm },
    options: { flexDirection: "row", gap: Spacing.sm },
    option: {
        flex: 1,
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: Spacing.md,
    },
});
