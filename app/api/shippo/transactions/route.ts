import { NextRequest, NextResponse } from "next/server";
import { shippoKey, shippoProxy, mockTransactionResponse } from "@/lib/shippo-server";

/**
 * POST /api/shippo/transactions — mirrors POST https://api.goshippo.com/transactions/
 * Body: { rate:<rate object_id>, label_file_type:"PDF_4x6", async:false }
 * Purchasing a rate returns { status:"SUCCESS", label_url, tracking_number,
 * tracking_url_provider } — the same three fields the seller actually needs.
 * `_meta` (provider/ref) is a prototype-only extra used by the mock label.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (shippoKey()) {
    const { status, json } = await shippoProxy("/transactions/", {
      rate: body.rate,
      label_file_type: body.label_file_type ?? "PDF_4x6",
      async: false,
    });
    return NextResponse.json(json, { status });
  }
  await new Promise((r) => setTimeout(r, 900));
  return NextResponse.json(mockTransactionResponse(body.rate, body._meta));
}
