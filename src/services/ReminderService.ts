import { SQLiteDatabase } from "../db/types";
import { Reminder, ReminderId, ReminderStatus } from "../models";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export class ReminderService {
    private db: SQLiteDatabase;

    constructor(db: SQLiteDatabase) {
        this.db = db;
    }

    async getUpcomingReminders(): Promise<Reminder[]> {
        return await this.db.getAllAsync<Reminder>(
            `SELECT * FROM reminders WHERE status = ? AND due_date > ? ORDER BY due_date ASC`,
            [ReminderStatus.PENDING, Math.floor(Date.now() / 1000)]
        );
    }

    async getPastReminders(): Promise<Reminder[]> {
        return await this.db.getAllAsync<Reminder>(
            `SELECT * FROM reminders WHERE status != ? OR due_date <= ? ORDER BY due_date DESC`,
            [ReminderStatus.PENDING, Math.floor(Date.now() / 1000)]
        );
    }
    
    async getRemindersByCustomer(customerId: number): Promise<Reminder[]> {
        return await this.db.getAllAsync<Reminder>(
            `SELECT * FROM reminders WHERE customer_id = ? ORDER BY due_date ASC`,
            [customerId]
        );
    }

    async createReminder(reminder: Omit<Reminder, "id" | "created_at" | "updated_at">): Promise<ReminderId> {
        // 1. Insert to DB immediately — user is unblocked right away
        const result = await this.db.runAsync(
            `INSERT INTO reminders (
                store_id, customer_id, transaction_id, title, description, due_date, status, notification_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                reminder.store_id || 1,
                reminder.customer_id || null,
                reminder.transaction_id || null,
                reminder.title,
                reminder.description || null,
                reminder.due_date,
                reminder.status || ReminderStatus.PENDING,
                null, // will be updated after notification is scheduled
            ]
        );
        const reminderId = result.lastInsertRowId as ReminderId;

        // 2. Schedule notification in the background — doesn't block the UI
        if (reminder.due_date > Math.floor(Date.now() / 1000)) {
            const date = new Date(reminder.due_date * 1000);
            Notifications.scheduleNotificationAsync({
                content: {
                    title: reminder.title,
                    body: reminder.description || "Reminder from KhataBook",
                    data: {
                        customerId: reminder.customer_id,
                        transactionId: reminder.transaction_id,
                    },
                    sound: true,
                    priority: 'high',
                },
                trigger: Platform.OS === 'android'
                    ? { channelId: 'reminders-high', type: 'date', date }
                    : { type: 'date', date },
            }).then((notificationId) => {
                // Persist the notification ID once we have it
                this.db.runAsync(
                    `UPDATE reminders SET notification_id = ? WHERE id = ?`,
                    [notificationId, reminderId]
                ).catch((e) => console.error("Failed to save notification_id", e));
            }).catch((e) => console.error("Failed to schedule notification", e));
        }

        return reminderId;
    }

    async updateReminderStatus(id: ReminderId, status: ReminderStatus): Promise<void> {
        const reminder = await this.db.getFirstAsync<Reminder>(`SELECT * FROM reminders WHERE id = ?`, [id]);
        
        // Cancel notification and update DB in parallel
        await Promise.all([
            reminder?.notification_id && status !== ReminderStatus.PENDING
                ? Notifications.cancelScheduledNotificationAsync(reminder.notification_id).catch(() => {})
                : Promise.resolve(),
            this.db.runAsync(
                `UPDATE reminders SET status = ?, updated_at = strftime('%s', 'now') WHERE id = ?`,
                [status, id]
            ),
        ]);
    }

    async deleteReminder(id: ReminderId): Promise<void> {
        const reminder = await this.db.getFirstAsync<Reminder>(`SELECT * FROM reminders WHERE id = ?`, [id]);
        
        // Delete from DB and cancel notification simultaneously
        await Promise.all([
            this.db.runAsync(`DELETE FROM reminders WHERE id = ?`, [id]),
            reminder?.notification_id
                ? Notifications.cancelScheduledNotificationAsync(reminder.notification_id).catch(() => {})
                : Promise.resolve(),
        ]);
    }
}
