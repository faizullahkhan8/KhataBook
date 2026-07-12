import React from "react";
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";
import { Spacing, Typography } from "../constants";
import { useTheme } from "../store";

interface InputProps extends Omit<TextInputProps, "style"> {
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    error?: boolean;
}

export const Input: React.FC<InputProps> = React.memo(({
    containerStyle,
    inputStyle,
    error = false,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    autoCapitalize,
    multiline,
    ...rest
}) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, containerStyle]}>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: colors.input.background,
                        borderColor: error
                            ? colors.danger
                            : colors.input.border,
                        color: colors.text.primary,
                    },
                    inputStyle,
                ]}
                placeholderTextColor={colors.input.placeholder}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                multiline={multiline}
                {...rest}
            />
        </View>
    );
});

Input.displayName = "Input";

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.body.medium,
        minHeight: 44,
    },
});
