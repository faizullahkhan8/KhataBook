import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../constants";
import { useTheme } from "../store";
import { Button } from "./Button";
import { Typography } from "./Typography";

type ErrorType = "database" | "network" | "general" | "loading";

interface ErrorScreenProps {
    error?: Error | null;
    type?: ErrorType;
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryText?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    children?: React.ReactNode;
    isLoading?: boolean;
    loadingText?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
    error,
    type = "general",
    title,
    message,
    onRetry,
    retryText,
    icon,
    children,
    isLoading = false,
    loadingText,
}) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    // If no error and not loading, render children
    if (!error && !isLoading) {
        return <>{children}</>;
    }

    const getIcon = (): keyof typeof Ionicons.glyphMap => {
        if (icon) return icon;
        if (isLoading) return "hourglass-outline";
        switch (type) {
            case "database":
                return "server-outline";
            case "network":
                return "wifi-outline";
            default:
                return "alert-circle-outline";
        }
    };

    const getTitle = (): string => {
        if (title) return title;
        if (isLoading) return t("common.loading", "Loading...");
        return t("common.errorTitle", "Oops!");
    };

    const getMessage = (): string => {
        if (message) return message;
        if (isLoading) return loadingText || "";
        switch (type) {
            case "database":
                return t(
                    "common.databaseError",
                    "Something went wrong with the database. Please try again.",
                );
            case "network":
                return t(
                    "common.networkError",
                    "Network connection failed. Please check your internet.",
                );
            default:
                return t(
                    "common.generalError",
                    "Something went wrong. Please try again.",
                );
        }
    };

    const getRetryText = (): string => {
        return retryText || t("common.retry", "Retry");
    };

    const iconName = getIcon();
    const iconColor = isLoading ? colors.primary : colors.danger;

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <View style={styles.content}>
                <Ionicons
                    name={iconName}
                    size={64}
                    color={iconColor}
                    style={styles.icon}
                />
                <Typography
                    variant="heading-small"
                    color={isLoading ? "primary" : "danger"}
                    style={styles.title}
                >
                    {getTitle()}
                </Typography>
                {getMessage() ? (
                    <Typography
                        variant="body-medium"
                        color="muted"
                        style={styles.message}
                    >
                        {getMessage()}
                    </Typography>
                ) : null}
                {onRetry && !isLoading && (
                    <Button
                        title={getRetryText()}
                        onPress={onRetry}
                        style={styles.button}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.xxl,
    },
    icon: {
        marginBottom: Spacing.lg,
    },
    title: {
        marginBottom: Spacing.sm,
        textAlign: "center",
    },
    message: {
        textAlign: "center",
        marginBottom: Spacing.lg,
        maxWidth: 300,
    },
    button: {
        minWidth: 140,
    },
});
