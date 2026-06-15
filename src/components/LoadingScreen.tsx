import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Spacing } from "../constants";
import { useTheme } from "../store";
import { Typography } from "./Typography";

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 1100,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );

        animation.start();
        return () => animation.stop();
    }, [rotation]);

    const rotate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={[
                    styles.panel,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        shadowColor: colors.primary,
                    },
                ]}
            >
                <View style={styles.logoContainer}>
                    <Animated.View
                        style={[
                            styles.loadingRing,
                            {
                                borderColor: `${colors.primary}35`,
                                borderTopColor: colors.primary,
                                borderRightColor: colors.primary,
                                transform: [{ rotate }],
                            },
                        ]}
                    />
                    <Image
                        source={require("../../assets/images/app-logo.png")}
                        style={styles.logo}
                        contentFit="cover"
                    />
                </View>
                <Typography
                    variant="body-medium"
                    color="secondary"
                    style={styles.message}
                >
                    {message || t("common.loading", "Loading...")}
                </Typography>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.xxl,
    },
    panel: {
        width: "100%",
        maxWidth: 380,
        minHeight: 104,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.lg,
        borderWidth: 1,
        borderRadius: 16,
        padding: Spacing.lg,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 5,
    },
    logoContainer: {
        width: 68,
        height: 68,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    loadingRing: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 3,
        borderRadius: 34,
    },
    logo: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    message: {
        flex: 1,
    },
});
