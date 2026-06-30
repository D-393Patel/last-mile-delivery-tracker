import { OrderStatus, Role } from "@prisma/client";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  ASSIGNED: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  PICKED_UP: [OrderStatus.IN_TRANSIT, OrderStatus.FAILED],
  IN_TRANSIT: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  FAILED: [OrderStatus.RESCHEDULED, OrderStatus.CANCELLED],
  RESCHEDULED: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus, role: Role) {
  if (role === Role.ADMIN && from !== OrderStatus.DELIVERED && from !== OrderStatus.CANCELLED) return true;
  return transitions[from].includes(to);
}

export function allowedTransitions(status: OrderStatus, role: Role) {
  if (role === Role.ADMIN && status !== OrderStatus.DELIVERED && status !== OrderStatus.CANCELLED) {
    return Object.values(OrderStatus).filter((candidate) => candidate !== status);
  }
  return transitions[status];
}

export const statusLabel = (status: OrderStatus) =>
  status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
