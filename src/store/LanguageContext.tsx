import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { I18nManager } from "react-native";
import i18n from "../i18n";

type LanguageType = "en" | "ur";

interface LanguageContextType {
    language: LanguageType;
    setLanguage: (lang: LanguageType) => Promise<void>;
    isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
    undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [language, setLangState] = useState<LanguageType>("en");
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem("appLanguage");
                if (savedLang === "en" || savedLang === "ur") {
                    setLangState(savedLang);
                    i18n.changeLanguage(savedLang);
                    const shouldBeRTL = savedLang === "ur";
                    if (I18nManager.isRTL !== shouldBeRTL) {
                        I18nManager.allowRTL(true);
                        I18nManager.forceRTL(shouldBeRTL);
                        // RTL change requires app restart - will apply on next launch
                    }
                }
            } catch (error) {
                console.error("Failed to load language", error);
            } finally {
                setIsReady(true);
            }
        };
        loadLanguage();
    }, []);

    const setLanguage = async (lang: LanguageType) => {
        try {
            const shouldBeRTL = lang === "ur";
            const currentRTL = I18nManager.isRTL;

            await AsyncStorage.setItem("appLanguage", lang);
            setLangState(lang);
            i18n.changeLanguage(lang);

            if (currentRTL !== shouldBeRTL) {
                I18nManager.allowRTL(true);
                I18nManager.forceRTL(shouldBeRTL);
                // RTL change requires app restart - will apply on next launch
            }
        } catch (error) {
            console.error("Failed to set language", error);
        }
    };

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            isRTL: language === "ur",
        }),
        [language],
    );

    // Don't render until initial language is loaded to prevent flicker
    if (!isReady) return null;

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
