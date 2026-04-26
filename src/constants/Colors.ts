// // Primary Palette
// export const Colors = {
//     primary: "#2563EB", // Blue - trust, finance
//     background: "#0F172A", // Deep navy, not pure black
//     surface: "#1E293B", // Cards, panels
//     border: "#334155", // Subtle separation

//     // Text Colors
//     text: {
//         primary: "#F8FAFC", // Primary Text
//         secondary: "#CBD5F5", // Secondary Text
//         muted: "#94A3B8", // Muted Text
//         success: "#10B981", // Success Text
//         danger: "#EF4444", // Danger Text
//         warning: "#F59E0B", // Warning Text
//     },

//     // Status Colors
//     success: "#10B981",
//     danger: "#EF4444",
//     warning: "#F59E0B",
//     info: "#3B82F6",

//     // Button Colors
//     button: {
//         primary: "#2563EB",
//         secondary: "transparent",
//         danger: "#EF4444",
//     },

//     // Input Colors
//     input: {
//         background: "#1E293B",
//         border: "#334155",
//         borderFocused: "#2563EB",
//         placeholder: "#94A3B8",
//     },
// } as const;

// Define the base color structure to ensure consistency
const BaseColors = {
    primary: "#2563EB",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
};

export const LightTheme = {
    ...BaseColors,
    background: "#F8FAFC", // Clean slate white
    surface: "#FFFFFF", // Pure white cards
    border: "#E2E8F0", // Soft gray borders

    text: {
        primary: "#0F172A", // High contrast slate
        secondary: "#475569", // Gray for subtitles
        muted: "#94A3B8", // Placeholder/Disabled
        success: "#059669", // Slightly darker for readability on white
        danger: "#DC2626",
        warning: "#D97706",
    },

    button: {
        primary: "#2563EB",
        secondary: "transparent",
        danger: "#EF4444",
    },

    input: {
        background: "#F1F5F9",
        border: "#E2E8F0",
        borderFocused: "#2563EB",
        placeholder: "#94A3B8",
    },
};

export const DarkTheme = {
    ...BaseColors,
    background: "#0F172A", // Your existing deep navy
    surface: "#1E293B", // Existing card color
    border: "#334155",

    text: {
        primary: "#F8FAFC",
        secondary: "#CBD5F5",
        muted: "#94A3B8",
        success: "#10B981",
        danger: "#EF4444",
        warning: "#F59E0B",
    },

    button: {
        primary: "#2563EB",
        secondary: "transparent",
        danger: "#EF4444",
    },

    input: {
        background: "#1E293B",
        border: "#334155",
        borderFocused: "#2563EB",
        placeholder: "#94A3B8",
    },
};

// Default export for backward compatibility or initial load
export const Colors = LightTheme;
