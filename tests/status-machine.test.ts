import { OrderStatus, Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/status-machine";

describe("order lifecycle", () => {
  it("allows an agent to follow the normal delivery lifecycle", () => {
    expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, Role.AGENT)).toBe(true);
    expect(canTransition(OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, Role.AGENT)).toBe(true);
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, Role.AGENT)).toBe(true);
  });

  it("rejects skipped transitions for non-admin users", () => {
    expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.DELIVERED, Role.AGENT)).toBe(false);
  });

  it("allows agents to report a failed delivery", () => {
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED, Role.AGENT)).toBe(true);
  });

  it("keeps cancellation and rescheduling out of the agent status endpoint", () => {
    expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.CANCELLED, Role.AGENT)).toBe(false);
    expect(canTransition(OrderStatus.FAILED, OrderStatus.RESCHEDULED, Role.AGENT)).toBe(false);
    expect(canTransition(OrderStatus.FAILED, OrderStatus.RESCHEDULED, Role.CUSTOMER)).toBe(false);
  });

  it("prevents mutation of terminal states even by an admin", () => {
    expect(canTransition(OrderStatus.DELIVERED, OrderStatus.IN_TRANSIT, Role.ADMIN)).toBe(false);
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.CREATED, Role.ADMIN)).toBe(false);
  });
});
