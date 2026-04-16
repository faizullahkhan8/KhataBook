import React from "react";
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";
import { Colors, Spacing, Typography } from "../constants";

interface InputProps extends Omit<TextInputProps, "style"> {
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    error?: boolean;
}

export const Input: React.FC<InputProps> = ({
    containerStyle,
    inputStyle,
    error = false,
    ...props
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            <TextInput
                style={[
                    styles.input,
                    {
                        borderColor: error
                            ? Colors.danger
                            : Colors.input.border,
                    },
                    inputStyle,
                ]}
                placeholderTextColor={Colors.input.placeholder}
                {...props}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    input: {
        backgroundColor: Colors.input.background,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.body.medium,
        color: Colors.text.primary,
        minHeight: 44,
    },
});
