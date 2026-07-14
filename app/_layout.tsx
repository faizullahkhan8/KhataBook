import { Stack } from "expo-router";
import {
    DatabaseProvider,
    ThemeProvider,
    LanguageProvider,
    PasscodeProvider,
    StoreProvider,
} from "@/store";
import { DatabaseSecurityGate, PasscodeGate } from "@/components";
import { GoogleAuthProvider } from "../src/context/GoogleAuthContext";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function RootLayout() {
    useEffect(() => {
        const setupNotifications = async () => {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('reminders-high', {
                    name: 'Reminders',
                    importance: 4, // AndroidImportance.HIGH
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
        };
        setupNotifications();
    }, []);

    return (
        <GoogleAuthProvider>
            <LanguageProvider>
            <ThemeProvider>
                <DatabaseProvider>
                    <DatabaseSecurityGate>
                        <StoreProvider>
                            <PasscodeProvider>
                                <PasscodeGate>
                                    <Stack
                                        screenOptions={{
                                            headerShown: false,
                                            animation: "slide_from_right",
                                            gestureEnabled: true,
                                        }}
                                    >
                                    <Stack.Screen
                                        name="index"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="onboarding"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="add-transaction"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="transaction-detail"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="customer-transactions"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="customer-profile"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="about"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="privacy-policy"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="terms-of-use"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="passcode"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="feedback"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="developer-options"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="logs"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="reminders"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="add-reminder"
                                        options={{ headerShown: false, presentation: 'modal' }}
                                    />
                                    <Stack.Screen
                                        name="settings/trash"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="settings/backup"
                                        options={{ headerShown: false }}
                                    />
                                </Stack>
                            </PasscodeGate>
                        </PasscodeProvider>
                        </StoreProvider>
                    </DatabaseSecurityGate>
                </DatabaseProvider>
            </ThemeProvider>
        </LanguageProvider>
        </GoogleAuthProvider>
    );
}
