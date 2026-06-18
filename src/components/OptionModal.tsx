import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { Spacing } from "../constants";
import { usePasscode, useTheme } from "../store";
import { Typography } from "./Typography";

export interface Option<T extends string | number = string> {
    value: T;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
}

interface OptionModalProps<T extends string | number> {
    visible: boolean;
    title: string;
    options: Option<T>[];
    selected?: T | null;
    showSelectionIndicator?: boolean;
    onSelect: (value: T) => void;
    onClose: () => void;
}

export const OptionModal = <T extends string | number>({
    visible,
    title,
    options,
    selected,
    showSelectionIndicator = true,
    onSelect,
    onClose,
}: OptionModalProps<T>) => {
    const { colors } = useTheme();
    const { setAutoLockSuspended } = usePasscode();
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        setAutoLockSuspended(true);
        return () => setAutoLockSuspended(false);
    }, [setAutoLockSuspended, visible]);

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 80,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, scaleAnim, opacityAnim]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.85,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const handleSelect = (value: T) => {
        onSelect(value);
        handleClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={styles.root}>
                <Animated.View
                    style={[
                        styles.overlay,
                        {
                            opacity: opacityAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 1],
                            }),
                        },
                    ]}
                />
                <Pressable onPress={handleClose} style={styles.backdropTouch} />
                <View style={styles.centeredContent} pointerEvents="box-none">
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={styles.modalWrapper}
                    >
                        <Animated.View
                            style={[
                                styles.animatedWrapper,
                                {
                                    transform: [{ scale: scaleAnim }],
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.sheet,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: colors.border,
                                        shadowColor: "#000",
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.handle,
                                        { backgroundColor: colors.text.muted },
                                    ]}
                                />
                                <Typography
                                    variant="heading-medium"
                                    color="primary"
                                    style={styles.title}
                                >
                                    {title}
                                </Typography>
                                <View
                                    style={[
                                        styles.optionsList,
                                        { borderColor: colors.border },
                                    ]}
                                >
                                    {options.map((option, index) => {
                                        const isSelected =
                                            selected === option.value;
                                        const isDisabled = Boolean(
                                            option.disabled,
                                        );
                                        return (
                                            <Pressable
                                                key={option.value}
                                                disabled={isDisabled}
                                                onPress={() =>
                                                    handleSelect(option.value)
                                                }
                                                style={[
                                                    styles.option,
                                                    isDisabled &&
                                                        styles.optionDisabled,
                                                    isSelected && {
                                                        backgroundColor: `${colors.primary}10`,
                                                    },
                                                    index <
                                                        options.length - 1 && {
                                                        borderBottomWidth: 1,
                                                        borderBottomColor:
                                                            colors.border,
                                                    },
                                                ]}
                                            >
                                                {option.icon && (
                                                    <Ionicons
                                                        name={option.icon}
                                                        size={20}
                                                        color={
                                                            isDisabled
                                                                ? colors.text
                                                                      .muted
                                                                : isSelected
                                                                  ? colors.primary
                                                                  : colors.text
                                                                        .muted
                                                        }
                                                    />
                                                )}
                                                <Typography
                                                    variant="body-medium"
                                                    color={
                                                        isDisabled
                                                            ? "muted"
                                                            : isSelected
                                                              ? "primary"
                                                              : "secondary"
                                                    }
                                                    style={styles.optionText}
                                                >
                                                    {option.label}
                                                </Typography>
                                                {showSelectionIndicator &&
                                                    !isDisabled && (
                                                    <Ionicons
                                                        name={
                                                            isSelected
                                                                ? "checkmark-circle"
                                                                : "ellipse-outline"
                                                        }
                                                        size={22}
                                                        color={
                                                            isSelected
                                                                ? colors.primary
                                                                : colors.text
                                                                      .muted
                                                        }
                                                    />
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </Animated.View>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    backdropTouch: {
        ...StyleSheet.absoluteFillObject,
    },
    centeredContent: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    modalWrapper: {
        width: "90%",
        maxWidth: 340,
        alignItems: "center",
    },
    animatedWrapper: {
        width: "100%",
        alignItems: "center",
    },
    sheet: {
        width: "100%",
        borderRadius: 20,
        borderWidth: 1,
        paddingBottom: Spacing.md,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: Spacing.sm,
        opacity: 0.4,
    },
    title: {
        textAlign: "center",
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
    },
    optionsList: {
        borderTopWidth: 1,
        marginHorizontal: 0,
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        minHeight: 52,
    },
    optionDisabled: {
        opacity: 0.45,
    },
    optionText: {
        flex: 1,
    },
});
