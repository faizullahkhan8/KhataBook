/**
 * Branded Type utility to provide compile-time type safety for plain numbers/strings.
 */
export type Brand<K, T> = K & { __brand: T };

/**
 * Unique identifiers for different entities.
 */
export type CustomerId = Brand<number, "CustomerId">;
export type AccountId = Brand<number, "AccountId">;
export type TransactionId = Brand<number, "TransactionId">;
export type PaymentId = Brand<number, "PaymentId">;
export type StoreId = Brand<number, "StoreId">;

/**
 * Financial amounts represented as integers (e.g. cents, paisa).
 */
export type CurrencyAmount = Brand<number, "CurrencyAmount">;

/**
 * Unix timestamps (seconds).
 */
export type Timestamp = number;
