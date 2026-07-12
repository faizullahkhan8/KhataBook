import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    Animated,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Input, Typography } from "../components";
import { Spacing } from "../constants";
import { usePagination } from "../hooks/usePagination";
import {
    formatLogEntry,
    LOG_CATEGORIES,
    LOG_LEVELS,
    LogCategory,
    LogEntry,
    LogLevel,
    logService,
} from "../services/LogService";
import { usePasscode, useTheme } from "../store";

const levelColors: Record<LogLevel, "muted" | "primary" | "warning" | "danger"> = {
    debug: "muted",
    info: "primary",
    warning: "warning",
    error: "danger",
};

const labelize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

const LogItem = React.memo(({ item, colors, copyLog }: { item: LogEntry; colors: any; copyLog: (entry: LogEntry) => void }) => {
    const levelColorName = levelColors[item.level];
    const accentColor = levelColorName === "muted" ? colors.text.muted : colors[levelColorName];
    
    return (
        <View
            style={[
                styles.logCard,
                {
                    backgroundColor: colors.surface,
                    borderLeftColor: accentColor,
                },
            ]}
        >
            <View style={styles.logHeader}>
                <View style={styles.logTitle}>
                    <Typography variant="small-small" style={{ color: accentColor, fontWeight: "bold" }}>
                        {item.level.toUpperCase()}
                    </Typography>
                    <Typography variant="small-small" color="muted">
                        • {labelize(item.category)} • {new Date(item.timestamp).toLocaleTimeString()}
                    </Typography>
                </View>
                <Pressable
                    onPress={() => copyLog(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Copy log"
                    style={styles.smallIconButton}
                >
                    <Ionicons name="copy-outline" size={16} color={colors.text.muted} />
                </Pressable>
            </View>
            <Typography variant="body-small" color="primary" style={styles.message}>
                {item.message}
            </Typography>
            {!!item.details && (
                <Typography variant="small-small" color="secondary" style={styles.mono}>
                    {item.details}
                </Typography>
            )}
            {item.level === "error" && !!item.stack && (
                <Typography variant="small-small" color="danger" style={styles.mono}>
                    {item.stack}
                </Typography>
            )}
        </View>
    );
}, (prev, next) => prev.item.id === next.item.id && prev.colors.surface === next.colors.surface);

export const LogsScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
        new Set(),
    );
    const [selectedCategories, setSelectedCategories] = useState<
        Set<LogCategory>
    >(new Set());
    const [isReloadingLogs, setIsReloadingLogs] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { page, pageSize, nextPage } = usePagination({ pageSize: 50 });
    const clearLogsAlertSuspendedRef = React.useRef(false);
    const reloadInProgressRef = useRef(false);
    const reloadSpinAnim = useRef(new Animated.Value(0)).current;

    const loadLogs = useCallback(async () => {
        if (reloadInProgressRef.current) return;

        reloadInProgressRef.current = true;
        setIsReloadingLogs(true);
        try {
            const entries = await logService.getLogs();
            // Newest first
            setLogs([...entries].reverse());
        } finally {
            reloadInProgressRef.current = false;
            setIsReloadingLogs(false);
        }
    }, []);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        if (!isReloadingLogs) {
            reloadSpinAnim.stopAnimation();
            reloadSpinAnim.setValue(0);
            return;
        }

        const animation = Animated.loop(
            Animated.timing(reloadSpinAnim, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            }),
        );
        animation.start();
        return () => animation.stop();
    }, [isReloadingLogs, reloadSpinAnim]);

    const filteredLogs = useMemo(() => {
        return logs.filter((entry) => {
            if (
                selectedLevels.size > 0 &&
                !selectedLevels.has(entry.level)
            ) {
                return false;
            }
            if (
                selectedCategories.size > 0 &&
                !selectedCategories.has(entry.category)
            ) {
                return false;
            }
            return true;
        });
    }, [logs, selectedCategories, selectedLevels]);

    const paginatedLogs = useMemo(
        () => filteredLogs.slice(0, (page + 1) * pageSize),
        [filteredLogs, page, pageSize],
    );

    const hasMore = paginatedLogs.length < filteredLogs.length;

    const toggleLevel = (level: LogLevel) => {
        setSelectedLevels((previous) => {
            const next = new Set(previous);
            if (next.has(level)) next.delete(level);
            else next.add(level);
            return next;
        });
    };

    const toggleCategory = (category: LogCategory) => {
        setSelectedCategories((previous) => {
            const next = new Set(previous);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    };

    const copyLog = useCallback(async (entry: LogEntry) => {
        await Clipboard.setStringAsync(formatLogEntry(entry));
        Alert.alert("Copied", "Log copied to clipboard.");
    }, []);

    const exportLogs = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const entries = await logService.getLogs();
            const content =
                entries.length > 0
                    ? entries.map(formatLogEntry).join("\n\n---\n\n")
                    : "No logs.";
            const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
            if (!directory) {
                Alert.alert("Export failed", "No writable directory is available.");
                return;
            }

            const fileUri = `${directory}khatabook-logs-${new Date()
                .toISOString()
                .replace(/[:.]/g, "-")}.txt`;
            await FileSystem.writeAsStringAsync(fileUri, content, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    dialogTitle: "Export logs",
                    mimeType: "text/plain",
                });
                return;
            }

            Alert.alert("Logs exported", fileUri);
        } catch (error) {
            console.error("Export failed:", error);
            Alert.alert("Export failed", "Failed to export logs.");
        } finally {
            setIsExporting(false);
        }
    };

    const clearLogs = () => {
        const releaseAlertSuspension = () => {
            if (!clearLogsAlertSuspendedRef.current) return;
            clearLogsAlertSuspendedRef.current = false;
        };

        clearLogsAlertSuspendedRef.current = true;
        const buttons = [
            {
                text: "Cancel",
                style: "cancel" as const,
                onPress: releaseAlertSuspension,
            },
            {
                text: "Clear",
                style: "destructive" as const,
                onPress: async () => {
                    try {
                        await logService.clearLogs();
                        setLogs([]);
                    } finally {
                        releaseAlertSuspension();
                    }
                },
            },
        ];

        Alert.alert("Clear logs", "Delete all stored logs?", buttons, {
            onDismiss: releaseAlertSuspension,
        });
    };

    const renderChip = <T extends string>(
        value: T,
        selected: boolean,
        onPress: () => void,
        chipColorType: "primary" | "success" | "warning" | "danger" | "muted" = "primary"
    ) => {
        const chipHex = chipColorType === "muted" ? colors.text.muted : colors[chipColorType];
        return (
        <Pressable
            key={value}
            onPress={onPress}
            style={[
                styles.chip,
                { borderColor: colors.border },
                selected && {
                    borderColor: chipHex,
                    backgroundColor: `${chipHex}15`,
                },
            ]}
        >
            <Typography
                variant="small-small"
                color={selected ? chipColorType : "muted"}
            >
                {labelize(value)}
            </Typography>
        </Pressable>
        );
    };

    const renderLog = useCallback(({ item }: { item: LogEntry }) => (
        <LogItem item={item} colors={colors} copyLog={copyLog} />
    ), [colors, copyLog]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={[
                    styles.header,
                    {
                        marginTop: insets.top + Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        overflow: "hidden",
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                        },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[
                        styles.iconButton,
                        { backgroundColor: `${colors.primary}18` },
                    ]}
                >
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <View style={styles.headerText}>
                    <Typography variant="heading-large" color="primary">
                        Logs
                    </Typography>
                </View>
                <View style={styles.headerActions}>
                    <Pressable
                        onPress={loadLogs}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh logs"
                        disabled={isReloadingLogs}
                        style={[
                            styles.iconButton,
                            { backgroundColor: `${colors.primary}18` },
                        ]}
                    >
                        <Animated.View
                            style={{
                                transform: [
                                    {
                                        rotate: reloadSpinAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ["0deg", "360deg"],
                                        }),
                                    },
                                ],
                            }}
                        >
                            <Ionicons
                                name="refresh"
                                size={22}
                                color={colors.primary}
                            />
                        </Animated.View>
                    </Pressable>
                    <Pressable
                        onPress={exportLogs}
                        accessibilityRole="button"
                        accessibilityLabel="Export logs"
                        disabled={isExporting}
                        style={[
                            styles.iconButton,
                            { backgroundColor: `${colors.primary}${isExporting ? '08' : '18'}` },
                        ]}
                    >
                        <Ionicons name="share-outline" size={22} color={colors.primary} style={isExporting && { opacity: 0.5 }} />
                    </Pressable>
                    <Pressable
                        onPress={clearLogs}
                        accessibilityRole="button"
                        accessibilityLabel="Clear logs"
                        style={[
                            styles.iconButton,
                            { backgroundColor: `${colors.danger}18` },
                        ]}
                    >
                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.filters}>
                <View style={styles.filterSection}>
                    <Typography variant="small-small" color="muted">
                        Level
                    </Typography>
                    <View style={styles.chipRow}>
                        {LOG_LEVELS.map((level) =>
                            renderChip(level, selectedLevels.has(level), () =>
                                toggleLevel(level),
                                levelColors[level]
                            ),
                        )}
                    </View>
                </View>
                <View style={styles.filterSection}>
                    <Typography variant="small-small" color="muted">
                        Category
                    </Typography>
                    <View style={styles.chipRow}>
                        {LOG_CATEGORIES.map((category) =>
                            renderChip(
                                category,
                                selectedCategories.has(category),
                                () => toggleCategory(category),
                            ),
                        )}
                    </View>
                </View>
            </View>

            <FlatList
                data={paginatedLogs}
                keyExtractor={(item) => item.id}
                renderItem={renderLog}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                contentContainerStyle={[
                    styles.logList,
                    { paddingBottom: insets.bottom + Spacing.xl },
                    paginatedLogs.length === 0 && styles.emptyList,
                ]}
                onEndReached={hasMore ? nextPage : undefined}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    paginatedLogs.length > 0 && paginatedLogs.length < filteredLogs.length ? (
                        <View style={styles.footer}>
                            <Typography variant="body-small" color="muted">
                                Loading more...
                            </Typography>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons
                            name="document-text-outline"
                            size={44}
                            color={colors.text.muted}
                        />
                        <Typography variant="body-small" color="muted">
                            No logs found
                        </Typography>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    headerActions: {
        flexDirection: "row",
        gap: Spacing.xs,
    },
    iconButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    filters: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    filterSection: {
        gap: Spacing.xs,
    },
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.xs,
    },
    chip: {
        minHeight: 34,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: Spacing.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    logList: {
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    emptyList: {
        flexGrow: 1,
    },
    logCard: {
        marginBottom: 8,
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderRadius: 8,
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
        borderLeftWidth: 4,
        gap: Spacing.xs,
    },
    logHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: Spacing.md,
    },
    logTitle: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    levelBadge: {
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: 6,
    },
    smallIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    message: {
        marginTop: Spacing.xs,
    },
    mono: {
        fontFamily: "monospace",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
    },
    footer: {
        padding: Spacing.md,
        alignItems: "center",
    },
});
