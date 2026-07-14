import { Spacing } from "@/constants";
import { CustomersScreen, LedgerScreen, SettingsScreen, RemindersScreen } from "@/screens";
import { useTheme } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { DeviceEventEmitter, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ABOUT_VISITED_KEY = "khatabook.aboutDeveloperVisited_banner";

const Tab = createMaterialTopTabNavigator();

export const AppNavigator = () => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [hasVisitedAbout, setHasVisitedAbout] = useState(true);

    useEffect(() => {
        const checkAboutVisited = async () => {
            const stored = await AsyncStorage.getItem(ABOUT_VISITED_KEY);
            if (stored !== "true") {
                setHasVisitedAbout(false);
            }
        };
        void checkAboutVisited();

        const sub = DeviceEventEmitter.addListener("aboutVisited", () => {
            setHasVisitedAbout(true);
        });
        return () => sub.remove();
    }, []);

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
                        <View>
                            <Ionicons name="settings" size={22} color={color} />
                            {!hasVisitedAbout && (
                                <View
                                    style={{
                                        position: "absolute",
                                        right: -6,
                                        top: -4,
                                        backgroundColor: colors.danger,
                                        width: 14,
                                        height: 14,
                                        borderRadius: 7,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#FFF",
                                            fontWeight: "bold",
                                            fontSize: 8,
                                        }}
                                    >
                                        1
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
