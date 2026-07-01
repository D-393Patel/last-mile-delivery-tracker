import { OrderStatus, Role } from "@prisma/client";

const agentTransitions: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [],
  ASSIGNED: [OrderStatus.PICKED_UP],
  PICKED_UP: [OrderStatus.IN_TRANSIT, OrderStatus.FAILED],
  IN_TRANSIT: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  FAILED: [],
  RESCHEDULED: [],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus, role: Role) {
  if (role === Role.ADMIN && from !== OrderStatus.DELIVERED && from !== OrderStatus.CANCELLED) return true;
  if (role === Role.AGENT) return agentTransitions[from].includes(to);
  return false;
}

export function allowedTransitions(status: OrderStatus, role: Role) {
  if (role === Role.ADMIN && status !== OrderStatus.DELIVERED && status !== OrderStatus.CANCELLED) {
    return Object.values(OrderStatus).filter((candidate) => candidate !== status);
  }
  return role === Role.AGENT ? agentTransitions[status] : [];
}

export const statusLabel = (status: OrderStatus) =>
  status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
