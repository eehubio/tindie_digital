import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { seedQuestions } from "@/lib/mock";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get("productId");
  const db = getDb();
  if (!db) {
    const qs = productId ? seedQuestions.filter((q) => q.productId === productId) : seedQuestions;
    return NextResponse.json({ source: "mock", questions: qs });
  }
  const rows = productId
    ? await db.select().from(schema.productQuestions).where(eq(schema.productQuestions.productId, productId))
    : await db.select().from(schema.productQuestions);
  return NextResponse.json({ source: "postgres", questions: rows });
}

export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json();
  if (!db) return NextResponse.json({ source: "mock", ok: true });
  await db.insert(schema.productQuestions).values(body);
  return NextResponse.json({ source: "postgres", ok: true });
}
