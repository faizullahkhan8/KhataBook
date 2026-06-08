import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../constants";
import {
    CustomersScreen,
    LedgerScreen,
    MessagesScreen,
    ReportsScreen,
    SettingsScreen,
} from "../screens";

import { useTheme } from "../store";

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    paddingBottom: Spacing.sm + insets.bottom,
                    paddingTop: Spacing.sm,
                    height: 60 + insets.bottom,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text.muted,
            }}
        >
            <Tab.Screen
                name="Customers"
                component={CustomersScreen}
                options={{
                    tabBarLabel: t("navigation.customers"),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Reports"
                component={ReportsScreen}
                options={{
                    tabBarLabel: t("navigation.reports"),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bar-chart" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Messages"
                component={MessagesScreen}
                options={{
                    tabBarLabel: t("navigation.messages"),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="chatbubble-ellipses"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="Ledger"
                component={LedgerScreen}
                options={{
                    tabBarLabel: t("navigation.ledger"),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: t("navigation.settings"),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="settings"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
