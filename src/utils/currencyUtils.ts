import { CurrencyAmount } from "../models/types";

/**
 * Converts a decimal amount (e.g. 10.50) to an integer (e.g. 1050) to avoid floating point errors.
 */
export const toInteger = (amount: number | string): CurrencyAmount => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return 0 as CurrencyAmount;
    return Math.round(num * 100) as CurrencyAmount;
};

/**
 * Converts an integer amount (e.g. 1050) back to a decimal (e.g. 10.50) for UI display.
 */
export const fromInteger = (amount: CurrencyAmount | number): number => {
    return amount / 100;
};

export const formatCurrency = (
    amount: CurrencyAmount | number,
    currency: string = "PKR",
): string => {
    const decimal = fromInteger(amount);
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: currency,
    }).format(decimal);
};

/**
 * Format large numbers in compact notation (K, M, B)
 * e.g., 1,500,000 -> ₨1.5M
 */
export const formatCompactCurrency = (
    amount: CurrencyAmount | number,
    currency: string = "PKR",
): string => {
    const decimal = fromInteger(amount);
    const absAmount = Math.abs(decimal);
    const sign = decimal < 0 ? "-" : "";

    if (absAmount >= 1_000_000_000) {
        return `${sign}₨${(absAmount / 1_000_000_000).toFixed(1)}B`;
    }
    if (absAmount >= 1_000_000) {
        return `${sign}₨${(absAmount / 1_000_000).toFixed(1)}M`;
    }

    return formatCurrency(amount, currency);
};
