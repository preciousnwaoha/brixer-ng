import { describe, expect, it } from "vitest";
import { getService, services } from "@/config/services";

describe("service catalogue", () => {
  it("has unique service codes and slugs", () => {
    expect(new Set(services.map((service) => service.code)).size).toBe(services.length);
    expect(new Set(services.map((service) => service.slug)).size).toBe(services.length);
  });

  it("keeps every price as positive integer kobo", () => {
    services.forEach((service) => {
      expect(Number.isInteger(service.priceKobo)).toBe(true);
      expect(service.priceKobo).toBeGreaterThan(0);
    });
  });

  it("resolves public service slugs", () => {
    expect(getService("business-name")?.code).toBe("BN");
  });
});
