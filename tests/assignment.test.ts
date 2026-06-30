import { describe, expect, it } from "vitest";
import { haversineKm, rankAgentCandidates } from "@/lib/assignment";

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

describe("agent ranking", () => {
  const agent = (id: string, sameZone: boolean, distanceKm: number, activeOrders: number) => ({ id, sameZone, distanceKm, activeOrders });

  it("prefers an available agent in the pickup zone", () => {
    const ranked = rankAgentCandidates([agent("remote", false, 1, 0), agent("local", true, 4, 2)]);
    expect(ranked[0].id).toBe("local");
  });

  it("selects the nearest agent when zone priority is equal", () => {
    const ranked = rankAgentCandidates([agent("far", true, 8, 0), agent("near", true, 2, 3)]);
    expect(ranked[0].id).toBe("near");
  });

  it("uses active workload as a deterministic distance tie-breaker", () => {
    const ranked = rankAgentCandidates([agent("busy", true, 2, 4), agent("free", true, 2, 1)]);
    expect(ranked[0].id).toBe("free");
  });
});
