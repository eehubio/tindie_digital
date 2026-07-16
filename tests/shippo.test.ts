import { describe, it, expect } from "vitest";
import { mockShipmentResponse, mockTransactionResponse, labelPdf } from "../lib/shippo-server";

describe("shippo mock schema", () => {
  it("shipment → rates in Shippo's exact shape; intl gets DHL FASTEST", () => {
    const sh = mockShipmentResponse({
      address_from: { country: "US" } as never,
      address_to: { country: "DE" } as never,
      parcels: [{ weight: "0.165", mass_unit: "kg" }],
    });
    expect(sh.object_id).toBeTruthy();
    for (const r of sh.rates) {
      expect(r).toHaveProperty("object_id");
      expect(r).toHaveProperty("amount");
      expect(r.servicelevel).toHaveProperty("token");
    }
    expect(sh.rates.some((r) => r.provider === "DHL Express" && r.attributes.includes("FASTEST"))).toBe(true);
  });
  it("transaction → SUCCESS + tracking + label_url; pdf generator emits valid header", () => {
    const tx = mockTransactionResponse("rate_x", { provider: "USPS", ref: "TD-1" });
    expect(tx.status).toBe("SUCCESS");
    expect(tx.tracking_number).toMatch(/^9405/);
    expect(tx.label_url).toContain("/api/shippo/label");
    const pdf = labelPdf(["A", "B"]);
    expect(new TextDecoder().decode(pdf.slice(0, 8))).toContain("%PDF-1.4");
  });
});
