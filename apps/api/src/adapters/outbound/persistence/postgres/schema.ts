import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("notes_created_at_idx").on(table.createdAt.desc(), table.id.desc())],
);

export type NoteRow = typeof notes.$inferSelect;
export type NewNoteRow = typeof notes.$inferInsert;
