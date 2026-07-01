import { OrderStatus, OrderType, PaymentType, PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHashes = await Promise.all([hash("Admin@123", 12), hash("Agent@123", 12), hash("Customer@123", 12)]);
  const admin = await prisma.user.upsert({ where: { email: "admin@dispatch.local" }, update: {}, create: { name: "Operations Admin", email: "admin@dispatch.local", phone: "+919810000001", passwordHash: passwordHashes[0], role: Role.ADMIN } });
  const agent = await prisma.user.upsert({ where: { email: "agent@dispatch.local" }, update: {}, create: { name: "Rohan Shah", email: "agent@dispatch.local", phone: "+919810000002", passwordHash: passwordHashes[1], role: Role.AGENT } });
  const agentTwo = await prisma.user.upsert({ where: { email: "agent2@dispatch.local" }, update: {}, create: { name: "Meera Joshi", email: "agent2@dispatch.local", phone: "+919810000003", passwordHash: passwordHashes[1], role: Role.AGENT } });
  const customer = await prisma.user.upsert({ where: { email: "customer@dispatch.local" }, update: {}, create: { name: "Aarav Patel", email: "customer@dispatch.local", phone: "+919820000001", passwordHash: passwordHashes[2], role: Role.CUSTOMER } });

  const zoneData = [
    { name: "Ahmedabad Central", areas: [{ name: "Old City", postalCode: "380001", latitude: 23.0225, longitude: 72.5714 }, { name: "Navrangpura", postalCode: "380009", latitude: 23.0365, longitude: 72.5611 }] },
    { name: "Ahmedabad West", areas: [{ name: "Satellite", postalCode: "380015", latitude: 23.0308, longitude: 72.5178 }, { name: "Bodakdev", postalCode: "380054", latitude: 23.0395, longitude: 72.5125 }] },
    { name: "Gandhinagar North", areas: [{ name: "Sector 10", postalCode: "382010", latitude: 23.2156, longitude: 72.6369 }, { name: "Kudasan", postalCode: "382421", latitude: 23.1926, longitude: 72.6309 }] },
  ];
  const zones = [];
  for (const item of zoneData) {
    const zone = await prisma.zone.upsert({ where: { name: item.name }, update: {}, create: { name: item.name } });
    for (const area of item.areas) await prisma.area.upsert({ where: { postalCode: area.postalCode }, update: { ...area, zoneId: zone.id }, create: { ...area, zoneId: zone.id } });
    zones.push(zone);
  }

  for (let originIndex = 0; originIndex < zones.length; originIndex++) {
    for (let destinationIndex = 0; destinationIndex < zones.length; destinationIndex++) {
      for (const type of [OrderType.B2C, OrderType.B2B]) {
        const interZone = originIndex !== destinationIndex;
        const baseRate = (type === OrderType.B2B ? 65 : 80) + (interZone ? 35 + Math.abs(originIndex - destinationIndex) * 10 : 0);
        await prisma.rateCard.upsert({
          where: { originZoneId_destinationZoneId_orderType: { originZoneId: zones[originIndex].id, destinationZoneId: zones[destinationIndex].id, orderType: type } },
          update: {}, create: { originZoneId: zones[originIndex].id, destinationZoneId: zones[destinationIndex].id, orderType: type, baseWeightKg: type === OrderType.B2B ? 5 : 1, baseRate, additionalRateKg: type === OrderType.B2B ? 18 : 28 },
        });
      }
    }
  }
  await prisma.codRule.upsert({ where: { orderType: OrderType.B2C }, update: {}, create: { orderType: OrderType.B2C, flatFee: 20, percentage: 1, minimumFee: 25, maximumFee: 150 } });
  await prisma.codRule.upsert({ where: { orderType: OrderType.B2B }, update: {}, create: { orderType: OrderType.B2B, flatFee: 35, percentage: 0.75, minimumFee: 50, maximumFee: 500 } });
  await prisma.agentProfile.upsert({ where: { userId: agent.id }, update: { zoneId: zones[0].id }, create: { userId: agent.id, zoneId: zones[0].id, currentLatitude: 23.026, currentLongitude: 72.574, available: true, maxActiveOrders: 5 } });
  await prisma.agentProfile.upsert({ where: { userId: agentTwo.id }, update: { zoneId: zones[2].id }, create: { userId: agentTwo.id, zoneId: zones[2].id, currentLatitude: 23.205, currentLongitude: 72.64, available: true, maxActiveOrders: 4 } });

  const existing = await prisma.order.findUnique({ where: { trackingNumber: "LMD260630DEMO01" } });
  if (existing) {
    // Keep the showcase order aligned with its configured inter-zone B2C rate.
    await prisma.order.update({ where: { id: existing.id }, data: { baseCharge: 163, totalCharge: 163 } });
  } else {
    await prisma.order.create({
      data: {
        trackingNumber: "LMD260630DEMO01", customerId: customer.id, createdById: customer.id, assignedAgentId: agent.id,
        pickupAddress: "12 Relief Road, Ahmedabad", pickupPostalCode: "380001", pickupLatitude: 23.0225, pickupLongitude: 72.5714, pickupZoneId: zones[0].id,
        dropAddress: "21 Sector 10, Gandhinagar", dropPostalCode: "382010", dropLatitude: 23.2156, dropLongitude: 72.6369, dropZoneId: zones[2].id,
        lengthCm: 30, breadthCm: 20, heightCm: 15, actualWeightKg: 2, volumetricWeightKg: 1.8, billableWeightKg: 2,
        orderType: OrderType.B2C, paymentType: PaymentType.PREPAID, declaredValue: 1000, baseCharge: 163, codSurcharge: 0, totalCharge: 163,
        status: OrderStatus.IN_TRANSIT, deliveryAttempts: { create: { attemptNumber: 1, scheduledDate: new Date(Date.now() + 86400000) } },
        trackingEvents: { create: [
          { actorId: customer.id, status: OrderStatus.CREATED, message: "Order confirmed and pricing locked.", createdAt: new Date(Date.now() - 7200000) },
          { actorId: admin.id, status: OrderStatus.ASSIGNED, message: "Rohan Shah assigned by proximity and capacity.", createdAt: new Date(Date.now() - 5400000) },
          { actorId: agent.id, status: OrderStatus.PICKED_UP, message: "Parcel collected from the pickup address.", createdAt: new Date(Date.now() - 3600000) },
          { actorId: agent.id, status: OrderStatus.IN_TRANSIT, message: "Parcel is moving toward the destination hub.", createdAt: new Date(Date.now() - 1800000) },
        ] },
      },
    });
  }
  console.log("Seed complete. Demo tracking: LMD260630DEMO01");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
