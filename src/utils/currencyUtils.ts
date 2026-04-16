export const formatCurrency = (
    amount: number,
    currency: string = "PKR",
): string => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: currency,
    }).format(amount);
};

/**
 * Format large numbers in compact notation (K, M, B)
 * e.g., 1,500,000 -> ₨1.5M
 */
export const formatCompactCurrency = (
    amount: number,
    currency: string = "PKR",
): string => {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";

    if (absAmount >= 1_000_000_000) {
        return `${sign}₨${(absAmount / 1_000_000_000).toFixed(1)}B`;
    }
    if (absAmount >= 1_000_000) {
        return `${sign}₨${(absAmount / 1_000_000).toFixed(1)}M`;
    }

    return formatCurrency(amount, currency);
};
