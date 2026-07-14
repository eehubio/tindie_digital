import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { products as mockProducts } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * GET /api/products — the buyer marketplace feed.
 * With DATABASE_URL set: reads Postgres. Without: serves the seeded mock,
 * so the prototype deploys to Vercel with no configuration at all.
 */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ source: "mock", products: mockProducts });
  const rows = await db.select().from(schema.products);
  return NextResponse.json({ source: "postgres", products: rows });
}

/** POST /api/products — publish from the seller wizard. */
export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json();
  if (!db) {
    // Mock mode: the client-side store already holds it; acknowledge.
    return NextResponse.json({ source: "mock", ok: true, id: body.id });
  }
  await db.insert(schema.products).values(body).onConflictDoUpdate({
    target: schema.products.id,
    set: body,
  });
  return NextResponse.json({ source: "postgres", ok: true, id: body.id });
}
