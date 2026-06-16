import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { I18nManager } from "react-native";
import { STORAGE_KEYS } from "../constants";
import i18n from "../i18n";
import { logger } from "../services/LogService";

type LanguageType = "en" | "ur";

interface LanguageContextType {
    language: LanguageType;
    setLanguage: (lang: LanguageType) => Promise<void>;
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
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);

        const loadLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem(
                    STORAGE_KEYS.appLanguage,
                );
                if (savedLang === "en" || savedLang === "ur") {
                    setLangState(savedLang);
                    i18n.changeLanguage(savedLang);
                }
            } catch (error) {
                void logger.error("navigation", "Failed to load language", error);
            } finally {
                setIsReady(true);
            }
        };
        loadLanguage();
    }, []);

    const setLanguage = async (lang: LanguageType) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.appLanguage, lang);
            setLangState(lang);
            i18n.changeLanguage(lang);
        } catch (error) {
            void logger.error("navigation", "Failed to set language", error);
        }
    };

    const value = useMemo(
        () => ({
            language,
            setLanguage,
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
