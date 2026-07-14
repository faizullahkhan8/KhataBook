export enum ReminderStatus {
    PENDING = 0,
    COMPLETED = 1,
    CANCELLED = 2,
}

export type ReminderId = number & { __reminderIdBrand: any };

export interface Reminder {
    id?: ReminderId;
    store_id?: number;
    customer_id?: number;
    transaction_id?: number;
    title: string;
    description?: string;
    due_date: number; // unix timestamp
    status: ReminderStatus;
    notification_id?: string;
    created_at?: number;
    updated_at?: number;
}
