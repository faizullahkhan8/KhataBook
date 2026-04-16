import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Typography } from "../components";
import { Colors, Spacing } from "../constants";
import {
    AboutScreen,
    CustomersScreen,
    LedgerScreen,
    ReportsScreen,
} from "../screens";

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    paddingBottom: Spacing.sm + insets.bottom,
                    paddingTop: Spacing.sm,
                    height: 60 + insets.bottom,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.text.muted,
            }}
        >
            <Tab.Screen
                name="Customers"
                component={CustomersScreen}
                options={{
                    tabBarLabel: ({ color }) => (
                        <Typography
                            variant="small-small"
                            color={
                                color === Colors.primary
                                    ? ("primary" as any)
                                    : "muted"
                            }
                        >
                            Customers
                        </Typography>
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Reports"
                component={ReportsScreen}
                options={{
                    tabBarLabel: ({ color }) => (
                        <Typography
                            variant="small-small"
                            color={
                                color === Colors.primary
                                    ? ("primary" as any)
                                    : "muted"
                            }
                        >
                            Reports
                        </Typography>
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bar-chart" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Ledger"
                component={LedgerScreen}
                options={{
                    tabBarLabel: ({ color }) => (
                        <Typography
                            variant="small-small"
                            color={
                                color === Colors.primary
                                    ? ("primary" as any)
                                    : "muted"
                            }
                        >
                            Ledger
                        </Typography>
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="About"
                component={AboutScreen}
                options={{
                    tabBarLabel: ({ color }) => (
                        <Typography
                            variant="small-small"
                            color={
                                color === Colors.primary
                                    ? ("primary" as any)
                                    : "muted"
                            }
                        >
                            About
                        </Typography>
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="information-circle"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
