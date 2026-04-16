import { Account } from "./Account";

export interface Customer {
    id?: number;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    image_uri?: string;
    notes?: string;
    created_at?: number;
    updated_at?: number;
}

export interface CustomerWithAccounts extends Customer {
    accounts?: Account[];
}
