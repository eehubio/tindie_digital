import { NextRequest, NextResponse } from "next/server";
import { shippoKey, shippoProxy, mockShipmentResponse } from "@/lib/shippo-server";

/**
 * POST /api/shippo/shipments — mirrors POST https://api.goshippo.com/shipments/
 * Body: { address_from, address_to, parcels[], async:false }
 * With SHIPPO_API_KEY set → real Shippo (test or live token); otherwise a mock
 * response in the exact same schema. The client cannot tell the difference.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (shippoKey()) {
    const { status, json } = await shippoProxy("/shipments/", { ...body, async: false });
    return NextResponse.json(json, { status });
  }
  // Simulate carrier latency so the UI's loading states are honest.
  await new Promise((r) => setTimeout(r, 700));
  return NextResponse.json(mockShipmentResponse(body));
}
