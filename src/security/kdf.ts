export interface Argon2Parameters {
    memory: number;
    iterations: number;
    parallelism: number;
    hashLength: number;
    mode: "argon2id";
    saltEncoding: "hex";
}

export declare const ARGON2_PARAMETERS: Argon2Parameters;
export declare const hashStrongValue: (
    value: string,
    salt: string,
) => Promise<string>;
