import { describe, expect, it } from "vitest";
import { paymentAmount } from "@/lib/payments";

describe("payment rules", () => {
  it("charges the full configured amount for a full payment", () => {
    expect(paymentAmount(6_000_000, "full")).toBe(6_000_000);
  });

  it("splits an installment into two equal payments", () => {
    expect(paymentAmount(6_000_000, "deposit")).toBe(3_000_000);
    expect(paymentAmount(6_000_000, "balance")).toBe(3_000_000);
  });

  it("preserves the total for an odd-kobo installment", () => {
    expect(paymentAmount(1_000_001, "deposit")).toBe(500_001);
    expect(paymentAmount(1_000_001, "balance")).toBe(500_000);
  });
});
