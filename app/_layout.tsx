import { Stack } from "expo-router";
import { DatabaseProvider, ThemeProvider, LanguageProvider } from "@/store";

export default function RootLayout() {
    return (
        <LanguageProvider>
            <ThemeProvider>
                <DatabaseProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="customer-transactions"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="about"
                            options={{ headerShown: false }}
                        />
                    </Stack>
                </DatabaseProvider>
            </ThemeProvider>
        </LanguageProvider>
    );
}
