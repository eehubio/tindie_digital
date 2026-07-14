import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazily-created client. Returns null when DATABASE_URL is not configured —
 * callers fall back to mock data, so the app deploys with zero env vars.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url), { schema });
}

export { schema };
