import { StoreId, Timestamp } from "./types";

export interface Store {
    id: StoreId;
    name: string;
    contact?: string;
    address?: string;
    is_default: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}
