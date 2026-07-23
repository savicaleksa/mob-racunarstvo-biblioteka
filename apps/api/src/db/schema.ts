import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Relational schema (see spec.md "### Schema" and ADR-0008).
 *
 * Foreign keys use `onDelete: "restrict"` so a referenced Author or Book cannot
 * be deleted out from under its Books/Loans — the API surfaces a domain error
 * instead of cascading and silently destroying lending history. RESTRICT is
 * only actually enforced when `PRAGMA foreign_keys = ON` is set on the
 * connection, which the Drizzle provider does for every connection.
 *
 * Availability is NOT stored (ADR-0007): it is derived on read as
 * `totalCopies - count(active loans)`, so there is deliberately no
 * `availableCopies` column on `books`.
 */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Stored as the string literals of the Role union: OWNER | LIBRARIAN | MEMBER.
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const authors = sqliteTable("authors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  bio: text("bio"),
  birthYear: integer("birth_year"),
});

export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  authorId: integer("author_id")
    .notNull()
    .references(() => authors.id, { onDelete: "restrict" }),
  totalCopies: integer("total_copies").notNull().default(1),
  isbn: text("isbn"),
  publishedYear: integer("published_year"),
  description: text("description"),
});

export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "restrict" }),
  memberId: integer("member_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  borrowedAt: integer("borrowed_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  // An Active Loan has returnedAt IS NULL (spec.md invariants).
  returnedAt: integer("returned_at", { mode: "timestamp" }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export const schema = { users, authors, books, loans };
