import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useState,
    useMemo,
    useEffect,
} from "react";
import { Appearance, StatusBar } from "react-native";
import { LightTheme, DarkTheme } from "../constants/Colors";
import { STORAGE_KEYS } from "../constants/StorageKeys";
import { logger } from "../services/LogService";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
    theme: "light" | "dark";
    mode: ThemeMode;
    colors: typeof LightTheme;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [mode, setModeState] = useState<ThemeMode>("light");
    const [isReady, setIsReady] = useState(false);
    const [systemTheme, setSystemTheme] = useState(Appearance.getColorScheme() || "light");

    useEffect(() => {
        const loadThemeMode = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(
                    STORAGE_KEYS.themeMode,
                );
                if (
                    savedMode === "light" ||
                    savedMode === "dark" ||
                    savedMode === "system"
                ) {
                    setModeState(savedMode);
                }
            } catch (error) {
                void logger.error("navigation", "Failed to load theme", error);
            } finally {
                setIsReady(true);
            }
        };

        void loadThemeMode();
    }, []);

    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setSystemTheme(colorScheme || "light");
        });
        return () => subscription.remove();
    }, []);

    const theme = useMemo(() => {
        if (mode === "system") return systemTheme as "light" | "dark";
        return mode;
    }, [mode, systemTheme]);

    const colors = useMemo(() => (theme === "light" ? LightTheme : DarkTheme), [theme]);

    useEffect(() => {
        StatusBar.setBarStyle(theme === "light" ? "dark-content" : "light-content");
        StatusBar.setBackgroundColor(colors.background);
    }, [colors.background, theme]);

    const setMode = useCallback((nextMode: ThemeMode) => {
        setModeState(nextMode);
        AsyncStorage.setItem(STORAGE_KEYS.themeMode, nextMode).catch((error) => {
            void logger.error("navigation", "Failed to save theme", error);
        });
        void logger.info("navigation", "Theme changed", { mode: nextMode });
    }, []);

    const toggleTheme = useCallback(() => {
        setMode(mode === "light" ? "dark" : "light");
    }, [mode, setMode]);

    const value = useMemo(
        () => ({
            theme,
            mode,
            colors,
            setMode,
            toggleTheme,
        }),
        [theme, mode, colors, setMode, toggleTheme],
    );

    if (!isReady) return null;

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
