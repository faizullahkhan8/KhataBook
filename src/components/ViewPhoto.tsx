import { Ionicons } from "@expo/vector-icons";
import { Image, ImageProps } from "expo-image";
import React, { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { Spacing } from "../constants";
import { usePasscode, useTheme } from "../store";

interface ViewPhotoProps {
    source: ImageProps["source"];
    children: React.ReactNode;
    enabled?: boolean;
    accessibilityLabel: string;
    closeAccessibilityLabel: string;
}

export const ViewPhoto: React.FC<ViewPhotoProps> = ({
    source,
    children,
    enabled = true,
    accessibilityLabel,
    closeAccessibilityLabel,
}) => {
    const { colors } = useTheme();
    const { setAutoLockSuspended } = usePasscode();
    const { width, height } = useWindowDimensions();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setAutoLockSuspended(true);
        return () => setAutoLockSuspended(false);
    }, [setAutoLockSuspended, visible]);

    const close = () => setVisible(false);

    return (
        <>
            <Pressable
                accessibilityRole={enabled ? "button" : undefined}
                accessibilityLabel={enabled ? accessibilityLabel : undefined}
                disabled={!enabled}
                onPress={(event) => {
                    event.stopPropagation();
                    setVisible(true);
                }}
            >
                {children}
            </Pressable>
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={close}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={closeAccessibilityLabel}
                    onPress={close}
                    style={styles.backdrop}
                >
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        style={[
                            styles.frame,
                            {
                                width: Math.min(width - Spacing.xxxl, 520),
                                height: Math.min(height * 0.68, 650),
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Image
                            source={source}
                            style={styles.image}
                            contentFit="contain"
                            transition={200}
                            cachePolicy="memory-disk"
                        />
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={closeAccessibilityLabel}
                            onPress={close}
                            hitSlop={Spacing.sm}
                            style={[
                                styles.closeButton,
                                { backgroundColor: colors.surface },
                            ]}
                        >
                            <Ionicons
                                name="close"
                                size={24}
                                color={colors.text.primary}
                            />
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.lg,
        backgroundColor: "#000000B8",
    },
    frame: {
        maxWidth: "100%",
        borderWidth: 1,
        borderRadius: 16,
        padding: Spacing.sm,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 12,
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 10,
    },
    closeButton: {
        position: "absolute",
        top: Spacing.md,
        right: Spacing.md,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },
});
