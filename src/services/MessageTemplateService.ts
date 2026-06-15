import { SQLiteDatabase } from "../db/types";
import { MessageTemplate } from "../models";

export class MessageTemplateService {
    constructor(private db: SQLiteDatabase) {}

    async getAll(): Promise<MessageTemplate[]> {
        return this.db.getAllAsync<MessageTemplate>(
            "SELECT * FROM message_templates ORDER BY updated_at DESC, name ASC",
        );
    }

    async create(template: Pick<MessageTemplate, "name" | "body">) {
        return this.db.runAsync(
            "INSERT INTO message_templates (name, body) VALUES (?, ?)",
            [template.name, template.body],
        );
    }

    async update(id: number, template: Pick<MessageTemplate, "name" | "body">) {
        return this.db.runAsync(
            "UPDATE message_templates SET name = ?, body = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
            [template.name, template.body, id],
        );
    }

    async delete(id: number) {
        return this.db.runAsync("DELETE FROM message_templates WHERE id = ?", [
            id,
        ]);
    }
}
