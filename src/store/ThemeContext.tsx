import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import { Appearance } from "react-native";
import { LightTheme, DarkTheme } from "../constants/Colors";

type ThemeMode = "light" | "dark" | "system";

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
    const [mode, setMode] = useState<ThemeMode>("light");
    const [systemTheme, setSystemTheme] = useState(Appearance.getColorScheme() || "light");

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

    const toggleTheme = () => {
        setMode((prev) => (prev === "light" ? "dark" : "light"));
    };

    const value = useMemo(
        () => ({
            theme,
            mode,
            colors,
            setMode,
            toggleTheme,
        }),
        [theme, mode, colors],
    );

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
