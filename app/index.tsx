import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import { AppNavigator } from "@/navigation/AppNavigator";
import { LoadingScreen } from "@/components";
import { STORAGE_KEYS } from "@/constants";

export default function Index() {
    const router = useRouter();
    const [isReady, setIsReady] = React.useState(false);
    const [isOnboardingComplete, setIsOnboardingComplete] =
        React.useState(false);

    React.useEffect(() => {
        let mounted = true;

        const loadOnboardingState = async () => {
            const completed = await AsyncStorage.getItem(
                STORAGE_KEYS.onboardingCompleted,
            );
            if (!mounted) return;
            const nextComplete = completed === "true";
            setIsOnboardingComplete(nextComplete);
            setIsReady(true);
            if (!nextComplete) {
                router.replace("/onboarding" as any);
            }
        };

        void loadOnboardingState();

        return () => {
            mounted = false;
        };
    }, [router]);

    if (!isReady) return <LoadingScreen />;
    if (!isOnboardingComplete) return null;

    return <AppNavigator />;
}
