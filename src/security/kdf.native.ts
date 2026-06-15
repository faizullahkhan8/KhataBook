import { Argon2Parameters } from "./kdf";

export const ARGON2_PARAMETERS: Argon2Parameters = {
    memory: 32 * 1024,
    iterations: 3,
    parallelism: 1,
    hashLength: 32,
    mode: "argon2id",
    saltEncoding: "hex",
};

export const hashStrongValue = async (value: string, salt: string) => {
    let argon2: typeof import("react-native-argon2").default;
    try {
        argon2 = require("react-native-argon2").default;
    } catch (error) {
        throw new Error(
            "This build does not include the Argon2 native module. Rebuild and install the development client.",
            { cause: error },
        );
    }

    return (await argon2(value, salt, ARGON2_PARAMETERS)).rawHash;
};
