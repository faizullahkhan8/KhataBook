// Primary Palette
export const Colors = {
    primary: "#2563EB", // Blue - trust, finance
    background: "#0F172A", // Deep navy, not pure black
    surface: "#1E293B", // Cards, panels
    border: "#334155", // Subtle separation

    // Text Colors
    text: {
        primary: "#F8FAFC", // Primary Text
        secondary: "#CBD5F5", // Secondary Text
        muted: "#94A3B8", // Muted Text
        success: "#10B981", // Success Text
        danger: "#EF4444", // Danger Text
        warning: "#F59E0B", // Warning Text
    },

    // Status Colors
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",

    // Button Colors
    button: {
        primary: "#2563EB",
        secondary: "transparent",
        danger: "#EF4444",
    },

    // Input Colors
    input: {
        background: "#1E293B",
        border: "#334155",
        borderFocused: "#2563EB",
        placeholder: "#94A3B8",
    },
} as const;
