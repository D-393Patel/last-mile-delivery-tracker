import { OrderType, PaymentType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type PriceInput = {
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  declaredValue: number;
  paymentType: PaymentType;
};

export type PriceRule = {
  baseWeightKg: number;
  baseRate: number;
  additionalRateKg: number;
  codFlatFee?: number;
  codPercentage?: number;
  codMinimum?: number;
  codMaximum?: number | null;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculatePrice(input: PriceInput, rule: PriceRule) {
  const volumetricWeightKg = money(
    (input.lengthCm * input.breadthCm * input.heightCm) / 5000,
  );
  const billableWeightKg = Math.max(input.actualWeightKg, volumetricWeightKg);
  const excessWeight = Math.max(0, Math.ceil(billableWeightKg - rule.baseWeightKg));
  const baseCharge = money(rule.baseRate + excessWeight * rule.additionalRateKg);

  let codSurcharge = 0;
  if (input.paymentType === PaymentType.COD) {
    const computed = (rule.codFlatFee ?? 0) + input.declaredValue * ((rule.codPercentage ?? 0) / 100);
    codSurcharge = Math.max(computed, rule.codMinimum ?? 0);
    if (rule.codMaximum != null) codSurcharge = Math.min(codSurcharge, rule.codMaximum);
    codSurcharge = money(codSurcharge);
  }

  return {
    volumetricWeightKg,
    billableWeightKg,
    baseCharge,
    codSurcharge,
    totalCharge: money(baseCharge + codSurcharge),
  };
}

export async function buildQuote(input: PriceInput & {
  pickupPostalCode: string;
  dropPostalCode: string;
  orderType: OrderType;
}) {
  const [pickupArea, dropArea] = await Promise.all([
    db.area.findUnique({ where: { postalCode: input.pickupPostalCode }, include: { zone: true } }),
    db.area.findUnique({ where: { postalCode: input.dropPostalCode }, include: { zone: true } }),
  ]);

  if (!pickupArea) throw new AppError("Pickup postal code is outside the service area.", 422, "PICKUP_UNSERVICEABLE");
  if (!dropArea) throw new AppError("Drop postal code is outside the service area.", 422, "DROP_UNSERVICEABLE");

  const [rateCard, codRule] = await Promise.all([
    db.rateCard.findUnique({
      where: {
        originZoneId_destinationZoneId_orderType: {
          originZoneId: pickupArea.zoneId,
          destinationZoneId: dropArea.zoneId,
          orderType: input.orderType,
        },
      },
    }),
    input.paymentType === PaymentType.COD
      ? db.codRule.findUnique({ where: { orderType: input.orderType } })
      : Promise.resolve(null),
  ]);

  if (!rateCard?.active) throw new AppError("No active rate card is configured for this route.", 422, "RATE_NOT_CONFIGURED");
  if (input.paymentType === PaymentType.COD && !codRule?.active) {
    throw new AppError("COD is unavailable for this order type.", 422, "COD_NOT_CONFIGURED");
  }

  const result = calculatePrice(input, {
    baseWeightKg: Number(rateCard.baseWeightKg),
    baseRate: Number(rateCard.baseRate),
    additionalRateKg: Number(rateCard.additionalRateKg),
    codFlatFee: codRule ? Number(codRule.flatFee) : 0,
    codPercentage: codRule ? Number(codRule.percentage) : 0,
    codMinimum: codRule ? Number(codRule.minimumFee) : 0,
    codMaximum: codRule?.maximumFee ? Number(codRule.maximumFee) : null,
  });

  return {
    ...result,
    pickupArea,
    dropArea,
    rateCardId: rateCard.id,
    currency: "INR",
    formula: `${rateCard.baseRate} + ${Math.max(0, Math.ceil(result.billableWeightKg - Number(rateCard.baseWeightKg)))} × ${rateCard.additionalRateKg}`,
  };
}

export const decimal = (value: number) => new Prisma.Decimal(value);
