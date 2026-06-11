import { Stack } from "expo-router";
import { DatabaseProvider, ThemeProvider, LanguageProvider, PasscodeProvider } from "@/store";
import { PasscodeGate } from "@/components";

export default function RootLayout() {
    return (
        <LanguageProvider>
            <ThemeProvider>
                <PasscodeProvider>
                    <DatabaseProvider>
                        <PasscodeGate>
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen
                                    name="index"
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
                            </Stack>
                        </PasscodeGate>
                    </DatabaseProvider>
                </PasscodeProvider>
            </ThemeProvider>
        </LanguageProvider>
    );
}
