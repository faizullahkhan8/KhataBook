import { Argon2Parameters } from "./kdf";

export const ARGON2_PARAMETERS: Argon2Parameters = {
    memory: 32 * 1024,
    iterations: 3,
    parallelism: 1,
    hashLength: 32,
    mode: "argon2id",
    saltEncoding: "hex",
};

export const hashStrongValue = async (): Promise<string> => {
    throw new Error("Passcode hashing is not supported on web");
};
