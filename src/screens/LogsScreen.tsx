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

export const LogsScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { setAutoLockSuspended } = usePasscode();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [search, setSearch] = useState("");
    const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
        new Set(),
    );
    const [selectedCategories, setSelectedCategories] = useState<
        Set<LogCategory>
    >(new Set());
    const [isReloadingLogs, setIsReloadingLogs] = useState(false);
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
        const query = search.trim().toLowerCase();
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
            if (!query) return true;

            return [
                entry.level,
                entry.category,
                entry.message,
                entry.details,
                entry.stack,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [logs, search, selectedCategories, selectedLevels]);

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

    const copyLog = async (entry: LogEntry) => {
        await Clipboard.setStringAsync(formatLogEntry(entry));
        Alert.alert("Copied", "Log copied to clipboard.");
    };

    const exportLogs = async () => {
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
    };

    const clearLogs = () => {
        const releaseAlertSuspension = () => {
            if (!clearLogsAlertSuspendedRef.current) return;
            clearLogsAlertSuspendedRef.current = false;
            setAutoLockSuspended(false);
        };

        clearLogsAlertSuspendedRef.current = true;
        setAutoLockSuspended(true);
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
    ) => (
        <Pressable
            key={value}
            onPress={onPress}
            style={[
                styles.chip,
                { borderColor: colors.border },
                selected && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}15`,
                },
            ]}
        >
            <Typography
                variant="small-small"
                color={selected ? "primary" : "muted"}
            >
                {labelize(value)}
            </Typography>
        </Pressable>
    );

    const renderLog = ({ item }: { item: LogEntry }) => (
        <Card
            style={[
                styles.logCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
            ]}
        >
            <View style={styles.logHeader}>
                <View style={styles.logTitle}>
                    <Typography variant="small-small" color={levelColors[item.level]}>
                        {item.level.toUpperCase()}
                    </Typography>
                    <Typography variant="small-small" color="muted">
                        {labelize(item.category)}
                    </Typography>
                </View>
                <Pressable
                    onPress={() => copyLog(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Copy log"
                    style={[
                        styles.smallIconButton,
                        { backgroundColor: `${colors.primary}12` },
                    ]}
                >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                </Pressable>
            </View>
            <Typography variant="small-small" color="muted">
                {new Date(item.timestamp).toLocaleString()}
            </Typography>
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
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + Spacing.md,
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[
                        styles.iconButton,
                        { backgroundColor: `${colors.primary}15` },
                    ]}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </Pressable>
                <View style={styles.headerText}>
                    <Typography variant="heading-large" color="primary">
                        Logs
                    </Typography>
                    <Typography variant="small-small" color="muted">
                        {filteredLogs.length} of {logs.length}
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
                            { backgroundColor: `${colors.primary}15` },
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
                        style={[
                            styles.iconButton,
                            { backgroundColor: `${colors.primary}15` },
                        ]}
                    >
                        <Ionicons name="share-outline" size={22} color={colors.primary} />
                    </Pressable>
                    <Pressable
                        onPress={clearLogs}
                        accessibilityRole="button"
                        accessibilityLabel="Clear logs"
                        style={[
                            styles.iconButton,
                            { backgroundColor: `${colors.danger}15` },
                        ]}
                    >
                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.filters}>
                <Input
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search logs"
                    autoCapitalize="none"
                    autoCorrect={false}
                    containerStyle={styles.searchInput}
                />
                <View style={styles.filterSection}>
                    <Typography variant="small-small" color="muted">
                        Level
                    </Typography>
                    <View style={styles.chipRow}>
                        {LOG_LEVELS.map((level) =>
                            renderChip(level, selectedLevels.has(level), () =>
                                toggleLevel(level),
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
        minHeight: 84,
        borderBottomWidth: 1,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    filters: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    searchInput: {
        marginBottom: 0,
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
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.md,
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
