import React, { useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from "react-native";
import { Spacing } from "../constants";
import { useTheme } from "../store";

type PinLength = 4 | 6 | 8;

interface PasscodePinInputProps extends Omit<
    TextInputProps,
    "keyboardType" | "secureTextEntry" | "maxLength"
> {
    length: PinLength;
    visibleByDefault?: boolean;
    showVisibilityToggle?: boolean;
    error?: boolean;
    shakeTrigger?: number;
}

export const PasscodePinInput: React.FC<PasscodePinInputProps> = ({
    length,
    value = "",
    placeholder,
    onChangeText,
    autoFocus,
    visibleByDefault = false,
    showVisibilityToggle = true,
    error = false,
    shakeTrigger = 0,
    ...props
}) => {
    const { colors } = useTheme();
    const inputRef = useRef<TextInput>(null);
    const [isVisible] = useState(visibleByDefault);
    const shake = useRef(new Animated.Value(0)).current;
    const pin = String(value).slice(0, length);

    React.useEffect(() => {
        if (!shakeTrigger) return;
        Animated.sequence([
            Animated.timing(shake, {
                toValue: -10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shake, {
                toValue: 10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shake, {
                toValue: -8,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shake, {
                toValue: 8,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shake, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, [shake, shakeTrigger]);

    return (
        <View>
            {/* {Boolean(placeholder) && (
                <Typography
                    variant="small-small"
                    color="muted"
                    style={styles.label}
                >
                    {placeholder}
                </Typography>
            )} */}
            <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Pressable
                    onPress={() => inputRef.current?.focus()}
                    style={[
                        styles.row,
                        length === 4
                            ? styles.rowFour
                            : length === 6
                              ? styles.rowSix
                              : styles.rowEight,
                    ]}
                    accessibilityRole="button"
                >
                    {Array.from({ length }, (_, index) => {
                        const digit = pin[index];
                        const isActive = pin.length === index;
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.box,
                                    length === 4
                                        ? styles.boxFour
                                        : length === 6
                                          ? styles.boxSix
                                          : styles.boxEight,
                                    {
                                        borderColor: error
                                            ? colors.danger
                                            : isActive
                                              ? colors.primary
                                              : colors.input.border,
                                        backgroundColor:
                                            colors.input.background,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.digit,
                                        { color: colors.text.primary },
                                    ]}
                                >
                                    {digit ? (isVisible ? digit : "•") : ""}
                                </Text>
                            </View>
                        );
                    })}
                    <TextInput
                        ref={inputRef}
                        value={pin}
                        placeholder="*"
                        onChangeText={(text) =>
                            onChangeText?.(
                                text.replace(/\D/g, "").slice(0, length),
                            )
                        }
                        keyboardType="number-pad"
                        maxLength={length}
                        autoFocus={autoFocus}
                        style={styles.hiddenInput}
                        caretHidden
                        {...props}
                    />
                </Pressable>
            </Animated.View>
            {/* {showVisibilityToggle && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isVisible ? "Hide PIN" : "Show PIN"}
                    onPress={() => setIsVisible((visible) => !visible)}
                    style={styles.toggle}
                    hitSlop={Spacing.sm}
                >
                    <Ionicons
                        name={isVisible ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.text.muted}
                    />
                </Pressable>
            )} */}
        </View>
    );
};

const styles = StyleSheet.create({
    label: { marginBottom: Spacing.sm },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        position: "relative",
        width: "100%",
    },
    rowFour: { gap: Spacing.lg },
    rowSix: { gap: Spacing.sm },
    rowEight: { gap: Spacing.xs },
    box: {
        height: 52,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    boxFour: { width: 48 },
    boxSix: { width: 42 },
    boxEight: { width: 34 },
    digit: { fontSize: 22, fontWeight: "600" },
    hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
    toggle: {
        alignSelf: "flex-end",
        padding: Spacing.sm,
        marginTop: Spacing.xs,
    },
});
