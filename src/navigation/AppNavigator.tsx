import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import React from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../constants";
import { CustomersScreen, LedgerScreen, SettingsScreen } from "../screens";
import { useTheme } from "../store";

export type AppTabParamList = {
    Customers: undefined;
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
            offscreenPageLimit={1}
            overdrag={true}
            screenOptions={{
                swipeEnabled: true,
                animationEnabled: true,
                lazy: false,
                lazyPreloadDistance: 1,
                tabBarShowIcon: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text.muted,
                tabBarIndicatorStyle: {
                    display: "none", // Hide the glitchy animated indicator
                },
                tabBarStyle: {
                    position: "absolute",
                    bottom: insets.bottom + Spacing.sm,
                    left: Spacing.xl,
                    right: Spacing.xl,
                    height: 56,
                    paddingBottom: 0,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    borderTopWidth: 0,
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                },
                tabBarItemStyle: {
                    minHeight: 56,
                    paddingVertical: 4,
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
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={[
                                {
                                    width: 44,
                                    height: 30,
                                    borderRadius: 10,
                                    alignItems: "center",
                                    justifyContent: "center",
                                },
                                focused && {
                                    backgroundColor: `${colors.primary}18`,
                                },
                            ]}
                        >
                            <Ionicons
                                name="people"
                                size={20}
                                color={
                                    focused ? colors.primary : colors.text.muted
                                }
                            />
                        </View>
                    ),
                }}
            />

            <Tab.Screen
                name="Ledger"
                component={LedgerScreen}
                options={{
                    tabBarLabel: t("navigation.ledger"),
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={[
                                {
                                    width: 44,
                                    height: 30,
                                    borderRadius: 10,
                                    alignItems: "center",
                                    justifyContent: "center",
                                },
                                focused && {
                                    backgroundColor: `${colors.primary}18`,
                                },
                            ]}
                        >
                            <Ionicons
                                name="list"
                                size={20}
                                color={
                                    focused ? colors.primary : colors.text.muted
                                }
                            />
                        </View>
                    ),
                }}
            />

            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: t("navigation.settings"),
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={[
                                {
                                    width: 44,
                                    height: 30,
                                    borderRadius: 10,
                                    alignItems: "center",
                                    justifyContent: "center",
                                },
                                focused && {
                                    backgroundColor: `${colors.primary}18`,
                                },
                            ]}
                        >
                            <Ionicons
                                name="settings"
                                size={20}
                                color={
                                    focused ? colors.primary : colors.text.muted
                                }
                            />
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
