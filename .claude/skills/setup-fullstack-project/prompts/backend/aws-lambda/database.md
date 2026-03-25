## Database (PostgreSQL + Drizzle ORM)

- Use Drizzle ORM for all database operations. No raw SQL unless Drizzle can't express the query.
- Schema defined in `src/db/schema.ts` using Drizzle's `pgTable()`.
- Use `drizzle-kit push` to push schema changes (not migrations for development).
- Connection: use a singleton `Postgres` client in `src/lib/Postgres.ts`. Initialize once per Lambda cold start.
- Connection pooling: use a connection pool with max 1 connection in Lambda (short-lived).
- Always close connections in Lambda by using `await client.end()` in a cleanup handler, or rely on Lambda lifecycle.
- Drizzle config reads from `.env.dev` or `.env.prod` based on `ENV` variable.
- Prefer Drizzle's relational query API (`db.query.users.findMany()`) over the lower-level `select()` builder for reads.
