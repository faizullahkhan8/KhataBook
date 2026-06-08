import { CustomerWithAccounts } from "../models";
import { formatCurrency } from "./currencyUtils";

export const MESSAGE_TEMPLATE_PLACEHOLDERS = [
    "name",
    "phone",
    "accountNumber",
    "balance",
] as const;

const PLACEHOLDER_PATTERN = /{{\s*([^{}]+?)\s*}}/g;

export const getUnsupportedPlaceholders = (body: string): string[] => {
    const allowed = new Set<string>(MESSAGE_TEMPLATE_PLACEHOLDERS);
    return Array.from(body.matchAll(PLACEHOLDER_PATTERN))
        .map((match) => match[1])
        .filter((placeholder) => !allowed.has(placeholder));
};

export const renderMessageTemplate = (
    body: string,
    customer: CustomerWithAccounts,
): string => {
    const account = customer.accounts?.[0];
    const values: Record<(typeof MESSAGE_TEMPLATE_PLACEHOLDERS)[number], string> =
        {
            name: customer.name,
            phone: customer.phone || "",
            accountNumber: account?.account_number || "N/A",
            balance: formatCurrency(account?.current_balance || 0),
        };

    return body.replace(PLACEHOLDER_PATTERN, (_, placeholder: string) => {
        return values[placeholder as keyof typeof values] ?? "";
    });
};

export const getPhoneDigits = (phone?: string): string =>
    (phone || "").replace(/\D/g, "");

export const hasValidSmsPhone = (phone?: string): boolean =>
    getPhoneDigits(phone).length >= 11;
