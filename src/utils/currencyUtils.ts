export const formatCurrency = (
    amount: number,
    currency: string = "PKR",
): string => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: currency,
    }).format(amount);
};
