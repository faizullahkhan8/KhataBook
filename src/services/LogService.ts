import AsyncStorage from "@react-native-async-storage/async-storage";

export type LogLevel = "debug" | "info" | "warning" | "error";
export type LogCategory =
    | "database"
    | "security"
    | "passcode"
    | "transactions"
    | "customers"
    | "messages"
    | "navigation";

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    category: LogCategory;
    message: string;
    details?: string;
    stack?: string;
}

interface LogInput {
    level: LogLevel;
    category: LogCategory;
    message: string;
    details?: unknown;
    stack?: unknown;
}

const STORAGE_KEY = "khatabook.developer.logs.v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 2000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_DETAILS_LENGTH = 4000;
const MAX_STACK_LENGTH = 6000;
const MAX_DEPTH = 5;
const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
    /(pin|passcode|recovery.*answer|answer.*recovery|pin.*hash|hash.*pin|pin.*salt|salt.*pin|answer.*hash|hash.*answer|answer.*salt|salt.*answer|cnic|phone|sms|message|database.*key|encryption.*key|key)/i;

const CNIC_PATTERN = /\b(\d{5})-?(\d{7})-?(\d)\b/g;
const PHONE_PATTERN = /(^|[^\d])((?:\+92|0092|92|0)?3\d{2}[-\s]?\d{7})(?!\d)/g;

const truncate = (value: string, limit: number) =>
    value.length > limit ? `${value.slice(0, limit)}...` : value;

export const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const normalized =
        digits.length === 12 && digits.startsWith("92")
            ? `0${digits.slice(2)}`
            : digits.length === 13 && digits.startsWith("0092")
              ? `0${digits.slice(4)}`
              : digits;

    if (normalized.length < 7) return REDACTED;
    return `${normalized.slice(0, 2)}******${normalized.slice(-3)}`;
};

export const maskCnic = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 13) return REDACTED;
    return `${digits.slice(0, 5)}-*******-${digits.slice(-1)}`;
};

const sanitizeString = (value: string, limit = MAX_DETAILS_LENGTH) =>
    truncate(
        value
            .replace(CNIC_PATTERN, (match) => maskCnic(match))
            .replace(
                PHONE_PATTERN,
                (_match, prefix: string, phone: string) =>
                    `${prefix}${maskPhone(phone)}`,
            ),
        limit,
    );

const sanitizeUnknown = (
    value: unknown,
    depth = 0,
    parentKey = "",
): unknown => {
    if (SENSITIVE_KEY_PATTERN.test(parentKey)) return REDACTED;
    if (value === null || value === undefined) return value;

    if (typeof value === "string") return sanitizeString(value);
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "function" || typeof value === "symbol") {
        return String(value);
    }

    if (value instanceof Error) {
        return {
            name: sanitizeString(value.name),
            message: sanitizeString(value.message),
            stack: value.stack ? sanitizeString(value.stack, MAX_STACK_LENGTH) : undefined,
        };
    }

    if (depth >= MAX_DEPTH) return "[Max depth reached]";

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeUnknown(item, depth + 1, parentKey));
    }

    if (typeof value === "object") {
        const output: Record<string, unknown> = {};
        Object.entries(value as Record<string, unknown>).forEach(
            ([key, item]) => {
                output[key] = sanitizeUnknown(item, depth + 1, key);
            },
        );
        return output;
    }

    return sanitizeString(String(value));
};

const toDetailsString = (value: unknown, limit: number) => {
    if (value === undefined) return undefined;
    const sanitized = sanitizeUnknown(value);
    const rendered =
        typeof sanitized === "string"
            ? sanitized
            : JSON.stringify(sanitized, null, 2);
    return rendered ? truncate(rendered, limit) : undefined;
};

const errorStackFrom = (details: unknown, stack: unknown) => {
    if (stack !== undefined) return stack;
    return details instanceof Error ? details.stack : undefined;
};

const prune = (entries: LogEntry[], now = Date.now()) =>
    entries
        .filter((entry) => now - entry.timestamp <= MAX_AGE_MS)
        .sort((left, right) => left.timestamp - right.timestamp)
        .slice(-MAX_ENTRIES);

const readRawLogs = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as LogEntry[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLogs = (entries: LogEntry[]) =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

export const logService = {
    async getLogs() {
        const entries = prune(await readRawLogs());
        await writeLogs(entries);
        return entries;
    },

    async clearLogs() {
        await AsyncStorage.removeItem(STORAGE_KEY);
    },

    async log(input: LogInput) {
        const timestamp = Date.now();
        const entry: LogEntry = {
            id: `${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
            timestamp,
            level: input.level,
            category: input.category,
            message: sanitizeString(input.message, MAX_MESSAGE_LENGTH),
            details: toDetailsString(input.details, MAX_DETAILS_LENGTH),
            stack: toDetailsString(
                errorStackFrom(input.details, input.stack),
                MAX_STACK_LENGTH,
            ),
        };

        const entries = prune([...(await readRawLogs()), entry], timestamp);
        await writeLogs(entries);
        return entry;
    },
};

export const logger = {
    debug: (category: LogCategory, message: string, details?: unknown) =>
        logService.log({ level: "debug", category, message, details }),
    info: (category: LogCategory, message: string, details?: unknown) =>
        logService.log({ level: "info", category, message, details }),
    warning: (category: LogCategory, message: string, details?: unknown) =>
        logService.log({ level: "warning", category, message, details }),
    error: (
        category: LogCategory,
        message: string,
        details?: unknown,
        stack?: unknown,
    ) => logService.log({ level: "error", category, message, details, stack }),
};

export const formatLogEntry = (entry: LogEntry) => {
    const parts = [
        `[${new Date(entry.timestamp).toISOString()}]`,
        entry.level.toUpperCase(),
        entry.category,
        entry.message,
    ];
    const lines = [parts.join(" | ")];
    if (entry.details) lines.push(entry.details);
    if (entry.stack) lines.push(entry.stack);
    return lines.join("\n");
};

export const LOG_LEVELS: LogLevel[] = ["debug", "info", "warning", "error"];
export const LOG_CATEGORIES: LogCategory[] = [
    "database",
    "security",
    "passcode",
    "transactions",
    "customers",
    "messages",
    "navigation",
];
