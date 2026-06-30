import { PaymentType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/lib/pricing";

const rule = { baseWeightKg: 1, baseRate: 80, additionalRateKg: 28, codFlatFee: 20, codPercentage: 1, codMinimum: 25, codMaximum: 150 };

describe("rate calculation engine", () => {
  it("bills the higher volumetric weight and rounds excess kilograms upward", () => {
    const quote = calculatePrice({ lengthCm: 50, breadthCm: 40, heightCm: 30, actualWeightKg: 3, declaredValue: 0, paymentType: PaymentType.PREPAID }, rule);
    expect(quote.volumetricWeightKg).toBe(12);
    expect(quote.billableWeightKg).toBe(12);
    expect(quote.baseCharge).toBe(388);
    expect(quote.totalCharge).toBe(388);
  });

  it("uses actual weight when it exceeds volumetric weight", () => {
    const quote = calculatePrice({ lengthCm: 10, breadthCm: 10, heightCm: 10, actualWeightKg: 2.2, declaredValue: 0, paymentType: PaymentType.PREPAID }, rule);
    expect(quote.volumetricWeightKg).toBe(0.2);
    expect(quote.billableWeightKg).toBe(2.2);
    expect(quote.baseCharge).toBe(136);
  });

  it("applies percentage COD pricing with configured minimum and maximum", () => {
    const minimum = calculatePrice({ lengthCm: 10, breadthCm: 10, heightCm: 10, actualWeightKg: 1, declaredValue: 100, paymentType: PaymentType.COD }, rule);
    const maximum = calculatePrice({ lengthCm: 10, breadthCm: 10, heightCm: 10, actualWeightKg: 1, declaredValue: 50000, paymentType: PaymentType.COD }, rule);
    expect(minimum.codSurcharge).toBe(25);
    expect(maximum.codSurcharge).toBe(150);
  });

  it("never applies COD surcharge to prepaid orders", () => {
    const quote = calculatePrice({ lengthCm: 10, breadthCm: 10, heightCm: 10, actualWeightKg: 1, declaredValue: 50000, paymentType: PaymentType.PREPAID }, rule);
    expect(quote.codSurcharge).toBe(0);
  });
});
