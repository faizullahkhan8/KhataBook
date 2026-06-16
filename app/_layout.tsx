import { Stack } from "expo-router";
import {
    DatabaseProvider,
    ThemeProvider,
    LanguageProvider,
    PasscodeProvider,
} from "@/store";
import { DatabaseSecurityGate, PasscodeGate } from "@/components";

export default function RootLayout() {
    return (
        <LanguageProvider>
            <ThemeProvider>
                <DatabaseProvider>
                    <DatabaseSecurityGate>
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
                                </Stack>
                            </PasscodeGate>
                        </PasscodeProvider>
                    </DatabaseSecurityGate>
                </DatabaseProvider>
            </ThemeProvider>
        </LanguageProvider>
    );
}
