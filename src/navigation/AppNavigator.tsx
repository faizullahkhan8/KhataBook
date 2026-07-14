import { Spacing } from "@/constants";
import { CustomersScreen, LedgerScreen, SettingsScreen, RemindersScreen } from "@/screens";
import { useTheme } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createMaterialTopTabNavigator();

export const AppNavigator = () => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={{
                swipeEnabled: true,
                tabBarIndicatorStyle: {
                    display: "none",
                },
                tabBarStyle: {
                    position: "absolute",
                    bottom: Math.max(insets.bottom, Spacing.sm) + Spacing.sm,
                    left: Spacing.md,
                    right: Spacing.md,
                    height: 64,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text.muted,
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                    textTransform: "none",
                },
                tabBarItemStyle: {
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                },

            }}
        >
            <Tab.Screen
                name="Customers"
                component={CustomersScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="people" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Ledger"
                component={LedgerScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="book" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Reminders"
                component={RemindersScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="notifications" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="settings" size={22} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
