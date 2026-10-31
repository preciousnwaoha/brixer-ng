import { describe, expect, it } from "vitest";
import { canAdvanceFromFiling, paymentAmount } from "@/lib/payments";

describe("payment rules", () => {
  it("charges the full configured amount for a full payment", () => {
    expect(paymentAmount(6_000_000, "full")).toBe(6_000_000);
  });

  it("splits an installment into two equal payments", () => {
    expect(paymentAmount(6_000_000, "deposit")).toBe(3_000_000);
    expect(paymentAmount(6_000_000, "balance")).toBe(3_000_000);
  });

  it("blocks installment orders at filing until fully paid", () => {
    expect(canAdvanceFromFiling("installment", 3_000_000, 6_000_000)).toBe(false);
    expect(canAdvanceFromFiling("installment", 6_000_000, 6_000_000)).toBe(true);
    expect(canAdvanceFromFiling("full", 6_000_000, 6_000_000)).toBe(true);
  });
});
