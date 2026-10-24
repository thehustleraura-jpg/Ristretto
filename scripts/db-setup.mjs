// Applies supabase/schema.sql to DATABASE_URL. Safe to re-run.
import fs from "node:fs";
import { openDb } from "../server/db.mjs";

const db = openDb();
await db.sql.unsafe(fs.readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
console.log("Schema applied.");
await db.sql.end();
