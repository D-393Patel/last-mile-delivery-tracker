import { describe, expect, it } from "vitest";
import { haversineKm } from "@/lib/assignment";

describe("agent distance calculation", () => {
  it("returns zero for identical coordinates", () => {
    expect(haversineKm(23.0225, 72.5714, 23.0225, 72.5714)).toBe(0);
  });

  it("calculates a plausible Ahmedabad-to-Gandhinagar distance", () => {
    const distance = haversineKm(23.0225, 72.5714, 23.2156, 72.6369);
    expect(distance).toBeGreaterThan(20);
    expect(distance).toBeLessThan(25);
  });
});
