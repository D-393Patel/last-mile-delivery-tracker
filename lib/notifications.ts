import { NotificationChannel, NotificationState, OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { statusLabel } from "@/lib/status-machine";

export async function queueStatusNotifications(orderId: string, status: OrderStatus) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (!order) return;

  const body = `Order ${order.trackingNumber} is now ${statusLabel(status)}. Open the tracker for the complete timeline.`;
  const notifications: Prisma.NotificationCreateManyInput[] = [
    {
      orderId,
      channel: NotificationChannel.EMAIL,
      recipient: order.customer.email,
      subject: `Delivery update: ${statusLabel(status)}`,
      body,
      state: NotificationState.QUEUED,
    },
  ];
  if (order.customer.phone) {
    notifications.push({
      orderId,
      channel: NotificationChannel.SMS,
      recipient: order.customer.phone,
      subject: null,
      body,
      state: NotificationState.QUEUED,
    });
  }
  await db.notification.createMany({ data: notifications });
}

async function deliverEmail(recipient: string, subject: string | null, body: string) {
  if (!process.env.RESEND_API_KEY) return null;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [recipient], subject: subject || "Delivery update", text: body }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Email provider rejected the message.");
  return result.id as string;
}

async function deliverSms(recipient: string, body: string) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = process.env;
  if (!sid || !token || !from) return null;
  const params = new URLSearchParams({ To: recipient, From: from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "SMS provider rejected the message.");
  return result.sid as string;
}

export async function processNotificationOutbox(limit = 25) {
  const queued = await db.notification.findMany({ where: { state: NotificationState.QUEUED }, orderBy: { createdAt: "asc" }, take: limit });
  const results = { sent: 0, skipped: 0, failed: 0 };
  for (const item of queued) {
    try {
      const providerId = item.channel === NotificationChannel.EMAIL
        ? await deliverEmail(item.recipient, item.subject, item.body)
        : await deliverSms(item.recipient, item.body);
      await db.notification.update({
        where: { id: item.id },
        data: providerId
          ? { state: NotificationState.SENT, providerId, sentAt: new Date() }
          : { state: NotificationState.SKIPPED, errorMessage: "Provider is not configured." },
      });
      providerId ? results.sent++ : results.skipped++;
    } catch (error) {
      await db.notification.update({ where: { id: item.id }, data: { state: NotificationState.FAILED, errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider error" } });
      results.failed++;
    }
  }
  return results;
}

// The DB outbox keeps provider latency and failures outside order transactions.
