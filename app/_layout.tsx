import { Stack } from "expo-router";
import { DatabaseProvider } from "../src/store";

export default function RootLayout() {
    return (
        <DatabaseProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen
                    name="customer-transactions"
                    options={{ headerShown: false }}
                />
            </Stack>
        </DatabaseProvider>
    );
}
