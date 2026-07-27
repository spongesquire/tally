import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Tally uses an isolated Postgres schema ("tally") within the shared Neon project.
 * This prevents table collisions with seda, pantry, startup-lab, etc.
 *
 * We use the WebSocket Pool driver (neon-serverless) instead of the HTTP
 * query function (neon-http) because expense and settlement writes require
 * real interactive transactions (db.transaction()) for atomic multi-table
 * mutations including revision snapshots and activity events.
 *
 * The schema (pgSchema) is defined in schema.ts and re-exported here.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle(pool, { schema });

export { schema };
