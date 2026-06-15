import { NativeModules } from "react-native";
import { DatabaseSecurityError } from "./types";

type OPSQLiteModule = typeof import("@op-engineering/op-sqlite");

const unavailable = (message: string, cause?: unknown) =>
    new DatabaseSecurityError("native_module_missing", message, { cause });

export const loadOPSQLite = (): OPSQLiteModule => {
    if (!NativeModules.OPSQLite) {
        throw unavailable(
            "This installed app does not include OP-SQLite. Rebuild and install the development client.",
        );
    }

    try {
        return require("@op-engineering/op-sqlite") as OPSQLiteModule;
    } catch (error) {
        throw unavailable(
            "OP-SQLite could not initialize in this installed app. Rebuild and install the development client.",
            error,
        );
    }
};

export const assertSQLCipherAvailable = (): OPSQLiteModule => {
    const opSQLite = loadOPSQLite();

    try {
        if (!opSQLite.isSQLCipher()) {
            throw unavailable(
                "This installed app includes OP-SQLite without SQLCipher support. Rebuild it with SQLCipher enabled.",
            );
        }
    } catch (error) {
        if (error instanceof DatabaseSecurityError) throw error;
        throw unavailable(
            "The SQLCipher native module is unavailable or failed to initialize.",
            error,
        );
    }

    return opSQLite;
};
