import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
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

export type AppTabParamList = {
    Customers: undefined;
    Reports: undefined;
    Messages: undefined;
    Ledger: undefined;
    Settings: undefined;
};

const Tab = createMaterialTopTabNavigator<AppTabParamList>();

export const AppNavigator: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={{
                swipeEnabled: true,
                animationEnabled: true,
                lazy: false,
                tabBarShowIcon: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text.muted,
                tabBarIndicatorStyle: {
                    top: 0,
                    height: 2,
                    backgroundColor: colors.primary,
                },
                tabBarStyle: {
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom,
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    elevation: 0,
                },
                tabBarItemStyle: {
                    minHeight: 60,
                    paddingVertical: Spacing.xs,
                },
                tabBarLabelStyle: {
                    margin: 0,
                    fontSize: 10,
                    textTransform: "none",
                },
            }}
        >
            <Tab.Screen
                name="Customers"
                component={CustomersScreen}
                options={{
                    tabBarLabel: t("navigation.customers"),
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="people" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Reports"
                component={ReportsScreen}
                options={{
                    tabBarLabel: t("navigation.reports"),
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="bar-chart" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Messages"
                component={MessagesScreen}
                options={{
                    tabBarLabel: t("navigation.messages"),
                    tabBarIcon: ({ color }) => (
                        <Ionicons
                            name="chatbubble-ellipses"
                            size={22}
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
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="list" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: t("navigation.settings"),
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="settings" size={22} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
