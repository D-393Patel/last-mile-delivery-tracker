import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20).optional(),
});

const positiveNumber = z.coerce.number().positive();

export const quoteSchema = z.object({
  pickupPostalCode: z.string().trim().min(3).max(12),
  dropPostalCode: z.string().trim().min(3).max(12),
  lengthCm: positiveNumber,
  breadthCm: positiveNumber,
  heightCm: positiveNumber,
  actualWeightKg: positiveNumber,
  orderType: z.enum(["B2B", "B2C"]),
  paymentType: z.enum(["PREPAID", "COD"]),
  declaredValue: z.coerce.number().nonnegative().default(0),
});

export const createOrderSchema = quoteSchema.extend({
  customerId: z.string().min(1).optional(),
  pickupAddress: z.string().trim().min(8).max(300),
  dropAddress: z.string().trim().min(8).max(300),
  scheduledDate: z.iso.datetime().optional(),
  deliveryNotes: z.string().trim().max(500).optional(),
  autoAssign: z.boolean().default(true),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY",
    "DELIVERED", "FAILED", "RESCHEDULED", "CANCELLED",
  ]),
  message: z.string().trim().min(3).max(300).optional(),
  failureReason: z.string().trim().min(3).max(300).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const rescheduleSchema = z.object({
  scheduledDate: z.iso.datetime(),
  notes: z.string().trim().max(300).optional(),
});
